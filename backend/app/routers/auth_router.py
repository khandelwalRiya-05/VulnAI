from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.services.auth import AuthService
import traceback

router = APIRouter()

class GoogleAuthRequest(BaseModel):
    token: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

@router.post("/auth/google", response_model=AuthResponse)
async def google_auth(auth_request: GoogleAuthRequest):
    """Authenticate user with Google OAuth token"""
    print("\n ========================================")
    print(" AUTHENTICATION ATTEMPT")
    print(" ========================================")
    
    try:
        print(f" Received token (first 20 chars): {auth_request.token[:20]}...")
        print(f" Token length: {len(auth_request.token)}")
        
        # Verify Google token
        print(" Verifying Google token...")
        user_data = AuthService.verify_google_token(auth_request.token)
        print(f" Google token verified for user: {user_data['email']}")
        
        # Create JWT access token
        print(" Creating JWT access token...")
        access_token = AuthService.create_access_token(user_data)
        print(f" JWT created (first 20 chars): {access_token[:20]}...")
        
        response = AuthResponse(
            access_token=access_token,
            token_type="bearer",
            user={
                "email": user_data["email"],
                "name": user_data["name"],
                "picture": user_data.get("picture", "")
            }
        )
        
        print(" Authentication successful!")
        print(" ========================================\n")
    
        return response
    
    except HTTPException as he:
        print(f" HTTP Exception: {he.detail}")
        print(" ========================================\n")
        raise
    except Exception as e:
        print(f" Unexpected error: {str(e)}")
        print(f" Error type: {type(e).__name__}")
        print(f" Full traceback:")
        traceback.print_exc()
        print(" ========================================\n")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")