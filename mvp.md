# Adaptive AI Study Journey

## Hackathon MVP Specification

### 1. Product Overview

We are building an **AI-powered adaptive learning platform that transforms a student's existing course materials into a personalized, Duolingo-style learning journey.**

Students upload their **syllabus and course materials**, such as chapter notes, textbook sections, lecture notes, or slides. The system analyzes these materials and generates a structured sequence of learning modules based on the concepts covered in the course.

Unlike a traditional study tool that generates the same flashcards or quizzes for every student, our system continuously adapts based on how the student performs.

The agent learns:

* What concepts the student understands
* What concepts the student struggles with
* What types of explanations appear most useful
* What difficulty level is appropriate
* What concepts should be reviewed later

Over time, each student develops a different learning journey based on their own performance.

---

# 2. Problem

Students are often given the same learning materials regardless of how they learn.

A textbook chapter may contain dozens of pages of dense information, while lecture notes may assume prerequisite knowledge the student does not fully understand.

Existing AI study tools can summarize notes or generate quizzes, but the interaction is often:

**Upload → Generate → Answer → Done**

The system does not meaningfully change how it teaches the student based on their performance.

We want to create a system where the learning experience becomes:

**Upload → Learn → Answer → Analyze → Adapt → Remember → Review**

---

# 3. Core Product Idea

The product consists of two connected systems:

## Course Journey

Represents **what the student needs to learn**.

Generated primarily from:

* Syllabus
* Course schedule
* Chapter notes
* Textbook sections
* Lecture material

Example:

```text
CS 311 — Algorithms

Foundations
    │
    ├── Arrays ✓
    │
    ├── Recursion ✓
    │
    └── Complexity ✓
            │
            ▼
Graph Algorithms
    │
    ├── BFS ✓
    │
    ├── DFS ◐
    │
    ├── Cycle Detection
    │
    └── Topological Sort
            │
            ▼
Shortest Paths
    │
    ├── Dijkstra
    │
    └── Bellman-Ford
            │
            ▼
        🏆 Midterm
```

## Personal Learning Journey

Represents **what this particular student needs to work on**.

Generated from:

* Quiz performance
* Incorrect answers
* Confidence
* Repeated misconceptions
* Previous learning sessions
* Student preferences

The agent combines the **course journey** and **personal journey** to determine what the student should do next.

---

# 4. User Flow

## Step 1 — Onboarding

The student completes a short questionnaire about how they prefer to study.

Example questions:

**When learning something new, what usually helps most?**

* Seeing an example first
* Reading an explanation first
* Seeing a diagram
* Trying a problem myself

**When you get a question wrong, what would you prefer?**

* Give me a small hint
* Explain the concept again
* Show me an example
* Walk me through the solution

**How do you prefer to study?**

* Short 5-minute sessions
* 10–15 minute lessons
* Longer deep-learning sessions

**How detailed should explanations be?**

* Very concise
* Moderate
* Detailed

The system creates an initial learning profile.

Example:

```json
{
  "example_first": true,
  "prefers_visuals": true,
  "explanation_length": "short",
  "preferred_session_length": 10,
  "hint_before_solution": true
}
```

This profile is only the **starting hypothesis**.

The system should later update its teaching strategy based on the student's actual performance.

---

# 5. Upload Course Materials

The student uploads:

### Required for MVP

* Syllabus
* One set of chapter notes / textbook material

### Future

* Lecture slides
* Homework
* Practice exams
* Research papers
* Professor study guides

The agent extracts information from the syllabus such as:

* Course topics
* Units
* Important dates
* Exams
* Topic ordering

The chapter material provides the actual content used to generate lessons and questions.

---

# 6. Generate the Learning Journey

The agent analyzes the uploaded material and identifies major concepts.

For example:

```text
Chapter: Graph Algorithms

Concepts detected:

1. Graph Representation
2. Breadth-First Search
3. Depth-First Search
4. Cycle Detection
5. Topological Sorting
```

The system then determines prerequisite relationships.

Example:

```text
Graph Representation
        │
        ▼
   BFS      DFS
    │        │
    │        ▼
    │   Cycle Detection
    │        │
    └────┬───┘
         ▼
 Topological Sort
```

These concepts become the student's **Duolingo-style learning path**.

---

