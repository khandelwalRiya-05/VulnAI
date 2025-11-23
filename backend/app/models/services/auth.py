from google.oauth2 import id_token
from google.auth.transport import requests
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta
import jwt
import os
from typing import Optional

# Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "your-google-client-id.apps.googleusercontent.com")
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

security = HTTPBearer()

class AuthService:
    @staticmethod
    def verify_google_token(token: str) -> dict:
        """Verify Google OAuth token and extract user info"""
        try:
            idinfo = id_token.verify_oauth2_token(
                token, 
                requests.Request(), 
                GOOGLE_CLIENT_ID
            )
            
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                raise ValueError('Wrong issuer.')
            
            return {
                "user_id": idinfo['sub'],
                "email": idinfo['email'],
                "name": idinfo.get('name', ''),
                "picture": idinfo.get('picture', '')
            }
        except ValueError as e:
            raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    
    @staticmethod
    def create_access_token(user_data: dict) -> str:
        """Create JWT access token"""
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode = {
            "user_id": user_data["user_id"],
            "email": user_data["email"],
            "name": user_data["name"],
            "exp": expire
        }
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def decode_token(token: str) -> dict:
        """Decode and verify JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
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