# GrowthPilot / BrokerBoost site

Static landing page (`index.html`) with optional **live voice assistant** powered by the OpenAI Realtime API (browser WebRTC).

## Voice assistant setup

1. **Deploy the token API** — The `server/` Node service exposes `POST /api/realtime/session`. It uses your OpenAI key to create a short-lived client secret; the browser never sees the full API key.
2. **Configure Render (or any host)** — Set environment variables on the Node service:
   - **`OPENAI_API_KEY`** — Standard OpenAI API key (server only).
   - **`ALLOWED_ORIGINS`** — Comma-separated list of exact origins allowed to call the API from the browser, e.g. `https://your-static-site.onrender.com,https://www.brokerboost.ai`.
3. **Point the static site at the API** — In `index.html`, set `window.BROKERBOOST_REALTIME_API` to the public URL of the Node service (no trailing slash), e.g. `https://growthpilot-realtime-api.onrender.com`. Leave empty only for local development if you proxy `/api/realtime/session` to the token server.
4. **Rotate keys** — Rotate `OPENAI_API_KEY` in the dashboard; redeploy if needed. Ephemeral tokens are minted per session and expire per OpenAI defaults (this app requests a 600s client secret TTL).

## Changing the assistant behavior

- **System prompt and tools** — Edit `server/index.js` (`SYSTEM_INSTRUCTIONS` and `TOOLS`). Tool names and shapes must stay aligned with handlers in `voice-agent.js`.
- **Health check** — `GET /health` on the token service returns `{ "ok": true }`.

## Blueprint

`render.yaml` defines two services: the static site and the Node token API under `rootDir: server`.
