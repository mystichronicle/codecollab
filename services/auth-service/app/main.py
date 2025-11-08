from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import logging
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Auth Service",
    description="Authentication and Authorization Service",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

@app.on_event("startup")
async def startup_event():
    logger.info("Starting Auth Service")

@app.get("/")
async def root():
    return {
        "service": "auth-service",
        "status": "running",
        "version": "0.1.0"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/auth/login")
async def login(username: str, password: str):
    """Login endpoint - placeholder"""
    logger.info(f"Login attempt: {username}")
    return {
        "access_token": "placeholder_token",
        "token_type": "bearer",
        "user_id": 1
    }

@app.post("/auth/register")
async def register(username: str, email: str, password: str):
    """Register endpoint - placeholder"""
    logger.info(f"Registration: {username}")
    return {
        "message": "User registered successfully",
        "user_id": 1
    }

@app.post("/auth/verify")
async def verify_token(token: str):
    """Verify JWT token - placeholder"""
    return {
        "valid": True,
        "user_id": 1
    }
