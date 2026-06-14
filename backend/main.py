from pathlib import Path

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware

from response import error, success
from routers.clients import router as clients_router
from routers.inventory import router as inventory_router
from routers.sales import router as sales_router
from routers.taxes import router as taxes_router
from routers.settings import router as settings_router
from routers.invoices import router as invoices_router
from routers.reports import router as reports_router
from routers.offers import router as offers_router

app = FastAPI(title="Provisions ERP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc: StarletteHTTPException):
    return JSONResponse(status_code=exc.status_code, content=error(str(exc.detail)))


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content=error("Validation error"))


from routers.suppliers import router as suppliers_router
from routers.purchases import router as purchases_router
from routers.price_history import router as price_history_router

app.include_router(clients_router, prefix="/api")
app.include_router(inventory_router, prefix="/api")
app.include_router(sales_router, prefix="/api")
app.include_router(taxes_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(invoices_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(offers_router, prefix="/api")
app.include_router(suppliers_router, prefix="/api")
app.include_router(purchases_router, prefix="/api")
app.include_router(price_history_router, prefix="/api")


@app.get("/api")
@app.get("/api/")
def root():
    try:
        return success({"status": "ok"})
    except Exception as e:
        return error(str(e))


frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
frontend_assets = frontend_dist / "assets"

if frontend_assets.is_dir():
    app.mount("/assets", StaticFiles(directory=frontend_assets), name="assets")


@app.get("/{path:path}", include_in_schema=False)
def frontend(path: str):
    if path.startswith("api"):
        return JSONResponse(status_code=404, content=error("Not found"))

    requested_file = frontend_dist / path
    if path and requested_file.is_file():
        return FileResponse(requested_file)

    index_file = frontend_dist / "index.html"
    if index_file.is_file():
        return FileResponse(index_file)

    return JSONResponse(
        status_code=503,
        content=error("Frontend build is unavailable"),
    )
