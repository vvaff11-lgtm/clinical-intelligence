from fastapi import APIRouter, Depends, Query

from backend.app.models.user import User
from backend.app.services.auth import get_current_user
from backend.app.services.medical_knowledge import get_medical_knowledge_service


router = APIRouter(prefix="/knowledge-graph", tags=["knowledge-graph"])


@router.get("")
def get_knowledge_graph(
    node_limit: int = Query(default=500, ge=1, le=2000),
    edge_limit: int = Query(default=1200, ge=1, le=5000),
    _: User = Depends(get_current_user),
) -> dict:
    """
    返回 Neo4j 医疗知识图谱节点和关系。
    """
    return get_medical_knowledge_service().get_full_graph(node_limit=node_limit, edge_limit=edge_limit)
