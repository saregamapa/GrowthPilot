/* ── Nav scroll ───────────────────────────────────────── */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

/* ── Reveal on scroll ────────────────────────────────── */
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revealObs.unobserve(e.target); } });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

/* ── Animated counters ───────────────────────────────── */
function runCounter(el) {
  const target = +el.dataset.count;
  const after  = el.dataset.after || '';
  const dur    = 1800;
  const steps  = 60;
  let   cur    = 0;
  const inc    = target / steps;
  const timer  = setInterval(() => {
    cur = Math.min(cur + inc, target);
    el.textContent = Math.round(cur) + after;
    if (cur >= target) clearInterval(timer);
  }, dur / steps);
}
const cntObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { runCounter(e.target); cntObs.unobserve(e.target); } });
}, { threshold: 0.5 });
document.querySelectorAll('[data-count]').forEach(el => cntObs.observe(el));

/* ── FAQ accordion ───────────────────────────────────── */
function toggleFaq(item) {
  const ans    = item.querySelector('.faq-a');
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => {
    i.classList.remove('open');
    i.querySelector('.faq-a').style.maxHeight = '0';
  });
  if (!isOpen) {
    item.classList.add('open');
    ans.style.maxHeight = ans.scrollHeight + 'px';
  }
}

/* ══════════════════════════════════════════════════════
   CHECKOUT MODAL — JS
══════════════════════════════════════════════════════ */

// ── Plan data: pricing cards always show monthly rate; checkout uses monthly vs discounted yearly total ──
function formatUsd(n) {
  return '$' + Number(n).toLocaleString('en-US');
}

const CO_PLANS = {
  starter: {
    name: 'Starter Plan',
    monthlyRate: 299,
    annualPrepayDiscount: 3050,
    features: [
      '3 platforms — Facebook, Instagram, Twitter',
      '2 posts per week',
      'Custom content creation',
      'Social media strategy',
      'Email support'
    ],
    payLink: {
      monthly: 'https://buy.stripe.com/3cI7sEc7O8WN2jsaDI1oI01',
      yearly:  'https://buy.stripe.com/3cI7sEc7O8WN2jsaDI1oI01' // 👉 replace with yearly link when available
    }
  },
  growth: {
    name: 'Growth Plan',
    monthlyRate: 349,
    annualPrepayDiscount: 3560,
    features: [
      '3 platforms — Facebook, Instagram, Twitter',
      '3 posts per week + 1 video / month',
      'Social media management & content creation',
      'Social account setup',
      'Ad campaign management (Business)'
    ],
    payLink: {
      monthly: 'https://buy.stripe.com/cNiaEQefW3Ct5vEdPU1oI02',
      yearly:  'https://buy.stripe.com/cNiaEQefW3Ct5vEdPU1oI02' // 👉 replace with yearly link when available
    }
  },
  pro: {
    name: 'Pro Plan',
    monthlyRate: 599,
    annualPrepayDiscount: 6110,
    features: [
      '3 platforms — Facebook, Instagram, Twitter',
      '5 posts per week + 2 videos / month',
      'Full social media management & strategy',
      'Social account setup & ad campaigns',
      'Monthly performance report'
    ],
    payLink: {
      monthly: 'https://buy.stripe.com/28EeV64Fmflb7DMfY21oI03',
      yearly:  'https://buy.stripe.com/28EeV64Fmflb7DMfY21oI03' // 👉 replace with yearly link when available
    }
  }
};

function coBillingSnapshot() {
  const p = CO_PLANS[coCurrentPlan];
  if (coBillingPeriod === 'yearly') {
    return {
      chip: 'Yearly',
      headerPrice: formatUsd(p.annualPrepayDiscount).replace('$', ''),
      headerPeriod: '/yr',
      badgeBilling: 'Yearly subscription · 15% off annual total',
      sumPrice: formatUsd(p.annualPrepayDiscount) + '/yr',
      sumSub: 'Annual total with 15% discount (vs 12 months at the list monthly rate).',
      sumCycle: 'Yearly',
      due: formatUsd(p.annualPrepayDiscount)
    };
  }
  return {
    chip: 'Monthly',
    headerPrice: String(p.monthlyRate),
    headerPeriod: '/mo',
    badgeBilling: 'Monthly subscription',
    sumPrice: '$' + p.monthlyRate + '/mo',
    sumSub: 'Recurring at the per-month rate shown on the pricing cards.',
    sumCycle: 'Monthly',
    due: formatUsd(p.monthlyRate)
  };
}

// ── State ─────────────────────────────────────────────────────────
let coCurrentPlan   = 'starter';
let coCurrentStep   = 1;
let coTotalSteps    = 3;
let coBillingPeriod = 'monthly'; // mirrors main page toggle

