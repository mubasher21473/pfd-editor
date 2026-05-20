from datetime import timedelta


class StorageService:
    def upload_bytes(self, key: str, payload: bytes) -> str:
        _ = payload
        return key

    def delete(self, key: str) -> None:
        _ = key

    def presigned_download_url(self, key: str, expires_in: timedelta = timedelta(hours=1)) -> str:
        _ = expires_in
        return f"https://example.com/{key}"
