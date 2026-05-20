from pydantic import BaseModel


class SubscriptionStatus(BaseModel):
    tier: str
    active: bool
