# Data Flow Patterns

<cite>
**Referenced Files in This Document**   
- [useSettings.js](file://lib/useSettings.js)
- [supabaseClient.js](file://lib/supabaseClient.js)
- [page.jsx](file://app/contact/page.jsx)
- [enquiry.js](file://lib/enquiry.js)
- [route.js](file://app/api/notify/route.js)
- [QuizHome.jsx](file://src/pages_components/QuizHome.jsx)
- [page.jsx](file://app/exam/page.jsx)
- [ExamClient.jsx](file://app/exam/ExamClient.jsx)
- [QuizComponent.jsx](file://src/pages_components/QuizComponent.jsx)
- [CompletionExam.jsx](file://src/pages_components/CompletionExam.jsx)
- [EssayExam.jsx](file://src/pages_components/EssayExam.jsx)
- [emailNotificationService.js](file://src/api/emailNotificationService.js)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document explains how data flows through the JMI School Website, focusing on two main areas:

- Marketing and contact content: how settings from Supabase are loaded by a shared hook and consumed by marketing pages such as the contact page.
- Exam data flow: how exam subjects are listed from the database, how students start an exam, and how results are processed for objective, completion, and essay sessions.

It also clarifies server-side API behavior versus client-side data loading, and documents error handling, loading states, and caching strategies used across these flows.

## Project Structure
The website uses Next.js App Router with client components for interactive features and server routes for secure operations like email delivery.

```mermaid
graph TB
subgraph "Marketing Pages"
Contact["Contact Page<br/>app/contact/page.jsx"]
SettingsHook["useSettings Hook<br/>lib/useSettings.js"]
SupabaseClient["Supabase Client<br/>lib/supabaseClient.js"]
end
subgraph "CBT Portal"
QuizHome["QuizHome<br/>src/pages_components/QuizHome.jsx"]
ExamPage["Exam Page Wrapper<br/>app/exam/page.jsx"]
ExamClient["Exam Client Router<br/>app/exam/ExamClient.jsx"]
Objective["Objective Quiz<br/>src/pages_components/QuizComponent.jsx"]
Completion["Completion Exam<br/>src/pages_components/CompletionExam.jsx"]
Essay["Essay Exam<br/>src/pages_components/EssayExam.jsx"]
end
subgraph "Data Layer"
Supabase["Supabase Database"]
NotifyAPI["Notify API Route<br/>app/api/notify/route.js"]
EmailService["Email Notification Service<br/>src/api/emailNotificationService.js"]
end
Contact --> SettingsHook
SettingsHook --> SupabaseClient
SupabaseClient --> Supabase
QuizHome --> Supabase
QuizHome --> ExamPage
ExamPage --> ExamClient
ExamClient --> Objective
ExamClient --> Completion
ExamClient --> Essay
Objective --> Supabase
Completion --> Supabase
Essay --> Supabase
Contact --> EnquiryLib["Enquiry Library<br/>lib/enquiry.js"]
EnquiryLib --> NotifyAPI
NotifyAPI --> EmailService
```

**Diagram sources**
- [page.jsx:1-162](file://app/contact/page.jsx#L1-L162)
- [useSettings.js:1-25](file://lib/useSettings.js#L1-L25)
- [supabaseClient.js:1-13](file://lib/supabaseClient.js#L1-L13)
- [QuizHome.jsx:1-508](file://src/pages_components/QuizHome.jsx#L1-L508)
- [page.jsx:1-12](file://app/exam/page.jsx#L1-L12)
- [ExamClient.jsx:1-46](file://app/exam/ExamClient.jsx#L1-L46)
- [QuizComponent.jsx:1-800](file://src/pages_components/QuizComponent.jsx#L1-L800)
- [CompletionExam.jsx:1-472](file://src/pages_components/CompletionExam.jsx#L1-L472)
- [EssayExam.jsx:1-418](file://src/pages_components/EssayExam.jsx#L1-L418)
- [route.js:1-115](file://app/api/notify/route.js#L1-L115)
- [emailNotificationService.js:1-127](file://src/api/emailNotificationService.js#L1-L127)

**Section sources**
- [page.jsx:1-162](file://app/contact/page.jsx#L1-L162)
- [useSettings.js:1-25](file://lib/useSettings.js#L1-L25)
- [supabaseClient.js:1-13](file://lib/supabaseClient.js#L1-L13)
- [QuizHome.jsx:1-508](file://src/pages_components/QuizHome.jsx#L1-L508)
- [page.jsx:1-12](file://app/exam/page.jsx#L1-L12)
- [ExamClient.jsx:1-46](file://app/exam/ExamClient.jsx#L1-L46)
- [QuizComponent.jsx:1-800](file://src/pages_components/QuizComponent.jsx#L1-L800)
- [CompletionExam.jsx:1-472](file://src/pages_components/CompletionExam.jsx#L1-L472)
- [EssayExam.jsx:1-418](file://src/pages_components/EssayExam.jsx#L1-L418)
- [route.js:1-115](file://app/api/notify/route.js#L1-L115)
- [emailNotificationService.js:1-127](file://src/api/emailNotificationService.js#L1-L127)

## Core Components
- Shared settings hook: loads a single settings row from Supabase and exposes `settings` and `loading`.
- Contact page: renders dynamic contact details from settings and submits enquiries to the database and notification API.
- CBT portal entry: lists available exams, validates student selection, and navigates to an exam session.
- Exam router: selects the correct exam component based on session type.
- Exam components: load questions, manage timer and answers, persist progress locally, submit results, and send notifications.

**Section sources**
- [useSettings.js:1-25](file://lib/useSettings.js#L1-L25)
- [page.jsx:1-162](file://app/contact/page.jsx#L1-L162)
- [QuizHome.jsx:1-508](file://src/pages_components/QuizHome.jsx#L1-L508)
- [page.jsx:1-12](file://app/exam/page.jsx#L1-L12)
- [ExamClient.jsx:1-46](file://app/exam/ExamClient.jsx#L1-L46)
- [QuizComponent.jsx:1-800](file://src/pages_components/QuizComponent.jsx#L1-L800)
- [CompletionExam.jsx:1-472](file://src/pages_components/CompletionExam.jsx#L1-L472)
- [EssayExam.jsx:1-418](file://src/pages_components/EssayExam.jsx#L1-L418)

## Architecture Overview
The application separates concerns between marketing content and exam functionality:

- Marketing content is driven by a single settings table. The contact page consumes this data via a reusable hook.
- The CBT portal reads exam metadata from multiple tables depending on session type, then routes users into the appropriate exam component.
- Results are persisted to a results table and optionally emailed using a server-only API route.

```mermaid
sequenceDiagram
participant User as "User"
participant Contact as "Contact Page"
participant Hook as "useSettings"
participant DB as "Supabase"
participant Enquiry as "Enquiry Library"
participant Notify as "Notify API"
participant Email as "Email Service"
User->>Contact : Open contact page
Contact->>Hook : Load settings
Hook->>DB : Read jmis_settings
DB-->>Hook : Settings row
Hook-->>Contact : settings + loading
Contact->>Contact : Render contact details
User->>Contact : Submit enquiry form
Contact->>Enquiry : submitEnquiry(data)
Enquiry->>DB : Insert jmis_enquiries
Enquiry->>Notify : POST /api/notify
Notify->>Email : Send email via SMTP
Email-->>Notify : Success or error
Notify-->>Enquiry : Response
Enquiry-->>Contact : Best-effort result
Contact-->>User : Success feedback
```

**Diagram sources**
- [page.jsx:1-162](file://app/contact/page.jsx#L1-L162)
- [useSettings.js:1-25](file://lib/useSettings.js#L1-L25)
- [enquiry.js:1-129](file://lib/enquiry.js#L1-L129)
- [route.js:1-115](file://app/api/notify/route.js#L1-L115)

## Detailed Component Analysis

### Marketing Settings Flow: useSettings to Contact Page
The marketing section reads configuration from a single settings row. The hook performs a one-time read on mount, sets loading state, and returns normalized settings. The contact page uses these values to render contact details and forms.

```mermaid
flowchart TD
Start(["Mount Contact Page"]) --> UseSettings["Call useSettings()"]
UseSettings --> FetchSettings["Read jmis_settings"]
FetchSettings --> HasData{"Settings found?"}
HasData --> |Yes| SetSettings["Set settings object"]
HasData --> |No| EmptySettings["Use empty defaults"]
SetSettings --> LoadingFalse["Set loading false"]
EmptySettings --> LoadingFalse
LoadingFalse --> Render["Render contact details"]
```

**Diagram sources**
- [useSettings.js:1-25](file://lib/useSettings.js#L1-L25)
- [page.jsx:1-162](file://app/contact/page.jsx#L1-L162)

**Section sources**
- [useSettings.js:1-25](file://lib/useSettings.js#L1-L25)
- [page.jsx:1-162](file://app/contact/page.jsx#L1-L162)

### Contact Form Submission Flow
The contact form persists the enquiry to the database first, then sends a best-effort email notification. If the email fails, the user still sees success because the database record is the source of truth.

```mermaid
sequenceDiagram
participant User as "User"
participant Contact as "Contact Page"
participant Enquiry as "submitEnquiry"
participant DB as "Supabase"
participant Notify as "/api/notify"
participant SMTP as "Gmail SMTP"
User->>Contact : Submit form
Contact->>Enquiry : submitEnquiry(payload)
Enquiry->>DB : INSERT jmis_enquiries
DB-->>Enquiry : Insert result
Enquiry->>Notify : POST {subject, message, recipients}
Notify->>SMTP : Send email
SMTP-->>Notify : Delivery status
Notify-->>Enquiry : JSON response
Enquiry-->>Contact : Ignore email errors
Contact-->>User : Show success toast
```

**Diagram sources**
- [page.jsx:1-162](file://app/contact/page.jsx#L1-L162)
- [enquiry.js:1-129](file://lib/enquiry.js#L1-L129)
- [route.js:1-115](file://app/api/notify/route.js#L1-L115)

**Section sources**
- [page.jsx:1-162](file://app/contact/page.jsx#L1-L162)
- [enquiry.js:1-129](file://lib/enquiry.js#L1-L129)
- [route.js:1-115](file://app/api/notify/route.js#L1-L115)

### Exam Listing Flow: QuizHome to Exam Router
QuizHome fetches exam metadata from Supabase, formats it, and allows filtering by subject, class, term, purpose, and archive status. When a student starts an exam, the component builds URL parameters and navigates to the exam page.

```mermaid
sequenceDiagram
participant User as "Student"
participant QuizHome as "QuizHome"
participant DB as "Supabase"
participant Router as "Next Router"
participant ExamPage as "Exam Page"
participant ExamClient as "ExamClient"
User->>QuizHome : Open CBT home
QuizHome->>DB : Fetch subjects (table depends on sessionType)
DB-->>QuizHome : Subject list
QuizHome->>QuizHome : Filter and format subjects
User->>QuizHome : Select subject and start exam
QuizHome->>Router : Navigate to /exam?params
Router->>ExamPage : Server wrapper receives searchParams
ExamPage->>ExamClient : Pass searchParams
ExamClient->>ExamClient : Choose component by sessionType
```

**Diagram sources**
- [QuizHome.jsx:1-508](file://src/pages_components/QuizHome.jsx#L1-L508)
- [page.jsx:1-12](file://app/exam/page.jsx#L1-L12)
- [ExamClient.jsx:1-46](file://app/exam/ExamClient.jsx#L1-L46)

**Section sources**
- [QuizHome.jsx:1-508](file://src/pages_components/QuizHome.jsx#L1-L508)
- [page.jsx:1-12](file://app/exam/page.jsx#L1-L12)
- [ExamClient.jsx:1-46](file://app/exam/ExamClient.jsx#L1-L46)

### Objective Exam Flow: QuizComponent
The objective exam loads questions from the objective questions table, manages a timer, tracks answers, auto-saves progress to localStorage, and uploads results after submission.

```mermaid
flowchart TD
Start(["Objective Exam Mount"]) --> LoadQuestions["Fetch questions from jmis_cbtQuestions"]
LoadQuestions --> QuestionsFound{"Questions found?"}
QuestionsFound --> |No| ShowError["Show error toast"]
QuestionsFound --> |Yes| InitState["Initialize timer, answers, score"]
InitState --> AnswerQ["Answer question"]
AnswerQ --> SaveLocal["Auto-save to localStorage"]
SaveLocal --> NextQ{"More questions?"}
NextQ --> |Yes| AnswerQ
NextQ --> |No| Submit["Submit exam"]
Submit --> Upload["Upload results to jmis_cbt_results"]
Upload --> ShowScore["Show score and review options"]
```

**Diagram sources**
- [QuizComponent.jsx:1-800](file://src/pages_components/QuizComponent.jsx#L1-L800)

**Section sources**
- [QuizComponent.jsx:1-800](file://src/pages_components/QuizComponent.jsx#L1-L800)

### Completion Exam Flow: CompletionExam
The completion exam loads fill-in-the-blank questions, evaluates answers using NLP scoring, persists progress locally, and saves results when not in practice mode.

```mermaid
flowchart TD
Start(["Completion Exam Mount"]) --> LoadQuestions["Fetch questions from jmis_cbt_completion"]
LoadQuestions --> InitTimer["Start timer"]
InitTimer --> TypeAnswer["Type answer per question"]
TypeAnswer --> AutoSave["Auto-save to localStorage"]
AutoSave --> Submit["Submit exam"]
Submit --> Evaluate["Evaluate answers with NLP scorer"]
Evaluate --> PrepareResult["Prepare result data"]
PrepareResult --> SaveResult["Insert jmis_cbt_results"]
SaveResult --> EmailResult["Send result email"]
EmailResult --> ShowResults["Display results"]
```

**Diagram sources**
- [CompletionExam.jsx:1-472](file://src/pages_components/CompletionExam.jsx#L1-L472)

**Section sources**
- [CompletionExam.jsx:1-472](file://src/pages_components/CompletionExam.jsx#L1-L472)

### Essay Exam Flow: EssayExam
The essay exam loads essay prompts, evaluates free-text responses with keyword and word-count logic, and records detailed feedback.

```mermaid
flowchart TD
Start(["Essay Exam Mount"]) --> LoadQuestions["Fetch questions from jmis_cbt_essay"]
LoadQuestions --> WriteAnswer["Write essay answer"]
WriteAnswer --> AutoSave["Auto-save to localStorage"]
AutoSave --> Submit["Submit exam"]
Submit --> ScoreEssay["Score essay with NLP scorer"]
ScoreEssay --> BuildResults["Build detailed results"]
BuildResults --> SaveResult["Insert jmis_cbt_results"]
SaveResult --> EmailResult["Send result email"]
EmailResult --> ShowResults["Display results"]
```

**Diagram sources**
- [EssayExam.jsx:1-418](file://src/pages_components/EssayExam.jsx#L1-L418)

**Section sources**
- [EssayExam.jsx:1-418](file://src/pages_components/EssayExam.jsx#L1-L418)

### Server-Side API vs Client-Side Data Loading
- Client-side data loading:
  - Marketing settings are loaded in the browser via the shared hook.
  - Exam metadata and questions are fetched directly from Supabase in client components.
- Server-side API:
  - The notify route runs only on the server, protecting SMTP credentials and performing email delivery.
  - It reads admin email from settings and deduplicates recipients before sending.

```mermaid
graph LR
Client["Client Components<br/>useSettings, QuizHome, Exam Components"] --> Supabase["Supabase Client"]
Client --> APIRoute["Server API Route<br/>/api/notify"]
APIRoute --> SMTP["SMTP Provider"]
```

**Diagram sources**
- [useSettings.js:1-25](file://lib/useSettings.js#L1-L25)
- [QuizHome.jsx:1-508](file://src/pages_components/QuizHome.jsx#L1-L508)
- [QuizComponent.jsx:1-800](file://src/pages_components/QuizComponent.jsx#L1-L800)
- [CompletionExam.jsx:1-472](file://src/pages_components/CompletionExam.jsx#L1-L472)
- [EssayExam.jsx:1-418](file://src/pages_components/EssayExam.jsx#L1-L418)
- [route.js:1-115](file://app/api/notify/route.js#L1-L115)

**Section sources**
- [route.js:1-115](file://app/api/notify/route.js#L1-L115)

## Dependency Analysis
The following diagram shows key dependencies among components and services.

```mermaid
graph TB
Contact["Contact Page"] --> SettingsHook["useSettings"]
SettingsHook --> SupabaseClient["Supabase Client"]
Contact --> Enquiry["Enquiry Library"]
Enquiry --> NotifyAPI["Notify API"]
NotifyAPI --> EmailService["Email Notification Service"]
QuizHome["QuizHome"] --> Supabase["Supabase"]
QuizHome --> ExamPage["Exam Page"]
ExamPage --> ExamClient["ExamClient"]
ExamClient --> Objective["QuizComponent"]
ExamClient --> Completion["CompletionExam"]
ExamClient --> Essay["EssayExam"]
Objective --> Supabase
Completion --> Supabase
Essay --> Supabase
```

**Diagram sources**
- [page.jsx:1-162](file://app/contact/page.jsx#L1-L162)
- [useSettings.js:1-25](file://lib/useSettings.js#L1-L25)
- [supabaseClient.js:1-13](file://lib/supabaseClient.js#L1-L13)
- [enquiry.js:1-129](file://lib/enquiry.js#L1-L129)
- [route.js:1-115](file://app/api/notify/route.js#L1-L115)
- [emailNotificationService.js:1-127](file://src/api/emailNotificationService.js#L1-L127)
- [QuizHome.jsx:1-508](file://src/pages_components/QuizHome.jsx#L1-L508)
- [page.jsx:1-12](file://app/exam/page.jsx#L1-L12)
- [ExamClient.jsx:1-46](file://app/exam/ExamClient.jsx#L1-L46)
- [QuizComponent.jsx:1-800](file://src/pages_components/QuizComponent.jsx#L1-L800)
- [CompletionExam.jsx:1-472](file://src/pages_components/CompletionExam.jsx#L1-L472)
- [EssayExam.jsx:1-418](file://src/pages_components/EssayExam.jsx#L1-L418)

**Section sources**
- [page.jsx:1-162](file://app/contact/page.jsx#L1-L162)
- [useSettings.js:1-25](file://lib/useSettings.js#L1-L25)
- [enquiry.js:1-129](file://lib/enquiry.js#L1-L129)
- [route.js:1-115](file://app/api/notify/route.js#L1-L115)
- [emailNotificationService.js:1-127](file://src/api/emailNotificationService.js#L1-L127)
- [QuizHome.jsx:1-508](file://src/pages_components/QuizHome.jsx#L1-L508)
- [page.jsx:1-12](file://app/exam/page.jsx#L1-L12)
- [ExamClient.jsx:1-46](file://app/exam/ExamClient.jsx#L1-L46)
- [QuizComponent.jsx:1-800](file://src/pages_components/QuizComponent.jsx#L1-L800)
- [CompletionExam.jsx:1-472](file://src/pages_components/CompletionExam.jsx#L1-L472)
- [EssayExam.jsx:1-418](file://src/pages_components/EssayExam.jsx#L1-L418)

## Performance Considerations
- Settings hook:
  - Single query on mount; no automatic refresh. Suitable for static marketing content.
  - No cache layer beyond React state; consider adding a small in-memory cache if settings are frequently accessed.
- Contact form:
  - Database insert is synchronous from the user’s perspective; email is fire-and-forget to avoid blocking.
- CBT listing:
  - Subjects are fetched once per session type change; filters are applied client-side.
  - Consider pagination or server-side filtering if the subject list grows significantly.
- Exam components:
  - LocalStorage auto-save improves resilience during network interruptions.
  - Timer-based submission ensures time limits are enforced even without network connectivity.
  - Network quality monitoring helps detect poor connectivity but does not retry failed requests automatically.
- Email service:
  - Server-only route protects credentials and centralizes SMTP configuration.
  - Recipient deduplication reduces duplicate emails.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and their likely causes:

- Settings not loading:
  - Check environment variables for Supabase URL and anon key.
  - Verify that the settings row exists in the database.
- Contact form appears sent but no email received:
  - Confirm SMTP credentials are configured in the notify route.
  - Check server logs for email delivery errors.
- No questions found for an exam:
  - Validate subject, class, term, and purpose filters.
  - Ensure the correct table contains the expected questions.
- Results not saved:
  - Confirm student lookup succeeds and the results table insert completes.
  - Check for database constraints or permission issues.
- Email notifications fail:
  - For contact enquiries, failures are ignored; verify the enquiry row exists.
  - For exam results, check the email service configuration and recipient resolution.

**Section sources**
- [useSettings.js:1-25](file://lib/useSettings.js#L1-L25)
- [route.js:1-115](file://app/api/notify/route.js#L1-L115)
- [QuizComponent.jsx:1-800](file://src/pages_components/QuizComponent.jsx#L1-L800)
- [CompletionExam.jsx:1-472](file://src/pages_components/CompletionExam.jsx#L1-L472)
- [EssayExam.jsx:1-418](file://src/pages_components/EssayExam.jsx#L1-L418)

## Conclusion
The JMI School Website separates marketing content and exam functionality while sharing a common data layer. Marketing pages consume settings through a simple hook, and the contact form prioritizes reliable data capture over email delivery. The CBT portal dynamically loads exam metadata, routes users to the correct exam component, and persists results with local auto-save as a safety net. Server-side APIs protect sensitive operations like email delivery, while client-side components handle interactive flows and user feedback.

[No sources needed since this section summarizes without analyzing specific files]