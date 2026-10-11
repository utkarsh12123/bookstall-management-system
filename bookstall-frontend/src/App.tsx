
import { useEffect, useState } from 'react'
import './App.css'

type Book = {
  id: number
  title: string
  price: number
  stock: number
}

type LocationStock = Record<string, number>

type StockTransfer = {
  id: number
  bookId: number
  bookTitle: string
  quantity: number
  source: string
  destination: string
  date: string
}

const LOCATIONS = [
  'Foundation Office',
  "Members' Bags",
  'Bookstalls',
]

const LOW_STOCK_LIMIT = 10

const sampleBooks: Book[] = [
  { id: 1, title: 'संगति', price: 210, stock: 45 },
  { id: 2, title: 'मन', price: 190, stock: 32 },
  { id: 3, title: 'उत्कृष्टता', price: 210, stock: 28 },
  { id: 4, title: 'लिखनी हैं नई कहानी', price: 210, stock: 24 },
  { id: 5, title: 'प्रेम', price: 210, stock: 36 },
  { id: 6, title: 'सफलता', price: 190, stock: 41 },
  { id: 7, title: 'जीवन प्रबंधन', price: 180, stock: 20 },
  { id: 8, title: 'आत्म-विकास', price: 200, stock: 18 },
]

const menuItems = [
  { name: 'Dashboard', icon: '▦' },
  { name: 'Books', icon: '▤' },
  { name: 'Inventory', icon: '▣' },
  { name: 'Stock Transfers', icon: '⇄' },
  { name: 'Stall Reports', icon: '▧' },
  { name: 'Volunteers', icon: '♙' },
  { name: 'Reports', icon: '▥' },
]

function readStoredData<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key)

  if (!saved) return fallback

  try {
    return JSON.parse(saved) as T
  } catch {
    return fallback
  }
}

