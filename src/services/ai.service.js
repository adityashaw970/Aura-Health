// ═══════════════════════════════════════════════════════════
// Gemini AI Service Module — AuraHealth
// Integrates Google Gemini API for real-time wellness insights,
// meal estimation, and longitudinal agent reviews with fallback.
// ═══════════════════════════════════════════════════════════

const API_KEY_STORAGE_KEY = 'aura_gemini_api_key';

export class AiService {
  /**
   * Retrieves the active Gemini API Key from localStorage or Vite environment variables.
   */
  static getApiKey() {
    // 1. Check user-configured key in LocalStorage
    if (typeof localStorage !== 'undefined') {
      const customKey = localStorage.getItem(API_KEY_STORAGE_KEY);
      if (customKey && customKey.trim() !== '') {
        return customKey.trim();
      }
    }
    
    // 2. Check environment variable (Vite import.meta.env)
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
      return import.meta.env.VITE_GEMINI_API_KEY.trim();
    }

    return null;
  }

  /**
   * Saves a custom user Gemini API Key into localStorage.
   */
  static setApiKey(key) {
    if (typeof localStorage === 'undefined') return;
    if (key && key.trim()) {
      localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  }

  /**
   * Clears saved Gemini API Key.
   */
  static clearApiKey() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  }

  /**
   * Checks if a Gemini API Key is available.
   */
  static hasApiKey() {
    const key = this.getApiKey();
    return Boolean(key && key.length > 5);
  }

  /**
   * Generic direct call to Google Gemini REST API (gemini-2.5-flash / gemini-1.5-flash).
   */
  static async callGeminiApi({ prompt, systemInstruction = '', jsonResponse = false }) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('No Gemini API Key configured.');
    }

    // Primary model gemini-3.6-flash / gemini-flash-latest, fallback to gemini-2.0-flash
    const models = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-2.0-flash'];
    let lastError = null;

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ]
      };

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      if (jsonResponse) {
        payload.generationConfig = {
          responseMimeType: 'application/json'
        };
      }

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${response.status} ${response.statusText}`;
          throw new Error(errMsg);
        }

        const data = await response.json();
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!candidateText) {
          throw new Error('Gemini API returned an empty response.');
        }

        return candidateText;
      } catch (err) {
        console.warn(`[AiService] Gemini model ${model} failed:`, err.message);
        lastError = err;
      }
    }

    throw lastError || new Error('Failed to connect to Gemini API.');
  }

  /**
   * Estimate Meal Macros using Gemini AI or return structured JSON.
   */
  static async estimateMealWithGemini(mealDescription) {
    if (!mealDescription || !mealDescription.trim()) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0, confidence: 0, advice: '', isGemini: false };
    }

    const systemInstruction = `You are a certified clinical sports nutritionist and expert AI calorie estimator.
Analyze the user's natural language meal description and estimate total calories (kcal), protein (g), carbs (g), and fat (g).
Return ONLY a valid JSON object matching this exact schema:
{
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "confidence": number (between 50 and 95),
  "summary": "Short 1-sentence breakdown of items detected",
  "advice": "Short 1-sentence nutritional tip"
}`;

    const prompt = `Estimate macros for this meal: "${mealDescription.trim()}"`;

    try {
      if (this.hasApiKey()) {
        const rawJsonText = await this.callGeminiApi({
          prompt,
          systemInstruction,
          jsonResponse: true
        });

        const parsed = JSON.parse(rawJsonText);
        const extractNum = (val) => typeof val === 'number' ? val : (parseFloat(String(val || 0).replace(/[^0-9.]/g, '')) || 0);
        return {
          calories: Math.round(extractNum(parsed.calories)),
          protein: Math.round(extractNum(parsed.protein)),
          carbs: Math.round(extractNum(parsed.carbs)),
          fat: Math.round(extractNum(parsed.fat)),
          confidence: Math.min(95, Math.max(50, Math.round(extractNum(parsed.confidence) || 85))),
          summary: parsed.summary || 'Gemini estimated macro breakdown',
          advice: parsed.advice || 'Balanced macro distribution detected.',
          isGemini: true
        };
      }
    } catch (err) {
      console.warn('[AiService] Gemini meal estimation fallback to local estimator:', err.message);
    }

    return null; // Signals fallback to local heuristic
  }

  /**
   * Process a health/wellness query using Gemini AI with active safety guardrails.
   */
  static async processQueryWithGemini(queryText, userSummaryContext = null) {
    if (!queryText || !queryText.trim()) {
      return null;
    }

    const lower = queryText.toLowerCase();

    // Check Safety Guardrails locally before hitting API to ensure strict compliance
    const medicalDiagnosisKeywords = ['diagnose', 'disease', 'condition', 'symptom', 'cancer', 'diabetes', 'thyroid', 'disorder', 'medication', 'cure', 'prescribe', 'treatment', 'doctor'];
    if (medicalDiagnosisKeywords.some(k => lower.includes(k))) {
      return {
        text: `⚠️ **Medical Safety Guardrail Triggered**: As an AI Wellness Assistant, I am strictly bounded and **cannot diagnose medical conditions, prescribe treatment, or recommend medications**. Please consult a qualified licensed healthcare physician for clinical medical advice regarding symptoms or health conditions.`,
        isGuardrailTriggered: true,
        guardrailType: 'Medical Boundary',
        isGemini: false
      };
    }

    const caloricMatch = lower.match(/(?:drop|reduce|set|cut|calories|intake)\s*(?:to|by)?\s*(\d{3,4})/i);
    if (caloricMatch) {
      const requestedVal = parseInt(caloricMatch[1]);
      if (requestedVal > 0 && requestedVal < 1200) {
        return {
          text: `⚠️ **Unsafe Intake Warning**: Setting daily calories below **1,200 kcal/day** is unsafe without direct clinical supervision. Caloric restriction this severe risks nutrient deficiency, muscle loss, and metabolic slowing. Minimum recommended threshold is 1,200 kcal/day.`,
          isGuardrailTriggered: true,
          guardrailType: 'Unsafe Intake Restriction',
          isGemini: false
        };
      }
    }

    const systemInstruction = `You are AuraHealth's Evidence-Based AI Health Review Agent.
