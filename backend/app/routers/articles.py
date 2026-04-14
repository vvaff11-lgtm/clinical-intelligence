from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.article import Article
from backend.app.schemas.article import ArticleDetail, ArticleSummary
from backend.app.schemas.response import PaginatedResponse


router = APIRouter(prefix="/articles", tags=["articles"])


@router.get("", response_model=PaginatedResponse[ArticleSummary])
def list_articles(
    query: str | None = Query(default=None, max_length=100),
    db: Session = Depends(get_db),
) -> PaginatedResponse[ArticleSummary]:
    statement = select(Article)
    count_statement = select(func.count()).select_from(Article)

    if query:
        pattern = f"%{query}%"
        filters = or_(Article.title.like(pattern), Article.excerpt.like(pattern), Article.category.like(pattern))
        statement = statement.where(filters)
        count_statement = count_statement.where(filters)

    items = db.scalars(statement.order_by(Article.featured.desc(), Article.published_at.desc())).all()
    total = db.scalar(count_statement) or 0
    return PaginatedResponse[ArticleSummary](items=items, total=total)


@router.get("/{article_id}", response_model=ArticleDetail)
def get_article(article_id: int, db: Session = Depends(get_db)) -> ArticleDetail:
    article = db.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return ArticleDetail.model_validate(article)
