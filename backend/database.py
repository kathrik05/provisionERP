import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from config import settings

engine_options = {
    "connect_args": {
        "connect_timeout": 10,
        "sslmode": "require",
    },
}

if os.getenv("VERCEL"):
    engine_options["poolclass"] = NullPool
else:
    engine_options.update(
        pool_pre_ping=True,
        pool_recycle=300,
    )

engine = create_engine(settings.DATABASE_URL, **engine_options)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
