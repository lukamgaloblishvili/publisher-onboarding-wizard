from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.core.config import settings


class StorageService:
    def __init__(self) -> None:
        self.base_path = Path(settings.upload_dir)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def save_upload(self, file: UploadFile) -> tuple[str, str]:
        suffix = Path(file.filename or "upload.bin").suffix
        target_name = f"{uuid4().hex}{suffix}"
        target = self.base_path / target_name
        with target.open("wb") as output:
            while chunk := file.file.read(1024 * 1024):
                output.write(chunk)
        return f"/uploads/{target_name}", file.filename or target_name
