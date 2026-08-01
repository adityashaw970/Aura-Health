// Main Application Controller — AuraHealth
// Handles auth routing, all tab views, AI agent, summaries & plan approval

import { authStore } from '../auth/auth.js';
import { store } from '../db/store.js';
import { DeterministicEngine } from '../engine/deterministic.js';
import { MealEstimator } from '../engine/mealEstimator.js';
import { AiReviewAgent } from '../engine/aiAgent.js';
import { UiRenderer } from './components.js';
import { AiService } from '../services/ai.service.js';
import { initLandingEnhancements, showToast } from './landing-ui.js';

// ═══════════════════════════════════════════════════════════
// AUTH ROUTER — decides which screen to show
// ═══════════════════════════════════════════════════════════
class AuthRouter {
  constructor() {
    this.appController = null;
    this.init();
  }

  init() {
    this.bindLandingButtons();
    this.bindAuthForms();
    this.initApiKeyModal();
    this.initLandingPlayground();

    // Initialize premium visual enhancements
    initLandingEnhancements();

    if (authStore.isLoggedIn()) {
      this.enterApp();
    } else {
      this.showScreen('landing');
    }
  }

  showScreen(name) {
    ['landing', 'auth', 'app'].forEach(s => {
      document.getElementById(`screen-${s}`)?.classList.remove('active');
    });
    document.getElementById(`screen-${name}`)?.classList.add('active');
  }

  enterApp() {
    try {
      store.bind();
    } catch {
      authStore.logout();
      this.showScreen('landing');
      return;
    }
    this.showScreen('app');
    if (!this.appController) {
      this.appController = new AppController();
    } else {
      this.appController.reload();
    }
  }

  // ── Landing Page Buttons ──────────────────────────────────
  bindLandingButtons() {
    const goSignup = () => {
      this.showScreen('auth');
      this.switchAuthTab('signup');
    };
    const goLogin = () => {
      this.showScreen('auth');
      this.switchAuthTab('login');
    };

    ['btn-goto-signup-nav', 'btn-goto-signup-hero', 'btn-goto-signup-cta'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', goSignup);
    });

    document.getElementById('btn-goto-login')?.addEventListener('click', goLogin);
    document.getElementById('btn-auth-back')?.addEventListener('click', () => this.showScreen('landing'));

