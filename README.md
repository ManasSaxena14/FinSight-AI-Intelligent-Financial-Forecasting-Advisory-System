# FinSight AI: Intelligent Financial Forecasting & Advisory System

[![Frontend Deployment](https://img.shields.io/badge/Frontend-Vercel-blue?style=for-the-badge&logo=vercel)](https://finsight-ai-intelligent-financial.vercel.app)
[![Backend Deployment](https://img.shields.io/badge/Backend-Render-green?style=for-the-badge&logo=render)](https://finsight-ai-k2yh.onrender.com)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-black?style=for-the-badge&logo=github)](https://github.com/ManasSaxena14/FinSight-AI-Intelligent-Financial-Forecasting-Advisory-System.git)

**FinSight AI** is a cutting-edge, full-stack financial management platform that leverages advanced Machine Learning and Generative AI to transform how individuals manage their money. Unlike traditional trackers, FinSight predicts future spending, detects anomalies in real-time, and provides personalized advisory through an AI-integrated chatbot.

---

## The Problem & Solution

### The Problem
Most personal finance apps are retrospective—they tell you what you *spent*, but not what you *will spend*. Users struggle with:
- Hidden seasonal spending patterns.
- Identifying unusual multivariate spending behaviors.
- Lack of personalized, actionable financial advice.

### The Solution
**FinSight AI** bridges this gap by acting as a proactive financial sentinel. It uses historical data mining and predictive modeling to forecast expenses, detect financial risks before they occur, and offer a conversational AI interface for real-time advisory.

---

## Key Features

- **Multi-Month Forecasting:** Proprietary engine using seasonal trend analysis to predict expenses for the next 1-12 months with per-category breakdowns.
- **Dual-Layer Anomaly Detection:** Combines **Z-score Analysis** (univariate) and **Isolation Forest** (multivariate) to flag unusual spending patterns with high precision.
- **AI Financial Advisor:** Integrated **Groq-powered chatbot** that understands your financial state and provides context-aware savings strategies.
- **Comparative Peer Analysis:** Percentile-based benchmarking that compares your spending habits against similar income brackets.
- **Spending Archetypes:** Automatically categorizes users into personas like "Power Saver," "Lifestyle Spender," or "Housing-Heavy" using heuristic analysis.
- **Financial Health Scoring:** A dynamic 0-100 score calculated using risk-assessment GBM models to quantify your financial stability.

---

## Tech Stack

### Frontend
- **Framework:** React.js (Vite)
- **Styling:** Tailwind CSS (Premium Modern UI)
- **Visualization:** Recharts (Dynamic Financial Dashboards)
- **State Management:** Context API + Axios Interceptors

### Backend
- **Framework:** FastAPI (Python) - High performance, asynchronous.
- **ML Engine:** Scikit-learn, Pandas, NumPy.
- **Models:** Isolation Forest (Anomalies), Gradient Boosting/Logistic Models (Risk), Linear Regression (Trends).
- **Communication:** Groq Cloud API for Generative AI.

### Infrastructure
- **Database:** MongoDB Atlas (NoSQL for flexible financial records).
- **Authentication:** JWT (JSON Web Tokens) with Bcrypt password hashing.
- **Deployment:** Vercel (Frontend) & Render (Backend).

---

## Architecture & Workflow

1. **Data Ingestion:** User inputs income and Categorized Expenses (Food, Travel, Rent, etc.).
2. **Preprocessing Layer:** Backend cleanses data and engineers features like "Rent-to-Income" and "Essential-to-Discretionary" ratios.
3. **ML Pipeline:** 
   - *Regression* predicts total future costs.
   - *Classification* determines financial risk levels.
   - *Isolation Forest* checks for pattern irregularities.
4. **AI Generation:** Groq LLM processes the ML results to generate human-readable summaries and advice.
5. **UI Layer:** React dashboard visualizes insights via interactive graphs and status indicators.

---

## Folder Structure

```
FinSight AI/
├── frontend/                # React.js SPA (Vite, Tailwind, Recharts)
│   ├── src/components/      # Reusable UI modules (Sidebar, Charts)
│   └── src/pages/           # Main Views (Dashboard, Advisor, Login)
├── backend/                 # FastAPI REST API
│   ├── app/ml/              # Advanced ML models & logic (Predictors, Detectors)
│   ├── app/routes/          # API endpoints (Auth, Expenses, AI)
│   └── data/                # Processed financial datasets
└── DATASET_FIN_TRACK.csv    # 8000+ row historical financial dataset
```

---

## Installation & Setup

### Prerequisites
- Python 3.9+
- Node.js 18+
- MongoDB Atlas Account

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
# Create .env file based on .env.example
uvicorn app.main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
# Configure VITE_API_URL in .env
npm run dev
```

---

## Future Roadmap
- [ ] **Bank API Integration:** Plaid/Yodlee integration for automated expense syncing.
- [ ] **OCR Receipt Scanning:** Extract data from images using Tesseract or AWS Textract.
- [ ] **Collaborative Budgeting:** Support for shared family accounts with multi-user tracking.
- [ ] **Crypto & Stock Portfolio Tracking:** Real-time asset value integration.

---

## Contributing
Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License
Distributed under the MIT License. See `LICENSE` for more information.

---

## For Recruiters
**Resume-worthy Snapshot:**  
*Built a full-stack predictive financial ecosystem using **FastAPI** and **React**, implementing **Isolation Forest** algorithms for anomaly detection and **Groq LLM** for real-time financial advisory, managing a dataset of 8000+ financial records.*

Created by [Manas Saxena](https://github.com/ManasSaxena14)
