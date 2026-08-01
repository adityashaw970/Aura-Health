// ═══════════════════════════════════════════════════════════
// AuraHealth — Landing Page UI Enhancement Module
// scroll-reveal, nav shadow, counter animation, toast system,
// Gemini API key status bar, particle effects
// ═══════════════════════════════════════════════════════════

import { AiService } from '../services/ai.service.js';

// ── Gemini Status Bar ─────────────────────────────────────
function updateGeminiStatusBar() {
  const bar = document.getElementById('gemini-status-bar');
  if (!bar) return;
  if (AiService.hasApiKey()) {
    bar.classList.add('active');
  } else {
    bar.classList.remove('active');
  }
}

// ── Toast Notification System ──────────────────────────────
export function showToast(msg, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: '✨' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || '💬'}</span>
    <span class="toast-msg">${msg}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Nav Scroll Shadow ─────────────────────────────────────
function initNavScroll() {
  const nav = document.querySelector('.land-nav');
  if (!nav) return;
  
  const onScroll = () => {
    if (window.scrollY > 60) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
}

// ── Scroll-Reveal Animation ────────────────────────────────
function initScrollReveal() {
  // Mark all revealable elements
  const selectors = [
    '.feature-card',
    '.evidence-card',
    '.fh-card',
    '.step-item',
    '.safety-inner',
    '.pg-input-box',
    '.pg-output-box',
    '.section-title',
    '.section-subtitle',
    '.section-label',
    '.how-section h2',
    '.playground-container h2',
    '.fact-hypo-section h2',
    '.fact-hypo-section p.section-subtitle'
  ];

  const elements = [];

  // Feature cards — staggered reveal
  document.querySelectorAll('.feature-card').forEach((el, i) => {
    el.classList.add('reveal');
    el.classList.add(`reveal-d${Math.min(i + 1, 6)}`);
    elements.push(el);
  });

  // Evidence cards
  document.querySelectorAll('.evidence-card').forEach((el, i) => {
    el.classList.add('reveal');
    el.classList.add(`reveal-d${Math.min(i + 1, 4)}`);
    elements.push(el);
  });

  // Fact vs hypothesis cards
  const fhCards = document.querySelectorAll('.fh-card');
  fhCards.forEach((el, i) => {
    el.classList.add(i === 0 ? 'reveal-left' : 'reveal-right');
    elements.push(el);
  });

  // Steps
  document.querySelectorAll('.step-item').forEach((el, i) => {
    el.classList.add('reveal');
    el.classList.add(`reveal-d${Math.min(i + 1, 4)}`);
    elements.push(el);
  });

  // Playground panels
  document.querySelectorAll('.pg-input-box, .pg-output-box').forEach((el, i) => {
    el.classList.add(i === 0 ? 'reveal-left' : 'reveal-right');
    el.style.transitionDelay = '0.1s';
    elements.push(el);
  });

  // Section headers
  document.querySelectorAll('.section-title, .section-label, .section-subtitle').forEach(el => {
    el.classList.add('reveal');
    elements.push(el);
  });

  // Safety inner
  const safetyInner = document.querySelector('.safety-inner');
  if (safetyInner) {
    safetyInner.classList.add('reveal');
    elements.push(safetyInner);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  elements.forEach(el => observer.observe(el));
}

// ── Animated Number Counter ────────────────────────────────
function animateCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.getAttribute('data-count'));
          const suffix = el.getAttribute('data-count-suffix') || '';
          const duration = 1500;
          const stepTime = 16;
          const steps = Math.floor(duration / stepTime);
          let current = 0;
          const increment = target / steps;

          const timer = setInterval(() => {
            current = Math.min(current + increment, target);
            el.textContent = Math.round(current) + suffix;
            if (current >= target) {
              clearInterval(timer);
              el.textContent = target + suffix;
            }
          }, stepTime);

          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.3 }
  );

  counters.forEach(el => observer.observe(el));
}

