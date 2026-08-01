// Authentication Store for AuraHealth
// Handles multi-user account creation, login sessions, and profile persistence

const AUTH_KEYS = {
  USERS: 'aura_users_registry',
  SESSION: 'aura_active_session'
};

export class AuthStore {
  constructor() {}

  // ── Registry helpers ──────────────────────────────────────────
  _getUsers() {
    return JSON.parse(localStorage.getItem(AUTH_KEYS.USERS) || '[]');
  }

  _saveUsers(users) {
    localStorage.setItem(AUTH_KEYS.USERS, JSON.stringify(users));
  }

  // ── Account Creation ─────────────────────────────────────────
  register({ name, email, password, age, gender, heightCm, startWeightKg, targetWeightKg }) {
    const users = this._getUsers();
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) return { success: false, error: 'An account with this email already exists.' };

    const uid = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const hashedPwd = this._simpleHash(password);

    const newUser = {
      uid,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: hashedPwd,
      age: parseInt(age) || null,
      gender: gender || '',
      heightCm: parseFloat(heightCm) || null,
      startWeightKg: parseFloat(startWeightKg) || null,
      targetWeightKg: parseFloat(targetWeightKg) || null,
      createdAt: new Date().toISOString(),
      // Per-user data storage keys
      dataKeys: {
        plans: `aura_plans_${uid}`,
        logs: `aura_logs_${uid}`,
        audit: `aura_audit_${uid}`
      }
    };

    users.push(newUser);
    this._saveUsers(users);

    // Seed default plans for new user
    this._initUserData(newUser);

    return { success: true, user: this._safeUser(newUser) };
  }

  // ── Login ─────────────────────────────────────────────────────
  login(email, password) {
    const users = this._getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user) return { success: false, error: 'No account found with this email address.' };

    const hash = this._simpleHash(password);
    if (hash !== user.passwordHash) return { success: false, error: 'Incorrect password. Please try again.' };

    const session = {
      uid: user.uid,
      name: user.name,
      email: user.email,
      dataKeys: user.dataKeys,
      loginAt: new Date().toISOString()
    };

    localStorage.setItem(AUTH_KEYS.SESSION, JSON.stringify(session));
    return { success: true, user: this._safeUser(user), session };
  }

  // ── Logout ────────────────────────────────────────────────────
  logout() {
    localStorage.removeItem(AUTH_KEYS.SESSION);
  }

  // ── Session Retrieval ─────────────────────────────────────────
  getSession() {
    return JSON.parse(localStorage.getItem(AUTH_KEYS.SESSION) || 'null');
  }

  isLoggedIn() {
    return !!this.getSession();
  }

  // ── Per-user Storage Key Resolver ────────────────────────────
  getUserDataKeys() {
    const session = this.getSession();
    if (!session) return null;
    return session.dataKeys;
  }

  // ── Initialize New User Default Data ─────────────────────────
  _initUserData(user) {
    const defaultPlans = [
      {
        version: '1.0',
        status: 'active',
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        targets: {
          dailyCalories: 2000,
          dailySleep: 8.0,
          dailyActivityMins: 40,
          targetWeightKg: user.targetWeightKg || 70.0
        },
        notes: 'Initial baseline plan created on account setup.',
        evidence: 'Standard energy expenditure baseline based on Harris-Benedict BMR equation.'
      }
    ];

    if (!localStorage.getItem(user.dataKeys.plans)) {
      localStorage.setItem(user.dataKeys.plans, JSON.stringify(defaultPlans));
    }
    if (!localStorage.getItem(user.dataKeys.logs)) {
      localStorage.setItem(user.dataKeys.logs, JSON.stringify([]));
    }
    if (!localStorage.getItem(user.dataKeys.audit)) {
      localStorage.setItem(user.dataKeys.audit, JSON.stringify([]));
    }
  }

  // ── Utilities ─────────────────────────────────────────────────
  _safeUser(user) {
    const { passwordHash, ...safe } = user;
    return safe;
  }

  // Simple deterministic string hash (NOT for real-world security — demo only)
  _simpleHash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
      hash = hash & hash; // convert to 32-bit
    }
    return hash.toString(16);
  }
}

export const authStore = new AuthStore();
