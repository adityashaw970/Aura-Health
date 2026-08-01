// 100% Deterministic Engine for Summaries, Data-Quality Checks & Inconsistency Alerts

export class DeterministicEngine {
  /**
   * Calculates exact period summaries given log array, target plan, and period days (7, 14, 30)
   */
  static computeSummary(logs, activePlan, days = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Filter logs in range
    const filteredLogs = logs.filter(l => new Date(l.date) >= cutoffDate);
    
    // Sort chronologically ascending
    const chronological = [...filteredLogs].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Completeness check
    const totalExpectedDays = days;
    const recordedDays = chronological.length;
    const missingDays = Math.max(0, totalExpectedDays - recordedDays);
    const completenessPct = Math.round((recordedDays / totalExpectedDays) * 100);

    // Metric accumulators
    let totalCalories = 0;
    let calorieCount = 0;

    let totalSleep = 0;
    let sleepCount = 0;

    let totalActivity = 0;
    let activityCount = 0;

    let totalMood = 0;
    let moodCount = 0;

    chronological.forEach(log => {
      if (log.meals && log.meals.calories > 0) {
        totalCalories += log.meals.calories;
        calorieCount++;
      }
      if (log.sleepHours != null && log.sleepHours > 0) {
        totalSleep += log.sleepHours;
        sleepCount++;
      }
      if (log.activityMins != null) {
        totalActivity += log.activityMins;
        activityCount++;
      }
      if (log.moodScore != null) {
        totalMood += log.moodScore;
        moodCount++;
      }
    });

    const avgCalories = calorieCount > 0 ? Math.round(totalCalories / calorieCount) : 0;
    const avgSleep = sleepCount > 0 ? Math.round((totalSleep / sleepCount) * 10) / 10 : 0;
    const avgActivity = activityCount > 0 ? Math.round(totalActivity / activityCount) : 0;
    const avgMood = moodCount > 0 ? Math.round((totalMood / moodCount) * 10) / 10 : 0;

    // Weight velocity (kg per week)
    let startWeight = null;
    let endWeight = null;
    let weightChangeKg = 0;
    let weightVelocityWeeklyKg = 0;

    const logsWithWeight = chronological.filter(l => l.weightKg != null && l.weightKg > 0);
    if (logsWithWeight.length >= 2) {
      startWeight = logsWithWeight[0].weightKg;
      endWeight = logsWithWeight[logsWithWeight.length - 1].weightKg;
      weightChangeKg = Math.round((endWeight - startWeight) * 10) / 10;
      
      const daySpan = Math.max(1, (new Date(logsWithWeight[logsWithWeight.length - 1].date) - new Date(logsWithWeight[0].date)) / (1000 * 3600 * 24));
      weightVelocityWeeklyKg = Math.round((weightChangeKg / (daySpan / 7)) * 100) / 100;
    } else if (logsWithWeight.length === 1) {
      startWeight = logsWithWeight[0].weightKg;
      endWeight = logsWithWeight[0].weightKg;
    }

    // Differences against Active Plan Targets
    const targets = activePlan ? activePlan.targets : { dailyCalories: 2000, dailySleep: 8.0, dailyActivityMins: 45 };
    const calorieDiff = avgCalories > 0 ? avgCalories - targets.dailyCalories : 0;
    const sleepDiff = avgSleep > 0 ? Math.round((avgSleep - targets.dailySleep) * 10) / 10 : 0;

    // Detect Inconsistencies & Anomalies
    const inconsistencies = this.detectInconsistencies(chronological, avgCalories, weightVelocityWeeklyKg, targets);

    return {
      periodDays: days,
      recordedDays,
      missingDays,
      completenessPct,
      avgCalories,
      avgSleep,
      avgActivity,
      avgMood,
      startWeight,
      endWeight,
      weightChangeKg,
      weightVelocityWeeklyKg,
      calorieDiff,
      sleepDiff,
      inconsistencies,
      chronological
    };
  }

  /**
   * Deterministic anomaly & inconsistency detector
   */
  static detectInconsistencies(logs, avgCalories, weeklyWeightVelocity, targets) {
    const alerts = [];

    // Rule 1: High calorie surplus reported but rapid weight loss recorded
    if (avgCalories > targets.dailyCalories + 300 && weeklyWeightVelocity < -0.5) {
      alerts.push({
        id: 'inc_surplus_weight_loss',
        severity: 'high',
        type: 'Inconsistency',
        title: 'Calorie Surplus vs Weight Loss Anomaly',
        message: `Reported average calories (${avgCalories} kcal) is +${avgCalories - targets.dailyCalories} above target, yet weight is decreasing at ${weeklyWeightVelocity} kg/wk. Check if meal portions are under-estimated or activity expenditure is unrecorded.`
      });
    }

    // Rule 2: Low sleep (< 6.0 hrs avg) with high reported mood/energy scores (> 8/10)
    const shortSleepHighMoodDays = logs.filter(l => l.sleepHours && l.sleepHours < 5.5 && l.moodScore && l.moodScore >= 8);
    if (shortSleepHighMoodDays.length >= 2) {
      alerts.push({
        id: 'inc_sleep_mood_mismatch',
        severity: 'medium',
        type: 'Pattern Warning',
        title: 'Short Sleep / High Energy Mismatch',
        message: `${shortSleepHighMoodDays.length} days had under 5.5 hrs sleep paired with high mood (>=8). Pay attention to latent fatigue or circadian disruption.`
      });
    }

    // Rule 3: Extreme Calorie Restriction (< 1000 kcal)
    const severeRestrictionDays = logs.filter(l => l.meals && l.meals.calories > 0 && l.meals.calories < 1000);
    if (severeRestrictionDays.length > 0) {
      alerts.push({
        id: 'inc_severe_restriction',
        severity: 'warning',
        type: 'Safety Alert',
        title: 'Severely Low Caloric Intake Recorded',
        message: `${severeRestrictionDays.length} day(s) recorded intake below 1,000 kcal. Prolonged intake below baseline BMR requires medical oversight.`
      });
    }

    // Rule 4: Data gaps (missing 3+ consecutive days)
    let consecutiveMissing = 0;
    let maxConsecutive = 0;
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const hasLog = logs.some(l => l.date === dateStr);
      if (!hasLog) {
        consecutiveMissing++;
        if (consecutiveMissing > maxConsecutive) maxConsecutive = consecutiveMissing;
      } else {
        consecutiveMissing = 0;
      }
    }

    if (maxConsecutive >= 2) {
      alerts.push({
        id: 'inc_data_gap',
        severity: 'info',
        type: 'Missing Data',
        title: 'Consecutive Unlogged Days Detected',
        message: `${maxConsecutive} consecutive days have missing logs in the past week. Consistent data entry improves recommendation precision.`
      });
    }

    return alerts;
  }
}
