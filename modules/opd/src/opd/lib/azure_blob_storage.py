"""Azure Blob Storage helpers for OPD patient health documents."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from functools import lru_cache
from urllib.parse import quote, unquote, urlparse

from azure.core.exceptions import ResourceExistsError
from azure.storage.blob import (
    BlobSasPermissions,
    BlobServiceClient,
    ContentSettings,
    generate_blob_sas,
)

from opd.core.config import get_azure_blob_settings
from opd.lib.file_upload_validation import generate_secure_filename, sanitize_filename


@dataclass(frozen=True)
class BlobUploadResult:
    blob_url: str
    storage_key: str


def _account_name_from_connection_string(connection_string: str) -> str | None:
    for part in connection_string.split(";"):
        key, _, value = part.partition("=")
        if key.strip().lower() == "accountname" and value.strip():
            return value.strip()
    return None


def _resolve_storage_account_name(settings) -> str:
    if settings.account_name:
        return settings.account_name
    if settings.connection_string:
        from_conn = _account_name_from_connection_string(settings.connection_string)
        if from_conn:
            return from_conn
    raise RuntimeError("Azure storage account name is not configured")


@lru_cache
def _blob_service_client() -> BlobServiceClient:
    settings = get_azure_blob_settings()
    if not settings.connection_string:
        raise RuntimeError("Azure Storage connection string is not configured")
    return BlobServiceClient.from_connection_string(settings.connection_string)


def upload_health_document_blob(
    file_bytes: bytes,
    original_file_name: str,
    mime_type: str,
    folder_path: str,
) -> BlobUploadResult:
    settings = get_azure_blob_settings()
    if not settings.connection_string:
        raise RuntimeError("Azure Storage connection string is not configured")

    client = _blob_service_client()
    container_client = client.get_container_client(settings.container_name)
    try:
        container_client.create_container()
    except ResourceExistsError:
        pass

    sanitized_name = sanitize_filename(original_file_name)
    extension = sanitized_name.rsplit(".", 1)[-1] if "." in sanitized_name else ""
    if not extension:
        extension = {
            "application/pdf": "pdf",
            "image/jpeg": "jpg",
            "image/jpg": "jpg",
            "image/png": "png",
        }.get(mime_type.split(";")[0].strip().lower(), "")
    secure_name = generate_secure_filename(f".{extension}" if extension else "")
    storage_key = f"{folder_path}/{secure_name}" if folder_path else secure_name

    blob_client = container_client.get_blob_client(storage_key)
    blob_client.upload_blob(
        file_bytes,
        overwrite=False,
        content_settings=ContentSettings(
            content_type=mime_type,
            cache_control="no-cache",
            content_disposition="attachment",
        ),
        metadata={
            "originalFileName": sanitized_name,
            "uploadedAt": datetime.now(UTC).isoformat(),
            "securityValidated": "true",
        },
    )
    return BlobUploadResult(blob_url=blob_client.url, storage_key=storage_key)


def generate_blob_sas_url(
    blob_url: str,
    *,
    storage_key: str | None = None,
    download_file_name: str | None = None,
    expiry_minutes: int = 10,
) -> str:
    settings = get_azure_blob_settings()
    if not settings.account_key:
        raise RuntimeError("Azure storage account key is not set")

    account_name = _resolve_storage_account_name(settings)
    container_name = settings.container_name

    if storage_key:
        blob_name = storage_key
        encoded_blob = quote(blob_name, safe="/")
        base_url = (
            f"https://{account_name}.blob.core.windows.net/"
            f"{container_name}/{encoded_blob}"
        )
    else:
        parsed = urlparse(blob_url.split("?", 1)[0])
        path_parts = [part for part in parsed.path.split("/") if part]
        if len(path_parts) < 2:
            raise ValueError("Could not parse container or blob name from URL")
        container_name = path_parts[0]
        blob_name = unquote("/".join(path_parts[1:]))
        base_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"

    expires_on = datetime.now(UTC) + timedelta(minutes=expiry_minutes)
    content_disposition = None
    if download_file_name:
        safe_name = sanitize_filename(download_file_name)
        content_disposition = f'attachment; filename="{safe_name}"'

    sas_token = generate_blob_sas(
        account_name=account_name,
        container_name=container_name,
        blob_name=blob_name,
        account_key=settings.account_key,
        permission=BlobSasPermissions(read=True),
        expiry=expires_on,
        content_disposition=content_disposition,
    )
    return f"{base_url}?{sas_token}"


def download_health_document_bytes(storage_key: str) -> tuple[bytes, str]:
    """Read blob bytes server-side (avoids browser CORS to Azure)."""
    settings = get_azure_blob_settings()
    if not settings.connection_string:
        raise RuntimeError("Azure Storage connection string is not configured")

    blob_client = _blob_service_client().get_blob_client(
        settings.container_name,
        storage_key,
    )
    try:
        props = blob_client.get_blob_properties()
        payload = blob_client.download_blob().readall()
    except Exception as exc:
        raise RuntimeError(f"Failed to download blob: {storage_key}") from exc

    content_type = "application/octet-stream"
    if props.content_settings and props.content_settings.content_type:
        content_type = props.content_settings.content_type
    return payload, content_type