    // Demo: load app as guest with mock data
    document.getElementById('btn-demo')?.addEventListener('click', () => {
      // Auto-register + login a demo account if not exists
      const demoEmail = 'demo@aurahealth.ai';
      const demoPass = 'demo1234';
      let result = authStore.login(demoEmail, demoPass);
      if (!result.success) {
        result = authStore.register({
          name: 'Demo User',
          email: demoEmail,
          password: demoPass,
          age: 30,
          gender: 'other',
          heightCm: 170,
          startWeightKg: 73,
          targetWeightKg: 68
        });
        if (result.success) authStore.login(demoEmail, demoPass);
      }
      this.enterApp();
      // Seed demo data after a tick
      setTimeout(() => {
        store.seedMockDataset();
        if (this.appController) this.appController.reload();
      }, 100);
    });
  }

  // ── Gemini API Key Modal Management ──────────────────────
  initApiKeyModal() {
    const modal = document.getElementById('modal-apikey');
    const openBtn = document.getElementById('btn-open-apikey-modal');
    const closeBtn = document.getElementById('btn-close-apikey-modal');
    const saveBtn = document.getElementById('btn-save-key');
    const clearBtn = document.getElementById('btn-clear-key');
    const inputKey = document.getElementById('input-gemini-api-key');
    const feedbackMsg = document.getElementById('apikey-feedback-msg');
    const statusText = document.getElementById('nav-key-status-text');

    const updateKeyUI = () => {
      const key = AiService.getApiKey();
      const statusTitle = document.getElementById('status-title-text');
      const statusSub = document.getElementById('status-sub-text');
      const statusDot = document.getElementById('status-dot');

      if (key) {
        if (statusText) statusText.textContent = 'API Key Set ✓';
        if (statusTitle) statusTitle.textContent = 'Custom Gemini Key Active';
        if (statusSub) statusSub.textContent = 'Connected directly to Google Gemini API';
        if (statusDot) statusDot.className = 'status-indicator-dot green';
      } else {
        if (statusText) statusText.textContent = 'API Key';
        if (statusTitle) statusTitle.textContent = 'Gemini System Engine Active';
        if (statusSub) statusSub.textContent = 'Using local engine / system fallback key';
        if (statusDot) statusDot.className = 'status-indicator-dot green';
      }
    };

    openBtn?.addEventListener('click', () => {
      if (modal) {
        modal.style.display = 'flex';
        const existing = localStorage.getItem('aura_gemini_api_key') || '';
        if (inputKey) inputKey.value = existing;
        if (feedbackMsg) feedbackMsg.style.display = 'none';
        updateKeyUI();
      }
    });

    closeBtn?.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
    });

    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });

    saveBtn?.addEventListener('click', () => {
      const val = inputKey.value.trim();
      if (!val) {
        AiService.clearApiKey();
        if (feedbackMsg) {
          feedbackMsg.textContent = 'Key removed. Using local fallback engine.';
          feedbackMsg.className = 'modal-feedback-msg success';
          feedbackMsg.style.display = 'block';
        }
      } else {
        AiService.setApiKey(val);
        if (feedbackMsg) {
          feedbackMsg.textContent = 'Google Gemini API Key saved successfully!';
          feedbackMsg.className = 'modal-feedback-msg success';
          feedbackMsg.style.display = 'block';
        }
      }
      updateKeyUI();
      if (val) showToast('✨ Google Gemini API Key saved! Live AI is ready.', 'success');
      else showToast('Key removed. Using local engine fallback.', 'info');
      setTimeout(() => { if (modal) modal.style.display = 'none'; }, 1000);
    });

    clearBtn?.addEventListener('click', () => {
      AiService.clearApiKey();
      if (inputKey) inputKey.value = '';
      if (feedbackMsg) {
        feedbackMsg.textContent = 'Key removed.';
        feedbackMsg.className = 'modal-feedback-msg success';
        feedbackMsg.style.display = 'block';
      }
      updateKeyUI();
      showToast('API Key removed. Local fallback engine active.', 'info');
    });

    updateKeyUI();
  }

  // ── Gemini AI Landing Playground Events ───────────────────
  initLandingPlayground() {
    // Smooth scroll button
    document.getElementById('btn-scroll-playground')?.addEventListener('click', () => {
      document.getElementById('ai-playground')?.scrollIntoView({ behavior: 'smooth' });
    });

    // Tab switching
    const tabEst = document.getElementById('pg-tab-estimator');
    const tabAgent = document.getElementById('pg-tab-agent');
    const contentEst = document.getElementById('pg-content-estimator');
    const contentAgent = document.getElementById('pg-content-agent');

    tabEst?.addEventListener('click', () => {
      tabEst.classList.add('active');
      tabAgent?.classList.remove('active');
      if (contentEst) contentEst.style.display = 'block';
      if (contentAgent) contentAgent.style.display = 'none';
    });

    tabAgent?.addEventListener('click', () => {
      tabAgent.classList.add('active');
      tabEst?.classList.remove('active');
      if (contentAgent) contentAgent.style.display = 'block';
      if (contentEst) contentEst.style.display = 'none';
    });

    // Meal Estimator Execution
    const btnEstimate = document.getElementById('pg-btn-estimate');
    const inputMeal = document.getElementById('pg-meal-input');

    const runMealParse = async (mealText) => {
      if (!mealText) return;
      if (btnEstimate) {
        btnEstimate.disabled = true;
        btnEstimate.innerHTML = '<span>⚡ Estimating with Gemini…</span>';
      }

      try {
        const res = await MealEstimator.estimateMealAsync(mealText);
        document.getElementById('pg-meal-calories').textContent = res.calories;
        document.getElementById('pg-meal-protein').textContent = res.protein + 'g';
        document.getElementById('pg-meal-carbs').textContent = res.carbs + 'g';
        document.getElementById('pg-meal-fat').textContent = res.fat + 'g';

        // Bar percentage calculations
        const totalGrams = (res.protein * 4) + (res.carbs * 4) + (res.fat * 9) || 1;
        document.getElementById('pg-bar-protein').style.width = Math.min(100, Math.round((res.protein * 4 / totalGrams) * 100)) + '%';
        document.getElementById('pg-bar-carbs').style.width = Math.min(100, Math.round((res.carbs * 4 / totalGrams) * 100)) + '%';
        document.getElementById('pg-bar-fat').style.width = Math.min(100, Math.round((res.fat * 9 / totalGrams) * 100)) + '%';

        if (res.advice) {
          document.getElementById('pg-meal-advice').textContent = `"${res.advice}"`;
        }
        document.getElementById('pg-meal-confidence').textContent = `${res.confidence}% ${res.confidence >= 80 ? 'High Confidence' : 'Moderate Confidence'}`;

        const engineBadge = document.getElementById('pg-meal-engine-badge');
        if (engineBadge) {
          engineBadge.textContent = res.isGemini ? '✨ Gemini 2.5 Flash' : '🤖 Aura Local Engine';
        }
        if (res.isGemini) {
          showToast('✨ Gemini AI estimated your meal nutrients!', 'success', 3000);
        }
      } catch (err) {
        console.warn('Playground meal estimation error:', err);
        showToast('Estimation failed — using local fallback.', 'warning', 3500);
      } finally {
        if (btnEstimate) {
          btnEstimate.disabled = false;
          btnEstimate.innerHTML = '<span>⚡ Parse with Gemini AI</span>';
        }
      }
    };

    btnEstimate?.addEventListener('click', () => {
      runMealParse(inputMeal?.value.trim());
    });

    inputMeal?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') runMealParse(inputMeal?.value.trim());
    });

    document.querySelectorAll('.pg-preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const meal = chip.getAttribute('data-meal');
        if (inputMeal && meal) {
          inputMeal.value = meal;
          runMealParse(meal);
        }
      });
    });

    // AI Agent Sandbox Execution
    const btnAsk = document.getElementById('pg-btn-ask-agent');
    const inputQuery = document.getElementById('pg-agent-input');

    const runAgentQuery = async (queryText) => {
      if (!queryText) return;
      if (btnAsk) {
        btnAsk.disabled = true;
        btnAsk.innerHTML = '<span>🤖 Querying Gemini…</span>';
      }

      try {
        let res;
        if (AiService.hasApiKey()) {
          res = await AiService.processQueryWithGemini(queryText);
        }
        if (!res) {
          const agent = new AiReviewAgent(store);
          res = agent.processUserQuery(queryText);
        }

        const responseEl = document.getElementById('pg-agent-response-text');
        const statusBadge = document.getElementById('pg-agent-status-badge');
        const citationBox = document.getElementById('pg-agent-citation-box');
        const citationText = document.getElementById('pg-agent-citation-text');

        if (responseEl) {
          let htmlText = res.text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n\n/g, '<br><br>');
          responseEl.innerHTML = htmlText;
        }

        if (statusBadge) {
          if (res.isGuardrailTriggered) {
            statusBadge.textContent = '🛡️ Guardrail Triggered';
            statusBadge.style.background = 'rgba(244, 63, 94, 0.15)';
            statusBadge.style.color = '#f43f5e';
            statusBadge.style.borderColor = 'rgba(244, 63, 94, 0.3)';
          } else {
            statusBadge.textContent = res.isGemini ? '✨ Gemini AI Response' : '🤖 Aura Health Agent';
            statusBadge.style.background = 'rgba(6, 182, 212, 0.12)';
            statusBadge.style.color = '#06b6d4';
            statusBadge.style.borderColor = 'rgba(6, 182, 212, 0.3)';
          }
        }

        if (citationBox && citationText) {
          if (res.evidence) {
            citationBox.style.display = 'flex';
            citationText.textContent = `Citation: ${res.evidence.title} (${res.evidence.citation})`;
          } else {
            citationBox.style.display = 'flex';
            citationText.textContent = res.isGuardrailTriggered ? 'Medical Safety Boundary Policy v2.4 Active' : 'Citation: Evidence-Based Clinical Wellness Protocol';
          }
        }

      } catch (err) {
        console.warn('Playground agent query error:', err);
        showToast('Query failed — try rephrasing your question.', 'error', 3500);
      } finally {
        if (btnAsk) {
          btnAsk.disabled = false;
          btnAsk.innerHTML = '<span>🤖 Query Agent</span>';
        }
      }
    };

    btnAsk?.addEventListener('click', () => {
      runAgentQuery(inputQuery?.value.trim());
    });

    inputQuery?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') runAgentQuery(inputQuery?.value.trim());
    });

    document.querySelectorAll('.pg-preset-prompt').forEach(btn => {
      btn.addEventListener('click', () => {
        const q = btn.getAttribute('data-query');
        if (inputQuery && q) {
          inputQuery.value = q;
          runAgentQuery(q);
        }
      });
    });
  }

  // ── Auth Tab Switching ────────────────────────────────────
  switchAuthTab(tab) {
    const loginForm = document.getElementById('auth-login-form');
    const signupForm = document.getElementById('auth-signup-form');
    const loginTab = document.getElementById('tab-login-btn');
    const signupTab = document.getElementById('tab-signup-btn');

    if (tab === 'login') {
      loginForm.style.display = 'block';
      signupForm.style.display = 'none';
      loginTab.classList.add('active');
      signupTab.classList.remove('active');
    } else {
      loginForm.style.display = 'none';
      signupForm.style.display = 'block';
      loginTab.classList.remove('active');
      signupTab.classList.add('active');
    }
  }

  // ── Auth Forms ────────────────────────────────────────────
  bindAuthForms() {
    document.getElementById('tab-login-btn')?.addEventListener('click', () => this.switchAuthTab('login'));
    document.getElementById('tab-signup-btn')?.addEventListener('click', () => this.switchAuthTab('signup'));
    document.getElementById('goto-signup-from-login')?.addEventListener('click', () => this.switchAuthTab('signup'));
    document.getElementById('goto-login-from-signup')?.addEventListener('click', () => this.switchAuthTab('login'));

    // Password visibility toggles
    document.querySelectorAll('.auth-pwd-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (input) input.type = input.type === 'password' ? 'text' : 'password';
      });
    });

    // Password strength indicator
    const pwdInput = document.getElementById('signup-password');
    const strengthFill = document.getElementById('pwd-strength-fill');
    if (pwdInput && strengthFill) {
      pwdInput.addEventListener('input', () => {
        const val = pwdInput.value;
        let score = 0;
        if (val.length >= 6) score++;
        if (val.length >= 10) score++;
        if (/[A-Z]/.test(val)) score++;
        if (/[0-9]/.test(val)) score++;
        if (/[^A-Za-z0-9]/.test(val)) score++;
        const pct = (score / 5) * 100;
        const colors = ['#f43f5e', '#f43f5e', '#f59e0b', '#10b981', '#10b981'];
        strengthFill.style.width = `${pct}%`;
        strengthFill.style.background = colors[Math.max(0, score - 1)] || '#f43f5e';
      });
    }

    // Profile toggle accordion
    const profileToggle = document.getElementById('toggle-profile-fields');
    const profileFields = document.getElementById('profile-fields');
    if (profileToggle && profileFields) {
      profileToggle.addEventListener('click', () => {
        const isOpen = profileFields.style.display !== 'none';
        profileFields.style.display = isOpen ? 'none' : 'block';
        profileToggle.classList.toggle('open', !isOpen);
      });
    }

    // LOGIN form
    document.getElementById('form-login')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const errEl = document.getElementById('login-error');
      const btn = document.getElementById('btn-login-submit');

      if (!email || !password) {
        this.showAuthError(errEl, 'Please enter your email and password.');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span>Signing in…</span>';

      setTimeout(() => {
        const result = authStore.login(email, password);
        if (result.success) {
          this.enterApp();
          document.getElementById('form-login').reset();
        } else {
          this.showAuthError(errEl, result.error);
          btn.disabled = false;
          btn.innerHTML = '<span>Sign In to AuraHealth</span>';
        }
      }, 300);
    });

    // SIGN UP form
    document.getElementById('form-signup')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const errEl = document.getElementById('signup-error');
      const btn = document.getElementById('btn-signup-submit');

      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;

      if (!name) { this.showAuthError(errEl, 'Please enter your full name.'); return; }
      if (!email || !email.includes('@')) { this.showAuthError(errEl, 'Please enter a valid email address.'); return; }
      if (password.length < 6) { this.showAuthError(errEl, 'Password must be at least 6 characters.'); return; }

      btn.disabled = true;
      btn.innerHTML = '<span>Creating account…</span>';

      setTimeout(() => {
        const result = authStore.register({
          name,
          email,
          password,
          age: document.getElementById('signup-age').value,
          gender: document.getElementById('signup-gender').value,
          heightCm: document.getElementById('signup-height').value,
          startWeightKg: document.getElementById('signup-weight').value,
          targetWeightKg: document.getElementById('signup-target').value
        });

        if (result.success) {
          // Auto-login after registration
          authStore.login(email, password);
          this.enterApp();
          document.getElementById('form-signup').reset();
          // Welcome toast
          setTimeout(() => {
            if (this.appController) {
              this.appController.showToast(`Welcome to AuraHealth, ${name}! 🎉 Start by logging your first daily entry.`, 'success');
            }
          }, 400);
        } else {
          this.showAuthError(errEl, result.error);
          btn.disabled = false;
          btn.innerHTML = '<span>Create Account & Start Tracking</span>';
        }
      }, 300);
    });
  }

  showAuthError(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
  }
}

