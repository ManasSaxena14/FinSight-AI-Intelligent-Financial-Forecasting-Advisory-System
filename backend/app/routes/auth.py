from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
import uuid
from datetime import datetime, timezone

from app.models.schemas import UserCreate, UserResponse, Token, UserLogin
from app.db import get_users_collection
from app.services.auth import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate):
    """
    Register a new user.
    Checks if the email is already registered and securely hashes the password.
    """
    users_collection = await get_users_collection()
    
    # Normalize email to lowercase
    email_normalized = user.email.lower().strip()
    
    # Check if user already exists
    existing_user = await users_collection.find_one({"email": email_normalized})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user document
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user.password)
    now = datetime.now(timezone.utc)
    
    user_doc = {
        "_id": user_id,
        "name": user.name,
        "email": email_normalized,
        "hashed_password": hashed_password,
        "created_at": now
    }
    
    # Store in MongoDB
    await users_collection.insert_one(user_doc)
    
    return UserResponse(
        id=user_id,
        name=user.name,
        email=email_normalized,
        created_at=now
    )

@router.post("/login", response_model=Token)
async def login(user_credentials: UserLogin):
    """
    Authenticate a user and return a JWT access token.
    """
    print(f"Login attempt for email: {user_credentials.email}")
    try:
        users_collection = await get_users_collection()
        
        # Normalize email to lowercase for lookup
        email_normalized = user_credentials.email.lower().strip()
        
        # Find user
        user = await users_collection.find_one({"email": email_normalized})
        if not user:
            print(f"User not found: {email_normalized}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Verify password
        if not verify_password(user_credentials.password, user["hashed_password"]):
            print(f"Invalid password for: {email_normalized}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Generate token
        access_token = create_access_token(data={"sub": str(user["_id"])})
        
        print(f"Login successful for: {email_normalized}")
        
        # Ensure all fields exist
        user_response = UserResponse(
            id=str(user["_id"]),
            name=user.get("name", "Unknown"),
            email=user.get("email", email_normalized),
            created_at=user.get("created_at", datetime.now(timezone.utc))
        )
        
        return {
            "access_token": access_token, 
            "token_type": "bearer",
            "user": user_response
        }
    except Exception as e:
        print(f"ERROR IN LOGIN ROUTE: {e}")
        import traceback
        traceback.print_exc()
        raise e

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Get current logged-in user profile from token.
    """
    return UserResponse(
        id=str(current_user["id"]),
        name=current_user["name"],
        email=current_user["email"],
        created_at=current_user["created_at"]
    )