// ── Open / Close ──────────────────────────────────────────────────
function openCheckout(planKey) {
  coCurrentPlan = planKey || 'starter';
  // Detect current billing period from main pricing toggle
  const activeTab = document.querySelector('.pricing-billing-tab[aria-selected="true"]');
  coBillingPeriod = activeTab ? (activeTab.dataset.billing || 'monthly') : 'monthly';

  const recur = document.getElementById('co-recurring');
  if (recur) recur.checked = true;

  coCurrentStep = 1;
  coRenderBadge();
  coRenderSummary();
  coShowStep(1);

  const overlay = document.getElementById('co-overlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Focus first input after transition
  setTimeout(() => {
    const first = document.getElementById('co-fname');
    if (first) first.focus();
  }, 380);
}

function closeCheckout() {
  const overlay = document.getElementById('co-overlay');
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  // Clear validation errors
  document.querySelectorAll('.co-input.error').forEach(el => el.classList.remove('error'));
  document.querySelectorAll('.co-err-msg.show').forEach(el => el.classList.remove('show'));
}

// Close on overlay click (outside box)
document.getElementById('co-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeCheckout();
});

// Close on Escape
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && document.getElementById('co-overlay').classList.contains('open')) {
    closeCheckout();
  }
});

// ── Render helpers ────────────────────────────────────────────────
function coRenderBadge() {
  const plan = CO_PLANS[coCurrentPlan];
  const snap = coBillingSnapshot();
  const badge = document.getElementById('co-plan-badge');

  document.getElementById('co-badge-plan-name').textContent = plan.name;
  document.getElementById('co-badge-price').textContent     = snap.headerPrice;
  document.getElementById('co-badge-period').textContent    = snap.headerPeriod;
  document.getElementById('co-badge-billing').textContent   = snap.badgeBilling;

  badge.classList.toggle('featured-badge', coCurrentPlan === 'growth');
}

function coRenderSummary() {
  const plan = CO_PLANS[coCurrentPlan];
  const snap = coBillingSnapshot();

  document.getElementById('sum-plan-name').textContent     = plan.name;
  document.getElementById('sum-billing-chip').textContent    = snap.chip;
  document.getElementById('sum-price').textContent         = snap.sumPrice;
  document.getElementById('sum-price-sub').textContent     = snap.sumSub;
  document.getElementById('sum-cycle').textContent         = snap.sumCycle;
  document.getElementById('sum-due').textContent           = snap.due;

  const detailRow = document.getElementById('sum-price-detail-row');
  if (detailRow) detailRow.style.display = snap.sumSub ? '' : 'none';

  const recurDesc = document.getElementById('co-recurring-desc');
  if (recurDesc) {
    recurDesc.textContent = coBillingPeriod === 'yearly'
      ? 'When enabled, your plan renews automatically each year at the discounted yearly subscription price until you cancel.'
      : 'When enabled, your plan renews automatically each month at the monthly subscription price until you cancel.';
  }

  const feat = document.getElementById('sum-features');
  feat.innerHTML = '';
  plan.features.forEach(f => {
    const d = document.createElement('div');
    d.className = 'co-summary-feature';
    d.textContent = f;
    feat.appendChild(d);
  });
}

// ── Step navigation ────────────────────────────────────────────────
function coShowStep(n) {
  coCurrentStep = n;

  // Steps
  for (let i = 1; i <= coTotalSteps; i++) {
    const step = document.getElementById('co-step-' + i);
    if (step) step.classList.toggle('active', i === n);
  }

  // Progress dots
  for (let i = 1; i <= coTotalSteps; i++) {
    const dot = document.getElementById('dot-' + i);
    if (!dot) continue;
    dot.classList.remove('active', 'done');
    if (i < n)  dot.classList.add('done');
    if (i === n) dot.classList.add('active');
  }

  // Back button
  const back = document.getElementById('co-btn-back');
  back.hidden = (n === 1);

  // Next vs Pay button
  const next = document.getElementById('co-btn-next');
  const pay  = document.getElementById('co-btn-pay');
  if (n < coTotalSteps) {
    next.style.display = '';
    pay.style.display  = 'none';
    next.textContent   = n === 2 ? 'Review Order →' : 'Continue →';
  } else {
    next.style.display = 'none';
    pay.style.display  = '';
    coRenderSummary();
  }

  // Header sub-text
  const subTexts = {
    1: 'Step 1 of 3 — Tell us about yourself',
    2: 'Step 2 of 3 — Your social media profiles',
    3: 'Step 3 of 3 — Confirm & complete payment'
  };
  document.getElementById('co-header-sub').textContent = subTexts[n] || '';

  // Scroll modal to top
  document.getElementById('co-box').scrollTop = 0;
}

function coNext() {
  if (!coValidateStep(coCurrentStep)) return;
  if (coCurrentStep < coTotalSteps) {
    coShowStep(coCurrentStep + 1);
  }
}

function coBack() {
  if (coCurrentStep > 1) {
    coShowStep(coCurrentStep - 1);
  }
}

