# AI Data Analyst

A production-grade, full-stack **Natural Language Business Intelligence** platform. Chat with spreadsheets and PostgreSQL databases in plain English — the AI generates validated SQL, executes it safely, visualizes results with auto-selected charts, and surfaces proactive business insights.

## Features

### Core Functionality
- **Natural Language to SQL**: Ask questions in plain English — Google Gemini generates PostgreSQL queries with full schema context
- **Spreadsheet Ingestion**: Drag & drop CSV/XLSX uploads with automatic type inference (INTEGER, FLOAT, TIMESTAMP, TEXT, BOOLEAN)
- **External Database Connection**: Connect directly to any PostgreSQL database; AES-256-Fernet encrypted credentials at rest
- **Read-Only SQL Guardrails**: `sqlglot` AST parsing rejects any destructive statement (DROP, DELETE, UPDATE, INSERT, etc.) — only SELECT is allowed
- **Auto-Row Limit**: Injects configurable `LIMIT` clause when absent to prevent dataset flooding
- **Session Memory**: Lightweight last-6-turn conversation context injected into every Gemini prompt

### Visualization & Dashboards
- **Automatic Chart Recommendation**: Infers optimal chart type (bar, line, area, pie, scatter, KPI) from SQL result column shapes
- **Recharts Integration**: Dark-mode styled bar, line, area, pie, scatter, and KPI metric card visualizations
- **Saved Dashboard Pinboard**: Pin any chart from the chat to a persistent BI dashboard; live SQL re-execution on page load

### Architecture
- **Backend**: Python + FastAPI + SQLAlchemy (SQLite for metadata, PostgreSQL for analytics data)
- **Frontend**: Next.js 16 App Router + Tailwind CSS + shadcn/ui + Recharts
- **AI Engine**: Google Gemini (`gemini-2.5-flash` / `gemini-1.5-flash` fallback)
- **SQL Parser**: `sqlglot` for AST validation and read-only enforcement

## Project Structure

```
AI Data Analyst/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/
│   │   │   ├── health.py          # GET /health
│   │   │   ├── upload.py          # POST /upload (CSV/XLSX ingestion)
│   │   │   ├── datasets.py        # GET /datasets, GET /datasets/{id}
│   │   │   ├── connect_db.py      # POST /connect-db (external DB)
│   │   │   ├── chat.py            # POST /chat (NL-to-SQL pipeline)
│   │   │   └── dashboards.py      # CRUD /dashboards
│   │   ├── core/
│   │   │   ├── config.py          # Pydantic Settings config
│   │   │   ├── database.py        # SQLAlchemy session & engine
│   │   │   └── security.py        # AES-256 Fernet credential encryption
│   │   ├── models/
│   │   │   ├── dataset.py         # DatasetModel
│   │   │   ├── chat_session.py    # ChatSessionModel, ChatMessageModel
│   │   │   └── dashboard.py       # DashboardModel, DashboardCardModel
│   │   ├── schemas/
│   │   │   ├── dataset.py         # Pydantic schemas for datasets
│   │   │   ├── chat.py            # Pydantic schemas for chat
│   │   │   └── dashboard.py       # Pydantic schemas for dashboards
│   │   └── services/
│   │       ├── ingestion_service.py    # CSV/XLSX parsing & table creation
│   │       ├── db_introspection.py     # External DB schema introspection
│   │       ├── sql_validator.py        # sqlglot AST read-only validator
│   │       ├── nl_to_sql.py            # Gemini NL→SQL pipeline + session memory
│   │       └── chart_generator.py      # Automatic chart type inference
│   ├── tests/
│   │   ├── test_ingestion.py           # 3 tests: CSV parse, type map, sanitize
│   │   ├── test_db_introspection.py    # 2 tests: credential encryption
│   │   ├── test_sql_validator.py       # 5 tests: read-only guardrails, limit inject
│   │   └── test_chart_generator.py     # 3 tests: KPI, line, bar chart inference
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── page.tsx               # Landing page with hero and feature grid
    │   ├── chat/page.tsx          # Interactive natural language chat explorer
    │   ├── datasets/page.tsx      # Dataset upload & schema manager
    │   └── dashboards/page.tsx    # Saved dashboards gallery
    ├── components/
    │   ├── charts/
    │   │   ├── DynamicChart.tsx   # Recharts multi-type chart renderer
    │   │   └── ChartCard.tsx      # Chart card wrapper with pin action
    │   ├── chat/
    │   │   ├── ChatMessageList.tsx    # User/AI chat bubbles
    │   │   ├── SqlCodeViewer.tsx      # Collapsible SQL code block
    │   │   └── QueryResultTable.tsx   # Paginated data result grid
    │   ├── datasets/
    │   │   ├── FileUploadZone.tsx     # Drag & drop CSV/XLSX uploader
    │   │   └── DbConnectModal.tsx     # External DB connection wizard modal
    │   └── shared/
    │       └── PipelineLoader.tsx     # Multi-stage animated step loader
    ├── lib/
    │   ├── api-client.ts          # Lightweight fetch wrapper
    │   └── utils.ts               # cn(), formatNumber(), formatDuration()
    └── types/
        ├── chat.ts                # ChatMessage, ChatResponse interfaces
        ├── dataset.ts             # Dataset, UploadResponse interfaces
        └── dashboard.ts           # Dashboard, DashboardCard interfaces
```

## Getting Started

### Prerequisites
- Python 3.11+ and Node.js 20+
- A Google Gemini API key (get from [Google AI Studio](https://aistudio.google.com))
- (Optional) PostgreSQL 14+ for external database connections

### Backend Setup

```bash
cd backend
python -m pip install -r requirements.txt

# Copy and edit environment variables
cp .env.example .env
# Set GEMINI_API_KEY in .env

python main.py
# API available at http://localhost:8000
# Swagger docs at http://localhost:8000/api/v1/docs
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# App available at http://localhost:3000
```

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key | required |
| `DATABASE_URL` | App metadata SQLite/Postgres URL | `sqlite:///./ai_data_analyst.db` |
| `MAX_ROW_LIMIT` | Max query result rows enforced | `1000` |
| `SECRET_KEY` | Encryption seed key | required |
| `CORS_ORIGINS` | Allowed frontend origins | `http://localhost:3000` |

### Run Tests

```bash
cd backend
python -m pytest tests/ -v
# 13/13 tests pass
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/health` | Health check |
| POST | `/api/v1/upload` | Upload CSV/XLSX spreadsheet |
| GET | `/api/v1/datasets` | List all datasets |
| GET | `/api/v1/datasets/{id}` | Get dataset schema |
| POST | `/api/v1/connect-db` | Connect external PostgreSQL DB |
| POST | `/api/v1/chat` | Natural language query (NL→SQL pipeline) |
| GET | `/api/v1/dashboards` | List saved dashboards |
| POST | `/api/v1/dashboards` | Create dashboard |
| POST | `/api/v1/dashboards/{id}/cards` | Pin chart card to dashboard |
| GET | `/api/v1/dashboards/{id}` | Get dashboard with live SQL re-execution |
