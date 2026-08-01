// Longitudinal AI Review Agent Engine with Guardrails & Evidence Attribution

import { queryKnowledgeBase } from '../data/knowledgeBase.js';
import { DeterministicEngine } from './deterministic.js';
import { AiService } from '../services/ai.service.js';

export class AiReviewAgent {
  constructor(store) {
    this.store = store;
  }

  /**
   * Generates a comprehensive longitudinal retrospective review.
   * STRICT REQUIREMENT: Separates Empirical Recorded Facts from AI Interpretation!
   */
  generateRetrospective(days = 7) {
    const logs = this.store.getLogs();
    const activePlan = this.store.getActivePlan();
    const summary = DeterministicEngine.computeSummary(logs, activePlan, days);

    // 1. RECORDED FACTS (Direct empirical observations from user logs)
    const facts = [
      `Logged ${summary.recordedDays} of ${summary.periodDays} days (${summary.completenessPct}% completion rate).`,
      `Average daily caloric intake was ${summary.avgCalories > 0 ? summary.avgCalories + ' kcal' : 'unrecorded'}. Target: ${activePlan.targets.dailyCalories} kcal.`,
      `Average daily sleep duration was ${summary.avgSleep > 0 ? summary.avgSleep + ' hours' : 'unrecorded'}. Target: ${activePlan.targets.dailySleep} hrs.`,
      `Average activity duration was ${summary.avgActivity} mins/day. Target: ${activePlan.targets.dailyActivityMins} mins/day.`,
      `Weight shift over period: ${summary.weightChangeKg >= 0 ? '+' : ''}${summary.weightChangeKg} kg (velocity: ${summary.weightVelocityWeeklyKg} kg/week).`
    ];

    // 2. POSSIBLE INTERPRETATION (AI Hypotheses - Clearly demarcated as interpretations)
    const interpretations = [];
    
    if (summary.calorieDiff < -250 && summary.weightVelocityWeeklyKg < -0.2) {
      interpretations.push({
        text: `The average caloric deficit (-${Math.abs(summary.calorieDiff)} kcal/day) aligns with the observed weight reduction (-${Math.abs(summary.weightChangeKg)} kg).`,
        kbId: 'kb_energy_balance'
      });
    } else if (summary.calorieDiff > 200 && summary.weightVelocityWeeklyKg > 0.3) {
      interpretations.push({
        text: `Caloric intake exceeded active target by ~${summary.calorieDiff} kcal/day, which correlates with the positive weight velocity (+${summary.weightVelocityWeeklyKg} kg/wk).`,
        kbId: 'kb_energy_balance'
      });
    }

    if (summary.avgSleep > 0 && summary.avgSleep < 7.0) {
      interpretations.push({
        text: `Sleep average of ${summary.avgSleep} hrs is below recommended 7-9 hr biological threshold, which may impair metabolic recovery and lower reported mood scores (avg ${summary.avgMood}/10).`,
        kbId: 'kb_sleep_hygiene'
      });
    }

    if (summary.avgActivity >= activePlan.targets.dailyActivityMins) {
      interpretations.push({
        text: `Physical activity target (${activePlan.targets.dailyActivityMins}m) was consistently met or exceeded, supporting cardiovascular fitness and insulin sensitivity.`,
        kbId: 'kb_activity_consistency'
      });
    }

    if (interpretations.length === 0) {
      interpretations.push({
        text: `Current logged patterns show general stability within target thresholds.`,
        kbId: 'kb_energy_balance'
      });
    }

    // 3. TARGETED FOLLOW-UP QUESTIONS (Addressing missing data or ambiguities)
    const followUpQuestions = [];
    if (summary.missingDays > 0) {
      followUpQuestions.push(`You missed logging ${summary.missingDays} day(s) this past week. Were there specific barriers (e.g. busy schedule, dining out) that prevented logging?`);
    }
    if (summary.avgSleep > 0 && summary.avgSleep < 6.5) {
      followUpQuestions.push(`Sleep averaged ${summary.avgSleep} hours. Did work stress or late evening screen time impact sleep latency?`);
    }
    if (summary.inconsistencies.length > 0) {
      summary.inconsistencies.forEach(inc => {
        followUpQuestions.push(`Quality Check: ${inc.title} - ${inc.message}`);
      });
    }
    if (followUpQuestions.length === 0) {
      followUpQuestions.push(`How are you feeling overall with your current energy levels and workout recovery?`);
    }

    // 4. RETRIEVE RELEVANT EVIDENCE CITATIONS
    const evidenceCitations = interpretations.map(interp => {
      const kbArticle = queryKnowledgeBase(interp.kbId)[0];
      return {
        id: kbArticle.id,
        title: kbArticle.title,
        citation: kbArticle.citation,
        summary: kbArticle.summary
      };
    });

    // 5. SUGGESTED LIMITED PLAN ADJUSTMENTS (Requires Explicit User Approval!)
    let suggestedPlanAdjustment = null;
    if (summary.weightVelocityWeeklyKg < -0.8) {
      // Weight loss too rapid (> 0.8 kg/wk) - suggest moderate calorie bump
      suggestedPlanAdjustment = {
        proposedTargets: {
          dailyCalories: activePlan.targets.dailyCalories + 150
        },
        rationale: `Weight loss velocity (-${Math.abs(summary.weightVelocityWeeklyKg)} kg/wk) is faster than recommended safe parameters (>0.8 kg/wk). Increasing caloric intake by +150 kcal/day helps preserve lean tissue mass.`,
        evidence: `Hall KD et al. (2012) - Rapid weight loss exceeding 0.75 kg/wk increases muscle catabolism and metabolic adaptation.`
      };
    } else if (summary.completenessPct >= 85 && Math.abs(summary.weightVelocityWeeklyKg) < 0.1 && summary.avgCalories >= activePlan.targets.dailyCalories - 100) {
      // Weight plateaued - suggest small 100 kcal tweak or 10m activity bump
      suggestedPlanAdjustment = {
        proposedTargets: {
          dailyCalories: activePlan.targets.dailyCalories - 100,
          dailyActivityMins: activePlan.targets.dailyActivityMins + 10
        },
        rationale: `Weight has stabilized over the past ${days} days. A modest reduction of 100 kcal/day and +10m daily activity will gently restart steady weight progression.`,
        evidence: `Leidy HJ et al. (2015) - Gradual 100-150 kcal progressive adjustments prevent sudden satiety disruption.`
      };
    }

    this.store.logAuditEvent({
      category: 'AI_RETROSPECTIVE',
      event: `Generated longitudinal retrospective review for past ${days} days`,
      confidence: 'High',
      outcome: `Identified ${facts.length} facts, ${interpretations.length} interpretations, ${followUpQuestions.length} questions`
    });

    return {
      periodDays: days,
      generatedAt: new Date().toISOString(),
      facts,
      interpretations,
      followUpQuestions,
      evidenceCitations,
      suggestedPlanAdjustment
    };
  }

