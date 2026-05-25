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

## User flow

1. **Welcome** — Pick an assessment framework and confirm the backend agent is online.
2. **Chat** — Message the agent; it asks framework questions and extracts your answers.
3. **Assess** — Run scoring when questions are complete; results appear in a side panel.

## Development

```bash
cd ui
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
```

Open http://localhost:5173. The dev server proxies `/api` to the backend when `VITE_API_URL` is unset.

## Production (Render)

Deployed as static site `dra-ui` via root `render.yaml`. Set `VITE_API_URL` to the `dra-backend` hostname at build time.

## Backend API used

| Action | Endpoint |
|--------|----------|
| Health | `GET /health` |
| Frameworks | `GET /frameworks` |
| Start chat | `POST /sessions` |
| Send message | `POST /sessions/{id}/messages` |
| Run assessment | `POST /sessions/{id}/assess` |
