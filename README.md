# AI Table Analyzer

Small full-stack portfolio project: **upload CSV/XLSX → parse the table → preview rows → ask an AI a question → show the answer in the browser**.

Built as a practical AI-assisted development exercise for a real interview-style task.

## What it demonstrates

- HTML/CSS/JavaScript web UI;
- Node.js + Express backend;
- multipart file upload;
- CSV/XLS/XLSX parsing with SheetJS;
- REST API + JSON;
- server-side AI API integration (API key never goes to the browser);
- input validation and useful error handling;
- deterministic demo mode when no AI key is configured;
- small automated tests with `node:test`.

## Architecture

```text
Browser
  ↓ file upload
POST /api/parse
  ↓
Express + Multer + SheetJS
  ↓ JSON rows
Browser preview
  ↓ question + rows
POST /api/analyze
  ↓
Demo analyzer OR AI API
  ↓
Answer in browser
```

## Run locally

Requirements: Node.js 20+.

```bash
npm install
npm start
```

Open `http://localhost:3000`.

The app works immediately in **demo mode** without an API key.

## Connect an AI model

Copy `.env.example` to `.env` and set:

```text
AI_API_KEY=your_key_here
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_MODEL=your_model_name
```

`AI_API_URL` is configurable so the backend can be pointed at a compatible provider endpoint.

## Test

```bash
npm test
```

## Example data

`sample-data/sales.csv` contains Russian columns:

- `Товар`
- `Продажи`
- `Расходы`

Try the question: **«Какие товары самые прибыльные и почему?»**

## Why the API call is server-side

The browser never receives the API key. The frontend talks only to this app's `/api/analyze` endpoint; the backend adds credentials when calling the model provider.

## Interview talking points

If asked to explain the project:

1. The browser sends the uploaded file to `/api/parse` as `multipart/form-data`.
2. The backend parses the first sheet and returns rows as JSON.
3. The browser renders a preview and sends a question plus table rows to `/api/analyze`.
4. The backend either runs deterministic demo analysis or calls an AI REST API.
5. Errors are returned as JSON and shown to the user instead of failing silently.

## Author

Yaroslav — AI-assisted development / AI automation / rapid prototyping
