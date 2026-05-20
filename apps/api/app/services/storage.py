from datetime import timedelta

import boto3
from botocore.config import Config as BotoConfig

from app.config import get_settings


class StorageService:
    def __init__(self) -> None:
        settings = get_settings()
        self.bucket = settings.storage_bucket_name
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.storage_endpoint_url,
            aws_access_key_id=settings.storage_access_key_id,
            aws_secret_access_key=settings.storage_secret_access_key,
            config=BotoConfig(signature_version="s3v4"),
        )

    def upload_bytes(self, key: str, payload: bytes) -> str:
        self.client.put_object(Bucket=self.bucket, Key=key, Body=payload)
        return key

    def download_bytes(self, key: str) -> bytes:
        resp = self.client.get_object(Bucket=self.bucket, Key=key)
        return resp["Body"].read()

    def delete(self, key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=key)

    def presigned_download_url(self, key: str, expires_in: timedelta = timedelta(hours=1)) -> str:
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=int(expires_in.total_seconds()),
        )
