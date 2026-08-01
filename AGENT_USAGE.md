# AGENT_USAGE.md — Coding Agent Usage Report

## 1. Tools & Coding Agents Used
During the development of **AuraHealth**, the following AI tools and coding agents were used:
- **Antigravity IDE Agentic Coding Assistant**: Primary pair programmer for architecture design, CSS token design system creation, deterministic engine implementation, and full-stack integration.
- **Google Gemini API (`gemini-3.6-flash` / `gemini-flash-latest`)**: Integrated runtime LLM engine for natural language meal estimation and interactive AI agent queries.
- **Chrome Subagent (Playwright)**: Browser subagent for automated screenshot verification, UI visual inspection, and layout refinement.

---

## 2. Representative Prompts & Delegation

### Architecture & Engine Implementation
- *"Implement a stateful data store (`AppStore`) that manages user daily logs, versioned active plans, data-quality check flags, and audit event logs per authenticated user."*
- *"Build a 100% deterministic mathematical summary engine that calculates 7-day and 30-day caloric averages, sleep duration, weight velocity, and completion rate without any AI hallucinations."*

### AI Agent & Safety Interceptors
- *"Design an AI Review Agent that separates empirical recorded facts from AI hypotheses, retrieves peer-reviewed research citations from a wellness knowledge base, and suggests versioned plan adjustments that require explicit user approval."*
- *"Implement hard safety boundary guardrails to block medical diagnosis requests and unsafe caloric restriction requests under 1,200 kcal/day, logging all triggers to an audit trail."*

### UI & Aesthetics
- *"Create a modern glassmorphic landing page design with glowing gradient text, particle micro-animations, single-line trust statistics, and responsive 4-step workflow cards."*

---

## 3. Important Agent Mistakes & Rejected Suggestions

During iterative development, the following agent mistakes or deprecated patterns were encountered and corrected:

1. **Deprecated Gemini Model Endpoints**:
   - *Mistake*: Initial REST calls targeted `gemini-1.5-flash` and `gemini-2.5-flash`, which returned `404 Not Found` or deprecation notices for new users.
   - *Correction*: Tested available models via `ModelService.ListModels` and updated the active fallback hierarchy to `gemini-3.6-flash`, `gemini-flash-latest`, and `gemini-2.0-flash`.

2. **Null Store Key in Unauthenticated Contexts**:
   - *Mistake*: The AI agent sandbox on the landing page attempted to log audit events before a user logged in, throwing a `TypeError: Cannot read properties of null (reading 'audit')`.
   - *Correction*: Added a safe key fallback (`this._keys?.audit || 'aura_guest_audit'`) in `AppStore.getAuditLogs()` and `logAuditEvent()`.

3. **Hero Section Margins & Text Wrapping**:
   - *Mistake*: Hero section used `justify-content: space-between` directly on a max-width container, creating dark vertical bars on screen edges and wrapping stat items onto line 2.
   - *Correction*: Re-architected `.hero-section` to span 100% full width with a centered inner wrapper `.hero-inner`, and set `flex-wrap: nowrap` on `.hero-trust-row`.

---

## 4. Verification of Generated Output

All code produced by coding agents was systematically verified using:
1. **Automated Production Builds**: Running `npm run build` to ensure zero compilation, bundling, or syntax errors.
2. **Runtime REST Verification**: Executing Node test scripts to verify live Gemini API REST payloads, MIME types, and JSON responses.
3. **Browser Walkthroughs**: Running browser subagent scripts to capture full-viewport screenshots and verify visual layout integrity across desktop and mobile screen sizes.
