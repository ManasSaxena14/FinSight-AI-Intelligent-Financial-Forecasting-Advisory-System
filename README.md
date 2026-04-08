# Project Proposal: AI-Powered Personal Expense Prediction and Budget Recommendation System using Machine Learning

## Project Title
AI-Powered Personal Expense Prediction and Budget Recommendation System using Machine Learning

## Problem Statement
Many individuals struggle to manage their personal finances due to:
- Lack of awareness of spending patterns
- Poor budgeting habits
- Inability to predict future expenses
- Limited access to intelligent financial planning tools

Traditional budgeting applications only track expenses but do not provide predictive insights or personalized recommendations.

There is a need for an intelligent system that can:
- Analyze spending behavior
- Predict future expenses
- Provide actionable financial recommendations

## Objective
The main objective of this project is to develop a machine learning-based financial assistant that helps users:
- Track and analyze expenses
- Predict future spending patterns
- Generate personalized budget recommendations
- Improve savings habits
- Visualize financial health through dashboards

## Proposed Solution
The proposed system will:
- Collect user financial data (income and expenses)
- Process and analyze historical spending
- Use machine learning models to predict future expenses
- Generate personalized budget suggestions
- Provide visual insights through an interactive dashboard

The system is implemented as a full-stack web application with a React frontend and Python backend, featuring advanced premium tools including an AI Chatbot, What-If Scenario Analyzers, and smart Goal Tracking.

---

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

Backend production URL: `https://finsight-ai-k2yh.onrender.com`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Set frontend API env for deployment:

```bash
VITE_API_URL=https://finsight-ai-k2yh.onrender.com/api
```

Frontend production URL: `https://finsight-ai-intelligent-financial.vercel.app`

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
