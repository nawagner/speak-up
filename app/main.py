from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import get_connection, close_connection
from app.api.routes import student, internal


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database
    get_connection()
    yield
    # Shutdown: close database
    close_connection()


app = FastAPI(
    title="Speak-Up",
    description="Oral Exam Application API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware for Streamlit integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(student.router, prefix="/api/v1", tags=["Student"])
app.include_router(internal.router, prefix="/internal", tags=["Internal"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "speak-up"}
