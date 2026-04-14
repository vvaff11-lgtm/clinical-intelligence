from typing import Generic, TypeVar

from backend.app.schemas.base import CamelModel


T = TypeVar("T")


class PaginatedResponse(CamelModel, Generic[T]):
    items: list[T]
    total: int