# 7. Learning Modules

Each concept becomes an interactive module.

A module contains multiple stages.

### Stage 1 — Teach

The agent chooses how to introduce the concept based on the student's profile.

Possible formats:

* Short explanation
* Visual explanation
* Analogy
* Worked example
* Step-by-step breakdown
* Checklist
* Mini scenario

### Stage 2 — Practice

The agent generates a question based only on the provided course material.

Question types could include:

* Multiple choice
* True/false
* Short answer
* Explain the concept
* Apply the concept
* Identify an error

### Stage 3 — Analyze

The agent evaluates more than whether the answer was correct.

It attempts to identify:

* Correct understanding
* Partial understanding
* Misconception
* Missing prerequisite
* Guessing / low confidence

### Stage 4 — Adapt

The agent decides what happens next.

```text
Student answers
       │
       ▼
Analyze response
       │
       ├──── Strong understanding
       │          │
       │          ▼
       │     Harder question
       │
       ├──── Partial understanding
       │          │
       │          ▼
       │       Give hint
       │
       └──── Misconception
                  │
                  ▼
          Explain differently
                  │
                  ▼
          Easier/new question
```

This is the primary agentic loop of the product.

---

# 8. Adaptive Teaching

The system should not simply generate another question when the student struggles.

It should decide **why the student struggled and what teaching strategy to try next.**

Example:

Student is learning DFS.

Question:

> Why can recursion be used to implement DFS?

The student gives an incorrect answer.

The agent determines that the student appears to understand DFS but does not understand the recursive call stack.

Instead of asking another DFS question:

```text
Detected weakness:

DFS                  82%
Recursion            54%
Call Stack           31%
```

The agent temporarily teaches the call stack.

Then it asks another question testing the relationship between recursion and DFS.

---

# 9. Student Knowledge Model

Each student has a persistent knowledge profile.

Example:

```json
{
  "DFS": {
    "mastery": 0.82,
    "attempts": 7,
    "correct": 5,
    "last_reviewed": "2026-09-18"
  },

  "recursion": {
    "mastery": 0.54,
    "attempts": 4,
    "correct": 2,
    "last_reviewed": "2026-09-18"
  },

  "call_stack": {
    "mastery": 0.31,
    "attempts": 3,
    "correct": 1,
    "last_reviewed": "2026-09-18"
  }
}
```

For the hackathon, mastery does not need a complicated ML model.

A simple score updated based on quiz performance is enough to demonstrate the idea.

---

# 10. Learning Preference Model

The system also maintains a second profile describing **how the student appears to learn effectively.**

Example:

```json
{
  "visual_explanations": 0.85,
  "worked_examples": 0.92,
  "long_explanations": 0.43,
  "short_explanations": 0.81,
  "hint_before_answer": 0.76
}
```

The initial questionnaire initializes these values.

Student behavior gradually updates them.

For example:

```text
Initial questionnaire:

Student says:
"I prefer visual explanations."

                ↓

System tries visual explanations.

                ↓

Student performs well afterward.

                ↓

Confidence in visual strategy increases.
```

The important distinction is:

**The student tells us how they think they learn. Their interactions teach the system how they actually respond.**

---

# 11. Spaced Repetition

The system remembers concepts the student struggles with.

Example:

### Day 1

Student struggles with:

```text
Recursive Call Stack
Mastery: 31%
```

The student finishes studying and closes the application.

### Day 2

When the student returns:

```text
🔥 Welcome Back

QUICK REVIEW

Yesterday you struggled with:
Recursive Call Stack

[ Start 3-minute review ]

---------------------

CONTINUE JOURNEY

Graph Algorithms

DFS ✓
Cycle Detection ◐
Topological Sort 🔒
```

The system re-tests weak concepts before continuing.

This demonstrates persistent memory across sessions, which is specifically part of Challenge #8.

---

# 12. Source Grounding

All generated learning material should remain grounded in the student's uploaded materials.

When generating:

* Questions
* Answers
* Explanations
* Summaries

the system retrieves the relevant section of the source material.

Example:

```text
Question

Why does DFS use a stack?

        ↓

Generated from:

Chapter 4 — Graph Traversal
Page 12
"Depth-first search explores..."
```

Students can click:

**View Source**

to see where the information came from.

---

