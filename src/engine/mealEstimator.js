import { AiService } from '../services/ai.service.js';

export class MealEstimator {
  /**
   * Async meal estimation using Google Gemini AI with fallback to rule engine.
   */
  static async estimateMealAsync(descriptionText) {
    if (AiService.hasApiKey()) {
      const geminiResult = await AiService.estimateMealWithGemini(descriptionText);
      if (geminiResult) {
        return {
          ...geminiResult,
          isEstimated: true
        };
      }
    }
    return this.estimateMeal(descriptionText);
  }

  /**
   * Synchronous heuristic fallback.
   */
  static estimateMeal(descriptionText) {
    if (!descriptionText || descriptionText.trim() === '') {
      return { calories: 0, protein: 0, carbs: 0, fat: 0, confidence: 0, isEstimated: false };
    }

    const text = descriptionText.toLowerCase();
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let confidence = 85; // Base confidence percentage

    // Keyword heuristic database for demonstration estimation
    const items = [
      { key: 'oatmeal', cal: 180, p: 6, c: 32, f: 3 },
      { key: 'oats', cal: 180, p: 6, c: 32, f: 3 },
      { key: 'egg', cal: 75, p: 6, c: 0.5, f: 5 },
      { key: 'eggs', cal: 150, p: 12, c: 1, f: 10 },
      { key: 'toast', cal: 90, p: 3, c: 15, f: 1 },
      { key: 'bread', cal: 90, p: 3, c: 15, f: 1 },
      { key: 'avocado', cal: 160, p: 2, c: 9, f: 15 },
      { key: 'chicken', cal: 220, p: 35, c: 0, f: 8 },
      { key: 'salad', cal: 120, p: 3, c: 10, f: 7 },
      { key: 'salmon', cal: 280, p: 30, c: 0, f: 16 },
      { key: 'rice', cal: 200, p: 4, c: 45, f: 1 },
      { key: 'steak', cal: 350, p: 38, c: 0, f: 22 },
      { key: 'apple', cal: 95, p: 0.5, c: 25, f: 0.3 },
      { key: 'banana', cal: 105, p: 1.3, c: 27, f: 0.3 },
      { key: 'protein shake', cal: 200, p: 25, c: 8, f: 3 },
      { key: 'coffee', cal: 35, p: 1, c: 4, f: 1.5 },
      { key: 'almonds', cal: 160, p: 6, c: 6, f: 14 },
      { key: 'yogurt', cal: 150, p: 15, c: 12, f: 4 },
      { key: 'burger', cal: 550, p: 28, c: 42, f: 30 },
      { key: 'pizza', cal: 600, p: 24, c: 70, f: 24 },
      { key: 'pasta', cal: 400, p: 14, c: 65, f: 8 }
    ];

    let matches = 0;
    items.forEach(item => {
      if (text.includes(item.key)) {
        calories += item.cal;
        protein += item.p;
        carbs += item.c;
        fat += item.f;
        matches++;
      }
    });

    // Default fallbacks if no exact food keyword matched
    if (matches === 0) {
      // Estimate based on word count heuristic
      const words = text.split(/\s+/).length;
      calories = Math.min(800, Math.max(250, words * 75));
      protein = Math.round(calories * 0.20 / 4);
      carbs = Math.round(calories * 0.50 / 4);
      fat = Math.round(calories * 0.30 / 9);
      confidence = 55; // Lower confidence for vague descriptions
    } else {
      confidence = Math.min(95, 70 + matches * 10);
    }

    return {
      calories: Math.round(calories),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
      confidence: confidence,
      isEstimated: true
    };
  }
}
