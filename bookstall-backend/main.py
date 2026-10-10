
from fastapi import FastAPI
from sqlalchemy import create_engine, text

app = FastAPI(title="Bookstall Management System")

DATABASE_URL = "postgresql+psycopg://localhost/bookstall_db"

engine = create_engine(DATABASE_URL)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "Bookstall backend is running"
    }


@app.get("/db-check")
def database_check():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1")).scalar()

    return {
        "database": "connected",
        "test_result": result
    }



@app.get("/books")
def get_books():
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT id, title, author, default_price, active
                FROM books
                WHERE active = TRUE
                ORDER BY title
            """)
        )

        books = [
            {
                "id": row.id,
                "title": row.title,
                "author": row.author,
                "price": float(row.default_price)
                    if row.default_price is not None else None,
                "active": row.active
            }
            for row in result
        ]

    return {"books": books}