// ── Validation ────────────────────────────────────────────────────
function coValidateStep(step) {
  if (step === 1) {
    const rules = [
      { id: 'co-fname',    err: 'err-fname',    test: v => v.trim().length >= 1 },
      { id: 'co-lname',    err: 'err-lname',    test: v => v.trim().length >= 1 },
      { id: 'co-email',    err: 'err-email',    test: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) },
      { id: 'co-phone',    err: 'err-phone',    test: v => v.trim().length >= 7 },
      { id: 'co-company',  err: 'err-company',  test: v => v.trim().length >= 1 },
      { id: 'co-industry', err: 'err-industry', test: v => v !== '' }
    ];
    let ok = true;
    rules.forEach(r => {
      const el   = document.getElementById(r.id);
      const errEl = document.getElementById(r.err);
      const valid = r.test(el.value);
      el.classList.toggle('error', !valid);
      if (errEl) errEl.classList.toggle('show', !valid);
      if (!valid) ok = false;
    });
    if (!ok) {
      // Scroll to first error
      const firstErr = document.querySelector('#co-step-1 .co-input.error');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return ok;
  }
  // Step 2 — social media is fully optional, no validation needed
  if (step === 2) return true;
  return true;
}

// ── Payment redirect ───────────────────────────────────────────────
// Stores the final Stripe URL so the manual fallback link can reuse it
let _coStripeUrl = '';

function coPay() {
  const plan   = CO_PLANS[coCurrentPlan];
  const baseUrl = plan.payLink[coBillingPeriod]; // https://buy.stripe.com/…

  // Collect user details from Step 1
  const email   = document.getElementById('co-fname')    ? document.getElementById('co-email').value.trim()   : '';
  const fname   = document.getElementById('co-fname')    ? document.getElementById('co-fname').value.trim()   : '';
  const lname   = document.getElementById('co-lname')    ? document.getElementById('co-lname').value.trim()   : '';
  const company = document.getElementById('co-company')  ? document.getElementById('co-company').value.trim() : '';
  const industry= document.getElementById('co-industry') ? document.getElementById('co-industry').value       : '';

  // Build client_reference_id: only alphanumerics + hyphens (Stripe requirement)
  // Format: plan-billing-firstinitial_last  e.g. "growth-monthly-JSmith"
  const safeName    = (fname.slice(0,1) + lname).replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);
  const refId       = [coCurrentPlan, coBillingPeriod, safeName || 'user'].join('-');

  // Stripe Payment Link supported params:
  //   prefilled_email        → pre-fills the email field on Stripe's page
  //   client_reference_id    → passed through to webhook / dashboard for tracking
  const params = new URLSearchParams({
    prefilled_email:      email,
    client_reference_id:  refId
  });

  _coStripeUrl = baseUrl + '?' + params.toString();

  // 1️⃣ Put the Pay button into loading state
  const payBtn = document.getElementById('co-btn-pay');
  payBtn.classList.add('loading');

  // 2️⃣ Show the redirect overlay after a short delay (feels intentional, not accidental)
  setTimeout(function() {
    document.getElementById('co-redirect-overlay').classList.add('show');
  }, 400);

  // 3️⃣ Open Stripe in a new tab
  setTimeout(function() {
    window.open(_coStripeUrl, '_blank', 'noopener,noreferrer');
  }, 600);
}

// Fallback if popup was blocked
function coPayManual() {
  if (_coStripeUrl) {
    window.open(_coStripeUrl, '_blank', 'noopener,noreferrer');
  }
}

// Reset redirect overlay when modal is closed
const _origCloseCheckout = closeCheckout;
closeCheckout = function() {
  _origCloseCheckout();
  document.getElementById('co-redirect-overlay').classList.remove('show');
  const payBtn = document.getElementById('co-btn-pay');
  if (payBtn) payBtn.classList.remove('loading');
  _coStripeUrl = '';
};

/* ── Pricing billing toggle (monthly / yearly, 15% off annual) ── */
(function initPricingBilling() {
  const tabs = document.querySelectorAll('.pricing-billing-tab[data-billing]');
  const note = document.getElementById('pricing-billing-note');
  const panel = document.getElementById('pricing-grid');
  if (!tabs.length || !panel) return;

  function apply(billing) {
    const yearly = billing === 'yearly';
    panel.querySelectorAll('.pc-price[data-monthly]').forEach((pc) => {
      const amt = pc.querySelector('.pc-price-amt');
      const m = Number(pc.dataset.monthly);
      if (!amt || Number.isNaN(m)) return;
      const n = yearly ? Math.round(m * 0.85) : m;
      amt.textContent = n.toLocaleString('en-US');
    });
    tabs.forEach((t) => {
      const on = t.dataset.billing === billing;
      t.setAttribute('aria-selected', on);
      if (on) panel.setAttribute('aria-labelledby', t.id);
    });
    if (note) {
      note.innerHTML = billing === 'yearly'
        ? 'Prices on the cards are <strong>per month</strong>. The <strong>yearly discounted total</strong> is calculated in checkout when you choose Yearly.'
        : 'Prices shown are <strong>per month</strong>.';
    }

    const overlay = document.getElementById('co-overlay');
    if (overlay && overlay.classList.contains('open')) {
      coBillingPeriod = billing;
      if (typeof coRenderBadge === 'function') {
        coRenderBadge();
        coRenderSummary();
      }
    }
  }

  tabs.forEach((t) => {
    t.addEventListener('click', () => apply(t.dataset.billing));
  });

  apply(document.querySelector('.pricing-billing-tab[aria-selected="true"]')?.dataset.billing || 'monthly');
})();
