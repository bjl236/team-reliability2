# Front end (React + Vite)
`npm install && npm run build` writes `dist/`, which `app/app.py` serves at `/`. Commit `dist/`: Posit Connect does not run a Node build.
Dev: start the API (`cd app && python -m uvicorn app:app --port 8000`), then `npm run dev` (proxies `/api` to port 8000).
All URLs are relative, so the app works under any path prefix.
