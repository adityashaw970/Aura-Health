// User-scoped Stateful Data Store for AuraHealth
// All data is keyed per authenticated user via their unique data keys

import { authStore } from '../auth/auth.js';

// Default plan seeded for every new user
function makeDefaultPlan(targetWeight = 70.0) {
  return [
    {
      version: '1.0',
      status: 'active',
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      targets: {
        dailyCalories: 2000,
        dailySleep: 8.0,
        dailyActivityMins: 40,
        targetWeightKg: targetWeight
      },
      notes: 'Initial baseline plan created on account setup.',
      evidence: 'Standard energy expenditure baseline based on Harris-Benedict BMR equation.'
    }
  ];
}

export class AppStore {
  constructor() {
    this._keys = null;
  }

  // Call after login to bind this store to the logged-in user's keys
  bind() {
    const keys = authStore.getUserDataKeys();
    if (!keys) throw new Error('No active session — store cannot be bound.');
    this._keys = keys;
    this._ensureDefaults();
    return this;
  }

  _ensureDefaults() {
    if (!localStorage.getItem(this._keys.plans)) {
      const session = authStore.getSession();
      localStorage.setItem(this._keys.plans, JSON.stringify(makeDefaultPlan()));
    }
    if (!localStorage.getItem(this._keys.logs)) {
      localStorage.setItem(this._keys.logs, JSON.stringify([]));
    }
    if (!localStorage.getItem(this._keys.audit)) {
      localStorage.setItem(this._keys.audit, JSON.stringify([]));
    }
  }

  // ── Plans ───────────────────────────────────────────────────
  getPlans() {
    return JSON.parse(localStorage.getItem(this._keys.plans) || '[]');
  }

  getActivePlan() {
    const plans = this.getPlans();
    return plans.find(p => p.status === 'active') || plans[plans.length - 1] || null;
  }

  getPendingPlan() {
    return this.getPlans().find(p => p.status === 'pending_user_approval') || null;
  }

  proposeNewPlan(proposedTargets, rationale, evidence) {
    const plans = this.getPlans().filter(p => p.status !== 'pending_user_approval');
    const activePlan = this.getActivePlan();
    const parts = activePlan ? activePlan.version.split('.') : ['1', '0'];
    const newVersion = `${parts[0]}.${parseInt(parts[1] || '0') + 1}`;

    const newPlan = {
      version: newVersion,
      status: 'pending_user_approval',
      createdAt: new Date().toISOString(),
      approvedAt: null,
      targets: { ...(activePlan ? activePlan.targets : {}), ...proposedTargets },
      notes: rationale,
      evidence
    };

    plans.push(newPlan);
    localStorage.setItem(this._keys.plans, JSON.stringify(plans));
    this.logAuditEvent({
      category: 'PLAN_PROPOSAL',
      event: `AI proposed new Plan v${newVersion}`,
      confidence: 'Medium-High',
      outcome: 'Awaiting User Approval'
    });
    return newPlan;
  }

  approvePendingPlan(version) {
    const plans = this.getPlans();
    let approvedPlan = null;

    const updated = plans.map(p => {
      if (p.version === version) {
        const u = { ...p, status: 'active', approvedAt: new Date().toISOString() };
        approvedPlan = u;
        return u;
      }
      if (p.status === 'active') return { ...p, status: 'archived' };
      return { ...p };
    });

    localStorage.setItem(this._keys.plans, JSON.stringify(updated));
    this.logAuditEvent({
      category: 'PLAN_APPROVAL',
      event: `User approved and activated Plan v${version}`,
      confidence: '100% Deterministic — User Explicit Approval',
      outcome: 'Plan Activated & Previous Version Archived'
    });
    return approvedPlan;
  }

  rejectPendingPlan(version, reason = 'User declined adjustment') {
    const plans = this.getPlans().filter(
      p => !(p.version === version && p.status === 'pending_user_approval')
    );
    localStorage.setItem(this._keys.plans, JSON.stringify(plans));
    this.logAuditEvent({
      category: 'PLAN_REJECTION',
      event: `User rejected proposed Plan v${version}`,
      confidence: 'User Explicit Action',
      outcome: `Recommendation Declined (${reason})`
    });
  }

