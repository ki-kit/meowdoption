from pydantic import BaseModel, ConfigDict


class Token(BaseModel):
    model_config = ConfigDict(json_schema_serialization_defaults_required=True)

    access_token: str
    token_type: str = "bearer"


class AdminRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
