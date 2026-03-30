# Resume Analyzer Frontend (React + Vite)

This frontend connects to the existing Spring Boot backend.

## Features

- Resume upload with drag-and-drop
- Calls backend API: `POST /api/upload`
- Ranked job matching result cards
- Intelligent insights panel (best fit role, runner-up, skill-gap hints)
- No database usage

## Requirements

- Node.js 18+
- Backend running at `http://localhost:8080`

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173`

## Environment variable

Copy `.env.example` to `.env` if needed and change API URL:

```env
VITE_API_BASE_URL=http://localhost:8080
```
