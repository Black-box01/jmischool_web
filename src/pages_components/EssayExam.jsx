'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import 'bootstrap/dist/css/bootstrap.min.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { supabase } from "../supabaseClient.js";
import { sendEmailNotification } from '../api/emailNotificationService';
import '../styles/QuizComponent.css';
import { evaluateEssay } from '../utils/nlpScorer';

const logo = '/logo.jpg';

const EssayExam = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const name = searchParams.get('name')?.trim();
  const newClass = searchParams.get('newClass')?.trim();
  const currentTerm = searchParams.get('currentTerm')?.trim();
  const subject = searchParams.get('subject')?.trim();
  const duration = searchParams.get('duration');
  const purpose = searchParams.get('purpose')?.trim();

  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [answers, setAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [examResults, setExamResults] = useState(null);
  const [adminPassword, setAdminPassword] = useState(null);
  const [isLocked, setIsLocked] = useState(true);
  const [passwordInput, setPasswordInput] = useState("");
  const [isSavingToStorage, setIsSavingToStorage] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  
  const examId = `cbt_essay_${name}_${subject}_${newClass}_${Date.now()}`;

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const { data, error } = await supabase
          .from('jmis_cbt_essay')
          .select('questions, subject, class, purpose, term')
          .ilike('subject', `%${subject?.trim() || ''}%`)
          .ilike('class', `%${newClass?.trim() || ''}%`);
        
        if (error) throw error;
        if (!data || data.length === 0) {
          toast.error(`No essay questions available for ${subject}, ${newClass}.`);
          return;
        }
        
        setQuestions(data[0].questions || []);
        setTimeout(() => loadFromLocalStorage(), 500);
      } catch (error) {
        toast.error('Error fetching questions: ' + error.message);
      }
    };
    fetchQuestions();
  }, [subject, newClass]);

  useEffect(() => {
    if (timeLeft <= 0 || showScore || isLocked) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.warning('Time is up! Submitting your exam...');
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, showScore, isLocked]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds / 60) % 60;
    const secs = seconds % 60;
    return `${hours < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getWordCount = (text) => text.trim() ? text.trim().split(/\s+/).length : 0;

  const handleAnswerChange = (index, value) => {
    const newAnswers = { ...answers, [index]: value };
    setAnswers(newAnswers);
    saveToLocalStorage(newAnswers);
  };

  const saveToLocalStorage = (currentAnswers) => {
    try {
      setIsSavingToStorage(true);
      const examData = {
        examId, name, newClass, currentTerm, subject, purpose, duration,
        answers: currentAnswers, currentQuestion, timeLeft,
        timestamp: new Date().toISOString(), isComplete: false
      };
      localStorage.setItem(examId, JSON.stringify(examData));
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setIsSavingToStorage(false);
    }
  };

  const loadFromLocalStorage = () => {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith('cbt_essay_') && key.includes(name) && key.includes(subject)
      );
      if (keys.length > 0) {
        const savedData = JSON.parse(localStorage.getItem(keys[keys.length - 1]));
        if (savedData && !savedData.isComplete) {
          setAnswers(savedData.answers || {});
          setCurrentQuestion(savedData.currentQuestion || 0);
          setTimeLeft(savedData.timeLeft || duration * 60);
          toast.info('Restored your previous exam progress!');
        }
      }
    } catch (error) {
      console.error('Error loading:', error);
    }
  };

  const handleSubmitExam = async () => {
    let totalScore = 0;
    let totalMaxScore = 0;
    const results = questions.map((q, index) => {
      const evaluation = evaluateEssay(answers[index] || '', q);
      totalScore += evaluation.score;
      totalMaxScore += evaluation.maxScore;
      return {
        questionIndex: index,
        questionText: q.questionText,
        studentAnswer: answers[index] || '',
        score: evaluation.score,
        maxScore: evaluation.maxScore,
        percentage: evaluation.percentage,
        feedback: evaluation.feedback,
        keywordMatches: evaluation.keywordMatches,
        wordCount: evaluation.wordCount,
        meetsMinWords: evaluation.meetsMinWords
      };
    });

    setExamResults({ totalScore, maxScore: totalMaxScore, results });
    setScore(totalScore);
    setMaxScore(totalMaxScore);
    
    try {
      const examData = JSON.parse(localStorage.getItem(examId) || '{}');
      examData.isComplete = true;
      localStorage.setItem(examId, JSON.stringify(examData));
    } catch (error) {}
    
    await uploadResults(totalScore);
    setShowScore(true);
    setIsSubmitted(true);
  };

  const uploadResults = async () => {
    if (purpose === 'practice') {
      toast.success("Practice completed! Results not saved.");
      return;
    }

    const resultData = await prepareResultData();
    if (!resultData) {
      toast.error("Error: Unable to fetch student ID.");
      return;
    }

    const success = await saveResultToDatabase(resultData);
    if (success) {
      await sendResultEmail();
      toast.success("✅ Results saved successfully!");
      try { localStorage.removeItem(examId); } catch (error) {}
    } else {
      toast.error("⚠️ Failed to save results.");
    }
  };

  const prepareResultData = async () => {
    try {
      const { data: studentData } = await supabase
        .from('jmis_student')
        .select('id')
        .eq('name', name)
        .eq('class', newClass)
        .single();

      if (!studentData) return null;

      return {
        studentId: studentData.id,
        studentName: name,
        studentClass: newClass.toUpperCase(),
        score,
        totalQuestions: questions.length,
        percentage: maxScore > 0 ? ((score / maxScore) * 100).toFixed(2) : 0
      };
    } catch (error) {
      return null;
    }
  };

  const saveResultToDatabase = async (resultData) => {
    try {
      const { error } = await supabase
        .from('jmis_cbt_results')
        .insert([{
          ...resultData,
          subject, term: currentTerm, purpose, sessionType: 'essay',
          answers, examResults, created_at: new Date().toISOString()
        }]);
      return !error;
    } catch (error) {
      return false;
    }
  };

  const sendResultEmail = async () => {
    const detailedScores = examResults?.results.map((r, idx) => {
      const keywordSummary = Object.entries(r.keywordMatches || {})
        .map(([kw, found]) => found ? '✓' : '✗')
        .join(' ');
      return `Q${idx + 1}: Score: ${r.score}/${r.maxScore} (${r.percentage}%)
  ${r.feedback}
  Keywords: ${keywordSummary}`;
    }).join('\n\n');

    const emailSubject = `CBT Essay Session Result - ${name}`;
    const emailMessage = `Student has completed a CBT Essay Session:

