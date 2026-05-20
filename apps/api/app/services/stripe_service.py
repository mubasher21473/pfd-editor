class StripeService:
    def create_checkout_session(self, user_id: str, price_id: str) -> dict[str, str]:
        return {
            "user_id": user_id,
            "price_id": price_id,
            "checkout_url": "https://checkout.stripe.com",
        }

    def handle_webhook(self, payload: bytes, signature: str) -> bool:
        _ = payload
        _ = signature
        return True
