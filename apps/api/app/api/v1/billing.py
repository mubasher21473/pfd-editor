from fastapi import APIRouter

router = APIRouter()


@router.post("/webhook")
async def stripe_webhook() -> dict[str, str]:
    return {"received": "true"}


@router.get("/status")
async def subscription_status() -> dict[str, str]:
    return {"tier": "free"}
