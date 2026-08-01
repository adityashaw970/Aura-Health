# AuraHealth — Longitudinal Health & Nutrition Review Agent
> **Assignment Weight**: Hard Difficulty (2.0 Weight)  
> **Tech Stack**: Vanilla JavaScript (ES6+), Modern CSS3 Design System, Vite, Google Gemini AI API, LocalStorage Stateful Persistence.

---

## 🌟 Executive Summary & Overview
**AuraHealth** is a stateful, evidence-based longitudinal health and nutrition tracking application. It empowers users to maintain personalized profiles, log daily wellness parameters (meals, sleep, activity, weight, mood), receive deterministic historical trend analyses, and collaborate with an AI Review Agent that proposes versioned plan adjustments backed by clinical research — with **zero medical claims** and **mandatory human approval**.

---

## 🚀 Key Features Implemented

### 1. Structured & Text-Based Data Entry
- **Natural Language Meal Estimator**: Uses **Google Gemini AI** (`gemini-3.6-flash` / `gemini-flash-latest`) to parse freeform text descriptions (e.g. *"2 scrambled eggs with avocado toast and coffee"*) into calories, protein, carbs, and fat.
- **User Correction & Override Workflow**: Users can inspect and override any AI-estimated macro values before saving.
- **Multi-Metric Logging**: Track sleep duration (hours), physical activity (minutes), body weight (kg), and mood score (1–10).

### 2. Data Quality & Anomaly Detection
- **Real-Time Data Quality Flags**: Highlights missing meal intake, extreme sleep values (<3h or >16h), and unusually low caloric intake (<800 kcal).
- **Inconsistency Alerts**: Flags discrepancies between logged caloric intake and weight velocity.

### 3. Deterministic Summaries & Trend Analysis
- **100% Math-Based Engine**: Computes weekly (7-day) and monthly (30-day) historical summaries deterministically without AI hallucinations.
- **Metrics Tracked**: Completion rate, average caloric intake, sleep duration, physical activity, net weight shift, and weekly weight velocity (kg/week).

### 4. Evidence-Based AI Agent with Strict Fact Separation
- **Fact vs. Interpretation Separation**: Clearly demarcates empirical recorded facts from AI-generated hypotheses.
- **Clinical Evidence Attribution**: Links insights and plan proposals directly to peer-reviewed literature (e.g., *Garber et al. 2011*, *Hirshkowitz et al. 2015*, *Leidy et al. 2015*).
- **Targeted Follow-up Questions**: The AI agent asks context-aware questions based on missing logs or plateaued trends.

### 5. Versioned Goals & Human-in-the-Loop Plan Approval
- **Versioned Active Plans**: Plans start at `v1.0` and iterate as `v1.1`, `v1.2`, etc.
- **Mandatory Approval**: Proposed target adjustments (e.g., caloric targets, sleep targets) require explicit user approval before updating the active plan.
- **Archived History**: Rejected or past plan proposals are preserved in the version history.

### 6. Medical Safety Guardrails & Audit Logging
- **Hard Safety Boundaries**:
  - **No Medical Diagnoses**: Refuses to diagnose diseases, prescribe medication, or give clinical treatment advice.
  - **Unsafe Caloric Target Blocker**: Hard blocks target caloric reductions under 1,200 kcal/day.
- **Complete Audit Trail**: Records user corrections, rejected plan proposals, AI safety guardrail triggers, and system fallback events.

---

## 🏗️ Architecture & Component Design

```
src/
├── auth/
│   └── auth.js             # User authentication store & session management
├── data/
│   └── knowledgeBase.js    # Curated clinical wellness research database
├── db/
│   └── store.js            # User-scoped stateful localStorage store & audit logs
├── engine/
│   ├── aiAgent.js          # Longitudinal AI Review Agent & safety interceptors
│   ├── deterministic.js   # 100% deterministic mathematical summary engine
│   └── mealEstimator.js    # NLP meal parser with local heuristic fallback
├── services/
│   └── ai.service.js       # Centralized Google Gemini REST API service
└── ui/
    ├── app.js              # Application controller & auth router
    ├── components.js       # Modular DOM renderers (Dashboard, Logs, Agent, Plans, Audit)
    └── landing-ui.js       # Interactive landing page animations, scroll-reveal & toast system
```

---

## 🛠️ Setup & Installation Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### 1. Clone & Install
```bash
git clone https://github.com/adityashaw970/Aura-Health.git
cd Aura-Health
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory (refer to `.env.example`):
```env
VITE_GEMINI_API_KEY=your_google_gemini_api_key_here
```

### 3. Run Locally
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 4. Production Build
```bash
npm run build
```

---

## 🧪 Testing Approach & Verification

- **Automated Build Checks**: Verified zero compilation or bundling errors using `vite build`.
- **API Model Verification**: Unit tested `gemini-3.6-flash` and `gemini-flash-latest` REST endpoints via Node test scripts for JSON schema compliance and fallback behavior.
- **Safety Interceptor Testing**: Verified that medical diagnosis requests and caloric reductions under 1,200 kcal/day trigger safety guardrail refusals and log audit events.
- **UI & Accessibility Verification**: Tested cross-device layouts, high-contrast dark mode palette, single-line trust stats, and responsive workflow step cards.

---

## 📊 Completed vs. Intentionally Excluded Scope

### Completed Scope
- Stateful user authentication & session management.
- Comprehensive multi-metric daily logging with NLP meal estimation.
- Deterministic 7-day and 30-day summary engine.
- AI Review Agent with clinical citation attribution.
- Fact vs. Interpretation separation.
- Versioned goals & human-in-the-loop plan proposal approvals.
- Safety guardrails (medical refusal & minimum caloric intake enforcement).
- Full audit log system recording all system events and safety triggers.

### Intentionally Excluded Scope
- **Server Database (PostgreSQL/MongoDB)**: Kept client-side via isolated browser `localStorage` to ensure 100% user data privacy and zero setup overhead.
- **Wearable Device SDK Integrations (Apple Health/Fitbit)**: Omitted hardware API integrations to focus on core data quality, NLP parsing, and agentic review workflows.

---

## 📄 License & Disclaimer
**AuraHealth** is an educational and wellness tracking tool. It is **not** a medical device and does not provide clinical medical diagnosis or treatment.
