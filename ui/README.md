# UI

React + Vite front end for the Digital Resiliency Assistant.

## Development

```bash
npm install
npm run dev
```

Set `VITE_API_URL` to the backend (e.g. `http://localhost:8000` locally, or your `dra-backend` hostname on Render). On Render static deploys, this is set at **build time** from `render.yaml`. Host-only values get `https://` in the client. In local dev, `/api` is proxied when `VITE_API_URL` is unset.
