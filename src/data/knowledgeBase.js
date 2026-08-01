// Curated Scientific & Clinical Wellness Knowledge Base

export const KNOWLEDGE_BASE = [
  {
    id: 'kb_energy_balance',
    title: 'Energy Balance & Safe Caloric Deficits',
    category: 'Nutrition',
    citation: 'Hall KD, et al. (2012) "Quantifying the effect of energy imbalance on bodyweight." Lancet.',
    summary: 'Sustainable weight loss generally occurs at a deficit of 300–500 kcal/day (approx 0.25–0.5 kg/week). Caloric intake should rarely drop below 1,200 kcal/day without direct clinical supervision to avoid metabolic slowing and nutrient deficiency.',
    keywords: ['calories', 'deficit', 'weight loss', 'energy', 'intake', 'starvation']
  },
  {
    id: 'kb_sleep_hygiene',
    title: 'Sleep Duration & Metabolic Health',
    category: 'Sleep Science',
    citation: 'Consensus Conference Panel (2015) "Recommended Amount of Sleep for a Healthy Adult." Journal of Clinical Sleep Medicine.',
    summary: 'Adults require 7–9 hours of quality sleep per night. Chronic sleep restriction (<6.5 hrs) alters ghrelin and leptin levels, increasing appetite and insulin resistance, and directly correlating with lowered mood and energy scores.',
    keywords: ['sleep', 'duration', 'mood', 'energy', 'fatigue', 'recovery']
  },
  {
    id: 'kb_macronutrient_distribution',
    title: 'Macronutrient Composition & Satiety',
    category: 'Nutrition',
    citation: 'Leidy HJ, et al. (2015) "The role of protein in weight management." American Journal of Clinical Nutrition.',
    summary: 'Adequate dietary protein (1.2–1.6 g/kg of body mass) supports lean muscle preservation during weight management and enhances satiety. Fiber intake (>25-30g/day) further stabilizes glycemic response.',
    keywords: ['protein', 'carbs', 'fat', 'macros', 'satiety', 'muscle']
  },
  {
    id: 'kb_activity_consistency',
    title: 'Physical Activity & Energy Expenditure',
    category: 'Fitness & Recovery',
    citation: 'Piercy KL, et al. (2018) "The Physical Activity Guidelines for Americans." JAMA.',
    summary: 'At least 150 minutes of moderate-intensity aerobic physical activity per week, coupled with 2 muscle-strengthening sessions, provides optimal cardiovascular benefits and supports metabolic homeostasis.',
    keywords: ['activity', 'exercise', 'workout', 'steps', 'minutes', 'cardio']
  },
  {
    id: 'kb_weight_fluctuations',
    title: 'Transient Weight Velocity & Fluid Retention',
    category: 'Physiology',
    citation: 'Thomas DM, et al. (2014) "Effect of dietary sodium and carbohydrate on daily weight variance." Am J Clin Nutr.',
    summary: 'Day-to-day weight fluctuations of 0.5–1.5 kg are normal and predominantly reflect shifts in glycogen storage, sodium intake, and hydration levels rather than immediate changes in fat or muscle tissue mass.',
    keywords: ['weight', 'fluctuation', 'water weight', 'velocity', 'scale', 'spike']
  }
];

export function queryKnowledgeBase(text) {
  if (!text) return KNOWLEDGE_BASE.slice(0, 2);
  const lower = text.toLowerCase();
  
  const matches = KNOWLEDGE_BASE.filter(item => {
    return item.keywords.some(k => lower.includes(k)) ||
           item.title.toLowerCase().includes(lower) ||
           item.summary.toLowerCase().includes(lower);
  });

  return matches.length > 0 ? matches : [KNOWLEDGE_BASE[0], KNOWLEDGE_BASE[1]];
}
