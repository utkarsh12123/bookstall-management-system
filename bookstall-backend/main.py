from fastapi.middleware.cors import CORSMiddleware

from fastapi import FastAPI, HTTPException

from pydantic import BaseModel, Field

from sqlalchemy import create_engine, text



app = FastAPI(title="Bookstall Management System")



app.add_middleware(

    CORSMiddleware,

    allow_origins=["http://localhost:5173"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],

)



DATABASE_URL = "postgresql+psycopg://localhost/bookstall_db"



engine = create_engine(DATABASE_URL)



class BookCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    price: float = Field(gt=0)


class BookUpdateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    price: float = Field(gt=0)


class TransferRequest(BaseModel):

    book_id: int = Field(gt=0)

    from_location_id: int = Field(gt=0)

    to_location_id: int = Field(gt=0)

    quantity: int = Field(gt=0)

    created_by: int | None = None





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





@app.post("/books", status_code=201)
def create_book(book: BookCreateRequest):
    title = book.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Book title cannot be empty.")

    with engine.begin() as connection:
        result = connection.execute(
            text("""
                INSERT INTO books (title, default_price, active)
                VALUES (:title, :price, TRUE)
                RETURNING id, title, author, default_price, active
            """),
            {"title": title, "price": book.price},
        ).mappings().one()

    return {"book": {
        "id": result["id"], "title": result["title"],
        "author": result["author"],
        "price": float(result["default_price"]) if result["default_price"] is not None else None,
        "active": result["active"],
    }}


@app.put("/books/{book_id}")
def update_book(book_id: int, book: BookUpdateRequest):
    title = book.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Book title cannot be empty.")

    with engine.begin() as connection:
        result = connection.execute(
            text("""
                UPDATE books
                SET title = :title, default_price = :price,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :book_id AND active = TRUE
                RETURNING id, title, author, default_price, active
            """),
            {"book_id": book_id, "title": title, "price": book.price},
        ).mappings().first()
        if result is None:
            raise HTTPException(status_code=404, detail="Active book not found.")

    return {"book": {
        "id": result["id"], "title": result["title"],
        "author": result["author"],
        "price": float(result["default_price"]) if result["default_price"] is not None else None,
        "active": result["active"],
    }}


