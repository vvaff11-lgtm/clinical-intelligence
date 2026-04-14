from contextlib import suppress
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import OperationalError

from backend.app.core.config import DIST_DIR, ROOT_DIR, get_settings
from backend.app.db.session import SessionLocal
from backend.app.routers import articles, auth, consultations, drugs, knowledge_graph, profile
from backend.app.seeds.seed_data import seed_reference_data


settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    with suppress(OperationalError):
        with SessionLocal() as session:
            seed_reference_data(session)
            session.commit()
    yield


app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(profile.router, prefix=settings.api_prefix)
app.include_router(consultations.router, prefix=settings.api_prefix)
app.include_router(drugs.router, prefix=settings.api_prefix)
app.include_router(articles.router, prefix=settings.api_prefix)
app.include_router(knowledge_graph.router, prefix=settings.api_prefix)

@app.get(f"{settings.api_prefix}/health")
def health() -> dict:
    return {"status": "ok"}


if (DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")


@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    index_file = DIST_DIR / "index.html"
    if full_path.startswith("api/"):
        return JSONResponse(status_code=404, content={"detail": "Not found"})
    if index_file.exists():
        return FileResponse(index_file)
    return JSONResponse(
        {
            "message": "Frontend build not found.",
            "hint": "Run `npm run build` to generate the production frontend bundle.",
            "root": str(ROOT_DIR),
        }
    )
