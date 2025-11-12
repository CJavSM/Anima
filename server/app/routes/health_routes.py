from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
def health_check():
    """Health check endpoint para Railway"""
    return {
        "status": "healthy",
        "service": "anima-api"
    }