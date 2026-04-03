import express from 'express';
import cors from 'cors';

const PORT = Number(process.env.PORT) || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ALLOWED = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;
const buckets = new Map();

function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) {
    return xff.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function rateLimit(req, res, next) {
  const ip = clientIp(req);
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b || now > b.reset) {
    b = { count: 0, reset: now + RATE_WINDOW_MS };
    buckets.set(ip, b);
  }
  b.count += 1;
  if (b.count > RATE_MAX) {
    res.status(429).json({ error: 'Too many requests' });
    return;
  }
  next();
}

function dynamicCors() {
  return cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (ALLOWED.length === 0) {
        console.warn('ALLOWED_ORIGINS empty — refusing CORS for browser clients');
        return cb(new Error('CORS not configured'));
      }
      if (ALLOWED.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  });
}

const SYSTEM_INSTRUCTIONS = `You are the voice assistant for BrokerBoost, an AI-powered social media marketing service for professionals (real estate, legal, health, coaches, local businesses).

Help visitors learn about plans, pricing, and booking. Be warm, concise, and professional.

Plans (use these exact keys for tools): starter, growth, pro. Growth is the popular middle tier.

Billing: monthly or yearly. Yearly saves about 15%; prices shown on the site are per month. Before starting checkout, call set_billing_period if the user wants yearly or monthly so the UI matches.

Free strategy call: use open_scheduling to open Calendly in a new tab (https://calendly.com/growthp175/free-social-media-growth-strategy-call).

Payments: Never ask for credit card numbers by voice. Use start_checkout to open the checkout modal, guide the user through on-screen steps, and submit_checkout_payment only when they are on step 3 and ready — that opens Stripe where they enter the card safely.

Use scroll_to_section to jump to pricing, the main CTA, or FAQ when helpful.

If a tool fails, explain briefly and offer an alternative (e.g. they can tap buttons on the page).`;

const TOOLS = [
  {
    type: 'function',
    name: 'open_scheduling',
    description: 'Opens the Calendly booking page for a free social media strategy call in a new browser tab.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'scroll_to_section',
    description: 'Scrolls the page to a major section.',
    parameters: {
      type: 'object',
      properties: {
        section: {
          type: 'string',
          enum: ['pricing', 'cta', 'faq'],
          description: 'Section id: pricing, cta (main call-to-action), or faq.',
        },
      },
      required: ['section'],
    },
  },
  {
    type: 'function',
    name: 'set_billing_period',
    description: 'Sets monthly vs yearly pricing on the page (updates tabs and displayed prices).',
    parameters: {
      type: 'object',
      properties: {
        billing: {
          type: 'string',
          enum: ['monthly', 'yearly'],
        },
      },
      required: ['billing'],
    },
  },
  {
    type: 'function',
    name: 'start_checkout',
    description: 'Opens the multi-step checkout modal for a plan. Optionally set billing first.',
    parameters: {
      type: 'object',
      properties: {
        plan: {
          type: 'string',
          enum: ['starter', 'growth', 'pro'],
          description: 'Plan key matching site buttons.',
        },
        billing: {
          type: 'string',
          enum: ['monthly', 'yearly'],
          description: 'If provided, billing period is applied before opening checkout.',
        },
      },
      required: ['plan'],
    },
  },
  {
    type: 'function',
    name: 'checkout_go_to_step',
    description: 'Moves the checkout modal to step 1, 2, or 3 if the modal is open. Use to guide the user; they must confirm details on screen.',
    parameters: {
      type: 'object',
      properties: {
        step: { type: 'integer', enum: [1, 2, 3] },
      },
      required: ['step'],
    },
  },
  {
    type: 'function',
    name: 'submit_checkout_payment',
    description: 'If checkout is on step 3, triggers payment which opens Stripe. Card entry happens only on Stripe.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
];

const app = express();
app.use(express.json({ limit: '4kb' }));
app.use((req, res, next) => {
  const o = req.headers.origin;
  if (o) {
    if (ALLOWED.length === 0) {
      console.warn('[CORS] Request has Origin but ALLOWED_ORIGINS is empty — set it on Render.');
    } else if (!ALLOWED.includes(o)) {
      console.warn(
        `[CORS] Origin "${o}" not in ALLOWED_ORIGINS. Add this exact string in Render env. Allowed: ${ALLOWED.join(' | ')}`
      );
    }
  }
  next();
});
app.use(rateLimit);
app.use(dynamicCors());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/realtime/session', async (req, res) => {
  if (!OPENAI_API_KEY) {
    res.status(503).json({ error: 'Server missing OPENAI_API_KEY' });
    return;
  }

  // Flat session config — the body IS the session object (no wrapping).
  // model: must be a real Realtime model slug, not 'gpt-realtime'.
  // voice: must be one of alloy|ash|ballad|coral|echo|sage|shimmer|verse.
  const body = {
    model: 'gpt-4o-realtime-preview-2024-12-17',
    modalities: ['audio', 'text'],
    instructions: SYSTEM_INSTRUCTIONS,
    voice: 'verse',
    tools: TOOLS,
    tool_choice: 'auto',
  };

  try {
    const r = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await r.text();
    if (!r.ok) {
      console.error('OpenAI realtime/sessions error', r.status, text.slice(0, 500));
      res.status(502).json({ error: 'Failed to create realtime session' });
      return;
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      res.status(502).json({ error: 'Invalid response from OpenAI' });
      return;
    }

    // /v1/realtime/sessions returns { client_secret: { value, expires_at }, ... }
    const ephemeralKey = data?.client_secret?.value;
    if (!ephemeralKey) {
      console.error('Unexpected OpenAI response shape:', JSON.stringify(data).slice(0, 300));
      res.status(502).json({ error: 'No ephemeral credential in response' });
      return;
    }

    res.json({
      value: ephemeralKey,
      expires_at: data?.client_secret?.expires_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Session request failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Realtime token API listening on ${PORT}`);
});