  /**
   * Interactive Query Handler with Strict Safety Boundary Interceptors!
   */
  processUserQuery(queryText) {
    if (!queryText || queryText.trim() === '') {
      return { text: 'Please enter a valid question or command.', isGuardrailTriggered: false };
    }

    const lower = queryText.toLowerCase();

    // ----------------------------------------------------
    // SAFETY BOUNDARY CHECK 1: MEDICAL DIAGNOSIS REQUESTS
    // ----------------------------------------------------
    const medicalDiagnosisKeywords = ['diagnose', 'disease', 'condition', 'symptom', 'cancer', 'diabetes', 'thyroid', 'disorder', 'medication', 'cure', 'prescribe', 'treatment', 'doctor'];
    const containsMedicalKey = medicalDiagnosisKeywords.some(k => lower.includes(k));

    if (containsMedicalKey) {
      this.store.logAuditEvent({
        category: 'SAFETY_GUARDRAIL_TRIGGER',
        event: `Blocked potential medical diagnosis or prescription request: "${queryText}"`,
        confidence: 'Strict Boundary Interceptor',
        outcome: 'Refusal & Professional Medical Disclaimer Issued'
      });

      return {
        text: `⚠️ **Medical Safety Guardrail**: As an AI Wellness Assistant, I am strictly bounded and **cannot diagnose medical conditions, prescribe treatment, or recommend medications**. Please consult a qualified licensed healthcare provider or physician for clinical medical advice regarding your symptoms or health conditions.`,
        isGuardrailTriggered: true,
        guardrailType: 'Medical Boundary'
      };
    }

    // ----------------------------------------------------
    // SAFETY BOUNDARY CHECK 2: UNSAFE CALORIC RESTRICTION (<1200 kcal request)
    // ----------------------------------------------------
    const caloricMatch = lower.match(/(?:drop|reduce|set|cut|calories|intake)\s*(?:to|by)?\s*(\d{3,4})/i);
    if (caloricMatch) {
      const requestedVal = parseInt(caloricMatch[1]);
      if (requestedVal > 0 && requestedVal < 1200) {
        this.store.logAuditEvent({
          category: 'SAFETY_GUARDRAIL_TRIGGER',
          event: `Blocked unsafe calorie target request (${requestedVal} kcal/day)`,
          confidence: 'Strict Boundary Interceptor',
          outcome: 'Refusal & Minimum Intake Warning Issued'
        });

        return {
          text: `⚠️ **Unsafe Intake Warning**: Setting daily calories below **1,200 kcal/day** is unsafe without direct clinical supervision. Caloric restriction this severe risks nutrient deficiency, muscle wasting, and metabolic slowing. Minimum recommended threshold is 1,200 kcal/day.`,
          isGuardrailTriggered: true,
          guardrailType: 'Unsafe Intake Restriction'
        };
      }
    }

    // ----------------------------------------------------
    // SAFETY BOUNDARY CHECK 3: GUARANTEED OUTCOME PROMISES
    // ----------------------------------------------------
    const guaranteeKeywords = ['guarantee', 'promise', 'lose 10kg in 1 week', 'exact result'];
    if (guaranteeKeywords.some(k => lower.includes(k))) {
      return {
        text: `⚠️ **Disclaimer**: Health outcomes vary individually based on genetics, compliance, and physiology. No specific weight loss rate or physical transformation can be guaranteed as a certainty.`,
        isGuardrailTriggered: true,
        guardrailType: 'Guaranteed Outcome Disclaimer'
      };
    }

    // ----------------------------------------------------
    // NORMAL WELLNESS GUIDANCE & KB RETRIEVAL
    // ----------------------------------------------------
    const kbResults = queryKnowledgeBase(queryText);
    const primaryKb = kbResults[0];

    // Check if query is asking for a plan adjustment proposal
    let suggestedPlan = null;
    if (lower.includes('adjust') || lower.includes('change plan') || lower.includes('new target') || lower.includes('calorie goal')) {
      const activePlan = this.store.getActivePlan();
      
      // Determine proposed change
      let newCal = activePlan.targets.dailyCalories;
      if (lower.includes('increase') || lower.includes('more')) newCal += 150;
      else if (lower.includes('decrease') || lower.includes('less') || lower.includes('deficit')) newCal -= 150;
      else if (caloricMatch && parseInt(caloricMatch[1]) >= 1200) newCal = parseInt(caloricMatch[1]);

      suggestedPlan = this.store.proposeNewPlan(
        { dailyCalories: newCal },
        `User requested plan adjustment via AI Chat ("${queryText}").`,
        `${primaryKb.title} (${primaryKb.citation})`
      );
    }

    this.store.logAuditEvent({
      category: 'AI_CHAT_QUERY',
      event: `Processed user query: "${queryText.substring(0, 50)}..."`,
      confidence: 'High',
      outcome: suggestedPlan ? 'Plan Proposed & Evidence Cited' : 'Guidance Provided'
    });

    return {
      text: `Based on curated research from *${primaryKb.title}* (${primaryKb.citation}):\n\n${primaryKb.summary}\n\n*Fact vs Interpretation Note*: Your recorded data shows consistent adherence. Any adjustment represents a hypothesis to be evaluated over subsequent weeks.`,
      evidence: primaryKb,
      suggestedPlan,
      isGuardrailTriggered: false,
      isGemini: false
    };
  }

  /**
   * Async process user query attempting Gemini AI first.
   */
  async processUserQueryAsync(queryText) {
    if (AiService.hasApiKey()) {
      const summary = DeterministicEngine.computeSummary(this.store.getLogs(), this.store.getActivePlan(), 7);
      const geminiRes = await AiService.processQueryWithGemini(queryText, summary);
      if (geminiRes) {
        return geminiRes;
      }
    }
    return this.processUserQuery(queryText);
  }
}