function App() {
  const [activePage, setActivePage] = useState('Dashboard')
  const [search, setSearch] = useState('')
  const [inventorySearch, setInventorySearch] = useState('')
  const [transferSearch, setTransferSearch] = useState('')

  const [showAddBook, setShowAddBook] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newStock, setNewStock] = useState('')

  const [books, setBooks] = useState<Book[]>(() =>
    readStoredData<Book[]>('bookstall-books', sampleBooks),
  )

  // Existing stock is assigned to Foundation Office on first use.
  const [locationStock, setLocationStock] = useState<
    Record<number, LocationStock>
  >(() => {
    const saved = readStoredData<Record<number, LocationStock> | null>(
      'bookstall-location-stock',
      null,
    )

    if (saved) return saved

    const currentBooks = readStoredData<Book[]>(
      'bookstall-books',
      sampleBooks,
    )

    return Object.fromEntries(
      currentBooks.map((book) => [
        book.id,
        {
          'Foundation Office': book.stock,
          "Members' Bags": 0,
          Bookstalls: 0,
        },
      ]),
    )
  })

  const [transfers, setTransfers] = useState<StockTransfer[]>(() =>
    readStoredData<StockTransfer[]>('bookstall-transfers', []),
  )

  const [transferBookId, setTransferBookId] = useState('')
  const [transferSource, setTransferSource] = useState(LOCATIONS[0])
  const [transferDestination, setTransferDestination] = useState(LOCATIONS[1])
  const [transferQuantity, setTransferQuantity] = useState('')

  useEffect(() => {
    localStorage.setItem('bookstall-books', JSON.stringify(books))
  }, [books])

  useEffect(() => {
    localStorage.setItem(
      'bookstall-location-stock',
      JSON.stringify(locationStock),
    )
  }, [locationStock])

  useEffect(() => {
    localStorage.setItem('bookstall-transfers', JSON.stringify(transfers))
  }, [transfers])

  // Keep each book's total stock in sync with stock at all locations.
  const totalAtLocations = (stock: LocationStock | undefined) =>
    LOCATIONS.reduce((total, location) => total + (stock?.[location] ?? 0), 0)

  const getLocationQuantity = (bookId: number, location: string) =>
    locationStock[bookId]?.[location] ?? 0

  const resetForm = () => {
    setNewTitle('')
    setNewPrice('')
    setNewStock('')
    setShowAddBook(false)
    setEditingBook(null)
  }

  const handleAddBook = () => {
    if (!newTitle.trim() || newPrice === '' || newStock === '') {
      alert('Please fill in all three fields.')
      return
    }

    const price = Number(newPrice)
    const stock = Number(newStock)

    if (
      !Number.isFinite(price) ||
      !Number.isFinite(stock) ||
      price <= 0 ||
      stock < 0 ||
      !Number.isInteger(stock)
    ) {
      alert('Enter a valid price and a whole-number stock quantity.')
      return
    }

    const newBook: Book = {
      id: Date.now(),
      title: newTitle.trim(),
      price,
      stock,
    }

    setBooks((current) => [...current, newBook])

    setLocationStock((current) => ({
      ...current,
      [newBook.id]: {
        'Foundation Office': stock,
        "Members' Bags": 0,
        Bookstalls: 0,
      },
    }))

    resetForm()
  }

  const handleEditClick = (book: Book) => {
    setEditingBook(book)
    setNewTitle(book.title)
    setNewPrice(String(book.price))
    setNewStock(String(book.stock))
    setShowAddBook(false)
  }

  const handleUpdateBook = () => {
    if (!editingBook || !newTitle.trim() || newPrice === '' || newStock === '') {
      alert('Please fill in all three fields.')
      return
    }

    const price = Number(newPrice)
    const stock = Number(newStock)

    if (
      !Number.isFinite(price) ||
      !Number.isFinite(stock) ||
      price <= 0 ||
      stock < 0 ||
      !Number.isInteger(stock)
    ) {
      alert('Enter a valid price and a whole-number stock quantity.')
      return
    }

    const existingLocationTotal = totalAtLocations(
      locationStock[editingBook.id],
    )

    // A stock edit adjusts the Foundation Office quantity by the difference.
    // This prevents editing a book from silently erasing stock elsewhere.
    const difference = stock - existingLocationTotal
    const officeStock = getLocationQuantity(
      editingBook.id,
      'Foundation Office',
    )

    if (officeStock + difference < 0) {
      alert(
        'The new total is too low to preserve stock already assigned elsewhere.',
      )
      return
    }

    setLocationStock((current) => ({
      ...current,
      [editingBook.id]: {
        ...(current[editingBook.id] ?? {
          'Foundation Office': editingBook.stock,
          "Members' Bags": 0,
          Bookstalls: 0,
        }),
        'Foundation Office': officeStock + difference,
      },
    }))

    setBooks((current) =>
      current.map((book) =>
        book.id === editingBook.id
          ? { ...book, title: newTitle.trim(), price, stock }
          : book,
      ),
    )

    // Keep the title in older transfer records as a historical snapshot.
    resetForm()
  }

  const handleDeleteBook = (book: Book) => {
    if (window.confirm(`Delete "${book.title}" from the catalogue?`)) {
      setBooks((current) => current.filter((item) => item.id !== book.id))

      setLocationStock((current) => {
        const updated = { ...current }
        delete updated[book.id]
        return updated
      })
    }
  }

  const filteredBooks = books.filter((book) =>
    book.title.toLowerCase().includes(search.toLowerCase()),
  )

  const totalCopies = books.reduce(
    (total, book) => total + totalAtLocations(locationStock[book.id]),
    0,
  )

  const lowStockBooks = books.filter(
    (book) => totalAtLocations(locationStock[book.id]) < LOW_STOCK_LIMIT,
  )

  const filteredInventory = books.filter((book) =>
    book.title.toLowerCase().includes(inventorySearch.toLowerCase()),
  )

  const availableForTransfer = transferBookId
    ? getLocationQuantity(Number(transferBookId), transferSource)
    : 0

  const filteredTransfers = transfers.filter((transfer) =>
    [
      transfer.bookTitle,
      transfer.source,
      transfer.destination,
    ].some((value) =>
      value.toLowerCase().includes(transferSearch.toLowerCase()),
    ),
  )

  const handleStockTransfer = () => {
    const bookId = Number(transferBookId)
    const quantity = Number(transferQuantity)
    const book = books.find((item) => item.id === bookId)

    if (!book) {
      alert('Please select a book.')
      return
    }

    if (transferSource === transferDestination) {
      alert('Source and destination must be different.')
      return
    }

    if (
      transferQuantity.trim() === '' ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      alert('Enter a positive whole-number quantity.')
      return
    }

    const sourceQuantity = getLocationQuantity(bookId, transferSource)

    if (quantity > sourceQuantity) {
      alert(
        `Only ${sourceQuantity} copies of "${book.title}" are available at ${transferSource}.`,
      )
      return
    }

    const currentStock = locationStock[bookId] ?? {
      'Foundation Office': book.stock,
      "Members' Bags": 0,
      Bookstalls: 0,
    }

    const updatedStock: LocationStock = {
      ...currentStock,
      [transferSource]: sourceQuantity - quantity,
      [transferDestination]:
        (currentStock[transferDestination] ?? 0) + quantity,
    }

    setLocationStock((current) => ({
      ...current,
      [bookId]: updatedStock,
    }))

    setBooks((current) =>
      current.map((item) =>
        item.id === bookId
          ? { ...item, stock: totalAtLocations(updatedStock) }
          : item,
      ),
    )

    const newTransfer: StockTransfer = {
      id: Date.now(),
      bookId,
      bookTitle: book.title,
      quantity,
      source: transferSource,
      destination: transferDestination,
      date: new Date().toLocaleString(),
    }

    setTransfers((current) => [newTransfer, ...current])
    setTransferQuantity('')
    alert('Stock transfer completed successfully.')
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">B</div>
          <div>
            <h2>Bookstall</h2>
            <p>Management System</p>
          </div>
        </div>

        <p className="menu-label">WORKSPACE</p>

        <nav>
          {menuItems.map((item) => (
            <button
              key={item.name}
              className={`menu-item ${activePage === item.name ? 'active' : ''}`}
              onClick={() => setActivePage(item.name)}
            >
              <span className="menu-icon">{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="avatar">A</div>
          <div>
            <strong>Administrator</strong>
            <p>Bookstall Team</p>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="breadcrumb">Workspace / {activePage}</p>
            <h1>{activePage}</h1>
          </div>
          <div className="topbar-right">
            <span className="status-dot" />
            <span>Inventory Workspace</span>
            <div className="avatar">A</div>
          </div>
        </header>

        {activePage === 'Books' ? (
          <section className="panel books-page">
            <div className="books-heading">
              <div>
                <h2>Book catalogue</h2>
                <p>Browse the books managed by your foundation.</p>
              </div>
              <span className="book-count">{filteredBooks.length} titles</span>
            </div>

            <div className="books-toolbar">
              <input
                type="text"
                placeholder="Search books by title..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search books"
              />

              <button
                className="primary-button"
                onClick={() => {
                  resetForm()
                  setShowAddBook(true)
                }}
              >
                + Add New Book
              </button>
            </div>

            {(showAddBook || editingBook) && (
              <div className="add-book-form">
                <h3>{editingBook ? 'Edit Book' : 'Add a New Book'}</h3>

                <input
                  type="text"
                  placeholder="Book title"
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                />

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Price (₹)"
                  value={newPrice}
                  onChange={(event) => setNewPrice(event.target.value)}
                />

                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Stock quantity"
                  value={newStock}
                  onChange={(event) => setNewStock(event.target.value)}
                />

                <div className="form-actions">
                  <button
                    className="primary-button"
                    onClick={editingBook ? handleUpdateBook : handleAddBook}
                  >
                    {editingBook ? 'Update Book' : 'Save Book'}
                  </button>

                  <button className="secondary-button" onClick={resetForm}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="books-table-wrapper">
              <table className="books-table">
                <thead>
                  <tr>
                    <th>BOOK TITLE</th>
                    <th>DEFAULT PRICE</th>
                    <th>TOTAL STOCK</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBooks.map((book) => (
                    <tr key={book.id}>
                      <td>
                        <div className="book-title-cell">
                          <div className="book-cover">B</div>
                          <strong>{book.title}</strong>
                        </div>
                      </td>
                      <td>₹{book.price.toFixed(2)}</td>
                      <td>
                        <span className="stock-badge">
                          {totalAtLocations(locationStock[book.id])} books
                        </span>
                      </td>
                      <td>
                        <div className="book-actions">
                          <button
                            className="edit-button"
                            onClick={() => handleEditClick(book)}
                          >
                            Edit
                          </button>
                          <button
                            className="delete-button"
                            onClick={() => handleDeleteBook(book)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredBooks.length === 0 && (
                    <tr>
                      <td colSpan={4} className="empty-state">
                        No books match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <p className="sample-note">
              Demo data only — prices and stock quantities are examples, not
              live inventory figures.
            </p>
          </section>
        ) : activePage === 'Inventory' ? (
          <section className="inventory-page">
            <div className="inventory-heading">
              <h2>Inventory overview</h2>
              <p>Monitor available stock and identify low-stock titles.</p>
            </div>

            <div className="inventory-summary">
              <div className="inventory-card">
                <span>Total Titles</span>
                <h2>{books.length}</h2>
                <p>Books in your catalogue</p>
              </div>
              <div className="inventory-card">
                <span>Total Copies</span>
                <h2>{totalCopies}</h2>
                <p>Copies across all locations</p>
              </div>
              <div className="inventory-card low-stock-card">
                <span>Low-Stock Titles</span>
                <h2>{lowStockBooks.length}</h2>
                <p>Titles with fewer than {LOW_STOCK_LIMIT} copies</p>
              </div>
            </div>

            {lowStockBooks.length > 0 && (
              <div className="stock-alert">
                <strong>Low-stock alert</strong>
                <p>
                  {lowStockBooks.length} title(s) have fewer than{' '}
                  {LOW_STOCK_LIMIT} copies remaining.
                </p>
                <ul>
                  {lowStockBooks.map((book) => (
                    <li key={book.id}>
                      {book.title} —{' '}
                      {totalAtLocations(locationStock[book.id])} copies
                      remaining
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <section className="panel inventory-table-panel">
              <div className="inventory-toolbar">
                <div>
                  <h3>Stock by location</h3>
                  <p>Search a title to see its quantity at each location.</p>
                </div>
                <input
                  type="text"
                  placeholder="Search inventory..."
                  value={inventorySearch}
                  onChange={(event) => setInventorySearch(event.target.value)}
                  aria-label="Search inventory"
                />
              </div>

              <div className="books-table-wrapper">
                <table className="books-table">
                  <thead>
                    <tr>
                      <th>BOOK TITLE</th>
                      {LOCATIONS.map((location) => (
                        <th key={location}>{location.toUpperCase()}</th>
                      ))}
                      <th>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((book) => (
                      <tr key={book.id}>
                        <td>
                          <div className="book-title-cell">
                            <div className="book-cover">B</div>
                            <strong>{book.title}</strong>
                          </div>
                        </td>
                        {LOCATIONS.map((location) => (
                          <td key={location}>
                            {getLocationQuantity(book.id, location)}
                          </td>
                        ))}
                        <td>
                          <strong>
                            {totalAtLocations(locationStock[book.id])}
                          </strong>
                        </td>
                      </tr>
                    ))}
                    {filteredInventory.length === 0 && (
                      <tr>
                        <td colSpan={LOCATIONS.length + 2} className="empty-state">
                          No books match your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="sample-note">
                On first use, existing stock is assigned to Foundation Office.
                Location-wise quantities are saved in this browser.
              </p>
            </section>
          </section>
        ) : activePage === 'Stock Transfers' ? (
          <section className="transfer-page">
            <div className="transfer-heading">
              <div>
                <h2>Stock Transfers</h2>
                <p>Move books between storage locations and track each transfer.</p>
              </div>
            </div>

            <div className="transfer-summary">
              <div className="inventory-card">
                <span>Total Transfers</span>
                <h2>{transfers.length}</h2>
                <p>Recorded movements</p>
              </div>
              <div className="inventory-card">
                <span>Copies Transferred</span>
                <h2>
                  {transfers.reduce((total, item) => total + item.quantity, 0)}
                </h2>
                <p>Total copies moved</p>
              </div>
              <div className="inventory-card">
                <span>Locations</span>
                <h2>{LOCATIONS.length}</h2>
                <p>Available locations</p>
              </div>
            </div>

            <section className="panel transfer-form-panel">
              <h3>Record a transfer</h3>
              <p className="panel-subtitle">
                Select a book, source, destination, and quantity.
              </p>

              <div className="transfer-form-grid">
                <label>
                  Book
                  <select
                    value={transferBookId}
                    onChange={(event) => setTransferBookId(event.target.value)}
                  >
                    <option value="">Select a book</option>
                    {books.map((book) => (
                      <option key={book.id} value={book.id}>
                        {book.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Source location
                  <select
                    value={transferSource}
                    onChange={(event) => setTransferSource(event.target.value)}
                  >
                    {LOCATIONS.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Destination location
                  <select
                    value={transferDestination}
                    onChange={(event) =>
                      setTransferDestination(event.target.value)
                    }
                  >
                    {LOCATIONS.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Quantity to transfer
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Enter copies"
                    value={transferQuantity}
                    onChange={(event) =>
                      setTransferQuantity(event.target.value)
                    }
                  />
                </label>
              </div>

              <div className="transfer-availability">
                <span>Available at source</span>
                <strong>
                  {transferBookId ? availableForTransfer : 'Select a book'}{' '}
                  {transferBookId ? 'copies' : ''}
                </strong>
              </div>

              <button
                className="primary-button"
                onClick={handleStockTransfer}
                disabled={books.length === 0}
              >
                Complete Transfer
              </button>
            </section>

            <section className="panel transfer-history-panel">
              <div className="inventory-toolbar">
                <div>
                  <h3>Transfer history</h3>
                  <p>Completed transfers are listed newest first.</p>
                </div>
                <input
                  type="text"
                  placeholder="Search transfers..."
                  value={transferSearch}
                  onChange={(event) => setTransferSearch(event.target.value)}
                  aria-label="Search transfers"
                />
              </div>

              <div className="books-table-wrapper">
                <table className="books-table">
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>BOOK</th>
                      <th>QUANTITY</th>
                      <th>SOURCE</th>
                      <th>DESTINATION</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransfers.map((transfer) => (
                      <tr key={transfer.id}>
                        <td>{transfer.date}</td>
                        <td>{transfer.bookTitle}</td>
                        <td>{transfer.quantity} copies</td>
                        <td>{transfer.source}</td>
                        <td>{transfer.destination}</td>
                        <td>
                          <span className="stock-status stock-available">
                            Completed
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredTransfers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="empty-state">
                          No transfers recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        ) : activePage === 'Dashboard' ? (
          <>
            <section className="welcome">
              <div>
                <p className="eyebrow">BOOKSTALL MANAGEMENT</p>
                <h2>Your books, organised.</h2>
                <p>
                  Keep track of stock, volunteers, and bookstall activity in
                  one place.
                </p>
              </div>
              <div className="welcome-art">▤</div>
            </section>

            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-top">
                  <span>Total book titles</span>
                  <span className="stat-icon purple">▤</span>
                </div>
                <h2>{books.length}</h2>
                <p>Titles in your catalogue</p>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span>Books in stock</span>
                  <span className="stat-icon green">▣</span>
                </div>
                <h2>{totalCopies}</h2>
                <p>Copies across all locations</p>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span>Active volunteers</span>
                  <span className="stat-icon orange">♙</span>
                </div>
                <h2>—</h2>
                <p>Helping at bookstalls</p>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span>Stalls recorded</span>
                  <span className="stat-icon blue">▧</span>
                </div>
                <h2>—</h2>
                <p>Reports submitted</p>
              </div>
            </section>

            <section className="content-grid">
              <div className="panel">
                <h3>Quick actions</h3>
                <p className="panel-subtitle">Common tasks, all in one place.</p>

                <div className="quick-actions">
                  {[
                    ['Books', 'Explore the catalogue', '＋', 'purple'],
                    ['Inventory', 'Review stock by location', '▣', 'green'],
                    ['Stock Transfers', 'Move books between locations', '⇄', 'orange'],
                    ['Stall Reports', 'Review stall activity', '▧', 'blue'],
                  ].map(([name, description, icon, color]) => (
                    <button key={name} onClick={() => setActivePage(name)}>
                      <span className={`action-icon ${color}`}>{icon}</span>
                      <span>
                        <strong>{name}</strong>
                        <small>{description}</small>
                      </span>
                      <span className="arrow">→</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="panel overview-panel">
                <h3>Inventory overview</h3>
                <p className="panel-subtitle">How your system is organised</p>

                <div className="overview-item">
                  <div className="overview-icon">⌂</div>
                  <div>
                    <strong>Foundation Office</strong>
                    <p>Main book storage</p>
                  </div>
                </div>

                <div className="overview-item">
                  <div className="overview-icon">♙</div>
                  <div>
                    <strong>Members' bags</strong>
                    <p>Books assigned to volunteers</p>
                  </div>
                </div>

                <div className="overview-item">
                  <div className="overview-icon">▧</div>
                  <div>
                    <strong>Bookstalls</strong>
                    <p>Sales and activity reports</p>
                  </div>
                </div>

                <div className="note">
                  <strong>Getting started</strong>
                  <p>
                    This dashboard currently uses browser data. A backend
                    database can be connected later.
                  </p>
                </div>
              </div>
            </section>
          </>
        ) : (
          <section className="panel placeholder-page">
            <div className="placeholder-icon">▤</div>
            <h2>{activePage}</h2>
            <p>
              This section is part of your Bookstall Management System.
            </p>
            <p>We'll build this page step by step.</p>
            <button
              className="primary-button"
              onClick={() => setActivePage('Dashboard')}
            >
              ← Back to dashboard
            </button>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