@app.delete("/books/{book_id}")
def deactivate_book(book_id: int):
    with engine.begin() as connection:
        book = connection.execute(
            text("SELECT id FROM books WHERE id = :book_id AND active = TRUE FOR UPDATE"),
            {"book_id": book_id},
        ).first()
        if book is None:
            raise HTTPException(status_code=404, detail="Active book not found.")

        locations_with_stock = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM (
                    SELECT location_id, SUM(stock_change) AS current_stock
                    FROM (
                        SELECT from_location_id AS location_id, -quantity AS stock_change
                        FROM inventory_transactions
                        WHERE book_id = :book_id AND from_location_id IS NOT NULL
                        UNION ALL
                        SELECT to_location_id AS location_id, quantity AS stock_change
                        FROM inventory_transactions
                        WHERE book_id = :book_id AND to_location_id IS NOT NULL
                    ) AS movement
                    GROUP BY location_id
                    HAVING SUM(stock_change) <> 0
                ) AS nonzero_locations
            """),
            {"book_id": book_id},
        ).scalar_one()
        if locations_with_stock:
            raise HTTPException(
                status_code=409,
                detail="This book still has stock at one or more locations. Transfer or reconcile its stock before deactivating it.",
            )

        connection.execute(
            text("UPDATE books SET active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = :book_id"),
            {"book_id": book_id},
        )

    return {"message": "Book deactivated. Transaction history has been preserved."}


@app.get("/inventory")

def get_inventory():

    query = text("""

        SELECT

            b.id AS book_id,

            b.title,

            l.id AS location_id,

            l.name AS location_name,

            SUM(movement.stock_change) AS current_stock

        FROM (

            SELECT

                book_id,

                from_location_id AS location_id,

                -quantity AS stock_change

            FROM inventory_transactions

            WHERE from_location_id IS NOT NULL



            UNION ALL



            SELECT

                book_id,

                to_location_id AS location_id,

                quantity AS stock_change

            FROM inventory_transactions

            WHERE to_location_id IS NOT NULL

        ) AS movement

        JOIN books AS b

            ON b.id = movement.book_id

        JOIN inventory_locations AS l

            ON l.id = movement.location_id

        WHERE b.active = TRUE

        GROUP BY

            b.id, b.title, l.id, l.name

        ORDER BY b.title, l.name

    """)



    with engine.connect() as connection:

        result = connection.execute(query)



        inventory = [

            {

                "book_id": row.book_id,

                "title": row.title,

                "location_id": row.location_id,

                "location_name": row.location_name,

                "current_stock": row.current_stock

            }

            for row in result

        ]



    return {"inventory": inventory}





@app.get("/locations")

def get_locations():

    query = text("""

        SELECT

            l.id,

            l.name,

            l.type,

            l.member_id,

            m.name AS member_name,

            l.active

        FROM inventory_locations AS l

        LEFT JOIN members AS m

            ON l.member_id = m.id

        WHERE l.active = TRUE

        ORDER BY l.id

    """)



    with engine.connect() as connection:

        result = connection.execute(query)



        locations = [

            {

                "id": row.id,

                "name": row.name,

                "type": row.type,

                "member_id": row.member_id,

                "member_name": row.member_name,

                "active": row.active

            }

            for row in result

        ]



    return {"locations": locations}





@app.post("/transfers")

def create_transfer(transfer: TransferRequest):

    if transfer.from_location_id == transfer.to_location_id:

        raise HTTPException(

            status_code=400,

            detail="Source and destination must be different."

        )



    with engine.begin() as connection:

        # Lock the book row so concurrent transfers for this book

        # cannot both spend the same available stock.

        book = connection.execute(

            text("""

                SELECT id

                FROM books

                WHERE id = :book_id AND active = TRUE

                FOR UPDATE

            """),

            {"book_id": transfer.book_id}

        ).first()



        if book is None:

            raise HTTPException(

                status_code=404,

                detail="Active book not found."

            )



        # Confirm both locations exist and are active.

        location_ids = connection.execute(

            text("""

                SELECT id

                FROM inventory_locations

                WHERE id IN (:source_id, :destination_id)

                  AND active = TRUE

            """),

            {

                "source_id": transfer.from_location_id,

                "destination_id": transfer.to_location_id,

            }

        ).scalars().all()



        if (

            transfer.from_location_id not in location_ids

            or transfer.to_location_id not in location_ids

        ):

            raise HTTPException(

                status_code=400,

                detail="Both locations must exist and be active."

            )



        # Calculate the source's current stock from the transaction ledger.

        source_stock = connection.execute(

            text("""

                SELECT COALESCE(

                    SUM(

                        CASE

                            WHEN from_location_id = :location_id

                                THEN -quantity

                            WHEN to_location_id = :location_id

                                THEN quantity

                        END

                    ), 0

                )

                FROM inventory_transactions

                WHERE book_id = :book_id

                  AND (

                      from_location_id = :location_id

                      OR to_location_id = :location_id

                  )

            """),

            {

                "book_id": transfer.book_id,

                "location_id": transfer.from_location_id,

            }

        ).scalar_one()



        if source_stock < 0:

            raise HTTPException(

                status_code=409,

                detail="Source location has negative stock. Reconcile it first."

            )



        if transfer.quantity > source_stock:

            raise HTTPException(

                status_code=409,

                detail=f"Only {source_stock} copies are available at the source."

            )



        # Validate the optional member who records the transfer.

        if transfer.created_by is not None:

            member = connection.execute(

                text("""

                    SELECT id

                    FROM members

                    WHERE id = :member_id AND status = 'ACTIVE'

                """),

                {"member_id": transfer.created_by}

            ).first()



            if member is None:

                raise HTTPException(

                    status_code=400,

                    detail="The recording member must be active."

                )



        # Record the transfer. The inventory endpoint will calculate

        # the new balances from this row.

        result = connection.execute(

            text("""

                INSERT INTO inventory_transactions (

                    book_id,

                    transaction_type,

                    from_location_id,

                    to_location_id,

                    quantity,

                    reference_type,

                    created_by

                )

                VALUES (

                    :book_id,

                    'TRANSFER',

                    :source_id,

                    :destination_id,

                    :quantity,

                    'TRANSFER',

                    :created_by

                )

                RETURNING id, created_at

            """),

            {

                "book_id": transfer.book_id,

                "source_id": transfer.from_location_id,

                "destination_id": transfer.to_location_id,

                "quantity": transfer.quantity,

                "created_by": transfer.created_by,

            }

        ).first()



        transaction_id = result.id

        created_at = result.created_at



    return {

        "message": "Transfer recorded successfully.",

        "transaction_id": transaction_id,

        "book_id": transfer.book_id,

        "from_location_id": transfer.from_location_id,

        "to_location_id": transfer.to_location_id,

        "quantity": transfer.quantity,

        "created_at": created_at.isoformat(),

    }



@app.get("/transfers")

def get_transfers():

    query = text("""

        SELECT

            t.id,

            t.book_id,

            b.title AS book_title,

            t.quantity,

            src.name AS source,

            dst.name AS destination,

            t.created_at

        FROM inventory_transactions AS t

        JOIN books AS b ON b.id = t.book_id

        JOIN inventory_locations AS src

            ON src.id = t.from_location_id

        JOIN inventory_locations AS dst

            ON dst.id = t.to_location_id

        WHERE t.transaction_type = 'TRANSFER'

        ORDER BY t.created_at DESC, t.id DESC

    """)



    with engine.connect() as connection:

        rows = connection.execute(query).mappings().all()



    transfers = [

        {

            "id": row["id"],

            "bookId": row["book_id"],

            "bookTitle": row["book_title"],

            "quantity": row["quantity"],

            "source": row["source"],

            "destination": row["destination"],

            "date": row["created_at"].isoformat(),

        }

        for row in rows

    ]



    return {"transfers": transfers}
