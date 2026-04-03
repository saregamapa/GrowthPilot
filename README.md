# GrowthPilot / BrokerBoost site

Static landing page (`index.html`) with an **ElevenLabs** conversational voice widget.

## Voice assistant (ElevenLabs)

The site embeds the official widget ([docs](https://elevenlabs.io/docs/conversational-ai/customization/widget)):

- **Agent ID** and optional **branch ID** are set on the `<elevenlabs-convai>` element in `index.html`.
- The agent must be **public** with authentication disabled (Advanced tab in ElevenLabs).
- Add your production domain(s) to the agent **Security → allowlist** so the widget can load on your site.
- Styling (orb colors, button text) is set via HTML attributes; more options are available in the [widget customization](https://elevenlabs.io/docs/conversational-ai/customization/widget) guide.

## Deploy on Render

`render.yaml` defines the static site only. Connect the repo and deploy.
