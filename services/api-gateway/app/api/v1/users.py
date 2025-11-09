from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional, List
from app.api.v1.auth import get_current_user
from app.core.mongodb import get_database
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class UserCreate(BaseModel):
    email: str
    username: str
    password: str
    full_name: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str] = None
    is_active: bool
    created_at: str


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate):
    """
    Create a new user
    """
    # This is a placeholder - will be implemented with actual DB logic
    logger.info(f"Creating user: {user.username}")
    
    return {
        "id": 1,
        "email": user.email,
        "username": user.username,
        "full_name": user.full_name,
        "is_active": True,
        "created_at": "2025-11-02T00:00:00Z"
    }


@router.get("/users/me", response_model=UserResponse)
async def get_current_user():
    """
    Get current authenticated user
    """
    # This is a placeholder - will be implemented with authentication
    return {
        "id": 1,
        "email": "user@example.com",
        "username": "testuser",
        "full_name": "Test User",
        "is_active": True,
        "created_at": "2025-11-02T00:00:00Z"
    }


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int):
    """
    Get user by ID
    """
    # This is a placeholder
    if user_id < 1:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {
        "id": user_id,
        "email": f"user{user_id}@example.com",
        "username": f"user{user_id}",
        "full_name": f"User {user_id}",
        "is_active": True,
        "created_at": "2025-11-02T00:00:00Z"
    }


@router.post("/users/favorites/{session_id}", status_code=status.HTTP_200_OK)
async def add_favorite(
    session_id: str,
    current_user = Depends(get_current_user)
):
    """Add a session to user's favorites"""
    db = get_database()
    
    # Check if session exists
    session = await db.sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get or create user favorites document
    favorites_doc = await db.user_favorites.find_one({"user_id": current_user.id})
    
    if not favorites_doc:
        # Create new favorites document
        await db.user_favorites.insert_one({
            "user_id": current_user.id,
            "username": current_user.username,
            "favorite_sessions": [session_id]
        })
    else:
        # Add to existing favorites if not already present
        if session_id not in favorites_doc.get("favorite_sessions", []):
            await db.user_favorites.update_one(
                {"user_id": current_user.id},
                {"$addToSet": {"favorite_sessions": session_id}}
            )
    
    logger.info(f"User {current_user.username} added session {session_id} to favorites")
    return {"message": "Session added to favorites", "session_id": session_id}


@router.delete("/users/favorites/{session_id}", status_code=status.HTTP_200_OK)
async def remove_favorite(
    session_id: str,
    current_user = Depends(get_current_user)
):
    """Remove a session from user's favorites"""
    db = get_database()
    
    await db.user_favorites.update_one(
        {"user_id": current_user.id},
        {"$pull": {"favorite_sessions": session_id}}
    )
    
    logger.info(f"User {current_user.username} removed session {session_id} from favorites")
    return {"message": "Session removed from favorites", "session_id": session_id}


@router.get("/users/favorites", response_model=List[str])
async def get_favorites(current_user = Depends(get_current_user)):
    """Get user's favorite session IDs"""
    db = get_database()
    
    favorites_doc = await db.user_favorites.find_one({"user_id": current_user.id})
    
    if not favorites_doc:
        return []
    
    favorite_ids = favorites_doc.get("favorite_sessions", [])
    logger.info(f"User {current_user.username} has {len(favorite_ids)} favorite sessions")
    return favorite_ids