// ═══════════════════════════════════════════════════════════
// APP CONTROLLER — runs after successful auth
// ═══════════════════════════════════════════════════════════
class AppController {
  constructor() {
    this.agent = new AiReviewAgent(store);
    this.activeSummaryPeriod = 7;
    this.currentAiEstimation = null;
    this.init();
  }

  init() {
    // Set today's date
    const dateInput = document.getElementById('log-date');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    this.bindNavigation();
    this.bindFormEvents();
    this.bindActionButtons();
    this.bindAiEvents();

    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to sign out?')) {
        authStore.logout();
        window.location.reload();
      }
    });

    this.reload();
  }

  reload() {
    const session = authStore.getSession();
    if (session) {
      const nameParts = session.name ? session.name.split(' ') : ['?'];
      const initials = nameParts.map(p => p[0]).join('').toUpperCase().slice(0, 2);
      const avatarEl = document.getElementById('user-avatar-initials');
      const nameEl = document.getElementById('profile-display-name');
      if (avatarEl) avatarEl.textContent = initials;
      if (nameEl) nameEl.textContent = session.name;
    }

    this.agent = new AiReviewAgent(store);
    this.renderAllViews();

    requestAnimationFrame(() => requestAnimationFrame(() => this.renderSummariesTab()));
  }

  // ─── Navigation ────────────────────────────────────────────
  bindNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-tab]');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetTab = item.getAttribute('data-tab');
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
        document.getElementById(targetTab)?.classList.add('active');

        if (targetTab === 'tab-summaries') this.renderSummariesTab();
        else if (targetTab === 'tab-plans') this.renderPlansTab();
        else if (targetTab === 'tab-audit') this.renderAuditLogsTab();
        else if (targetTab === 'tab-dashboard') {
          this.renderRecentLogsTable();
          this.renderActivePlanHeader();
        }
      });
    });
  }

  // ─── Form Events ──────────────────────────────────────────
  bindFormEvents() {
    // Mood slider live display
    const moodInput = document.getElementById('input-mood');
    const moodValSpan = document.getElementById('mood-val');
    if (moodInput && moodValSpan) {
      moodInput.addEventListener('input', () => {
        moodValSpan.textContent = `${moodInput.value} / 10`;
      });
    }

    // AI Meal Estimator
    const estimateBtn = document.getElementById('btn-estimate-meal');
    const mealTextarea = document.getElementById('meal-description');
    if (estimateBtn && mealTextarea) {
      estimateBtn.addEventListener('click', async () => {
        const text = mealTextarea.value.trim();
        if (!text) { alert('Please describe your meals before estimating.'); return; }
        estimateBtn.textContent = 'Estimating with Gemini…';
        estimateBtn.disabled = true;
        
        try {
          const estimate = await MealEstimator.estimateMealAsync(text);
          this.currentAiEstimation = { ...estimate };
          document.getElementById('meal-estimation-box')?.classList.remove('hidden');
          document.getElementById('ai-confidence').textContent = `Confidence: ${estimate.confidence}% ${estimate.isGemini ? '(✨ Gemini 2.5)' : '(Local)'}`;
          document.getElementById('meal-calories').value = estimate.calories;
          document.getElementById('meal-protein').value = estimate.protein;
          document.getElementById('meal-carbs').value = estimate.carbs;
          document.getElementById('meal-fat').value = estimate.fat;
          const corrFlag = document.getElementById('correction-flag');
          if (corrFlag) corrFlag.style.display = 'none';
          store.logAuditEvent({
            category: 'AI_MEAL_ESTIMATE',
            event: `AI estimated macros for: "${text.substring(0, 40)}..."`,
            confidence: `${estimate.confidence}% (${estimate.isGemini ? 'Gemini AI' : 'Local'})`,
            outcome: `Calories: ${estimate.calories} kcal | P:${estimate.protein}g C:${estimate.carbs}g F:${estimate.fat}g`
          });
        } catch (err) {
          console.warn('Meal estimation error:', err);
        } finally {
          estimateBtn.textContent = 'Estimate with AI';
          estimateBtn.disabled = false;
        }
      });
    }

    // Calorie correction detection
    document.getElementById('meal-calories')?.addEventListener('input', (e) => {
      const corrFlag = document.getElementById('correction-flag');
      if (corrFlag && this.currentAiEstimation && parseInt(e.target.value) !== this.currentAiEstimation.calories) {
        corrFlag.style.display = 'flex';
      } else if (corrFlag) {
        corrFlag.style.display = 'none';
      }
    });

    // Daily Log Submit
    document.getElementById('daily-log-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const date = document.getElementById('log-date').value;
      if (!date) { alert('Please select a log date.'); return; }

      const calories = parseInt(document.getElementById('meal-calories').value) || 0;
      const weight = parseFloat(document.getElementById('input-weight').value) || null;
      const sleep = parseFloat(document.getElementById('input-sleep').value) || null;
      const activity = parseInt(document.getElementById('input-activity').value) || null;
      const mood = parseInt(document.getElementById('input-mood').value) || 7;

      if (sleep !== null && (sleep < 0 || sleep > 24)) { alert('Sleep must be between 0–24 hours.'); return; }
      if (weight !== null && (weight < 20 || weight > 500)) { alert('Weight looks unusual (20–500 kg).'); return; }
      if (calories > 0 && calories < 300) {
        if (!confirm(`Logged calories (${calories} kcal) are very low. Correct?`)) return;
      }

      const userCorrected = !!(this.currentAiEstimation && calories > 0 && calories !== this.currentAiEstimation.calories);
      if (userCorrected) {
        store.logAuditEvent({
          category: 'USER_MEAL_CORRECTION',
          event: `User overrode AI calorie estimate: AI=${this.currentAiEstimation.calories} → User=${calories} on ${date}`,
          confidence: 'User Direct Override',
          outcome: 'Correction Recorded'
        });
      }

      store.saveDailyLog({
        date,
        meals: {
          description: document.getElementById('meal-description').value.trim(),
          calories,
          protein: parseInt(document.getElementById('meal-protein').value) || 0,
          carbs: parseInt(document.getElementById('meal-carbs').value) || 0,
          fat: parseInt(document.getElementById('meal-fat').value) || 0,
          isAiEstimated: !!this.currentAiEstimation,
          aiOriginalCalories: this.currentAiEstimation?.calories ?? null,
          userCorrected
        },
        weightKg: weight,
        sleepHours: sleep,
        activityMins: activity,
        moodScore: mood,
        notes: document.getElementById('input-notes').value.trim()
      });

      // Button feedback
      const saveBtn = document.getElementById('btn-save-log');
      if (saveBtn) {
        const orig = saveBtn.innerHTML;
        saveBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>Saved!</span>';
        saveBtn.style.background = 'var(--accent-emerald)';
        setTimeout(() => { saveBtn.innerHTML = orig; saveBtn.style.background = ''; }, 1600);
      }

      this.currentAiEstimation = null;
      document.getElementById('meal-estimation-box')?.classList.add('hidden');
      this.renderAllViews();
    });
  }

  // ─── Action Buttons ────────────────────────────────────────
  bindActionButtons() {
    document.getElementById('btn-seed-data')?.addEventListener('click', () => {
      if (confirm('Load 14-day mock dataset? Existing logs will be replaced.')) {
        store.seedMockDataset();
        this.renderAllViews();
        requestAnimationFrame(() => this.renderSummariesTab());
      }
    });

    document.getElementById('btn-quick-log')?.addEventListener('click', () => {
      document.getElementById('nav-dashboard')?.click();
      setTimeout(() => document.getElementById('meal-description')?.focus(), 100);
    });

    // Period filter buttons
    document.querySelectorAll('[data-period]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-period]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeSummaryPeriod = parseInt(btn.getAttribute('data-period'));
        this.renderSummariesTab();
      });
    });

    document.getElementById('btn-clear-audit-logs')?.addEventListener('click', () => {
      if (confirm('Clear all audit logs?')) { store.clearAuditLogs(); this.renderAuditLogsTab(); }
    });

    document.getElementById('btn-manual-new-plan')?.addEventListener('click', () => {
      const activePlan = store.getActivePlan();
      const cal = prompt('New daily calorie target (kcal):', String(activePlan?.targets?.dailyCalories || 2000));
      if (cal === null) return;
      const val = parseInt(cal);
      if (isNaN(val) || val <= 0) { alert('Enter a valid calorie number.'); return; }
      if (val < 1200) { alert('⚠️ Safety: Targets below 1,200 kcal/day are restricted without medical supervision.'); return; }
      store.proposeNewPlan({ dailyCalories: val }, `Manual plan: calorie target → ${val} kcal/day`, 'User manual input via plan management.');
      this.renderPlansTab();
      document.getElementById('nav-plans')?.click();
    });
  }

  // ─── AI Agent Events ───────────────────────────────────────
  bindAiEvents() {
    document.getElementById('btn-run-ai-review')?.addEventListener('click', () => {
      const btn = document.getElementById('btn-run-ai-review');
      btn.disabled = true;
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg><span>Analyzing…</span>`;
      setTimeout(() => {
        this.runAiRetrospective();
        btn.disabled = false;
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/><path d="M10 8l6 4-6 4V8z"/></svg><span>Generate Retrospective &amp; Plan Review</span>`;
      }, 400);
    });

    const sendQueryBtn = document.getElementById('btn-send-ai-query');
    const queryInput = document.getElementById('ai-user-query');

    if (sendQueryBtn && queryInput) {
      const handleSend = async () => {
        const q = queryInput.value.trim();
        if (!q) return;
        sendQueryBtn.disabled = true;
        try {
          const resp = await this.agent.processUserQueryAsync(q);
          this.renderAiQueryResponse(q, resp);
          queryInput.value = '';
          if (resp.suggestedPlan) this.renderPlansTab();
        } finally {
          sendQueryBtn.disabled = false;
        }
      };
      sendQueryBtn.addEventListener('click', handleSend);
      queryInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleSend(); });
    }

    document.querySelectorAll('.quick-prompt-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        const qi = document.getElementById('ai-user-query');
        const sb = document.getElementById('btn-send-ai-query');
        if (qi && sb) { qi.value = tag.getAttribute('data-prompt'); sb.click(); }
      });
    });
  }

  // ─── AI Retrospective ──────────────────────────────────────
  runAiRetrospective() {
    const logs = store.getLogs();
    if (logs.length === 0) {
      this.showAiOutputMessage('ℹ️ No health logs recorded yet. Add daily entries or load the 14-day mock dataset to start.');
      return;
    }

    const retro = this.agent.generateRetrospective(this.activeSummaryPeriod);
    const container = document.getElementById('ai-review-output');
    if (!container) return;

    container.innerHTML = `
      <div class="card glass-card retrospective-card">
        <div class="card-header">
          <div>
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20"/><path d="m17 5-9.5 7h5.5l-5 8"/></svg>
              Past ${retro.periodDays}-Day Longitudinal Retrospective
            </h3>
            <span class="text-muted" style="font-size:12px;">Generated ${new Date(retro.generatedAt).toLocaleString()}</span>
          </div>
        </div>

        <div class="retro-section">
          <div class="retro-section-title retro-fact-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Empirical Recorded Facts (No AI Inference)
          </div>
          <ul class="retro-list">${retro.facts.map(f => `<li class="fact-item">${f}</li>`).join('')}</ul>
        </div>

        <div class="retro-section">
          <div class="retro-section-title retro-interp-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            AI Interpretations (Hypotheses — Not Confirmed Medical Facts)
          </div>
          <ul class="retro-list">
            ${retro.interpretations.map((interp, idx) => {
              const cit = retro.evidenceCitations[idx] || retro.evidenceCitations[0];
              return `<li class="interp-item">
                ${interp.text}
                <div>
                  <span class="evidence-tag" data-citation-idx="${idx}">
                    📚 ${cit ? cit.title : 'Clinical Guidelines'}
                  </span>
                </div>
              </li>`;
            }).join('')}
          </ul>
        </div>

        <div class="retro-section">
          <div class="retro-section-title retro-question-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Targeted Follow-up Questions
          </div>
          <ul class="retro-list">${retro.followUpQuestions.map(q => `<li>❓ ${q}</li>`).join('')}</ul>
        </div>

        ${retro.suggestedPlanAdjustment ? `
          <div class="retro-section" style="background:rgba(139,92,246,0.08);padding:18px;border-radius:12px;border:1px solid rgba(139,92,246,0.25);">
            <div class="retro-section-title retro-plan-title">💡 Suggested Plan Adjustment (Requires Your Approval — Not Yet Active)</div>
            <p style="font-size:14px;margin-bottom:10px;line-height:1.6;">${retro.suggestedPlanAdjustment.rationale}</p>
            <span class="evidence-tag" style="display:inline-flex;margin-bottom:14px;">📚 ${retro.suggestedPlanAdjustment.evidence}</span>
            <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">
              <button class="btn btn-primary btn-sm" id="btn-propose-retro-plan">Propose for Approval</button>
            </div>
            <p style="font-size:11px;color:var(--text-muted);margin-top:10px;">⚠️ Suggestion only. Does not constitute medical advice.</p>
          </div>
        ` : ''}
      </div>
    `;

    container.querySelectorAll('.evidence-tag[data-citation-idx]').forEach(tag => {
      tag.addEventListener('click', () => {
        const cit = retro.evidenceCitations[parseInt(tag.getAttribute('data-citation-idx'))] || retro.evidenceCitations[0];
        if (cit) alert(`📚 ${cit.title}\n${cit.citation}\n\n${cit.summary}`);
      });
    });

    document.getElementById('btn-propose-retro-plan')?.addEventListener('click', () => {
      store.proposeNewPlan(retro.suggestedPlanAdjustment.proposedTargets, retro.suggestedPlanAdjustment.rationale, retro.suggestedPlanAdjustment.evidence);
      this.renderPlansTab();
      document.getElementById('nav-plans')?.click();
    });
  }

  showAiOutputMessage(msg) {
    const c = document.getElementById('ai-review-output');
    if (c) c.innerHTML = `<div class="card glass-card placeholder-box"><p class="text-muted">${msg}</p></div>`;
  }

  renderAiQueryResponse(query, response) {
    const container = document.getElementById('ai-review-output');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'card glass-card';
    div.style.borderLeft = response.isGuardrailTriggered ? '4px solid var(--accent-rose)' : '4px solid var(--accent-cyan)';
    div.style.animation = 'fadeIn 0.3s ease';
    div.innerHTML = `
      <div style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <strong style="color:var(--text-secondary);font-size:12px;">YOUR QUERY</strong>
        ${response.isGuardrailTriggered ? '<span class="status-pill status-pending">🛡️ Guardrail</span>' : ''}
      </div>
      <div style="font-size:14px;color:var(--text-secondary);margin-bottom:10px;padding:8px 12px;background:rgba(0,0,0,0.2);border-radius:8px;">"${query}"</div>
      <div style="font-size:14px;white-space:pre-wrap;line-height:1.7;">${response.text}</div>
      ${response.evidence ? `<span class="evidence-tag" style="margin-top:12px;" onclick="alert('📚 ${response.evidence.title}\\n${response.evidence.citation}\\n\\n${response.evidence.summary}')">📚 ${response.evidence.title}</span>` : ''}
      ${response.suggestedPlan ? `
        <div style="margin-top:14px;padding:12px;background:rgba(139,92,246,0.1);border-radius:8px;border:1px solid rgba(139,92,246,0.2);">
          <strong style="font-size:13px;">📋 Plan Proposal Created — Awaiting Your Approval</strong>
          <p style="font-size:12px;color:var(--text-secondary);margin-top:4px;">The adjustment is pending and will NOT take effect until you approve it.</p>
          <button class="btn btn-sm btn-primary" style="margin-top:8px;" onclick="document.getElementById('nav-plans').click()">Review & Approve →</button>
        </div>
      ` : ''}
    `;

    const placeholder = container.querySelector('.placeholder-box');
    if (placeholder) placeholder.remove();
    container.prepend(div);
  }

  // ─── Master Render Coordinator ─────────────────────────────
  renderAllViews() {
    this.renderActivePlanHeader();
    this.renderRecentLogsTable();
    this.renderPlansTab();
    this.renderAuditLogsTab();
  }

  renderActivePlanHeader() {
    const p = store.getActivePlan();
    if (!p) return;
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('active-plan-version-tag', `Plan v${p.version} Active`);
    el('active-plan-status', `v${p.version} Active`);
    el('target-calories-val', `${p.targets.dailyCalories.toLocaleString()} kcal`);
    el('target-sleep-val', `${p.targets.dailySleep} hrs`);
    el('target-activity-val', `${p.targets.dailyActivityMins} mins/day`);
    el('target-weight-val', `${p.targets.targetWeightKg} kg`);
    const det = document.getElementById('active-plan-details');
    if (det) det.innerHTML = `
      <div style="font-size:13px;font-weight:700;color:var(--accent-emerald);margin-bottom:6px;">Active Plan v${p.version}</div>
      <p style="font-size:12px;color:var(--text-secondary);line-height:1.6;">${p.notes}</p>
      <p style="font-size:11px;color:var(--text-muted);margin-top:6px;">Approved: ${p.approvedAt ? new Date(p.approvedAt).toLocaleDateString() : 'N/A'}</p>
    `;
  }

  renderRecentLogsTable() {
    const logs = store.getLogs();
    const tbody = document.getElementById('recent-logs-tbody');
    const countSpan = document.getElementById('total-logs-count');
    if (!tbody) return;
    if (countSpan) countSpan.textContent = `${logs.length} log${logs.length !== 1 ? 's' : ''} recorded`;

    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:36px;color:var(--text-muted);"><div style="font-size:18px;margin-bottom:8px;">📋</div>No health logs yet.<br><span style="font-size:12px;">Click <strong>New Daily Entry</strong> or <strong>Load 14-Day Demo Data</strong> to begin.</span></td></tr>`;
      return;
    }

    tbody.innerHTML = logs.map(l => {
      const isMissing = l.qualityFlags && l.qualityFlags.length > 0;
      const qLabel = isMissing ? `⚠️ ${l.qualityFlags[0]}` : '✓ Clean';
      return `<tr>
        <td><strong>${l.date}</strong></td>
        <td>${l.meals?.calories > 0 ? `<div style="font-weight:600;">${l.meals.calories.toLocaleString()} kcal</div><div style="font-size:11px;color:var(--text-muted);">P:${l.meals.protein}g C:${l.meals.carbs}g F:${l.meals.fat}g</div>${l.meals.userCorrected ? '<span style="font-size:10px;color:var(--accent-amber);font-weight:600;">✏️ AI Override</span>' : ''}` : '<span style="color:var(--text-muted);font-style:italic;">Not recorded</span>'}</td>
        <td>${l.weightKg ? `<strong>${l.weightKg}</strong> kg` : '—'}</td>
        <td>${l.sleepHours ? `${l.sleepHours} hrs` : '—'}</td>
        <td>${l.activityMins ? `${l.activityMins} min` : '—'}</td>
        <td><span class="range-badge">${l.moodScore != null ? l.moodScore + '/10' : '—'}</span></td>
        <td><span class="status-pill ${isMissing ? 'status-pending' : 'status-active'}">${qLabel}</span></td>
        <td><button class="btn btn-sm btn-danger" onclick="window.appController.deleteLog('${l.date}')">Delete</button></td>
      </tr>`;
    }).join('');
  }

  deleteLog(dateStr) {
    if (confirm(`Delete log for ${dateStr}?`)) {
      store.logAuditEvent({ category: 'USER_LOG_DELETION', event: `Deleted daily log for ${dateStr}`, confidence: 'User Explicit Action', outcome: 'Removed' });
      store.deleteDailyLog(dateStr);
      this.renderAllViews();
    }
  }

  renderSummariesTab() {
    const logs = store.getLogs();
    const activePlan = store.getActivePlan();
    if (!activePlan) return;

    const summary = DeterministicEngine.computeSummary(logs, activePlan, this.activeSummaryPeriod);

    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('summary-avg-calories', summary.avgCalories > 0 ? `${summary.avgCalories.toLocaleString()} kcal` : '--');

    const calDiffEl = document.getElementById('summary-calorie-diff');
    if (calDiffEl) {
      if (!summary.avgCalories) { calDiffEl.textContent = 'No calorie data'; calDiffEl.className = 'stat-sub neutral'; }
      else {
        const s = summary.calorieDiff > 0 ? '+' : '';
        calDiffEl.textContent = `${s}${summary.calorieDiff} kcal vs target`;
        calDiffEl.className = Math.abs(summary.calorieDiff) > 300 ? 'stat-sub negative' : 'stat-sub';
      }
    }

    el('summary-avg-sleep', summary.avgSleep > 0 ? `${summary.avgSleep} hrs` : '--');
    const sleepDiffEl = document.getElementById('summary-sleep-diff');
    if (sleepDiffEl) {
      sleepDiffEl.textContent = summary.avgSleep > 0 ? `${summary.sleepDiff >= 0 ? '+' : ''}${summary.sleepDiff} hrs vs goal` : 'No sleep data';
      sleepDiffEl.className = summary.sleepDiff >= 0 ? 'stat-sub' : 'stat-sub negative';
    }

    el('summary-weight-change', summary.startWeight !== null ? `${summary.weightChangeKg >= 0 ? '+' : ''}${summary.weightChangeKg} kg` : '--');
    const velEl = document.getElementById('summary-weight-velocity');
    if (velEl) velEl.textContent = summary.weightVelocityWeeklyKg !== 0 ? `${summary.weightVelocityWeeklyKg > 0 ? '▲' : '▼'} ${Math.abs(summary.weightVelocityWeeklyKg)} kg/week` : '→ 0.0 kg/week';

    el('summary-completeness', `${summary.completenessPct}%`);
    el('summary-missing-days', `${summary.missingDays} missing day${summary.missingDays !== 1 ? 's' : ''}`);

    const badge = document.getElementById('missing-data-badge');
    if (badge) {
      badge.classList.toggle('hidden', summary.missingDays === 0);
      badge.textContent = `${summary.missingDays} Missing`;
    }

    const alertsContainer = document.getElementById('quality-alerts-container');
    if (alertsContainer) {
      if (summary.inconsistencies.length > 0) {
        alertsContainer.innerHTML = summary.inconsistencies.map(inc => `
          <div style="background:rgba(${inc.severity==='info'?'6,182,212':'244,63,94'},0.08);border:1px solid rgba(${inc.severity==='info'?'6,182,212':'244,63,94'},0.25);padding:14px 18px;border-radius:12px;margin-bottom:12px;display:flex;align-items:flex-start;gap:12px;">
            <span style="font-size:18px;flex-shrink:0;">${inc.severity==='info'?'ℹ️':'⚠️'}</span>
            <div>
              <strong style="font-size:14px;">${inc.type}: ${inc.title}</strong>
              <p style="font-size:13px;color:var(--text-secondary);margin-top:4px;line-height:1.6;">${inc.message}</p>
            </div>
          </div>`).join('');
      } else if (logs.length > 0) {
        alertsContainer.innerHTML = `<div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);padding:12px 18px;border-radius:12px;margin-bottom:12px;display:flex;align-items:center;gap:10px;"><span>✅</span><span style="font-size:13px;color:var(--accent-emerald);font-weight:600;">No inconsistencies or data quality issues detected.</span></div>`;
      } else {
        alertsContainer.innerHTML = '';
      }
    }

    requestAnimationFrame(() => {
      UiRenderer.renderCalorieWeightChart('chart-calories-weight', summary.chronological, activePlan.targets.dailyCalories);
      UiRenderer.renderSleepMoodChart('chart-sleep-mood', summary.chronological);
    });
  }

  renderPlansTab() {
    const plans = store.getPlans();
    const pendingPlan = store.getPendingPlan();
    const pendingCard = document.getElementById('pending-plan-card');
    const badge = document.getElementById('plan-pending-badge');

    if (pendingPlan) {
      if (badge) badge.style.display = 'inline-block';
      if (pendingCard) {
        pendingCard.classList.remove('hidden');
        pendingCard.innerHTML = `
          <div class="card glass-card" style="border:2px solid var(--accent-amber);background:rgba(245,158,11,0.06);">
            <div class="card-header">
              <h3 style="color:var(--accent-amber);">⚠️ Pending Plan Recommendation — Requires Your Approval</h3>
              <span class="status-pill status-pending">v${pendingPlan.version} Proposed</span>
            </div>
            <div style="font-size:14px;margin-bottom:14px;">
              <strong>Proposed Targets:</strong>&nbsp;
              Calories: <strong>${pendingPlan.targets.dailyCalories.toLocaleString()} kcal</strong> |
              Sleep: <strong>${pendingPlan.targets.dailySleep} hrs</strong> |
              Activity: <strong>${pendingPlan.targets.dailyActivityMins}m/day</strong>
            </div>
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:10px;line-height:1.6;"><strong>Rationale:</strong> ${pendingPlan.notes}</p>
            <span class="evidence-tag" style="margin-bottom:16px;display:inline-flex;">📚 ${pendingPlan.evidence}</span>
            <p style="font-size:11px;color:var(--text-muted);margin-bottom:14px;">⚠️ This plan will NOT become active until you explicitly approve it below. Previous version is preserved.</p>
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
              <button class="btn btn-success" onclick="window.appController.approvePlan('${pendingPlan.version}')">✓ Approve & Activate v${pendingPlan.version}</button>
              <button class="btn btn-danger" onclick="window.appController.rejectPlan('${pendingPlan.version}')">✕ Reject Recommendation</button>
            </div>
          </div>`;
      }
    } else {
      if (badge) badge.style.display = 'none';
      if (pendingCard) pendingCard.classList.add('hidden');
    }

    const timeline = document.getElementById('plan-history-timeline');
    if (!timeline) return;
    const sorted = [...plans].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (!sorted.length) { timeline.innerHTML = '<p class="text-muted" style="padding:16px;">No plan versions yet.</p>'; return; }

    timeline.innerHTML = sorted.map(p => {
      const sLabel = p.status === 'active' ? 'ACTIVE' : p.status === 'pending_user_approval' ? 'PENDING APPROVAL' : 'ARCHIVED';
      const sClass = p.status === 'pending_user_approval' ? 'pending' : p.status;
      return `<div class="timeline-item ${p.status === 'active' ? 'active' : ''}">
        <div class="timeline-dot"></div>
        <div class="timeline-card">
          <div class="flex-row-between" style="margin-bottom:10px;">
            <strong style="font-size:16px;">Plan v${p.version}</strong>
            <span class="status-pill status-${sClass}">${sLabel}</span>
          </div>
          <div style="font-size:13px;color:var(--text-secondary);display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px;">
            <span>🔥 ${p.targets.dailyCalories.toLocaleString()} kcal/day</span>
            <span>😴 ${p.targets.dailySleep} hrs</span>
            <span>🏃 ${p.targets.dailyActivityMins}m</span>
            <span>⚖️ Goal: ${p.targets.targetWeightKg}kg</span>
          </div>
          <p style="font-size:12px;color:var(--text-muted);margin-bottom:6px;line-height:1.5;">${p.notes}</p>
          <div style="font-size:11px;color:var(--text-muted);">Created: ${new Date(p.createdAt).toLocaleString()}${p.approvedAt ? ` · Approved: ${new Date(p.approvedAt).toLocaleString()}` : ''}</div>
        </div>
      </div>`;
    }).join('');
  }

  approvePlan(version) {
    store.approvePendingPlan(version);
    this.renderAllViews();
    this.showToast(`✅ Plan v${version} is now active!`, 'success');
  }

  rejectPlan(version) {
    const reason = prompt('Why are you rejecting this recommendation? (optional)', 'Does not fit my current goals');
    store.rejectPendingPlan(version, reason || 'User declined');
    this.renderAllViews();
    this.showToast(`Proposed Plan v${version} was rejected and removed.`, 'warning');
  }

  renderAuditLogsTab() {
    const logs = store.getAuditLogs();
    const tbody = document.getElementById('audit-logs-tbody');
    if (!tbody) return;
    if (!logs.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:36px;color:var(--text-muted);"><div style="font-size:18px;margin-bottom:8px;">🔍</div>No audit events yet. They're recorded automatically as you use the system.</td></tr>`;
      return;
    }
    const catColors = { AI_MEAL_ESTIMATE:'#06b6d4', USER_MEAL_CORRECTION:'#f59e0b', SAFETY_GUARDRAIL_TRIGGER:'#f43f5e', PLAN_PROPOSAL:'#8b5cf6', PLAN_APPROVAL:'#10b981', PLAN_REJECTION:'#f43f5e', AI_RETROSPECTIVE:'#6366f1', AI_CHAT_QUERY:'#6366f1', DATA_SEED:'#9ca3af', USER_LOG_DELETION:'#f59e0b', SYSTEM:'#6b7280' };
    tbody.innerHTML = logs.map(l => {
      const color = catColors[l.category] || '#6b7280';
      return `<tr>
        <td style="font-family:var(--font-mono);font-size:11px;white-space:nowrap;color:var(--text-muted);">${new Date(l.timestamp).toLocaleString()}</td>
        <td><span class="status-pill" style="background:${color}22;color:${color};border:1px solid ${color}44;">${l.category}</span></td>
        <td style="max-width:280px;font-size:13px;">${l.event}</td>
        <td><span class="confidence-badge">${l.confidence}</span></td>
        <td style="font-size:12px;color:var(--accent-cyan);font-weight:600;">${l.outcome}</td>
      </tr>`;
    }).join('');
  }

  showToast(message, type = 'info') {
    document.getElementById('aura-toast')?.remove();
    const toast = document.createElement('div');
    toast.id = 'aura-toast';
    const colors = { success: '#10b981', warning: '#f59e0b', error: '#f43f5e', info: '#6366f1' };
    toast.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;background:rgba(18,26,44,0.95);backdrop-filter:blur(12px);border:1px solid ${colors[type]};border-radius:12px;padding:14px 20px;color:#fff;font-size:14px;font-weight:500;box-shadow:0 8px 32px rgba(0,0,0,0.4);font-family:inherit;animation:fadeIn 0.3s ease;max-width:360px;`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }
}

// ═══════════════════════════════════════════════════════════
// Bootstrap
// ═══════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  const router = new AuthRouter();
  // Expose appController globally for inline onclick handlers
  Object.defineProperty(window, 'appController', {
    get: () => router.appController
  });
});
