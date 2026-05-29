# UI module

User-facing web application for chatting with the Digital Resiliency backend agent.

## Module layout

```
ui/
├── src/
│   ├── components/
│   │   ├── layout/       # App shell
│   │   ├── setup/        # Welcome & framework selection
│   │   ├── chat/         # Messages, composer, typing indicator
│   │   ├── assessment/   # Results panel
│   │   └── common/       # Connection status, progress
│   ├── hooks/            # useChatSession, useAutoScroll
│   ├── services/         # agentApi — talks to backend gateway
│   ├── lib/              # API base URL resolution
│   └── styles/           # global + chat styles
├── package.json
└── vite.config.ts
```

## User flow (people-first UX)

Designed around practical usability: one clear goal per screen, supportive microcopy, visible progress, and accessible defaults.

1. **Choose framework** — Single primary action; connection status and plain-language errors.
2. **Answer questions** — Step indicator + progress bar; Enter to send; helpful empty states.
3. **View results** — Plain labels (“Gap found”, “On track”), success confirmation, optional hide panel.

See `src/lib/userMessages.ts` for shared copy and friendly error text.

## Development

```bash
cd ui
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
```

Open http://localhost:5173. The dev server proxies `/api` to the backend when `VITE_API_URL` is unset.

## Production (Render)

Deployed as static site `dra-ui` via root `render.yaml`. `VITE_API_URL` is wired to `dra-backend` in the blueprint (`fromService` + `RENDER_EXTERNAL_URL`). After changing `render.yaml`, sync the blueprint (Vite bakes the URL at build time).

## Backend API used

| Action | Endpoint |
|--------|----------|
| Health | `GET /health` |
| Frameworks | `GET /frameworks` |
| Start chat | `POST /sessions` |
| Send message | `POST /sessions/{id}/messages` |
| Run assessment | `POST /sessions/{id}/assess` |
