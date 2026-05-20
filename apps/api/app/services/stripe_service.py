import stripe

from app.config import get_settings


class StripeService:
    def __init__(self) -> None:
        settings = get_settings()
        stripe.api_key = settings.stripe_secret_key
        self.webhook_secret = settings.stripe_webhook_secret

    def create_checkout_session(self, user_id: str, price_id: str) -> dict[str, str]:
        return {
            "user_id": user_id,
            "price_id": price_id,
            "checkout_url": "https://checkout.stripe.com",
        }

    def handle_webhook(self, payload: bytes, signature: str) -> bool:
        try:
            stripe.Webhook.construct_event(
                payload=payload,
                sig_header=signature,
                secret=self.webhook_secret,
            )
        except (ValueError, stripe.error.SignatureVerificationError):
            return False
        return True