# 13. Human-in-the-Loop Verification

The hackathon specifically requires demonstrating that humans checked the agent's work.

Our application will include a verification mechanism.

Generated content can show:

```text
✓ Grounded in uploaded material

Source:
Chapter 4 — Page 12

[View Source]
```

During the demo, we can intentionally identify an example where the AI generates a questionable explanation or question.

A human verifies the output against the original source and flags the issue.

This demonstrates that the system does not blindly trust AI-generated educational material.

---

# 14. MVP Screens

We should focus on approximately **five core screens**.

## Screen 1 — Onboarding

```text
How do you like to learn?

○ Examples first
○ Explanation first
○ Visuals
○ Practice first

How long should lessons be?

○ 5 minutes
○ 10 minutes
○ 20 minutes

When you're stuck:

○ Give me a hint
○ Show an example
○ Explain differently

[Create My Learning Profile]
```

## Screen 2 — Course Upload

```text
Build Your Course

Syllabus
[ Upload ]

Course Notes
[ Upload ]

[ Generate My Journey ]
```

## Screen 3 — Learning Journey

```text
Algorithms

🔥 3 Day Streak                240 XP

           ✓ Graph Basics
                  │
             ✓ BFS
                  │
             ◐ DFS
                  │
          🔒 Cycle Detection
                  │
        🔒 Topological Sort
                  │
             🏆 MIDTERM

Recommended Review:

⚠ Recursive Call Stack
Mastery: 31%

[Practice]
```

## Screen 4 — Adaptive Lesson

```text
DFS — Lesson 3

Let's visualize how recursion performs DFS.

        A
       / \
      B   C
     / \
    D   E

Question:

After visiting A and then B, which node
would recursive DFS visit next?

○ C
○ D
○ E
○ A

[Submit]
```

If incorrect:

```text
Not quite.

It looks like the confusing part may be
how the recursive call stack works.

Let's look at it differently.

CALL STACK

A
↓
B
↓
D

[Show Me]

Then Try Again →
```

## Screen 5 — Progress

```text
Your Knowledge

Graph Basics          ██████████ 100%
BFS                   █████████░  92%
DFS                   ████████░░  81%
Recursion             █████░░░░░  54%
Call Stack            ███░░░░░░░  31%

AI Insight

"You understand DFS traversal well, but
questions involving recursion have been
more difficult. Your next lesson will
focus on the recursive call stack."
```

---

# 15. Agent Architecture

For the MVP, we can separate the system into four logical agents.

### Curriculum Agent

Input:

* Syllabus
* Notes

Responsibilities:

* Extract concepts
* Determine ordering
* Identify prerequisites
* Generate learning journey

### Tutor Agent

Input:

* Current concept
* Source material
* Student profile

Responsibilities:

* Teach concepts
* Generate questions
* Generate examples
* Change explanation style

### Evaluation Agent

Input:

* Question
* Student answer
* Source material

Responsibilities:

* Determine correctness
* Identify misconceptions
* Estimate concept mastery
* Recommend what should happen next

### Learning Manager Agent

Input:

* Knowledge profile
* Learning preferences
* Course progression

Responsibilities:

* Decide next lesson
* Schedule reviews
* Select question difficulty
* Determine whether to advance or review

Overall workflow:

```text
        Syllabus + Notes
               │
               ▼
        Curriculum Agent
               │
               ▼
        Learning Journey
               │
               ▼
          Tutor Agent
               │
               ▼
           Question
               │
               ▼
        Student Answer
               │
               ▼
       Evaluation Agent
               │
               ▼
        Update Mastery
               │
               ▼
     Learning Manager Agent
               │
        ┌──────┴──────┐
        ▼             ▼
     Advance        Review
        │             │
        └──────┬──────┘
               ▼
          Tutor Agent
```

---

# 16. Database

For the hackathon MVP, we only need a few core tables.

### Users

```text
id
name
learning_preferences
```

### Courses

```text
id
user_id
course_name
syllabus
```

### Concepts

```text
id
course_id
name
description
prerequisites
order
```

### StudentConceptMastery

```text
user_id
concept_id
mastery_score
attempts
correct_attempts
last_reviewed
```

### Attempts

```text
id
user_id
concept_id
question
student_answer
correct
identified_misconception
timestamp
```