Student Name: ${name}
Class: ${newClass}
Term: ${currentTerm || 'N/A'}
Subject: ${subject}
Session Type: Essay

Performance Summary:
Total Questions: ${questions.length}
Total Score: ${score}/${maxScore}
Percentage: ${maxScore > 0 ? ((score / maxScore) * 100).toFixed(2) : 0}%

Detailed Breakdown:
${detailedScores}

---
Automated notification from JMIC CBT System`;

    // Fetch admin email from database
    let recipients = ['rhemaexpertsolutions@gmail.com', 'onyevid@gmail.com'];
    
    try {
      const { data: settingsData } = await supabase
        .from('jmis_settings')
        .select('adminEmail')
        .single();
      
      if (settingsData?.adminEmail) {
        recipients.push(settingsData.adminEmail);
      }
    } catch (error) {
      console.warn('Could not fetch admin email:', error.message);
    }

    try {
      await sendEmailNotification(supabase, emailSubject, emailMessage, recipients);
    } catch (error) {
      console.error('Email error:', error);
    }
  };

  const handleUnlock = async () => {
    if (!passwordInput) {
      toast.error("Please enter the admin password.");
      return;
    }
    const { data } = await supabase.from('jmis_settings').select('cbtPassword').single();
    if (passwordInput === data?.cbtPassword) {
      setAdminPassword(passwordInput);
      setIsLocked(false);
      toast.success("Exam unlocked!");
    } else {
      toast.error("Incorrect password.");
    }
  };

  if (isLocked) {
    return (
      <div className="lock-screen">
        <div className="lock-screen-content">
          <h2>🔒 Locked Essay Exam</h2>
          <p>Enter admin password to start.</p>
          <input type="password" className="form-control mb-3" value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)} placeholder="Admin password" />
          <button className="btn btn-primary" onClick={handleUnlock}>Unlock</button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return <div className="container mt-5"><h3>No essay questions available.</h3></div>;
  }

  return (
    <div className="container">
      <ToastContainer />
      
      {lastSaved && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          padding: '6px 12px', borderRadius: '15px', fontSize: '0.85rem',
          backgroundColor: isSavingToStorage ? '#FFC107' : '#2196F3', color: 'white'
        }}>
          {isSavingToStorage ? '💾 Saving...' : `💾 Saved ${lastSaved.toLocaleTimeString()}`}
        </div>
      )}

      <nav className="navbar navbar-light bg-light cbtNavbar mb-4">
        <div className="navbar-brand" style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
          <img src={logo} alt="Logo" style={{height: '40px'}} />
          <h4>Essay Exam - {subject}</h4>
        </div>
        <div className="d-flex align-items-center gap-3">
          <span className="badge bg-info">Student: {name}</span>
          <span className="badge bg-secondary">Class: {newClass}</span>
          <span className="badge bg-warning text-dark">Time: {formatTime(timeLeft)}</span>
        </div>
      </nav>

      {!showScore ? (
        <div className="quiz">
          <div className="question-card">
            <h5>Question {currentQuestion + 1} of {questions.length}</h5>
            <p className="text-muted">
              Minimum words: {questions[currentQuestion].minWords} | 
              Points: {questions[currentQuestion].points}
            </p>
            <p className="question-text">{questions[currentQuestion].questionText}</p>
            <textarea
              className="form-control"
              rows="10"
              value={answers[currentQuestion] || ''}
              onChange={(e) => handleAnswerChange(currentQuestion, e.target.value)}
              placeholder="Write your essay here..."
            />
            <p className="text-right mt-2">
              Word count: {getWordCount(answers[currentQuestion] || '')}
              {getWordCount(answers[currentQuestion] || '') < questions[currentQuestion].minWords && 
                <span className="text-danger"> (Minimum: {questions[currentQuestion].minWords})</span>
              }
            </p>
          </div>

          <div className="navigation-buttons mt-4">
            <button className="btn btn-secondary me-2"
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}>Previous</button>
            <button className="btn btn-primary me-2"
              onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
              disabled={currentQuestion === questions.length - 1}>Next</button>
            <button className="btn btn-success" onClick={handleSubmitExam}>Submit Exam</button>
          </div>

          <div className="question-grid mt-4">
            {questions.map((_, idx) => (
              <button key={idx}
                className={`btn btn-sm m-1 ${idx === currentQuestion ? 'btn-primary' : answers[idx] ? 'btn-success' : 'btn-outline-secondary'}`}
                onClick={() => setCurrentQuestion(idx)}>
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="score-modal">
          <div className="score-content">
            <h2>📊 Essay Exam Results</h2>
            <div className="score-section">
              <p><strong>Total Questions:</strong> {questions.length}</p>
              <p><strong>Total Score:</strong> {score}/{maxScore}</p>
              <p><strong>Percentage:</strong> {maxScore > 0 ? ((score / maxScore) * 100).toFixed(2) : 0}%</p>
            </div>

            <h4 className="mt-4">Detailed Feedback:</h4>
            {examResults?.results.map((r, idx) => (
              <div key={idx} className="result-item">
                <p><strong>Q{idx + 1}:</strong> {r.questionText}</p>
                <p><strong>Score:</strong> {r.score}/{r.maxScore} ({r.percentage}%)</p>
                <p><strong>Feedback:</strong> {r.feedback}</p>
                <p><strong>Word Count:</strong> {r.wordCount}</p>
              </div>
            ))}

            <button className="btn btn-primary mt-4" onClick={() => router.push('/cbt')}>
              Back to CBT Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EssayExam;
