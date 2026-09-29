from pydantic import BaseModel, ConfigDict


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
