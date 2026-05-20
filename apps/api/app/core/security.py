from datetime import UTC, datetime, timedelta

from jose import jwt


def create_access_token(subject: str, secret: str, algorithm: str, minutes: int) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=minutes)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, secret, algorithm=algorithm)
