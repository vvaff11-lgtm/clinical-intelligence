from pathlib import Path
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.app.db.base_class import Base
from backend.app.db.session import get_db
from backend.app.main import app
from backend.app.seeds.seed_data import seed_reference_data


TEST_DB_PATH = Path("backend/tests/test_app.db")
TEST_ENGINE = create_engine(f"sqlite:///{TEST_DB_PATH}", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(bind=TEST_ENGINE, autocommit=False, autoflush=False)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(bind=TEST_ENGINE)
    Base.metadata.create_all(bind=TEST_ENGINE)
    with TestingSessionLocal() as session:
        seed_reference_data(session)
        session.commit()
    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def register_user(client: TestClient):
    response = client.post(
        "/api/auth/register",
        json={
            "name": "测试用户",
            "email": "tester@example.com",
            "phone": "13800000000",
            "password": "secret123",
        },
    )
    assert response.status_code == 201
    return response.json()


def auth_headers(token: str):
    return {"Authorization": f"Bearer {token}"}


def test_auth_profile_and_consultations_flow(client: TestClient):
    auth = register_user(client)
    token = auth["token"]

    me = client.get("/api/auth/me", headers=auth_headers(token))
    assert me.status_code == 200
    assert me.json()["email"] == "tester@example.com"

    update_profile = client.put(
        "/api/profile",
        headers=auth_headers(token),
        json={
            "age": 32,
            "bloodType": "A+",
            "height": "176 cm",
            "address": "上海市浦东新区",
            "allergies": ["花粉"],
            "chronicConditions": ["过敏性鼻炎"],
            "privacySettings": {"shareHistory": True, "smartAlerts": True},
        },
    )
    assert update_profile.status_code == 200
    assert update_profile.json()["bloodType"] == "A+"

    session_response = client.post("/api/consultations", headers=auth_headers(token), json={})
    assert session_response.status_code == 201
    session_id = session_response.json()["id"]

    message_response = client.post(
        f"/api/consultations/{session_id}/messages",
        headers=auth_headers(token),
        json={"content": "持续头痛三天，并伴随轻微发热"},
    )
    assert message_response.status_code == 201

    history = client.get("/api/consultations", headers=auth_headers(token))
    assert history.status_code == 200
    assert history.json()["total"] == 1
    assert "持续头痛" in history.json()["items"][0]["summary"]


def test_public_content_endpoints(client: TestClient):
    articles = client.get("/api/articles")
    assert articles.status_code == 200
    assert articles.json()["total"] >= 1

    drugs = client.get("/api/drugs?query=布洛芬")
    assert drugs.status_code == 200
    assert drugs.json()["items"][0]["name"] == "布洛芬缓释胶囊"