This gives us persistent learning memory without requiring complicated infrastructure.

---

# 17. What NOT to Build During the Hackathon

To keep the project achievable, we should avoid spending time on:

* Complex authentication
* Social features
* Leaderboards
* Full gamification system
* Multiple courses
* Perfect spaced-repetition algorithms
* Training our own ML model
* Complicated analytics
* Mobile application
* Professor dashboard
* Full textbook ingestion pipeline

These can all be future features.

The MVP should prove one thing:

> **The AI can create a course journey and meaningfully adapt that journey based on how the student learns.**

---

# 18. Four-Hour MVP Scope

### Priority 1 — Must Work

**Upload syllabus + notes**

↓

**Extract concepts**

↓

**Generate learning journey**

↓

**Open concept module**

↓

**AI teaches concept**

↓

**AI generates question**

↓

**Student answers**

↓

**AI analyzes response**

↓

**Mastery score updates**

↓

**AI chooses next action**

↓

**Progress persists**

### Priority 2 — Strong Demo Features

If time allows:

* Initial learning questionnaire
* Different explanation formats
* Source citations
* Concept dependency graph
* Weak-topic review
* Persistent session memory

### Priority 3 — Stretch Features

Only after the core loop works:

* XP
* Streaks
* Animations
* Achievements
* Exam countdown
* More sophisticated spaced repetition
* Automatically generated study schedule

---

# 19. Demo Scenario

For the presentation, use a deliberately controlled example.

### Step 1

Upload an Algorithms syllabus and graph-algorithm notes.

### Step 2

The application generates:

```text
Graph Basics
     ↓
BFS
     ↓
DFS
     ↓
Cycle Detection
     ↓
Topological Sorting
```

### Step 3

Complete the onboarding questionnaire.

Select:

```text
Examples first
Short explanations
Hints before solutions
```

### Step 4

Start DFS.

The AI provides a short worked example because of the student's learning profile.

### Step 5

Answer the first question correctly.

```text
DFS Mastery

60% → 72%
```

The agent increases difficulty.

### Step 6

Deliberately answer a recursion-related question incorrectly.

The evaluator identifies:

```text
Possible misconception:
Recursive call stack
```

Instead of simply providing the correct answer, the tutor switches strategies and provides a visual explanation.

### Step 7

Answer the follow-up correctly.

```text
Call Stack

31% → 48%
```

### Step 8

Exit and return to the application.

The dashboard remembers:

```text
Recommended Review

Recursive Call Stack
48% mastery

[Review]
```

This demonstrates that the agent remembers the student's weaknesses across sessions.

---

# 20. Hackathon Pitch

### One-Sentence Pitch

**We turn your syllabus and course materials into a personalized Duolingo-style learning journey that learns how to teach you as you learn.**

### Problem

Every student receives roughly the same textbook, lectures, and assignments despite learning differently and struggling with different concepts.

### Solution

Our AI agent creates an individualized learning path from the student's actual course materials.

As students answer questions, the system builds a model of both:

**what they know**

and

**how they learn.**

The agent then decides whether to advance, review a prerequisite, change its explanation style, or schedule the concept for later review.

### Key Differentiator

Traditional AI study tools generate content.

**Our agent makes decisions about the learning process.**

It doesn't just ask:

> "What question should I generate?"

It asks:

> "What should this student learn next, and what is the best way to teach it to them?"

---

# 21. Success Criteria

By the end of the hackathon, we should be able to demonstrate:

**1. Course Understanding**
The agent converts a syllabus and notes into a structured learning journey.

**2. Personalization**
Two students can receive different explanations or questions for the same concept.

**3. Adaptation**
The agent changes its strategy after seeing student performance.

**4. Memory**
The system remembers weaknesses across sessions.

**5. Grounding**
Questions and explanations are tied back to uploaded course material.

**6. Human Verification**
A human can inspect the source and identify when the agent produced an incorrect or unsupported result.

---

# 22. North Star

The final experience should feel like:

**Duolingo generated specifically for your class.**

But instead of following a curriculum created for millions of people, the curriculum comes from **your syllabus**, the lessons come from **your course materials**, and the journey evolves based on **your understanding.**

**Your course determines what you need to learn.**

**Your performance determines what you need to practice.**

**Your interactions teach the AI how to teach you.**
