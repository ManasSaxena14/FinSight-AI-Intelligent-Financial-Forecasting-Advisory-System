# FinSight AI — Intelligent Financial Forecasting & Advisory System

A production-level web application that helps users track expenses, predict future spending, and receive intelligent financial recommendations using machine learning.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React.js + Tailwind CSS + Recharts + Axios |
| **Backend** | Python + FastAPI |
| **Machine Learning** | Scikit-learn (Linear Regression, Random Forest), Pandas, NumPy |
| **Database** | MongoDB (Atlas) |
| **Authentication** | JWT + bcrypt |
| **Deployment** | Vercel (frontend) + Render (backend) |

## Project Structure

```
FinSight AI/
├── frontend/              → React.js application
├── backend/
│   ├── app/
│   │   ├── main.py        → FastAPI entry point
│   │   ├── config.py      → App configuration
│   │   ├── models/        → Pydantic models & schemas
│   │   ├── routes/        → API route handlers
│   │   ├── services/      → Business logic
│   │   └── ml/            → Machine learning models
│   ├── data/              → Datasets (raw + cleaned)
│   └── requirements.txt   → Python dependencies
└── DATASET_FIN_TRACK.csv  → Original 8000-row financial dataset
```

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # macOS/Linux
pip install -r requirements.txt
cp .env.example .env            # Fill in your values
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Core Features

- Expense tracking (income + categorized expenses)
- Data visualization (charts, trends)
- ML-based expense prediction
- Financial Health Score (0-100)
- Budget planning & tracking
- Smart alerts for overspending
- Savings prediction & multi-month forecasting
- Scenario analysis (what-if changes)
- AI-based recommendations
- Anomaly detection (unusual spending)
- Financial goal tracking
- Monthly AI-generated summaries
- AI chatbot financial advisor
- Multi-user authentication system

## License

MIT