// ── Gemini Playground Loading State ───────────────────────
export function showPlaygroundSkeleton(outputId) {
  const el = document.getElementById(outputId);
  if (!el) return;
  const responseArea = el.querySelector('#pg-agent-response-text');
  if (responseArea) {
    responseArea.innerHTML = `
      <div class="pg-skeleton-line skeleton"></div>
      <div class="pg-skeleton-line skeleton"></div>
      <div class="pg-skeleton-line skeleton"></div>
    `;
  }
}

// ── Smooth Scroll for Landing Nav Links ───────────────────
function initSmoothScroll() {
  document.querySelectorAll('a.land-nav-link[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const targetId = anchor.getAttribute('href').slice(1);
      const target = document.getElementById(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ── Floating Particle Micro-animation ────────────────────
function initParticles() {
  const heroSection = document.querySelector('.hero-section');
  if (!heroSection) return;

  const particleContainer = document.createElement('div');
  particleContainer.style.cssText = `
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
    z-index: 0;
  `;

  const PARTICLE_COUNT = 18;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = document.createElement('div');
    const size = Math.random() * 3 + 1;
    const x = Math.random() * 100;
    const delay = Math.random() * 8;
    const duration = 8 + Math.random() * 12;
    const opacity = 0.15 + Math.random() * 0.25;
    const colors = ['rgba(99,102,241,', 'rgba(6,182,212,', 'rgba(139,92,246,', 'rgba(16,185,129,'];
    const color = colors[Math.floor(Math.random() * colors.length)] + opacity + ')';

    p.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: 50%;
      left: ${x}%;
      bottom: -10px;
      animation: particle-rise ${duration}s ${delay}s ease-in infinite;
    `;
    particleContainer.appendChild(p);
  }

  heroSection.insertBefore(particleContainer, heroSection.firstChild);

  // Inject keyframe
  if (!document.getElementById('particle-keyframes')) {
    const style = document.createElement('style');
    style.id = 'particle-keyframes';
    style.textContent = `
      @keyframes particle-rise {
        0%   { opacity: 0; transform: translateY(0px) scale(0.5); }
        10%  { opacity: 1; }
        90%  { opacity: 0.4; }
        100% { opacity: 0; transform: translateY(-110vh) scale(1.5) rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
}

// ── Typing Effect for AI Preview Message ──────────────────
function initTypingEffect() {
  const el = document.querySelector('.preview-ai-msg');
  if (!el) return;
  
  const fullText = el.textContent;
  el.textContent = '';
  el.style.borderRight = '2px solid rgba(99,102,241,0.6)';

  let i = 0;
  const delay = 2000; // wait 2s before starting
  setTimeout(() => {
    const interval = setInterval(() => {
      if (i <= fullText.length) {
        el.textContent = fullText.slice(0, i);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          el.style.borderRight = 'none';
        }, 600);
      }
    }, 40);
  }, delay);
}

// ── Interactive Hover Glow on Preview Cards ──────────────
function initCardHoverGlow() {
  document.querySelectorAll('.preview-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mouse-x', `${x}%`);
      card.style.setProperty('--mouse-y', `${y}%`);
    });
  });
}

// ── Update API Key Status in Nav & Status Bar ─────────────
function updateApiKeyUIAll() {
  updateGeminiStatusBar();
  const statusText = document.getElementById('nav-key-status-text');
  if (statusText) {
    if (AiService.hasApiKey()) {
      statusText.textContent = 'API Key ✓';
      statusText.style.color = '#10b981';
    } else {
      statusText.textContent = 'API Key';
      statusText.style.color = '';
    }
  }
}

// ── Main Initialization ────────────────────────────────────
export function initLandingEnhancements() {
  // Init on DOM ready
  initNavScroll();
  initSmoothScroll();
  initScrollReveal();
  animateCounters();
  initParticles();
  updateApiKeyUIAll();

  // Slight delay for typing effect (let hero render first)
  setTimeout(initTypingEffect, 600);
  setTimeout(initCardHoverGlow, 300);

  // Re-check API key status periodically in case user saves key
  setInterval(updateApiKeyUIAll, 2000);

  // Listen for storage events (key saved in modal)
  window.addEventListener('storage', updateApiKeyUIAll);

  console.log('[AuraHealth] Landing enhancements loaded ✨');
}
