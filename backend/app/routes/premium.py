import os
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends  # type: ignore
from typing import List
from groq import Groq  # type: ignore

from app.models.schemas import (  # type: ignore
    GoalCreate, GoalResponse,
    ChatMessage, ChatResponse,
    ScenarioRequest, ScenarioResponse
)
from app.db import get_database  # type: ignore
from app.services.auth import get_current_user  # type: ignore

router = APIRouter(prefix="/api/premium", tags=["Premium Features"])

# Initialize Groq API if key is present
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# ── 1. Financial Goals ──────────────────────────────────────────────────────────

@router.post("/goals", response_model=GoalResponse)
async def create_goal(goal: GoalCreate, current_user: dict = Depends(get_current_user)):
    """Create a new financial goal."""
    db = get_database()
    goal_id = str(uuid.uuid4())
    
    # We will assume initial savings for this new goal is 0 for simplicity.
    document = {
        "_id": goal_id,
        "user_id": current_user["id"],
        "name": goal.name,
        "target_amount": goal.target_amount,
        "target_date": goal.target_date,
        "current_savings": 0.0,
        "created_at": datetime.utcnow()
    }
    
    await db["goals"].insert_one(document)
    
    response_data = document.copy()
    response_data["id"] = response_data.pop("_id")
    # Derived fields
    response_data["progress_percentage"] = 0.0
    response_data["is_on_track"] = True
    
    return GoalResponse(**response_data)

@router.get("/goals", response_model=List[GoalResponse])
async def get_goals(current_user: dict = Depends(get_current_user)):
    """Retrieve all goals for the user, calculating current progress dynamically from total savings."""
    db = get_database()
    
    # Calculate user's total historical savings to see how much they can allocate to goals
    expenses_cursor = db["expenses"].find({"user_id": current_user["id"]})
    total_banked_savings: float = 0.0
    async for exp in expenses_cursor:
        total_banked_savings += float(exp.get("savings", 0.0))
        
    goals_cursor = db["goals"].find({"user_id": current_user["id"]}).sort("created_at", -1)
    
    goals = []
    # Distribute total savings across goals (simplistic proportional or sequential distribution)
    # For now, we just mock the distribution by allocating savings equally or just showing raw percentages
    async for doc in goals_cursor:
        doc["id"] = doc.pop("_id")
        
        target_amount = float(doc.get("target_amount", 0.0))
        
        # Simple allocation logic: what percentage of this single goal's target is covered by total life savings
        # In a real app, users would explicitly transfer money to specific goals.
        progress: float = (float(total_banked_savings) / target_amount) * 100.0 if target_amount > 0.0 else 0.0
        
        doc["current_savings"] = min(float(total_banked_savings), target_amount)
        doc["progress_percentage"] = min(100.0, float(f"{progress:.1f}"))
        
        # Assess if on track based on time left (simplified)
        doc["is_on_track"] = True 
        
        goals.append(GoalResponse(**doc))
        
    return goals

# ── 2. AI Chatbot ───────────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def chat_with_advisor(req: ChatMessage, current_user: dict = Depends(get_current_user)):
    """Chat with the AI Financial Advisor via Groq."""
    if not groq_client:
        # Fallback to rule-based logic
        lower_msg = req.message.lower()
        if "save" in lower_msg:
            return ChatResponse(reply="To save more, consider using the 50/30/20 rule: 50% for needs, 30% for wants, and 20% for savings.")
        elif "expense" in lower_msg or "spend" in lower_msg:
            return ChatResponse(reply="Tracking your expenses is the first step! Try reducing your highest non-essential category this month.")
        elif "invest" in lower_msg:
            return ChatResponse(reply="Before investing, ensure you have an emergency fund covering 3-6 months of expenses, and you've paid off high-interest debt.")
        else:
            return ChatResponse(reply="I am your FinSight AI Advisor. Please ensure GROQ_API_KEY is properly loaded to unlock my full AI capabilities! For now, ask me about saving, spending, or investing.")
            
    # LLM branch using Groq
    try:
        from typing import cast
        client = cast(Groq, groq_client)
        
        context_str = "No specific financial context provided."
        if req.context:
            context_str = f"User's latest income: ${req.context.get('income', 0)}. Expenses breakdown: {req.context.get('expenses', {})}. Total Savings: ${req.context.get('savings', 0)}."
            
        system_prompt = f"You are a highly professional, concise, and helpful AI Financial Advisor for the application 'FinSight AI'. You give factual, practical financial advice. Do NOT give boilerplate disclaimers constantly, just act like a smart embedded tool. Here is the user's current context: {context_str}"
        
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": req.message
                }
            ],
            model="llama3-8b-8192",
            temperature=0.5,
            max_tokens=1024
        )
        
        return ChatResponse(reply=chat_completion.choices[0].message.content)
    except Exception as e:
        return ChatResponse(reply=f"AI Service Temporarily Unavailable: {str(e)}")

# ── 3. Scenario Analysis ────────────────────────────────────────────────────────

@router.post("/scenario", response_model=ScenarioResponse)
async def analyze_scenario(req: ScenarioRequest, current_user: dict = Depends(get_current_user)):
    """Process a 'what-if' budget scenario."""
    
    total_proposed_expenses = sum(req.proposed_expenses.values())
    projected_savings = req.current_income - total_proposed_expenses
    
    # Calculate simple health score (similar to ml.py but lightweight)
    savings_rate = (projected_savings / req.current_income) * 100 if req.current_income > 0 else 0
    
    score = 50
    if savings_rate >= 20:
        score = 90
    elif savings_rate >= 10:
        score = 75
    elif savings_rate > 0:
        score = 60
    else:
        score = 30
        
    advice = "Your proposed budget looks balanced."
    if savings_rate < 0:
        advice = "Warning: This scenario results in spending more than you earn. Consider reducing variable expenses."
    elif savings_rate >= 20:
        advice = "Excellent! You are allocating 20%+ to savings, which builds strong wealth over time."
        
    return ScenarioResponse(
        projected_savings=round(projected_savings, 2),
        savings_difference=0.0, # Will be calculated by frontend comparing to actual
        projected_health_score=score,
        advice=advice
    )

# ── 4. AI Monthly Summary ──────────────────────────────────────────────────────

@router.post("/summary", response_model=ChatResponse)
async def generate_monthly_summary(req: ChatMessage, current_user: dict = Depends(get_current_user)):
    """Generate a cohesive narrative summary of the user's monthly financial health via Groq."""
    if not groq_client:
        return ChatResponse(reply="AI Summaries require a valid GROQ_API_KEY. Add it to your .env to unlock narrative insights.")

    try:
        from typing import cast
        client = cast(Groq, groq_client)
        
        context_str = "No data available."
        if req.context:
            context_str = (
                f"Income: ${req.context.get('income', 0)}. "
                f"Expenses: {req.context.get('expenses', {})}. "
                f"Total Savings this month: ${req.context.get('savings', 0)}."
            )
            
        prompt = (
            f"You are a premium financial analyst. Analyze this user's monthly data: {context_str}. "
            "Generate a 2-3 sentence narrative summary. Focus on their savings rate, any major category spikes, "
            "and one actionable 'gold' piece of advice. Keep the tone encouraging, professional, and sophisticated. "
            "Do not use bullet points. Just one smooth paragraph."
        )
        
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama3-8b-8192",
            temperature=0.7,
            max_tokens=256
        )
        
        return ChatResponse(reply=chat_completion.choices[0].message.content.strip())
    except Exception as e:
        return ChatResponse(reply=f"Could not generate summary: {str(e)}")
