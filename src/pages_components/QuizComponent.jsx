'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import 'bootstrap/dist/css/bootstrap.min.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { supabase } from "../supabaseClient.js";
import { sendEmailNotification } from '../api/emailNotificationService';
import '../styles/QuizComponent.css';
import '../styles/DetailedResults.css';
import { FaCheck, FaTrophy, FaEye, FaEyeSlash } from 'react-icons/fa';
import { schoolSubjects } from '../utils/subjectUtils';

// Using logo from public directory
const logo = '/logo.jpg';



const QuizComponent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const name = searchParams.get('name')?.trim();
  const newClass = searchParams.get('newClass')?.trim();
  const currentTerm = searchParams.get('currentTerm')?.trim();
  const newSex = searchParams.get('newSex');
  const subject = searchParams.get('subject')?.trim();
  const duration = searchParams.get('duration');
  const purpose = searchParams.get('purpose')?.trim();

  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(duration * 60); // Convert duration from minutes to seconds
  const [answers, setAnswers] = useState({}); // Store user answers
  const [adminPassword, setAdminPassword] = useState(null); // State to store admin password, init to null
  const [isLocked, setIsLocked] = useState(true); // State to manage lock screen visibility, default to true
  const [passwordInput, setPasswordInput] = useState(""); // State to manage password input visibility
  const [showPassword, setShowPassword] = useState(false); // State to manage password visibility
  const [isSubmitted, setIsSubmitted] = useState(false); // State to manage submission status
  
  // Network reliability features
  const [networkStatus, setNetworkStatus] = useState({ isOnline: true, quality: 'good' });
  const [saveAttempts, setSaveAttempts] = useState(0);
  const [pendingResult, setPendingResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Result review features
  const [showDetailedResults, setShowDetailedResults] = useState(false);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(null);
  
  // LocalStorage auto-save features
  const [isSavingToStorage, setIsSavingToStorage] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const examId = `cbt_exam_${name}_${subject}_${newClass}_${Date.now()}`;

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        console.log('🔍 [QuizComponent] Fetching questions with params:', { 
          subject, 
          newClass, 
          purpose, 
          currentTerm 
        });
        
        // First, let's see what's actually in the database for this subject
        const { data: allQuestions, error: checkError } = await supabase
          .from('jmis_cbtQuestions')
          .select('subject, class, purpose, term')
          .ilike('subject', `%${subject?.trim() || ''}%`);
        
        if (checkError) {
          console.error('❌ [QuizComponent] Error checking database:', checkError);
        } else {
          console.log('📋 [QuizComponent] All matching questions in database:', allQuestions);
        }
        
        let query = supabase
          .from('jmis_cbtQuestions')
          .select('questions, subject, class, purpose, term');

        if (subject) {
          query = query.ilike('subject', `%${subject.trim()}%`);
        }

        if (newClass) {
          // Make class matching case-insensitive
          query = query.ilike('class', `%${newClass.trim()}%`);
        }

        if (purpose) {
          const trimmedPurpose = purpose.trim().toLowerCase();
          // Allow 'test' to match 'midterm' as well, since they are often used interchangeably in result processing
          if (trimmedPurpose === 'test' || trimmedPurpose === 'midterm') {
            query = query.or(`purpose.ilike.%test%,purpose.ilike.%midterm%`);
          } else {
            query = query.ilike('purpose', `%${trimmedPurpose}%`);
          }
        }

        if (currentTerm) {
          query = query.ilike('term', `%${currentTerm.trim()}%`);
        }

        const { data, error } = await query;
        
        if (error) {
          console.error('❌ [QuizComponent] Database error:', error);
          throw error;
        }
        
        console.log('📊 [QuizComponent] Query result:', { 
          found: data?.length || 0, 
          data: data,
          searchedParams: { subject, newClass, purpose, currentTerm }
        });
        
        if (!data || data.length === 0) {
          console.warn('⚠️ [QuizComponent] No questions found!');
          console.warn('   Search params:', { subject, newClass, purpose, currentTerm });
          console.warn('   Available in DB:', allQuestions);
          toast.error(`No questions available for Subject: ${subject}, Class: ${newClass}, Purpose: ${purpose || 'Any'}.`);
        }
        
        const fetchedQuestions = data && data.length > 0 ? data[0].questions || [] : [];
        setQuestions(fetchedQuestions);
        
        // Try to load saved progress after questions are loaded
        if (fetchedQuestions.length > 0) {
          setTimeout(() => {
            loadFromLocalStorage();
          }, 500);
        }
      } catch (error) {
        console.error('❌ [QuizComponent] Error fetching questions:', error);
        toast.error('Error fetching questions: ' + error.message);
      }
    };
    fetchQuestions();
  }, [subject, newClass, purpose, currentTerm]);

  useEffect(() => {
    const fetchAdminPassword = async () => {
      try {
        const { data, error } = await supabase
          .from('jmis_settings')
          .select('cbtPassword');
        if (error) throw error;
        // Use the first row if data exists, otherwise default to empty string
        setAdminPassword(data && data.length > 0 ? data[0].cbtPassword : "");
      } catch (error) {
        toast.error('Error fetching admin password: ' + error.message);
        setAdminPassword(""); // Fallback
      }
    };
    fetchAdminPassword();
  }, []);

  // Network quality monitoring - check every 5 seconds
  useEffect(() => {
    const checkNetworkQuality = async () => {
      const startTime = Date.now();
      try {
        // Test connectivity with a quick Supabase query
        const { error } = await supabase
          .from('jmis_cbtQuestions')
          .select('id')
          .limit(1)
          .maybeSingle();
        
        const latency = Date.now() - startTime;
        
        if (error) {
          setNetworkStatus({ isOnline: false, quality: 'offline' });
        } else {
          setNetworkStatus({
            isOnline: true,
            quality: latency < 1000 ? 'good' : latency < 3000 ? 'poor' : 'offline'
          });
        }
      } catch {
        setNetworkStatus({ isOnline: false, quality: 'offline' });
      }
    };

    checkNetworkQuality();
    const interval = setInterval(checkNetworkQuality, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isLocked) return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          setShowScore(true);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLocked]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      const password = prompt("Enter admin password to continue the exam:");
      if (password !== adminPassword) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [adminPassword]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsLocked(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleUnlock = () => {
    if (adminPassword === null) {
      toast.info("Please wait, loading system configuration...");
      return;
    }
    if (passwordInput === adminPassword) {
      setIsLocked(false);
      setPasswordInput("");
    } else {
      toast.error("Incorrect admin password.");
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds / 60) % 60;
    const secs = seconds % 60;
    return `${hours < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleAnswerOptionClick = (index) => {
    const previousAnswer = answers[currentQuestion];
    const newAnswers = { ...answers, [currentQuestion]: index };
    setAnswers(newAnswers);
    
    // Recalculate score from scratch to avoid double-counting
    let newScore = 0;
    Object.keys(newAnswers).forEach(qIndex => {
      const qIdx = parseInt(qIndex);
      const selectedOption = newAnswers[qIdx];
      if (questions[qIdx] && questions[qIdx].answerOptions[selectedOption]?.isCorrect) {
        newScore++;
      }
    });
    setScore(newScore);
    
    // Auto-save to localStorage
    saveToLocalStorage(newAnswers, newScore);
  };
  
  // Save exam progress to localStorage
  const saveToLocalStorage = (currentAnswers, currentScore) => {
    try {
      setIsSavingToStorage(true);
      const examData = {
        examId,
        name,
        newClass,
        currentTerm,
        subject,
        purpose,
        duration,
        answers: currentAnswers,
        score: currentScore,
        currentQuestion,
        timeLeft,
        timestamp: new Date().toISOString(),
        isComplete: false
      };
      
      localStorage.setItem(examId, JSON.stringify(examData));
      setLastSaved(new Date());
      console.log('💾 [AutoSave] Saved to localStorage');
    } catch (error) {
      console.error('❌ [AutoSave] Error saving to localStorage:', error);
    } finally {
      setIsSavingToStorage(false);
    }
  };
  
  // Load exam progress from localStorage
  const loadFromLocalStorage = () => {
    try {
      // Find the most recent exam for this student/subject
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith('cbt_exam_') && 
        key.includes(name) && 
        key.includes(subject)
      );
      
      if (keys.length > 0) {
        const mostRecentKey = keys[keys.length - 1];
        const savedData = JSON.parse(localStorage.getItem(mostRecentKey));
        
        if (savedData && !savedData.isComplete) {
          console.log('📂 [AutoLoad] Found saved exam:', savedData.timestamp);
          setAnswers(savedData.answers || {});
          setScore(savedData.score || 0);
          setCurrentQuestion(savedData.currentQuestion || 0);
          setTimeLeft(savedData.timeLeft || duration * 60);
          toast.info('Restored your previous exam progress!');
          return true;
        }
      }
    } catch (error) {
      console.error('❌ [AutoLoad] Error loading from localStorage:', error);
    }
    return false;
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handleSubmitExam = async () => {
    // Mark exam as complete in localStorage
    try {
      const examData = JSON.parse(localStorage.getItem(examId) || '{}');
      examData.isComplete = true;
      localStorage.setItem(examId, JSON.stringify(examData));
    } catch (error) {
      console.error('Error marking exam complete:', error);
    }
    
    await uploadResults();
    setShowScore(true);
    setIsSubmitted(true);
  };

  const getCongratulationMessage = (percentage) => {
    if (percentage >= 70) {
      return <span style={{ color: 'green' }}>Excellent! You did a great job!</span>;
    } else if (percentage >= 50) {
      return <span style={{ color: 'orange' }}>Good job! Keep it up!</span>;
    } else if (percentage >= 30) {
      return <span style={{ color: 'red' }}>You passed! But there's room for improvement.</span>;
    } else {
      return <span style={{ color: 'red' }}>You didn't pass. Better luck next time!</span>;
    }
  };

  const normalizedPurpose = (purpose || "").toLowerCase();
  const displayedScore = normalizedPurpose === "exam" ? Math.min(score, 40) : score;
  const displayedTotal = normalizedPurpose === "exam" ? 40 : questions.length;
  const percentageScore = displayedTotal > 0 ? (displayedScore / displayedTotal) * 100 : 0;

  // Categorize questions for detailed review
  const getQuestionCategories = () => {
    const correct = [];
    const incorrect = [];
    const unattempted = [];

    questions.forEach((question, index) => {
      const userAnswer = answers[index];
      
      if (userAnswer === undefined) {
        unattempted.push({
          questionNumber: index + 1,
          questionText: question.questionText,
          options: question.answerOptions
        });
      } else {
        const isCorrect = question.answerOptions[userAnswer]?.isCorrect;
        if (isCorrect) {
          correct.push({
            questionNumber: index + 1,
            questionText: question.questionText,
            selectedOption: userAnswer,
            selectedText: question.answerOptions[userAnswer].answerText,
            options: question.answerOptions
          });
        } else {
          incorrect.push({
            questionNumber: index + 1,
            questionText: question.questionText,
            selectedOption: userAnswer,
            selectedText: question.answerOptions[userAnswer].answerText,
            correctOption: question.answerOptions.findIndex(opt => opt.isCorrect),
            correctText: question.answerOptions.find(opt => opt.isCorrect)?.answerText,
            options: question.answerOptions
          });
        }
      }
    });

    return { correct, incorrect, unattempted };
  };

  const handleDownloadResultsReview = () => {
    const categories = getQuestionCategories();
    
    // Determine school name based on class/year
    const schoolName = (newClass.toLowerCase().includes('year') && 
                       (parseInt(newClass.split(' ')[1]) >= 7 || 
                        ['jss1', 'jss2', 'jss3', 'ss1', 'ss2', 'ss3'].includes(newClass.toLowerCase()))) 
      ? 'Jeshurun Montessori International High School'
      : 'Jeshurun Montessori International School';
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    // Generate HTML content with exact styling
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Detailed CBT Results - ${name}</title>
  <style>
    @page {
      margin: 1.5cm;
      size: A4;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #000;
      font-size: 11pt;
    }
    
    .header {
      border-bottom: 3px solid #007bff;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    
    .school-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 15px;
    }
    
    .school-logo {
      width: 80px;
      height: 80px;
      object-fit: contain;
    }
    
    .school-info {
      flex: 1;
      text-align: center;
    }
    
    h1 {
      color: #2c3e50;
      font-size: 24pt;
      margin-bottom: 5px;
    }
    
    .subtitle {
      color: #7f8c8d;
      font-size: 14pt;
      font-weight: normal;
    }
    
    h2 {
      color: #34495e;
      font-size: 18pt;
      margin-top: 20px;
      margin-bottom: 15px;
      border-bottom: 2px solid #3498db;
      padding-bottom: 5px;
    }
    
    h3 {
      color: #2c3e50;
      font-size: 14pt;
      margin-top: 15px;
      margin-bottom: 10px;
    }
    
    .student-info {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      margin-top: 10px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    
    .info-item {
      margin-bottom: 8px;
    }
    
    .info-label {
      font-weight: bold;
      color: #495057;
    }
    
    .summary-stats {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-top: 15px;
    }
    
    .stat-card {
      padding: 15px;
      border-radius: 5px;
      text-align: center;
    }
    
    .stat-correct {
      background: #d4edda;
      color: #155724;
    }
    
    .stat-incorrect {
      background: #f8d7da;
      color: #721c24;
    }
    
    .stat-unattempted {
      background: #fff3cd;
      color: #856404;
    }
    
    .stat-total {
      background: #d1ecf1;
      color: #0c5460;
    }
    
    .stat-number {
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .stat-label {
      font-size: 0.9rem;
    }
    
    .question-card {
      border: 2px solid;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    
    .question-correct {
      border-color: #28a745;
      background: #d4edda;
    }
    
    .question-incorrect {
      border-color: #dc3545;
      background: #f8d7da;
    }
    
    .question-unattempted {
      border-color: #ffc107;
      background: #fff3cd;
    }
    
    .question-title {
      font-weight: bold;
      font-size: 12pt;
      margin-bottom: 10px;
    }
    
    .option {
      padding: 8px;
      margin: 5px 0;
      border-radius: 4px;
      border: 1px solid #ddd;
    }
    
    .option-correct {
      background: #28a745;
      color: white;
      border-color: #28a745;
    }
    
    .option-user-wrong {
      background: #ffc107;
      color: black;
      border-color: #007bff;
      border-width: 2px;
    }
    
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #007bff;
      text-align: center;
      color: #6c757d;
    }
    
    @media print {
      body {
        font-size: 11pt;
      }
      
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="school-header">
      <img src="${window.location.origin}/logo.jpg" alt="School Logo" class="school-logo" />
      <div class="school-info">
        <h1>${schoolName}</h1>
        <div class="subtitle">Detailed CBT Exam Results - Review</div>
      </div>
    </div>
    <div class="student-info">
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Student Name:</div>
          <div>${name}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Class:</div>
          <div>${newClass}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Subject:</div>
          <div>${subject}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Exam Type:</div>
          <div>${purpose === 'midterm' || purpose === 'test' ? 'Mid-term Exam' : purpose === 'exam' ? 'Final Exam' : 'Practice Test'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Term:</div>
          <div>${currentTerm || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Date:</div>
          <div>${new Date().toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="summary-stats">
    <h2>Exam Summary</h2>
    <div class="stats-grid">
      <div class="stat-card stat-correct">
        <div class="stat-number">${categories.correct.length}</div>
        <div class="stat-label">Correct</div>
      </div>
      <div class="stat-card stat-incorrect">
        <div class="stat-number">${categories.incorrect.length}</div>
        <div class="stat-label">Incorrect</div>
      </div>
      <div class="stat-card stat-unattempted">
        <div class="stat-number">${categories.unattempted.length}</div>
        <div class="stat-label">Unattempted</div>
      </div>
      <div class="stat-card stat-total">
        <div class="stat-number">${questions.length}</div>
        <div class="stat-label">Total</div>
      </div>
    </div>
  </div>

  ${categories.correct.length > 0 ? `
  <h2>✅ Correct Answers (${categories.correct.length})</h2>
  ${categories.correct.map(item => `
    <div class="question-card question-correct">
      <div class="question-title">Question ${item.questionNumber}: ${item.questionText}</div>
      <div style="margin-top: 10px;">
        ${item.options.map((opt, idx) => `
          <div class="option ${opt.isCorrect ? 'option-correct' : ''}" style="${answers[item.questionNumber - 1] === idx ? 'border: 2px solid #007bff;' : ''}">
            ${String.fromCharCode(65 + idx)}. ${opt.answerText}${opt.isCorrect ? ' ✓' : ''}${answers[item.questionNumber - 1] === idx ? ' (Your Answer)' : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('')}
  ` : ''}

  ${categories.incorrect.length > 0 ? `
  <h2>❌ Incorrect Answers (${categories.incorrect.length})</h2>
  ${categories.incorrect.map(item => `
    <div class="question-card question-incorrect">
      <div class="question-title">Question ${item.questionNumber}: ${item.questionText}</div>
      <div style="margin-top: 10px;">
        ${item.options.map((opt, idx) => `
          <div class="option ${opt.isCorrect ? 'option-correct' : ''}" style="${answers[item.questionNumber - 1] === idx ? 'border: 2px solid #007bff; background: #ffc107; color: black;' : ''}">
            ${String.fromCharCode(65 + idx)}. ${opt.answerText}${opt.isCorrect ? ' ✓ Correct Answer' : ''}${answers[item.questionNumber - 1] === idx ? ' (Your Answer)' : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('')}
  ` : ''}

  ${categories.unattempted.length > 0 ? `
  <h2>⏭️ Unattempted Questions (${categories.unattempted.length})</h2>
  ${categories.unattempted.map(item => `
    <div class="question-card question-unattempted">
      <div class="question-title">Question ${item.questionNumber}: ${item.questionText}</div>
      <div style="margin-top: 10px;">
        ${item.options.map((opt, idx) => `
          <div class="option ${opt.isCorrect ? 'option-correct' : ''}">
            ${String.fromCharCode(65 + idx)}. ${opt.answerText}${opt.isCorrect ? ' ✓ Correct Answer' : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('')}
  ` : ''}

  <div class="footer">
    <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
    <div>JMIC CBT Examination System</div>
  </div>

  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() {
        window.close();
      };
    };
  </script>
</body>
</html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    toast.success('PDF generation started - select "Save as PDF" in print dialog!');
  };

  const fetchStudentId = async (studentName, studentClass) => {
    try {
      const { data, error } = await supabase
        .from("jmis_student")
        .select("id")
        .eq("name", studentName)
        .eq("class", studentClass)
        .single();

      if (error) {
        throw error;
      }

      return data?.id || null;
    } catch (error) {
      console.error("Error fetching student ID: ", error.message);
      return null;
    }
  };

  const calculateMidtermGrade = (score) => {
    if (score >= 29) return "A+";
    if (score >= 26) return "A";
    if (score >= 24) return "B+";
    if (score >= 21) return "B";
    if (score >= 20) return "C+";
    if (score >= 17) return "C";
    if (score >= 14) return "D";
    return "E";
  };

  const prepareResultData = async () => {
    const studentId = await fetchStudentId(name, newClass);
    if (!studentId) return null;

    const isMidterm = purpose && (purpose.toLowerCase() === 'midterm' || purpose.toLowerCase() === 'test');
    const isExamPurpose = purpose && purpose.toLowerCase() === 'exam';
    const rawScore = score;
    const midtermStoredScore = isMidterm ? Math.min(rawScore, 30) : rawScore;
    const examStoredScore = isExamPurpose ? Math.min(rawScore, 40) : rawScore;

    const termKey = currentTerm === "1st Term" ? "term1Subjects"
      : currentTerm === "2nd Term" ? "term2Subjects"
      : "term3Subjects";
    
    const scoreField = (purpose === 'midterm' || purpose === 'test') ? 'ca1' : 'exam';
    const normalizeSubjectKey = (name) => name.toLowerCase().replace(/[\s.]/g, '');

    const { data: existingResultData } = await supabase
      .from("jmis_result")
      .select(termKey)
      .eq("studentId", studentId)
      .maybeSingle();

    let termSubjects = existingResultData ? existingResultData[termKey] || [] : [];
    const subjectIndex = termSubjects.findIndex((item) => normalizeSubjectKey(item.subjectName) === normalizeSubjectKey(subject));

    if (subjectIndex !== -1) {
      const subjectEntry = termSubjects[subjectIndex];
      if (scoreField === 'ca1') subjectEntry.test = midtermStoredScore.toString();
      else if (scoreField === 'exam') subjectEntry.examination = examStoredScore.toString();
      
      if (!subjectEntry.grade) subjectEntry.grade = "";
      if (!subjectEntry.remark) subjectEntry.remark = "";
      if (!subjectEntry.project) subjectEntry.project = "";
      
      if (scoreField === 'exam' && parseFloat(subjectEntry.examination || 0) > 40) {
        subjectEntry.examination = '40';
      }
      
      subjectEntry.total = parseFloat(subjectEntry.test || 0) + Math.min(parseFloat(subjectEntry.examination || 0), 40) + parseFloat(subjectEntry.project || 0);
    } else {
      const normalizedClassKey = newClass.toLowerCase().replace(/\s+/g, '');
      const availableSubjects = schoolSubjects[normalizedClassKey] || [];
      const canonicalSubject = availableSubjects.find(s => normalizeSubjectKey(s) === normalizeSubjectKey(subject)) || subject;

      termSubjects.push({
        subjectName: canonicalSubject,
        test: scoreField === 'ca1' ? midtermStoredScore.toString() : "",
        grade: "",
        total: scoreField === 'exam' ? examStoredScore : midtermStoredScore,
        remark: "",
        project: "",
        examination: scoreField === 'exam' ? examStoredScore.toString() : "",
      });
    }

    const formatClassName = (cls) => cls ? cls.toUpperCase() : "";
    const formattedClass = formatClassName(newClass);

    return {
      studentId,
      updatedData: {
        studentId,
        studentName: name,
        studentClass: formattedClass,
        [termKey]: termSubjects,
      },
      newData: {
        studentId,
        studentName: name,
        studentClass: formattedClass,
        [termKey]: schoolSubjects[newClass.toLowerCase().replace(/\s+/g, '')].map((subj) => ({
          subjectName: subj,
          test: normalizeSubjectKey(subj) === normalizeSubjectKey(subject) && scoreField === 'ca1' ? midtermStoredScore.toString() : "",
          grade: "", 
          total: normalizeSubjectKey(subj) === normalizeSubjectKey(subject) && scoreField === 'ca1'
            ? midtermStoredScore
            : (normalizeSubjectKey(subj) === normalizeSubjectKey(subject) && scoreField === 'exam' ? examStoredScore : 0),
          remark: "", 
          project: "", 
          examination: normalizeSubjectKey(subj) === normalizeSubjectKey(subject) && scoreField === 'exam' ? examStoredScore.toString() : "",
        })),
      },
      existingResult: !!existingResultData
    };
  };

  const saveResultToDatabase = async (resultData) => {
    try {
      if (resultData.existingResult) {
        const { error } = await supabase
          .from("jmis_result")
          .update(resultData.updatedData)
          .eq("studentId", resultData.studentId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("jmis_result")
          .insert([resultData.newData]);
        if (error) throw error;
      }
      return true;
    } catch (error) {
      console.error('Error saving result:', error);
      return false;
    }
  };

  const sendResultEmail = async () => {
    console.log('📧 [SendResultEmail] Starting email process...');
    
    const isMidterm = purpose && (purpose.toLowerCase() === 'midterm' || purpose.toLowerCase() === 'test');
    const examType = isMidterm ? 'Mid-term Test' : 'Exam';
    const action = pendingResult ? 'Updated' : 'Submitted';
    
    console.log(`📝 [SendResultEmail] Exam Type: ${examType}, Action: ${action}`);
    
    // Format detailed scores like in Result.jsx
    const detailedScores = questions.map((q, idx) => {
      const userAnswer = answers[idx];
      const isCorrect = userAnswer !== undefined && q.answerOptions[userAnswer]?.isCorrect;
      return `Q${idx + 1}: ${isCorrect ? '✓ Correct' : (userAnswer === undefined ? '⏭ Unattempted' : '✗ Wrong')}`;
    }).join('\n');

    const emailSubject = `CBT ${examType} Result ${action} - ${name}`;
    const emailMessage = `Student has ${action.toLowerCase()} a CBT ${examType.toLowerCase()}:

Student Name: ${name}
Class: ${newClass}
Term: ${currentTerm || 'N/A'}
Subject: ${subject}
Exam Type: ${examType}

Performance Summary:
Total Questions: ${questions.length}
Correct Answers: ${score}
Incorrect Answers: ${getQuestionCategories().incorrect.length}
Unattempted: ${getQuestionCategories().unattempted.length}
Score: ${displayedScore}/${displayedTotal}
Percentage: ${percentageScore.toFixed(2)}%
Grade: ${calculateMidtermGrade(score)}

Detailed Breakdown:
${detailedScores}

---
Automated notification from JMIC CBT System`;

    // Fetch admin email from database and send to all recipients
    let recipients = ['rhemaexpertsolutions@gmail.com', 'onyevid@gmail.com'];
    
    try {
      const { data: settingsData } = await supabase
        .from('jmis_settings')
        .select('adminEmail')
        .single();
      
      if (settingsData?.adminEmail) {
        recipients.push(settingsData.adminEmail);
        console.log('✅ [SendResultEmail] Admin email added:', settingsData.adminEmail);
      }
    } catch (error) {
      console.warn('⚠️ [SendResultEmail] Could not fetch admin email:', error.message);
    }
    
    console.log('📨 [SendResultEmail] Recipients:', recipients.join(', '));
    console.log('📄 [SendResultEmail] Subject:', emailSubject);
    
    try {
      console.log('📤 [SendResultEmail] Calling sendEmailNotification...');
      const result = await sendEmailNotification(supabase, emailSubject, emailMessage, recipients);
      if (result && result.success) {
        console.log('✅ [SendResultEmail] Email sent successfully to:', recipients.join(', '));
        toast.info('Email notification sent!');
      } else {
        console.warn('⚠️ [SendResultEmail] Email sending failed:', result);
        const errorMsg = result?.details || result?.error || 'Unknown error';
        toast.warn('Email notification failed: ' + errorMsg);
      }
    } catch (error) {
      console.error('❌ [SendResultEmail] Email error:', error);
      toast.error('Failed to send email notification: ' + (error.message || 'Unknown error'));
    }
  };

  const uploadResults = async () => {
    console.log('📝 [UploadResults] Starting upload process...');
    
    // Don't save practice scores
    if (purpose === 'practice') {
      console.log('ℹ️ [UploadResults] Practice test - skipping save');
      toast.success("Practice test completed! Results not saved.");
      return;
    }

    // Check network before attempting save
    if (networkStatus.quality === 'offline') {
      console.error('❌ [UploadResults] Network is offline');
      toast.error('⚠️ No internet connection. Your answers are saved locally and will be uploaded when connection is restored.');
      setPendingResult(await prepareResultData());
      return;
    }

    setIsSaving(true);
    let resultData = await prepareResultData();
    
    if (!resultData) {
      console.error('❌ [UploadResults] Failed to prepare result data');
      toast.error("Error: Unable to fetch student ID.");
      setIsSaving(false);
      return;
    }

    console.log('📊 [UploadResults] Result data prepared:', resultData);
    
    // Retry logic - attempt up to 5 times
    let attempts = 0;
    const maxAttempts = 5;
    let success = false;
    
    while (attempts < maxAttempts && !success) {
      attempts++;
      console.log(`💾 [UploadResults] Attempt ${attempts}/${maxAttempts}...`);
      
      if (attempts > 1) {
        toast.info(`Retrying save... (${attempts}/${maxAttempts})`);
        // Wait 2 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Re-check network
        if (networkStatus.quality === 'offline') {
          console.error('❌ [UploadResults] Still offline');
          toast.error('⚠️ Still offline. Please check your internet connection.');
          setPendingResult(resultData);
          setIsSaving(false);
          return;
        }
      }
      
      success = await saveResultToDatabase(resultData);
      
      if (success) {
        console.log('✅ [UploadResults] Save successful on attempt', attempts);
        break;
      } else {
        console.error(`❌ [UploadResults] Attempt ${attempts} failed`);
      }
    }
    
    if (success) {
      console.log('📧 [UploadResults] Sending email notification...');
      await sendResultEmail();
      console.log('✅ [UploadResults] Upload complete');
      toast.success("✅ Results saved successfully!");
      setPendingResult(null);
      setSaveAttempts(0);
      
      // Clear localStorage after successful save
      try {
        localStorage.removeItem(examId);
        console.log('🗑️ [AutoSave] Cleared localStorage');
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    } else {
      console.error('❌ [UploadResults] All attempts failed, setting pending result');
      setPendingResult(resultData);
      setSaveAttempts(attempts);
      toast.error(`⚠️ Failed to save after ${maxAttempts} attempts. Your answers are saved locally. Click "Retry Save" when connection is restored.`);
    }
    
    setIsSaving(false);
  };

  const handleRetrySave = async () => {
    if (!pendingResult) return;
    
    if (networkStatus.quality === 'offline') {
      toast.error('Still offline. Please check your connection.');
      return;
    }

    setIsSaving(true);
    const success = await saveResultToDatabase(pendingResult);
    
    if (success) {
      await sendResultEmail();
      setPendingResult(null);
      setSaveAttempts(0);
      toast.success("Results saved successfully!");
    } else {
      setSaveAttempts(prev => prev + 1);
      toast.error(`Save failed again (${saveAttempts + 1}/3). Please check your connection.`);
      
      if (saveAttempts >= 2) {
        toast.error('Maximum retry attempts reached. Please contact support.');
      }
    }
    
    setIsSaving(false);
  };

  const handleDownloadResult = () => {
    const resultText = `
CBT EXAM RESULT
===============

Student Details:
- Name: ${name}
- Class: ${newClass}
- Term: ${currentTerm}
- Subject: ${subject}

Score:
- Obtained: ${score}/${questions.length}
- Percentage: ${((score / questions.length) * 100).toFixed(2)}%
- Purpose: ${purpose}

Generated: ${new Date().toLocaleString()}
    `.trim();

    const blob = new Blob([resultText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}_${subject}_result.txt`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Result downloaded!');
  };

  return (
    <div className="container m-5 p-5">
      <ToastContainer />
      
      {/* Network Status Indicator */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        padding: '8px 16px',
        borderRadius: '20px',
        fontWeight: 'bold',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        backgroundColor: networkStatus.quality === 'good' ? '#4CAF50' : networkStatus.quality === 'poor' ? '#FFC107' : '#F44336',
        color: 'white'
      }}>
        {networkStatus.quality === 'good' ? '✓ Good Network' : networkStatus.quality === 'poor' ? '⚠ Poor Network' : '✗ Offline'}
      </div>
      
      {/* Auto-Save Status Indicator */}
      {lastSaved && (
        <div style={{
          position: 'fixed',
          top: '70px',
          right: '20px',
          zIndex: 9999,
          padding: '6px 12px',
          borderRadius: '15px',
          fontSize: '0.85rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          backgroundColor: isSavingToStorage ? '#FFC107' : '#2196F3',
          color: 'white'
        }}>
          {isSavingToStorage ? '💾 Saving...' : `💾 Saved ${lastSaved.toLocaleTimeString()}`}
        </div>
      )}

      <nav className="navbar navbar-light bg-light cbtNavbar">
        <div className="navbar-brand" style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
          <img src={logo} width="60" height="60" className="d-inline-block align-top" alt="" />
          <p style={{marginBottom: '0px', fontWeight: '600', wordWrap: 'break-word', textWrap: 'balance'}} className='headingText'>Jeshurun Montessori International School</p>
        </div>
        <span className={`navbar-text ${timeLeft <= 600 ? 'text-danger' : 'text-primary'}`} style={{fontSize: '1rem', fontWeight: '700'}}>
          {timeLeft === 0 ? 'TIME UP!' : `Time Left: ${formatTime(timeLeft)}`}
        </span>
      </nav>
      <div className="quiz-info">
        <div className="info-item"><strong>Subject:</strong> {subject}</div>
        <div className="info-item"><strong>Class:</strong> {newClass}</div>
        <div className="info-item"><strong>Term:</strong> {currentTerm}</div>
        <div className="info-item"><strong>Gender:</strong> {newSex}</div>
        <div className="info-item"><strong>Student Name:</strong> <span className='text-primary'>{name}</span></div>
      </div>

      {isLocked ? (
        <div className="lock-screen">
          <div className="lock-screen-content">
            <h2>Exam Locked</h2>
            <p>Please enter the admin password to continue the exam.</p>
            <div style={{display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center'}}>
            <input
              type={showPassword ? "text" : "password"}
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter admin password"
              className="form-control"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="btn btn-secondary mt-2"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
              </div>
            <button onClick={handleUnlock} className="btn btn-primary mt-3">Unlock</button>
          </div>
        </div>
      ) : (
        <>
          <div className="preview-section" style={{marginBottom: '30px'}}>
            {questions.map((_, index) => (
              <div key={index} className={`preview-item ${answers[index] !== undefined ? 'answered' : ''}`}>
                {answers[index] !== undefined ? <FaCheck /> : index + 1}
              </div>
            ))}
          </div>

          <div className="quiz">
            {showScore ? (
              <div className="score-modal">
                <div className="score-content">
                  <FaTrophy className="score-icon" />
                  <h2>Congratulations!</h2>
                  <p>Your {purpose === 'midterm' ? 'mid-term test' : purpose === 'exam' ? 'exam' : 'practice test'} has been submitted successfully.</p>
                  <p>{getCongratulationMessage(percentageScore)}</p>
                  <p><strong>Subject:</strong> {subject}</p>
                  <p><strong>Score:</strong> {displayedScore} out of {displayedTotal} ({percentageScore.toFixed(2)}%)</p>
                  
                  {/* Show retry save button if save failed */}
                  {pendingResult && (
                    <div style={{ 
                      marginTop: '20px', 
                      padding: '15px', 
                      backgroundColor: 'var(--warning-bg, #fff3cd)',
                      borderLeft: '4px solid #ffc107',
                      borderRadius: '4px'
                    }}>
                      <p style={{ color: '#856404', marginBottom: '10px' }}>
                        ⚠️ Results not saved to database due to network issues.
                        {saveAttempts > 0 && ` (Attempted ${saveAttempts} time(s))`}
                      </p>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button 
                          onClick={handleRetrySave} 
                          disabled={isSaving || networkStatus.quality === 'offline'}
                          className="btn btn-warning"
                        >
                          {isSaving ? 'Saving...' : 'Retry Save'}
                        </button>
                        <button onClick={handleDownloadResult} className="btn btn-success">
                          Download Result
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Action Buttons - Single Row */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '20px' }}>
                    <button 
                      onClick={handleSubmitExam} 
                      className="btn btn-primary"
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : isSubmitted ? "✓ Exam Submitted" : "Submit Exam"}
                    </button>
                    {!pendingResult && (
                      <>
                        <button onClick={handleDownloadResult} className="btn btn-success">
                          📥 Download Result
                        </button>
                        <button onClick={() => {
                          router.push('/quiz');
                        }} className="btn btn-secondary">
                          Finish
                        </button>
                        <button 
                          onClick={() => setShowDetailedResults(true)} 
                          className="btn btn-info"
                        >
                          📊 View Detailed Results
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              questions.length > 0 ? (
                <>
                  <div className="question-section">
                    <div className="question-count text-primary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div><span>Question {currentQuestion + 1}</span>/{questions.length}</div>
                      <button onClick={handleSubmitExam} className="btn btn-danger">
                        Submit Exam
                      </button>
                    </div>
                    <div className="question-text">{currentQuestion + 1}. {questions[currentQuestion].questionText}</div>
                  </div>
                  <div className="answer-section">
                    {questions[currentQuestion].answerOptions.map((answerOption, index) => (
                      <button
                        key={index}
                        onClick={() => { handleAnswerOptionClick(index); handleNextQuestion(); }}
                        className={answers[currentQuestion] === index ? 'selected' : ''}
                      >
                        {String.fromCharCode(65 + index)}. {answerOption.answerText}
                      </button>
                    ))}
                  </div>
                  <div className="navigation-buttons">
                    <button onClick={handlePreviousQuestion} disabled={currentQuestion === 0} className="btn btn-secondary">
                      Previous
                    </button>
                    <button onClick={handleNextQuestion} disabled={currentQuestion === questions.length - 1} className="btn btn-primary">
                      Next
                    </button>
                  </div>
                </>
              ) : (
                <div className="no-questions">
                  No questions available for Subject: {subject}, Class: {newClass}, Purpose: {purpose || 'Any'}.
                </div>
              )
            )}
          </div>
        </>
      )}
      
      {/* Detailed Results Modal */}
      {showDetailedResults && (
        <div className="detailed-results-modal" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 9999,
          overflow: 'auto',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            maxWidth: '1000px',
            margin: '0 auto',
            padding: '30px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Header with Student Info */}
            <div style={{ 
              borderBottom: '3px solid #007bff', 
              paddingBottom: '20px', 
              marginBottom: '20px' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h2 style={{ margin: 0 }}>📊 Detailed Exam Results</h2>
                <button 
                  onClick={() => setShowDetailedResults(false)}
                  className="btn btn-secondary"
                  style={{ fontSize: '1.2rem' }}
                >
                  ✕ Close
                </button>
              </div>
              
              {/* Student Information */}
              <div style={{
                backgroundColor: 'var(--container-bg, #f8f9fa)',
                padding: '15px',
                borderRadius: '8px',
                marginTop: '10px'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  <div>
                    <strong>Student Name:</strong>
                    <p style={{ margin: '5px 0 0 0', color: '#495057' }}>{name}</p>
                  </div>
                  <div>
                    <strong>Class:</strong>
                    <p style={{ margin: '5px 0 0 0', color: '#495057' }}>{newClass}</p>
                  </div>
                  <div>
                    <strong>Subject:</strong>
                    <p style={{ margin: '5px 0 0 0', color: '#495057' }}>{subject}</p>
                  </div>
                  <div>
                    <strong>Exam Type:</strong>
                    <p style={{ margin: '5px 0 0 0', color: '#495057', textTransform: 'capitalize' }}>
                      {purpose === 'midterm' || purpose === 'test' ? 'Mid-term Exam' : purpose === 'exam' ? 'Final Exam' : purpose || 'Practice Test'}
                    </p>
                  </div>
                  <div>
                    <strong>Term:</strong>
                    <p style={{ margin: '5px 0 0 0', color: '#495057' }}>{currentTerm || 'N/A'}</p>
                  </div>
                  <div>
                    <strong>Date:</strong>
                    <p style={{ margin: '5px 0 0 0', color: '#495057' }}>{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Exam Summary Stats */}
            <div style={{
              backgroundColor: 'var(--container-bg, #f8f9fa)',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '30px'
            }}>
              <h3 style={{ marginTop: 0 }}>Exam Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginTop: '15px' }}>
                <div style={{ padding: '15px', backgroundColor: '#d4edda', borderRadius: '5px', textAlign: 'center' }}>
                  <h4 style={{ margin: 0, color: '#155724', fontSize: '2rem' }}>{getQuestionCategories().correct.length}</h4>
                  <p style={{ margin: '5px 0 0 0', color: '#155724', fontSize: '0.9rem' }}>Correct</p>
                </div>
                <div style={{ padding: '15px', backgroundColor: '#f8d7da', borderRadius: '5px', textAlign: 'center' }}>
                  <h4 style={{ margin: 0, color: '#721c24', fontSize: '2rem' }}>{getQuestionCategories().incorrect.length}</h4>
                  <p style={{ margin: '5px 0 0 0', color: '#721c24', fontSize: '0.9rem' }}>Incorrect</p>
                </div>
                <div style={{ padding: '15px', backgroundColor: 'var(--warning-bg, #fff3cd)', borderRadius: '5px', textAlign: 'center' }}>
                  <h4 style={{ margin: 0, color: '#856404', fontSize: '2rem' }}>{getQuestionCategories().unattempted.length}</h4>
                  <p style={{ margin: '5px 0 0 0', color: '#856404', fontSize: '0.9rem' }}>Unattempted</p>
                </div>
                <div style={{ padding: '15px', backgroundColor: '#d1ecf1', borderRadius: '5px', textAlign: 'center' }}>
                  <h4 style={{ margin: 0, color: '#0c5460', fontSize: '2rem' }}>{questions.length}</h4>
                  <p style={{ margin: '5px 0 0 0', color: '#0c5460', fontSize: '0.9rem' }}>Total</p>
                </div>
              </div>
            </div>

            {/* Download Button */}
            <div style={{ marginBottom: '20px', textAlign: 'right' }}>
              <button onClick={handleDownloadResultsReview} className="btn btn-success">
                📥 Download Detailed Review
              </button>
            </div>

            {/* Tabs for categories */}
            <div style={{ marginBottom: '20px' }}>
              <ul className="nav nav-tabs" role="tablist">
                <li className="nav-item">
                  <a 
                    className={`nav-link ${!selectedQuestionIndex ? 'active' : ''}`}
                    onClick={() => setSelectedQuestionIndex(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    📋 All Questions
                  </a>
                </li>
                <li className="nav-item">
                  <a 
                    className="nav-link text-success"
                    onClick={() => setSelectedQuestionIndex('correct')}
                    style={{ cursor: 'pointer' }}
                  >
                    ✅ Correct ({getQuestionCategories().correct.length})
                  </a>
                </li>
                <li className="nav-item">
                  <a 
                    className="nav-link text-danger"
                    onClick={() => setSelectedQuestionIndex('incorrect')}
                    style={{ cursor: 'pointer' }}
                  >
                    ❌ Incorrect ({getQuestionCategories().incorrect.length})
                  </a>
                </li>
                <li className="nav-item">
                  <a 
                    className="nav-link text-warning"
                    onClick={() => setSelectedQuestionIndex('unattempted')}
                    style={{ cursor: 'pointer' }}
                  >
                    ⏭️ Unattempted ({getQuestionCategories().unattempted.length})
                  </a>
                </li>
              </ul>
            </div>

            {/* Questions Review */}
            <div className="print-content">
              {(!selectedQuestionIndex || selectedQuestionIndex === 'correct') && (
                <div style={{ display: !selectedQuestionIndex || selectedQuestionIndex === 'correct' ? 'block' : 'none' }}>
                  <h3>✅ Correct Answers</h3>
                  {getQuestionCategories().correct.map((item) => (
                    <div key={item.questionNumber} className="question-review-card" style={{
                      border: '2px solid #28a745',
                      borderRadius: '8px',
                      padding: '15px',
                      marginBottom: '15px',
                      backgroundColor: '#d4edda'
                    }}>
                      <h4>Question {item.questionNumber}</h4>
                      <p><strong>{item.questionText}</strong></p>
                      <div style={{ marginTop: '10px' }}>
                        {item.options.map((option, idx) => {
                          const isUserSelected = answers[item.questionNumber - 1] === idx;
                          const isCorrect = option.isCorrect;
                          
                          return (
                            <div 
                              key={idx}
                              style={{
                                padding: '8px',
                                margin: '5px 0',
                                borderRadius: '4px',
                                backgroundColor: isCorrect ? '#28a745' : 'white',
                                color: isCorrect ? 'white' : 'black',
                                border: isUserSelected ? '2px solid #007bff' : '1px solid #ddd'
                              }}
                            >
                              {String.fromCharCode(65 + idx)}. {option.answerText}
                              {isUserSelected && ' (Your Answer)'}
                              {isCorrect && ' ✓'}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(!selectedQuestionIndex || selectedQuestionIndex === 'incorrect') && (
                <div style={{ display: !selectedQuestionIndex || selectedQuestionIndex === 'incorrect' ? 'block' : 'none' }}>
                  <h3>❌ Incorrect Answers</h3>
                  {getQuestionCategories().incorrect.map((item) => (
                    <div key={item.questionNumber} className="question-review-card" style={{
                      border: '2px solid #dc3545',
                      borderRadius: '8px',
                      padding: '15px',
                      marginBottom: '15px',
                      backgroundColor: '#f8d7da'
                    }}>
                      <h4>Question {item.questionNumber}</h4>
                      <p><strong>{item.questionText}</strong></p>
                      <div style={{ marginTop: '10px' }}>
                        {item.options.map((option, idx) => {
                          const isUserSelected = answers[item.questionNumber - 1] === idx;
                          const isCorrect = option.isCorrect;
                          
                          return (
                            <div 
                              key={idx}
                              style={{
                                padding: '8px',
                                margin: '5px 0',
                                borderRadius: '4px',
                                backgroundColor: isCorrect ? '#28a745' : (isUserSelected ? '#ffc107' : 'white'),
                                color: isCorrect ? 'white' : 'black',
                                border: isUserSelected ? '2px solid #007bff' : '1px solid #ddd'
                              }}
                            >
                              {String.fromCharCode(65 + idx)}. {option.answerText}
                              {isUserSelected && ' (Your Answer)'}
                              {isCorrect && ' ✓ Correct Answer'}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(!selectedQuestionIndex || selectedQuestionIndex === 'unattempted') && (
                <div style={{ display: !selectedQuestionIndex || selectedQuestionIndex === 'unattempted' ? 'block' : 'none' }}>
                  <h3>⏭️ Unattempted Questions</h3>
                  {getQuestionCategories().unattempted.map((item) => (
                    <div key={item.questionNumber} className="question-review-card" style={{
                      border: '2px solid #ffc107',
                      borderRadius: '8px',
                      padding: '15px',
                      marginBottom: '15px',
                      backgroundColor: 'var(--warning-bg, #fff3cd)'
                    }}>
                      <h4>Question {item.questionNumber}</h4>
                      <p><strong>{item.questionText}</strong></p>
                      <div style={{ marginTop: '10px' }}>
                        {item.options.map((option, idx) => {
                          const isCorrect = option.isCorrect;
                          
                          return (
                            <div 
                              key={idx}
                              style={{
                                padding: '8px',
                                margin: '5px 0',
                                borderRadius: '4px',
                                backgroundColor: isCorrect ? '#28a745' : 'white',
                                color: isCorrect ? 'white' : 'black',
                                border: '1px solid #ddd'
                              }}
                            >
                              {String.fromCharCode(65 + idx)}. {option.answerText}
                              {isCorrect && ' ✓ Correct Answer'}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>


          </div>
        </div>
      )}
    </div>
  );
};

export default QuizComponent;
