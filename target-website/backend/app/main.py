
import os
import time
import threading
from collections import deque
from contextlib import asynccontextmanager

import psutil

from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy.orm import sessionmaker, Session

from app.models import Base, User
from app.schemas import UserCreate, LoginRequest, TokenResponse, UserResponse
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://lab_user:lab_password@db:5432/target_db",
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# --------------------------------------------------
# Monitoring and Detection Configuration
# --------------------------------------------------

process = psutil.Process(os.getpid())
process.cpu_percent(interval=None)

server_started_at = time.monotonic()

metrics_lock = threading.Lock()

metrics = {
    "request_count": 0,
    "active_requests": 0,
    "completed_requests": 0,
    "total_response_time_ms": 0.0,
}

# Detection configuration
DETECTION_WINDOW_SECONDS = 5
SUSPICIOUS_RPS_THRESHOLD = 10
UNDER_ATTACK_RPS_THRESHOLD = 25

request_timestamps = deque()
detection_lock = threading.Lock()

# --------------------------------------------------
# Mitigation Engine Configuration
# --------------------------------------------------

MITIGATION_RATE_LIMIT = 10
MITIGATION_WINDOW_SECONDS = 1
MITIGATION_RECOVERY_SECONDS = 10

mitigation_lock = threading.Lock()

mitigation_state = {
    "active": False,
    "activated_at": None,
    "deactivated_at": None,
    "normal_since": None,
    "blocked_requests": 0,
}

client_request_timestamps = {}

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# --------------------------------------------------
# Detection Engine
# --------------------------------------------------

def get_detection_snapshot():
    now = time.monotonic()
    cutoff = now - DETECTION_WINDOW_SECONDS

    with detection_lock:
        while (
            request_timestamps
            and request_timestamps[0] < cutoff
        ):
            request_timestamps.popleft()

        recent_requests = len(request_timestamps)

    requests_per_second = (
        recent_requests / DETECTION_WINDOW_SECONDS
    )

    if requests_per_second >= UNDER_ATTACK_RPS_THRESHOLD:
        detection_status = "UNDER_ATTACK"
        severity = "critical"
        message = "High request rate detected."

    elif requests_per_second >= SUSPICIOUS_RPS_THRESHOLD:
        detection_status = "SUSPICIOUS"
        severity = "warning"
        message = "Unusual request rate detected."

    else:
        detection_status = "NORMAL"
        severity = "info"
        message = "Traffic is within the configured normal range."

    return {
        "status": detection_status,
        "severity": severity,
        "message": message,
        "requests_per_second": round(requests_per_second, 2),
        "observed_requests": recent_requests,
        "window_seconds": DETECTION_WINDOW_SECONDS,
        "thresholds": {
            "suspicious_rps": SUSPICIOUS_RPS_THRESHOLD,
            "under_attack_rps": UNDER_ATTACK_RPS_THRESHOLD,
        },
    }

# --------------------------------------------------
# Mitigation Engine
# --------------------------------------------------

def update_mitigation_state():
    detection = get_detection_snapshot()
    now = time.monotonic()

    with mitigation_lock:

        if detection["status"] == "UNDER_ATTACK":

            mitigation_state["active"] = True
            mitigation_state["normal_since"] = None

            if mitigation_state["activated_at"] is None or (
                mitigation_state["deactivated_at"] is not None
            ):
                mitigation_state["activated_at"] = time.time()
                mitigation_state["deactivated_at"] = None

        elif mitigation_state["active"]:

            if detection["status"] == "NORMAL":

                if mitigation_state["normal_since"] is None:
                    mitigation_state["normal_since"] = now

                elif (
                    now - mitigation_state["normal_since"]
                    >= MITIGATION_RECOVERY_SECONDS
                ):
                    mitigation_state["active"] = False
                    mitigation_state["deactivated_at"] = time.time()
                    mitigation_state["normal_since"] = None

            else:
                mitigation_state["normal_since"] = None


def get_mitigation_snapshot():

    with mitigation_lock:
        return {
            "active": mitigation_state["active"],
            "activated_at": mitigation_state["activated_at"],
            "deactivated_at": mitigation_state["deactivated_at"],
            "blocked_requests": mitigation_state["blocked_requests"],
            "rate_limit": MITIGATION_RATE_LIMIT,
            "window_seconds": MITIGATION_WINDOW_SECONDS,
            "recovery_seconds": MITIGATION_RECOVERY_SECONDS,
        }

# --------------------------------------------------
# Application Lifecycle
# --------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    yield

    engine.dispose()


app = FastAPI(
    title="DDoS Lab - Target Server",
    description="Local laboratory target web application.",
    version="1.0.0",
    lifespan=lifespan,
)

bearer_scheme = HTTPBearer(auto_error=False)


# --------------------------------------------------
# Authentication
# --------------------------------------------------

def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = decode_access_token(credentials.credentials)

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


