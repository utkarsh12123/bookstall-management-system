# Database Design

## 1. Books

The `books` table stores information about every book that the foundation manages.

### Fields

| Field | Meaning |
|---|---|
| id | Unique ID of the book |
| title | Name of the book |
| author | Author of the book |
| default_price | Normal/list price |
| active | Whether the book is currently active |
| created_at | When the book was added |
| updated_at | When the book was last updated |

---

## 2. Members

The `members` table stores people involved in the bookstall operation.

### Fields

| Field | Meaning |
|---|---|
| id | Unique ID of the person |
| name | Person's name |
| role | Admin, regular member, or volunteer |
| status | Current status |
| joined_date | Date they joined |
| created_at | When the record was created |
| updated_at | When the record was updated |

---

## 3. Inventory Locations

An inventory location represents a physical place where books can currently exist.

### Examples

- Foundation Office
- Utkarsh's Bag
- Rajnish's Bag
- Amit's Bag

### Fields

| Field | Meaning |
|---|---|
| id | Unique ID of the location |
| name | Name of the location |
| type | OFFICE or MEMBER_BAG |
| member_id | Member who owns the bag, if applicable |
| active | Whether the location is currently active |
| created_at | When the location was created |

---

## 4. Inventory Transactions

The `inventory_transactions` table records every movement of books from one
inventory location to another.

We do not directly overwrite the current stock quantity.

Instead, every stock movement is recorded as a transaction.

### Fields

| Field | Meaning |
|---|---|
| id | Unique ID of the transaction |
| book_id | Which book was moved |
| transaction_type | Why the movement happened |
| from_location_id | Where the book came from |
| to_location_id | Where the book went |
| quantity | Number of copies moved |
| reference_type | Related record, such as sale or transfer |
| reference_id | ID of the related record |
| created_by | Person who created the transaction |
| created_at | When the transaction happened |

### Transaction Types

The system will initially support these transaction types:

- STOCK_RECEIVED
- TRANSFER
- SALE
- ADJUSTMENT

---

## 5. Stalls

A stall represents one specific bookstall event.

A stall is independent of inventory transfers. A person can take books
from the office on one day and use those books at a stall on another day.

### Fields

| Field | Meaning |
|---|---|
| id | Unique ID of the stall record |
| stall_number | Official stall number |
| date | Date of the stall |
| location | Where the stall happened |
| location_type | Type of location |
| start_time | Stall start time |
| end_time | Stall end time |
| visitor_min | Minimum estimated visitors |
| visitor_max | Maximum estimated visitors |
| app_downloads | Number of app downloads |
| youtube_subscriptions | Number of YouTube subscriptions |
| status | Draft, submitted, approved, etc. |
| created_at | When the record was created |
| updated_at | When the record was updated |

---

## 6. Stall Participants

A stall can have multiple participants.

Participation is separate from inventory ownership and stock source.

### Fields

| Field | Meaning |
|---|---|
| id | Unique ID |
| stall_id | Which stall |
| member_id | Which person participated |
| role | Their role at the stall |
| created_at | When the participation was recorded |

---

## 7. Stall Stock Sources

A stall may have one or more inventory locations supplying the books sold
during that stall.

The stock source is separate from the list of participants.

### Fields

| Field | Meaning |
|---|---|
| id | Unique ID |
| stall_id | Which stall |
| inventory_location_id | Which inventory location supplied the books |
| created_at | When the source was recorded |

---

## 8. Sales

A sale represents a book sale made during a stall.

A stall can have multiple sales.

### Fields

| Field | Meaning |
|---|---|
| id | Unique ID of the sale |
| stall_id | Stall where the sale happened |
| inventory_location_id | Inventory location from which the book was supplied |
| total_amount | Total amount of this sale |
| created_at | When the sale was recorded |

---

## 9. Sale Items

A sale can contain one or more different books.

Each sale item represents one book included in a sale.

### Fields

| Field | Meaning |
|---|---|
| id | Unique ID |
| sale_id | Which sale this item belongs to |
| book_id | Which book was sold |
| inventory_location_id | Which inventory location supplied the book |
| quantity | Number of copies sold |
| list_price | Normal/default price at the time of sale |
| actual_price | Actual price paid per copy |
| discount | Difference between list and actual price |
| created_at | When the item was recorded |

### Fields

| Field | Meaning |
|---|---|
| id | Unique ID |
| sale_id | Which sale this item belongs to |
| book_id | Which book was sold |
| quantity | Number of copies sold |
| list_price | Normal/default price at the time of sale |
| actual_price | Actual price paid per copy |
| discount | Difference between list and actual price |
| created_at | When the item was recorded |

---

## 10. Payments

A stall can receive money through different payment methods.

For example:

- Cash
- Online / UPI

Payment information is stored separately from the sale itself.

### Fields

| Field | Meaning |
|---|---|
| id | Unique ID of the payment |
| stall_id | Stall associated with the payment |
| payment_method | CASH or ONLINE |
| amount | Amount received |
| created_at | When the payment was recorded |

---

## 11. Relationship Between Sales and Inventory

A sale is a stall/business event.

An inventory transaction is a stock movement.

They are separate concepts, but a completed sale can create an inventory
movement.

For example:

If Utkarsh's Bag supplies a stall and 3 copies of a book are sold:

Sale:
    3 copies sold at the stall

Inventory effect:
    3 copies removed from Utkarsh's Bag

---

## 12. Stock Source Rule

Participation in a stall does not imply ownership of the books sold.

The inventory source of a sale item must be explicitly recorded.

For each sale item, the system should identify the inventory location
from which the sold books came.

If the source is unknown, the system should flag the record for review
rather than guessing.



