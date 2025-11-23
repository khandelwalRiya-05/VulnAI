from google.oauth2 import id_token
from google.auth.transport import requests
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta
import jwt

# Import configuration (which loads .env)
from app.config import (
    GOOGLE_CLIENT_ID,
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

security = HTTPBearer()

class AuthService:
    @staticmethod
    def verify_google_token(token: str) -> dict:
        """Verify Google OAuth token and extract user info"""
        print("Starting Google token verification...")
        
        try:
            if not GOOGLE_CLIENT_ID:
                error_msg = "GOOGLE_CLIENT_ID environment variable is not set"
                print(f" {error_msg}")
                raise ValueError(error_msg)
            
            print(f"✓ GOOGLE_CLIENT_ID is set: {GOOGLE_CLIENT_ID[:20]}...")
            print(" Calling Google's token verification API...")
            
            # Add clock_skew_in_seconds to handle time differences
            idinfo = id_token.verify_oauth2_token(
                token, 
                requests.Request(), 
                GOOGLE_CLIENT_ID,
                clock_skew_in_seconds=10
            )
            
            print(f" Token verified successfully!")
            print(f"   - Email: {idinfo.get('email')}")
            print(f"   - Name: {idinfo.get('name')}")
            
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                raise ValueError('Wrong issuer.')
            
            user_data = {
                "user_id": idinfo['sub'],
                "email": idinfo['email'],
                "name": idinfo.get('name', ''),
                "picture": idinfo.get('picture', '')
            }
            
            print(f" User data extracted: {user_data['email']}")
            return user_data
            
        except ValueError as e:
            print(f" ValueError: {str(e)}")
            raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
        except Exception as e:
            print(f" Exception: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")
    
    @staticmethod
    def create_access_token(user_data: dict) -> str:
        """Create JWT access token"""
        print(" Creating JWT access token...")
        
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode = {
            "user_id": user_data["user_id"],
            "email": user_data["email"],
            "name": user_data["name"],
            "exp": expire
        }
        
        print(f"   - Expires at: {expire}")
        print(f"   - User: {user_data['email']}")
        
        encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        
        print(f" JWT created successfully")
        return encoded_jwt
    
    @staticmethod
    def decode_token(token: str) -> dict:
        """Decode and verify JWT token"""
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    user_data = AuthService.decode_token(token)
    return user_data