Your core principle: STRICT SEPARATION OF EMPIRICAL FACTS FROM AI HYPOTHESES.
Rules:
1. NEVER offer clinical medical diagnoses, prescriptions, or treatment advice.
2. Maintain an encouraging, scientific, clear tone.
3. Cite evidence-based guidelines where appropriate (e.g. Sleep Research Society, ISSN, CDC).
4. Frame any suggestions as hypotheses that require user approval.`;

    let contextPrompt = `User Query: "${queryText}"`;
    if (userSummaryContext) {
      contextPrompt += `\nUser Health Context:
- Avg Daily Calories: ${userSummaryContext.avgCalories || 'N/A'} kcal
- Avg Daily Sleep: ${userSummaryContext.avgSleep || 'N/A'} hrs
- Avg Daily Activity: ${userSummaryContext.avgActivity || 'N/A'} mins
- Weight Shift: ${userSummaryContext.weightChangeKg || 0} kg`;
    }

    try {
      if (this.hasApiKey()) {
        const text = await this.callGeminiApi({
          prompt: contextPrompt,
          systemInstruction
        });

        return {
          text,
          isGuardrailTriggered: false,
          isGemini: true
        };
      }
    } catch (err) {
      console.warn('[AiService] Gemini process query failed, falling back to local KB:', err.message);
    }

    return null; // Fallback to local KB engine
  }

  /**
   * Generate Gemini Longitudinal Health Insight for Retrospective Review.
   */
  static async generateRetrospectiveInsightsWithGemini(summary, activePlan, recordedFacts) {
    if (!this.hasApiKey()) return null;

    const systemInstruction = `You are AuraHealth's Longitudinal AI Review Agent.
Analyze the user's weekly health tracking data against their active targets.
Return a structured JSON object with 3 fields:
1. "interpretations": array of 2-3 objects with format {"text": string, "citation": string}
   (Demarcated as AI Hypotheses based on facts. E.g. "Caloric deficit of -300 kcal aligns with -0.4kg weight shift")
2. "followUpQuestions": array of 2 thoughtful questions asking about barriers, energy levels, or missing data.
3. "recommendation": string (optional gentle adjustment recommendation or encouragement, emphasizing user approval required).`;

    const prompt = `Data Summary:
- Period: ${summary.periodDays} days (Logged ${summary.recordedDays} days)
- Avg Calories: ${summary.avgCalories} kcal (Target: ${activePlan.targets.dailyCalories})
- Avg Sleep: ${summary.avgSleep} hrs (Target: ${activePlan.targets.dailySleep})
- Avg Activity: ${summary.avgActivity} mins (Target: ${activePlan.targets.dailyActivityMins})
- Weight Change: ${summary.weightChangeKg} kg (Weekly Velocity: ${summary.weightVelocityWeeklyKg} kg/wk)

Recorded Facts:
${recordedFacts.join('\n')}`;

    try {
      const rawText = await this.callGeminiApi({
        prompt,
        systemInstruction,
        jsonResponse: true
      });

      const parsed = JSON.parse(rawText);
      return {
        interpretations: parsed.interpretations || [],
        followUpQuestions: parsed.followUpQuestions || [],
        recommendation: parsed.recommendation || '',
        isGemini: true
      };
    } catch (err) {
      console.warn('[AiService] Gemini Retrospective Insight failed:', err.message);
      return null;
    }
  }
}
