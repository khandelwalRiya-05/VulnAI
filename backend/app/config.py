# app/config.py
from dotenv import load_dotenv
import os

# Get the project root directory (one level up from app/)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BASE_DIR, '.env')

# Load .env file
load_dotenv(ENV_PATH, override=True)

# Export configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

# Debug print
print("\n ========================================")
print(" CONFIG LOADED")
print(" ========================================")
print(f"GOOGLE_CLIENT_ID set: {bool(GOOGLE_CLIENT_ID)}")
if GOOGLE_CLIENT_ID:
    print(f"GOOGLE_CLIENT_ID preview: {GOOGLE_CLIENT_ID[:30]}...")
print(f"JWT_SECRET_KEY set: {bool(JWT_SECRET_KEY)}")
print(" ========================================\n")