  // ── Daily Logs ──────────────────────────────────────────────
  getLogs() {
    const logs = JSON.parse(localStorage.getItem(this._keys.logs) || '[]');
    return logs.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  saveDailyLog(logEntry) {
    const logs = this.getLogs();
    const idx = logs.findIndex(l => l.date === logEntry.date);
    logEntry.qualityFlags = this.checkLogQuality(logEntry);
    if (idx >= 0) {
      logs[idx] = { ...logs[idx], ...logEntry, updatedAt: new Date().toISOString() };
    } else {
      logEntry.createdAt = new Date().toISOString();
      logs.push(logEntry);
    }
    localStorage.setItem(this._keys.logs, JSON.stringify(logs));
    return logEntry;
  }

  deleteDailyLog(dateStr) {
    const logs = this.getLogs().filter(l => l.date !== dateStr);
    localStorage.setItem(this._keys.logs, JSON.stringify(logs));
  }

  checkLogQuality(entry) {
    const flags = [];
    if (!entry.meals || entry.meals.calories === 0) flags.push('Missing Meal Intake');
    if (!entry.sleepHours) flags.push('Missing Sleep Duration');
    if (!entry.weightKg) flags.push('Missing Weight Record');
    if (entry.sleepHours && (entry.sleepHours < 3 || entry.sleepHours > 16)) flags.push('Extreme Sleep Value');
    if (entry.meals && entry.meals.calories > 0 && entry.meals.calories < 800) flags.push('Unusually Low Calories (<800 kcal)');
    return flags;
  }

  // ── Audit Logs ──────────────────────────────────────────────
  getAuditLogs() {
    const key = this._keys?.audit || authStore.getUserDataKeys()?.audit || 'aura_guest_audit';
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
      return [];
    }
  }

  logAuditEvent(event) {
    const key = this._keys?.audit || authStore.getUserDataKeys()?.audit || 'aura_guest_audit';
    const logs = this.getAuditLogs();
    const item = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      category: event.category || 'SYSTEM',
      event: event.event || '',
      confidence: event.confidence || 'N/A',
      outcome: event.outcome || '',
      meta: event.meta || null
    };
    logs.unshift(item);
    localStorage.setItem(key, JSON.stringify(logs.slice(0, 100)));
    return item;
  }

  clearAuditLogs() {
    localStorage.setItem(this._keys.audit, JSON.stringify([]));
  }

  // ── Mock Dataset Seeder ────────────────────────────────────
  seedMockDataset() {
    const sampleLogs = [];
    const today = new Date();

    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const sleep = Math.round((6.5 + Math.random() * 2) * 10) / 10;
      const weight = Math.round((73.5 - (13 - i) * 0.1 + (Math.random() * 0.3 - 0.15)) * 10) / 10;
      const calories = Math.round(1950 + Math.random() * 400);
      const activity = Math.round(30 + Math.random() * 35);
      const mood = Math.min(10, Math.max(1, Math.round(sleep * 0.9 + (Math.random() * 2 - 1))));

      sampleLogs.push({
        date: dateStr,
        meals: {
          description: `Sample meal log day ${14 - i}: Oatmeal with berries, grilled chicken salad, brown rice & veggies.`,
          calories,
          protein: Math.round(calories * 0.25 / 4),
          carbs: Math.round(calories * 0.50 / 4),
          fat: Math.round(calories * 0.25 / 9),
          isAiEstimated: true,
          userCorrected: i === 5
        },
        sleepHours: i === 2 ? null : sleep,
        weightKg: weight,
        activityMins: activity,
        moodScore: mood,
        notes: i === 5 ? 'Felt energetic after morning jog.' : '',
        qualityFlags: i === 2 ? ['Missing Sleep Duration'] : [],
        createdAt: new Date().toISOString()
      });
    }

    localStorage.setItem(this._keys.logs, JSON.stringify(sampleLogs));
    this.logAuditEvent({
      category: 'DATA_SEED',
      event: 'Seeded 14-day realistic health history with deliberate missing data and 1 meal correction',
      confidence: '100%',
      outcome: 'Dataset Loaded'
    });
  }
}

// Singleton — must be bound after login via store.bind()
export const store = new AppStore();
