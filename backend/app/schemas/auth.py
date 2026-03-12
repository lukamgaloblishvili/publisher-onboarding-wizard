from pydantic import BaseModel, ConfigDict


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class PublisherCodeLoginRequest(BaseModel):
    access_code: str


class SessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    role: str
    username: str | None = None
    publisher_id: int | None
    publisher_name: str | None = None
    publisher_slug: str | None = None


class UserUpdate(BaseModel):
    username: str | None = None
    password: str | None = None
