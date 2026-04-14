from datetime import datetime

from backend.app.schemas.base import CamelModel


class ArticleSummary(CamelModel):
    id: int
    title: str
    category: str
    excerpt: str
    image_url: str
    author: str
    published_at: datetime
    read_time: str
    tags: list[str]
    featured: bool


class ArticleDetail(ArticleSummary):
    content: str