# --------------------------------------------------
# Middleware
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.middleware("http")
async def monitor_requests(request: Request, call_next):

    # Endpoints that must remain accessible during mitigation.
    mitigation_exempt_paths = {
        "/health",
        "/api/metrics",
        "/api/detection",
        "/api/mitigation",
    }

    # Monitoring endpoints must not affect attack detection.
    excluded_paths = {
        "/api/metrics",
        "/api/detection",
        "/api/mitigation",
    }

    path = request.url.path

    should_measure = path not in excluded_paths
    should_protect = path not in mitigation_exempt_paths

    if should_measure:

        now = time.monotonic()
        cutoff = now - DETECTION_WINDOW_SECONDS

        # Record incoming requests for detection.
        with detection_lock:
            request_timestamps.append(now)

            while (
                request_timestamps
                and request_timestamps[0] < cutoff
            ):
                request_timestamps.popleft()

        # Update server metrics.
        with metrics_lock:
            metrics["request_count"] += 1
            metrics["active_requests"] += 1

        # Update automatic mitigation state.
        update_mitigation_state()

    started_at = time.perf_counter()

    try:

        # Apply per-client rate limiting when mitigation is active.
        if should_protect:

            with mitigation_lock:
                mitigation_active = mitigation_state["active"]

            if mitigation_active:

                client_ip = (
                    request.client.host
                    if request.client
                    else "unknown"
                )

                now = time.monotonic()
                cutoff = now - MITIGATION_WINDOW_SECONDS

                with mitigation_lock:

                    client_requests = client_request_timestamps.setdefault(
                        client_ip,
                        deque()
                    )

                    # Remove expired timestamps.
                    while (
                        client_requests
                        and client_requests[0] <= cutoff
                    ):
                        client_requests.popleft()

                    if len(client_requests) >= MITIGATION_RATE_LIMIT:

                        mitigation_state["blocked_requests"] += 1

                        return JSONResponse(
                            status_code=429,
                            content={
                                "detail": "Request rate limit exceeded",
                                "mitigation_active": True,
                                "retry_after_seconds": (
                                    MITIGATION_WINDOW_SECONDS
                                ),
                            },
                            headers={
                                "Retry-After": str(
                                    MITIGATION_WINDOW_SECONDS
                                )
                            },
                        )

                    # Allow this request.
                    client_requests.append(now)

        response = await call_next(request)
        return response

    finally:

        if should_measure:

            elapsed_ms = (
                time.perf_counter() - started_at
            ) * 1000

            with metrics_lock:
                metrics["active_requests"] -= 1
                metrics["completed_requests"] += 1
                metrics["total_response_time_ms"] += elapsed_ms


# --------------------------------------------------
# Basic Endpoints
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "service": "Target Server",
        "status": "running",
        "environment": "isolated-lab",
    }


@app.get("/health")
def health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "database": "connected",
        }

    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "unhealthy",
                "database": "disconnected",
            },
        ) from exc


@app.get("/api/status")
def application_status():
    return {
        "application": "Target Website",
        "status": "operational",
        "database": "PostgreSQL",
    }


# --------------------------------------------------
# Monitoring Endpoint
# --------------------------------------------------

@app.get("/api/metrics")
def get_metrics():

    with metrics_lock:
        request_count = metrics["request_count"]
        completed_requests = metrics["completed_requests"]
        active_requests = metrics["active_requests"]
        total_response_time = metrics["total_response_time_ms"]

    average_response_time = (
        total_response_time / completed_requests
        if completed_requests > 0
        else 0.0
    )

    try:
        cpu_percent = process.cpu_percent(interval=None)
        memory_mb = (
            process.memory_info().rss / (1024 * 1024)
        )
        uptime_seconds = (
            time.monotonic() - server_started_at
        )

    except psutil.Error:
        cpu_percent = 0.0
        memory_mb = 0.0
        uptime_seconds = (
            time.monotonic() - server_started_at
        )

    return {
        "cpu_percent": round(cpu_percent, 2),
        "memory_mb": round(memory_mb, 2),
        "request_count": request_count,
        "completed_requests": completed_requests,
        "active_requests": active_requests,
        "average_response_time_ms": round(
            average_response_time, 2
        ),
        "uptime_seconds": round(uptime_seconds, 2),
    }



# --------------------------------------------------
# Detection Endpoint
# --------------------------------------------------

@app.get("/api/detection")
def get_detection_status():
    return get_detection_snapshot()


# --------------------------------------------------
# Mitigation Endpoint
# --------------------------------------------------

@app.get("/api/mitigation")
def get_mitigation_status():

    # Update mitigation state to support automatic recovery.
    update_mitigation_state()

    return get_mitigation_snapshot()


# --------------------------------------------------
# Authentication Endpoints
# --------------------------------------------------

@app.post(
    "/api/auth/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
):

    existing_username = db.query(User).filter(
        User.username == user_data.username
    ).first()

    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already registered",
        )

    existing_email = db.query(User).filter(
        User.email == user_data.email
    ).first()

    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    new_user = User(
        username=user_data.username,
        email=str(user_data.email),
        hashed_password=hash_password(user_data.password),
        is_active=True,
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email is already registered",
        ) from exc

    return new_user


@app.post(
    "/api/auth/login",
    response_model=TokenResponse,
)
def login_user(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
):

    user = db.query(User).filter(
        User.email == login_data.email
    ).first()

    if not user or not verify_password(
        login_data.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    access_token, expires_in = create_access_token(
        subject=str(user.id)
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": expires_in,
    }


@app.get(
    "/api/auth/me",
    response_model=UserResponse,
)
def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    return current_user
