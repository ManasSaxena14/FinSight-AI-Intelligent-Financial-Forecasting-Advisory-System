import os
import uuid
from datetime import datetime, timezone, date
from math import ceil
from fastapi import APIRouter, HTTPException, Depends  # type: ignore
from typing import List
from groq import Groq  # type: ignore

from app.models.schemas import (  # type: ignore
    GoalCreate, GoalResponse, GoalContribution, GoalDeleteResponse,
    ChatMessage, ChatResponse,
    ScenarioRequest, ScenarioResponse,
    SmartSavingsResponse, SmartSavingsTip,
    BudgetLiveResponse,
    NotificationItem, NotificationsResponse,
)
from app.db import get_database  # type: ignore
from app.services.auth import get_current_user  # type: ignore
from app.services.financial_logic import calculate_health_score  # type: ignore

router = APIRouter(prefix="/api/premium", tags=["Premium Features"])

from app.config import settings

# Initialize Groq API if key is present
GROQ_API_KEY = settings.GROQ_API_KEY
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None


# ── 1. Financial Goals ──────────────────────────────────────────────────────────

def _assess_goal_track(target_amount: float, current_savings: float, target_date_str: str) -> dict:
    """Calculate whether a goal is on track using date-based math."""
    try:
        target_dt = datetime.strptime(target_date_str, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return {"is_on_track": True, "days_remaining": None, "required_monthly_saving": None}
    
    today = date.today()
    days_remaining = (target_dt - today).days
    remaining_amount = max(0, target_amount - current_savings)
    
    if remaining_amount <= 0:
        return {"is_on_track": True, "days_remaining": max(0, days_remaining), "required_monthly_saving": 0.0}
    
    if days_remaining <= 0:
        return {"is_on_track": False, "days_remaining": 0, "required_monthly_saving": remaining_amount}
    
    months_remaining = max(1, days_remaining / 30.44)
    required_monthly = remaining_amount / months_remaining
    
    # On track if required monthly is reasonable (less than 40% of typical income range)
    is_on_track = days_remaining > 30
    
    return {
        "is_on_track": is_on_track,
        "days_remaining": days_remaining,
        "required_monthly_saving": round(required_monthly, 2),
    }


@router.post("/goals", response_model=GoalResponse)
async def create_goal(goal: GoalCreate, current_user: dict = Depends(get_current_user)):
    """Create a new financial goal."""
    db = get_database()
    goal_id = str(uuid.uuid4())
    
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
    
    track = _assess_goal_track(goal.target_amount, 0.0, goal.target_date)
    
    return GoalResponse(
        id=goal_id,
        user_id=current_user["id"],
        name=goal.name,
        target_amount=goal.target_amount,
        target_date=goal.target_date,
        current_savings=0.0,
        progress_percentage=0.0,
        **track,
    )


@router.get("/goals", response_model=List[GoalResponse])
async def get_goals(current_user: dict = Depends(get_current_user)):
    """Retrieve all goals for the user with proper progress and track assessment."""
    db = get_database()
    
    goals_cursor = db["goals"].find({"user_id": current_user["id"]}).sort("created_at", -1)
    
    goals = []
    async for doc in goals_cursor:
        doc["id"] = doc.pop("_id")
        
        target_amount = float(doc.get("target_amount", 0.0))
        current_savings = float(doc.get("current_savings", 0.0))
        
        progress = (current_savings / target_amount) * 100.0 if target_amount > 0 else 0.0
        doc["progress_percentage"] = min(100.0, round(progress, 1))
        
        track = _assess_goal_track(target_amount, current_savings, doc.get("target_date", ""))
        doc["is_on_track"] = track["is_on_track"]
        doc["days_remaining"] = track["days_remaining"]
        doc["required_monthly_saving"] = track["required_monthly_saving"]
        
        goals.append(GoalResponse(**doc))
        
    return goals


@router.put("/goals/{goal_id}/contribute", response_model=GoalResponse)
async def contribute_to_goal(goal_id: str, contribution: GoalContribution, current_user: dict = Depends(get_current_user)):
    """Add a manual savings contribution to a specific goal."""
    db = get_database()
    
    goal_doc = await db["goals"].find_one({"_id": goal_id, "user_id": current_user["id"]})
    if not goal_doc:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    new_savings = float(goal_doc.get("current_savings", 0.0)) + contribution.amount
    new_savings = min(new_savings, float(goal_doc["target_amount"]))  # Cap at target
    
    await db["goals"].update_one(
        {"_id": goal_id},
        {"₹set": {"current_savings": new_savings}}
    )
    
    target_amount = float(goal_doc["target_amount"])
    progress = (new_savings / target_amount) * 100.0 if target_amount > 0 else 0.0
    track = _assess_goal_track(target_amount, new_savings, goal_doc.get("target_date", ""))
    
    return GoalResponse(
        id=goal_id,
        user_id=current_user["id"],
        name=goal_doc["name"],
        target_amount=target_amount,
        target_date=goal_doc["target_date"],
        current_savings=new_savings,
        progress_percentage=min(100.0, round(progress, 1)),
        **track,
    )


@router.delete("/goals/{goal_id}", response_model=GoalDeleteResponse)
async def delete_goal(goal_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a financial goal."""
    db = get_database()
    
    result = await db["goals"].delete_one({"_id": goal_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found or unauthorized")
    
    return GoalDeleteResponse(message="Goal deleted successfully", deleted_id=goal_id)


# ── 2. AI Chatbot ───────────────────────────────────────────────────────────────

RULE_BASED_REPLIES = {
    "save": "To maximize savings, apply the 50/30/20 rule: allocate 50% for necessities, 30% for wants, and 20% for savings. Automate a fixed savings transfer each payday so it happens before you can spend it.",
    "invest": "Before investing, build a 3-6 month emergency fund. Once secured, explore low-cost index funds via a brokerage account. Even ₹50/month compounded over 30 years grows significantly.",
    "budget": "A zero-based budget works well — assign every dollar a purpose. List income at the top, subtract fixed expenses (rent, bills), then variable ones (food, entertainment) until you reach zero leftover.",
    "debt": "Attack debt using the Avalanche method (highest interest first) to save the most money, or the Snowball method (smallest balance first) for quick psychological wins.",
    "emergency": "Your emergency fund should cover 3-6 months of essential expenses. Keep it in a high-yield savings account for both accessibility and modest growth.",
    "rent": "Housing should stay below 30% of gross monthly income. If rent exceeds this, consider roommates, negotiating at lease renewal, or exploring nearby lower-cost areas.",
    "food": "Reduce food expenses by meal-prepping on weekends and buying in bulk. A ₹15/day food habit costs ₹450/month — meal prep can cut this by 50%.",
    "goal": "Set SMART financial goals: Specific, Measurable, Achievable, Relevant, and Time-bound. Break big goals into monthly targets.",
    "tax": "Maximize pre-tax retirement contributions (401k/IRA) to reduce taxable income. Every dollar contributed pre-tax saves money at your marginal rate.",
    "credit": "Your credit score is affected by: payment history (35%), utilization (30%), length of history (15%), new credit (10%), and credit mix (10%). Keep utilization below 30%.",
    "expense": "Tracking expenses is the first step to financial clarity. Categorize every spend and identify your top 3 highest categories — those are your highest-impact optimization targets.",
    "spend": "To reduce spending, list every recurring expense and cancel anything unused. Then apply a 48-hour rule on all non-essential purchases above ₹50.",
    "income": "To boost income, consider skill-based freelancing, monetizing a hobby, or negotiating your salary annually. A 10% income increase has a bigger long-term impact than cutting expenses.",
    "insurance": "Ensure you have health, auto, and renter's/homeowner's insurance. The right coverage prevents a single event from wiping out your entire savings.",
    "retire": "Start retirement planning early. The power of compound interest means starting at 25 vs 35 can nearly double your retirement fund, even with the same monthly contribution.",
    "inflation": "Inflation erodes purchasing power at ~3% annually. Ensure your savings earn above the inflation rate through investments, TIPS, or I-bonds to maintain real value.",
    "subscription": "Audit subscriptions monthly — the average person wastes ₹30-50/month on forgotten services. Cancel what you haven't used in the last 30 days.",
    "side hustle": "A side income stream of just ₹500/month (₹6,000/year) invested at 8% average return becomes over ₹87,000 in 10 years through compounding.",
}

@router.post("/chat", response_model=ChatResponse)
async def chat_with_advisor(req: ChatMessage, current_user: dict = Depends(get_current_user)):
    """Chat with the AI Financial Advisor via Groq or rule-based fallback."""
    if not groq_client:
        lower_msg = req.message.lower()

        # Build context-aware prefix
        context_prefix = ""
        if req.context:
            income = req.context.get("income", 0)
            savings = req.context.get("savings", 0)
            savings_rate = (savings / income * 100) if income > 0 else 0
            if savings_rate < 0:
                context_prefix = f"Based on your current data (overspending by ₹{abs(savings):,.0f}): "
            elif savings_rate < 10:
                context_prefix = f"With your {savings_rate:.1f}% savings rate: "
            elif savings_rate >= 20:
                context_prefix = f"Great job on your {savings_rate:.1f}% savings rate! "

        for keyword, reply in RULE_BASED_REPLIES.items():
            if keyword in lower_msg:
                return ChatResponse(reply=context_prefix + reply)

        return ChatResponse(reply=context_prefix + "I am your FinSight AI Advisor. Ask me about budgeting, saving, investing, debt, emergency funds, taxes, credit, retirement, or inflation. For example: 'How do I save more?' or 'Help me budget better.'")
            
    # LLM branch using Groq
    try:
        from typing import cast
        client = cast(Groq, groq_client)
        
        context_str = "No specific financial context provided."
        if req.context:
            context_str = f"User's latest income: ₹{req.context.get('income', 0)}. Expenses breakdown: {req.context.get('expenses', {})}. Total Savings: ₹{req.context.get('savings', 0)}."
            
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
            model="llama-3.1-8b-instant",
            temperature=0.5,
            max_tokens=1024
        )
        
        return ChatResponse(reply=chat_completion.choices[0].message.content)
    except Exception as e:
        return ChatResponse(reply=f"AI Service Temporarily Unavailable: {str(e)}")

# ── 3. Scenario Analysis ────────────────────────────────────────────────────────

@router.post("/scenario", response_model=ScenarioResponse)
async def analyze_scenario(req: ScenarioRequest, current_user: dict = Depends(get_current_user)):
    """Process a 'what-if' budget scenario with real savings_difference."""
    db = get_database()
    
    total_proposed_expenses = sum(req.proposed_expenses.values())
    projected_savings = req.current_income - total_proposed_expenses
    
    savings_rate = (projected_savings / req.current_income) * 100 if req.current_income > 0 else 0
    
    health = calculate_health_score(req.current_income, total_proposed_expenses, req.proposed_expenses)
    score = health["score"]
    
    # Calculate actual savings difference from user's real latest record
    savings_difference = 0.0
    try:
        latest_cursor = db["expenses"].find({"user_id": current_user["id"]}).sort("created_at", -1).limit(1)
        async for doc in latest_cursor:
            actual_savings = float(doc.get("savings", 0))
            savings_difference = round(projected_savings - actual_savings, 2)
    except Exception:
        pass
        
    advice_parts = []
    if savings_rate < 0:
        advice_parts.append("[CRITICAL] Warning: This scenario results in deficit spending. Consider reducing variable expenses immediately.")
    elif savings_rate >= 20:
        advice_parts.append("[SUCCESS] Excellent! You are allocating 20%+ to savings, which builds strong wealth over time.")
    elif savings_rate >= 10:
        advice_parts.append("[OPTIMAL] Good balance. You are saving above 10%. Push towards the 20% golden benchmark for accelerated wealth growth.")
    else:
        advice_parts.append("[ADVICE] Your proposed savings rate is below 10%. Try reducing your top spending category by 15-20% to increase your financial buffer.")
    
    if savings_difference > 0:
        advice_parts.append(f"[TREND] This scenario saves ₹{savings_difference:,.0f} more than your current budget — a positive trajectory.")
    elif savings_difference < 0:
        advice_parts.append(f"[ALERT] This scenario saves ₹{abs(savings_difference):,.0f} less than your current budget. Re-evaluate the tradeoffs.")
    
    # Category-level insights
    high_cats = sorted(req.proposed_expenses.items(), key=lambda x: x[1], reverse=True)[:2]
    if high_cats:
        top_cat = high_cats[0]
        top_pct = (top_cat[1] / total_proposed_expenses * 100) if total_proposed_expenses > 0 else 0
        if top_pct > 35:
            advice_parts.append(f"[INSIGHT] {top_cat[0]} consumes {top_pct:.0f}% of total expenses. Diversifying spend allocation reduces single-category risk.")

    return ScenarioResponse(
        projected_savings=round(projected_savings, 2),
        savings_difference=savings_difference,
        projected_health_score=score,
        advice=" ".join(advice_parts)
    )

# ── 4. AI Monthly Summary ──────────────────────────────────────────────────────

def _generate_rule_based_summary(context: dict) -> str:
    """Generate a comprehensive summary without LLM, using pure business logic."""
    income = context.get("income", 0)
    expenses = context.get("expenses", {})
    savings = context.get("savings", 0)
    
    total_expense = sum(expenses.values()) if isinstance(expenses, dict) else 0
    savings_rate = (savings / income * 100) if income > 0 else 0
    
    # Find top spending categories
    sorted_cats = sorted(expenses.items(), key=lambda x: x[1], reverse=True) if isinstance(expenses, dict) else []
    top_cat = sorted_cats[0] if sorted_cats else ("N/A", 0)
    top_cat_pct = (top_cat[1] / total_expense * 100) if total_expense > 0 else 0
    
    # Build narrative
    parts = []
    
    # Opening assessment
    if savings_rate >= 20:
        parts.append(f"Outstanding fiscal discipline this cycle — you achieved a {savings_rate:.1f}% savings rate, placing you in the top tier of financially healthy individuals.")
    elif savings_rate >= 10:
        parts.append(f"A solid month with a {savings_rate:.1f}% savings rate. You are on the right path, though there is room to optimize towards the 20% benchmark.")
    elif savings_rate >= 0:
        parts.append(f"Your {savings_rate:.1f}% savings rate this month indicates tight margins. While you stayed in the positive, building a larger financial buffer should be a priority.")
    else:
        parts.append(f"Critical: You overspent by ₹{abs(savings):,.0f} this month, resulting in a negative {savings_rate:.1f}% savings rate. Immediate cost reduction is recommended.")
    
    # Category insight
    if top_cat[0] != "N/A":
        parts.append(f"Your dominant expense category was {top_cat[0]} at ₹{top_cat[1]:,.0f} ({top_cat_pct:.0f}% of total spend).")
        
        # Second category comparison
        if len(sorted_cats) >= 2:
            runner = sorted_cats[1]
            gap = top_cat[1] - runner[1]
            if gap > 500:
                parts.append(f"This is ₹{gap:,.0f} above {runner[0]}, your second-largest category — a significant concentration worth reviewing.")
    
    # Actionable advice
    if savings_rate < 10:
        parts.append("Gold Insight: Automating a fixed 15% income transfer to savings on payday, before discretionary spending begins, could transform your financial trajectory within 3 months.")
    elif savings_rate < 20:
        parts.append("Gold Insight: Consider redirecting just 5% more of income into an investment vehicle — at historical market returns, this could yield an additional ₹12,000+ over 5 years.")
    else:
        parts.append("Gold Insight: With your strong savings foundation, explore diversifying into index funds or increasing retirement contributions to maximize compound growth.")
    
    return " ".join(parts)


@router.post("/summary", response_model=ChatResponse)
async def generate_monthly_summary(req: ChatMessage, current_user: dict = Depends(get_current_user)):
    """Generate a cohesive narrative summary — LLM-powered or rule-based fallback."""
    
    # Rule-based fallback (always available)
    if not groq_client:
        if req.context:
            return ChatResponse(reply=_generate_rule_based_summary(req.context))
        return ChatResponse(reply="Add expense data to unlock your personalized AI monthly financial synthesis report.")

    try:
        from typing import cast
        client = cast(Groq, groq_client)
        
        context_str = "No data available."
        if req.context:
            context_str = (
                f"Income: ₹{req.context.get('income', 0)}. "
                f"Expenses: {req.context.get('expenses', {})}. "
                f"Total Savings this month: ₹{req.context.get('savings', 0)}."
            )
            
        prompt = (
            f"You are a premium financial analyst. Analyze this user's monthly data: {context_str}. "
            "Generate a 2-3 sentence narrative summary. Focus on their savings rate, any major category spikes, "
            "and one actionable 'gold' piece of advice. Keep the tone encouraging, professional, and sophisticated. "
            "Do not use bullet points. Just one smooth paragraph."
        )
        
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.7,
            max_tokens=256
        )
        
        return ChatResponse(reply=chat_completion.choices[0].message.content.strip())
    except Exception:
        # Graceful fallback to rule-based if LLM fails
        if req.context:
            return ChatResponse(reply=_generate_rule_based_summary(req.context))
        return ChatResponse(reply="Could not generate AI summary. Add expense data and try again.")


# ── 5. Smart Savings Recommendations ────────────────────────────────────────────────

@router.get("/smart-savings", response_model=SmartSavingsResponse)
async def get_smart_savings(current_user: dict = Depends(get_current_user)):
    """Generate personalized smart savings tips based on user's actual spending data."""
    db = get_database()
    
    expenses_cursor = db["expenses"].find({"user_id": current_user["id"]}).sort("created_at", -1).limit(3)
    records = []
    async for doc in expenses_cursor:
        records.append(doc)
    
    if not records:
        return SmartSavingsResponse(
            tips=[
                SmartSavingsTip(
                    category="General",
                    tip="Start by adding your monthly expenses to unlock personalized savings recommendations.",
                    potential_saving=0.0,
                    priority="high"
                )
            ],
            monthly_saving_potential=0.0,
            annual_saving_potential=0.0,
            summary="Add your first expense record to unlock AI-powered personalized savings analysis."
        )
    
    latest = records[0]
    income = float(latest.get("income", 0))
    expenses = latest.get("expenses", {})
    total_expense = float(latest.get("total_expense", sum(expenses.values())))
    savings = float(latest.get("savings", income - total_expense))
    savings_rate = (savings / income * 100) if income > 0 else 0
    
    tips: list[SmartSavingsTip] = []
    total_potential = 0.0
    
    BENCHMARKS = {
        "Food": 0.12,
        "Travel": 0.08,
        "Rent": 0.28,
        "Shopping": 0.05,
        "Bills": 0.10,
        "Entertainment": 0.05
    }
    
    TIPS_LIBRARY = {
        "Food": "Meal prepping on Sundays can reduce daily food costs by 40-50%. Batch cook proteins and grains, and you'll save both time and money throughout the week.",
        "Travel": "Consider carpooling, public transit passes, or a monthly bike-sharing membership. Reducing solo car trips can yield significant monthly savings.",
        "Rent": "Renegotiate your lease at renewal time—landlords often prefer long-term tenants over vacancy. Even a 5% reduction saves substantially over 12 months.",
        "Shopping": "Implement a 48-hour rule for non-essential purchases. Research shows this eliminates up to 70% of impulse buys without meaningful lifestyle sacrifice.",
        "Bills": "Audit your subscriptions monthly. Most people have 2-3 subscriptions they've forgotten about. Also call your internet/phone provider annually to negotiate rates.",
        "Entertainment": "Switch to one streaming service at a time on a rotating schedule. Combine with free local events, library e-books, and community activities."
    }
    
    for category, benchmark_pct in BENCHMARKS.items():
        cat_amount = float(expenses.get(category, 0))
        benchmark_amount = income * benchmark_pct
        
        if cat_amount > benchmark_amount * 1.2:
            potential = cat_amount - benchmark_amount
            total_potential += potential
            
            overage_pct = ((cat_amount - benchmark_amount) / benchmark_amount) * 100
            priority = "high" if overage_pct > 50 else "medium" if overage_pct > 25 else "low"
            
            tips.append(SmartSavingsTip(
                category=category,
                tip=TIPS_LIBRARY.get(category, f"Your {category} spending is {overage_pct:.0f}% above recommended levels. Look for opportunities to reduce this category."),
                potential_saving=round(potential, 2),
                priority=priority
            ))
    
    if savings_rate < 20:
        deficit = (income * 0.20) - savings
        tips.append(SmartSavingsTip(
            category="Savings Rate",
            tip=f"You are saving {savings_rate:.1f}% of income. The ideal target is 20%. Automate a transfer of ₹{deficit:,.0f}/month to a dedicated savings account on payday before you can spend it.",
            potential_saving=round(max(0, deficit), 2),
            priority="high" if savings_rate < 10 else "medium"
        ))
        total_potential += max(0, deficit)
    
    priority_order = {"high": 0, "medium": 1, "low": 2}
    tips.sort(key=lambda x: priority_order.get(x.priority, 3))
    
    if not tips:
        tips.append(SmartSavingsTip(
            category="Well Done!",
            tip="Your spending is within healthy benchmarks across all categories. Consider increasing your investment contributions or building a larger emergency fund.",
            potential_saving=0.0,
            priority="low"
        ))
    
    if savings_rate >= 20:
        summary = f"Excellent discipline! You are saving {savings_rate:.1f}% of income. Focus on growing these savings through investments."
    elif savings_rate >= 10:
        summary = f"You are saving {savings_rate:.1f}% of income. These {len(tips)} optimizations could unlock an additional ₹{total_potential:,.0f}/month."
    else:
        summary = f"Your savings rate is {savings_rate:.1f}%. Implementing these {len(tips)} strategies could significantly improve your financial position."
    
    return SmartSavingsResponse(
        tips=tips,
        monthly_saving_potential=round(total_potential, 2),
        annual_saving_potential=round(total_potential * 12, 2),
        summary=summary
    )


# ── 6. Live Budget Status (Real-time Tracker) ──────────────────────────────────

@router.get("/budget-live", response_model=BudgetLiveResponse)
async def get_live_budget(current_user: dict = Depends(get_current_user)):
    """Returns the user's current aggregated budget status for real-time display."""
    db = get_database()
    
    cursor = db["expenses"].find({"user_id": current_user["id"]}).sort("created_at", -1).limit(2)
    records = []
    async for doc in cursor:
        records.append(doc)
    
    if not records:
        return BudgetLiveResponse(
            total_income=0.0, total_expense=0.0, total_savings=0.0,
            savings_rate=0.0, health_score=0, health_status="No Data",
            last_updated=datetime.now(timezone.utc).isoformat(),
            trend="stable"
        )
    
    latest = records[0]
    income = float(latest.get("income", 0))
    expenses = latest.get("expenses", {})
    total_expense = float(latest.get("total_expense", 0))
    savings = float(latest.get("savings", income - total_expense))
    savings_rate = (savings / income * 100) if income > 0 else 0
    
    health = calculate_health_score(income, total_expense, expenses)
    
    trend = "stable"
    if len(records) >= 2:
        prev = records[1]
        prev_income = float(prev.get("income", 1))
        prev_savings = float(prev.get("savings", 0))
        prev_rate = (prev_savings / prev_income * 100) if prev_income > 0 else 0
        diff = savings_rate - prev_rate
        trend = "up" if diff > 2 else "down" if diff < -2 else "stable"
    
    return BudgetLiveResponse(
        total_income=round(income, 2),
        total_expense=round(total_expense, 2),
        total_savings=round(savings, 2),
        savings_rate=round(savings_rate, 1),
        health_score=health["score"],
        health_status=health["status"],
        last_updated=datetime.now(timezone.utc).isoformat(),
        trend=trend
    )


# ── 7. Notifications / Alerts Engine ───────────────────────────────────────────

@router.get("/notifications", response_model=NotificationsResponse)
async def get_notifications(current_user: dict = Depends(get_current_user)):
    """Generate real-time notifications based on the user's financial data."""
    db = get_database()
    
    cursor = db["expenses"].find({"user_id": current_user["id"]}).sort("created_at", -1).limit(3)
    records = []
    async for doc in cursor:
        records.append(doc)
    
    notifications: list[NotificationItem] = []
    now_str = datetime.now(timezone.utc).isoformat()
    idx = 0
    
    def _make(type_: str, severity: str, title: str, message: str):
        nonlocal idx
        idx += 1
        return NotificationItem(
            id=f"notif-{idx}",
            type=type_,
            severity=severity,
            title=title,
            message=message,
            timestamp=now_str
        )
    
    if not records:
        notifications.append(_make("tip", "info", "Get Started", "Add your first monthly expense record to unlock AI-powered financial insights and alerts."))
        return NotificationsResponse(notifications=notifications, unread_count=len(notifications))
    
    latest = records[0]
    income = float(latest.get("income", 0))
    expenses = latest.get("expenses", {})
    total_expense = float(latest.get("total_expense", 0))
    savings = float(latest.get("savings", income - total_expense))
    savings_rate = (savings / income * 100) if income > 0 else 0
    
    # 1. Overspending alert
    if savings < 0:
        notifications.append(_make(
            "alert", "critical", "Overspending Detected",
            f"You spent ₹{abs(savings):,.0f} more than your income this month. Immediate action recommended."
        ))
    
    # 2. Low savings rate warning
    if 0 <= savings_rate < 10:
        notifications.append(_make(
            "alert", "warning", "Low Savings Rate",
            f"Your savings rate is {savings_rate:.1f}%. Aim for 20% — automate a fixed transfer on payday."
        ))
    
    # 3. Category spike detection (compare to previous month)
    if len(records) >= 2:
        prev = records[1]
        prev_expenses = prev.get("expenses", {})
        for cat, curr_val in expenses.items():
            prev_val = float(prev_expenses.get(cat, 0))
            if prev_val > 0:
                pct_change = ((float(curr_val) - prev_val) / prev_val) * 100
                if pct_change >= 40 and float(curr_val) > 300:
                    notifications.append(_make(
                        "alert", "warning", f"{cat} Spending Spike",
                        f"Your {cat} spending jumped {pct_change:.0f}% vs last month (₹{prev_val:,.0f} → ₹{float(curr_val):,.0f})."
                    ))
                elif pct_change <= -30 and prev_val > 300:
                    notifications.append(_make(
                        "achievement", "success", f"{cat} Spending Reduced",
                        f"Great job! You reduced {cat} spending by {abs(pct_change):.0f}% compared to last month."
                    ))
    
    # 4. Achievement — strong savings
    if savings_rate >= 25:
        notifications.append(_make(
            "achievement", "success", "Exceptional Saver",
            f"Outstanding! Your {savings_rate:.1f}% savings rate this month places you in the top tier of financial discipline."
        ))
    
    # 5. High category concentration
    if expenses:
        sorted_cats = sorted(expenses.items(), key=lambda x: float(x[1]), reverse=True)
        if sorted_cats:
            top_cat, top_val = sorted_cats[0]
            top_pct = (float(top_val) / total_expense * 100) if total_expense > 0 else 0
            if top_pct > 40:
                notifications.append(_make(
                    "insight", "info", f"High {top_cat} Concentration",
                    f"{top_cat} accounts for {top_pct:.0f}% of your total spend. Diversifying may reduce financial risk."
                ))
    
    # 6. Goal deadline approaching
    goals_cursor = db["goals"].find({"user_id": current_user["id"]})
    async for goal in goals_cursor:
        try:
            target_dt = datetime.strptime(goal.get("target_date", ""), "%Y-%m-%d").date()
            days_left = (target_dt - date.today()).days
            progress = (float(goal.get("current_savings", 0)) / float(goal.get("target_amount", 1))) * 100
            if 0 < days_left <= 30 and progress < 90:
                notifications.append(_make(
                    "alert", "warning", f"Goal Deadline Approaching",
                    f"'{goal['name']}' is due in {days_left} days but only {progress:.0f}% complete. Consider increasing contributions."
                ))
            elif progress >= 100:
                notifications.append(_make(
                    "achievement", "success", "Goal Achieved!",
                    f"Congratulations! You completed your '{goal['name']}' savings goal!"
                ))
        except (ValueError, TypeError):
            pass
    
    # 7. Periodic insight tip
    if len(notifications) == 0:
        notifications.append(_make(
            "tip", "info", "Financial Health Tip",
            "Consider setting up an automatic monthly investment — even ₹100/month into an index fund grows significantly over time."
        ))
    
    return NotificationsResponse(
        notifications=notifications[:10],  # Cap at 10
        unread_count=min(10, len(notifications))
    )
