
import { useEffect, useState } from 'react'
import './App.css'
const API_BASE_URL = 'http://127.0.0.1:8000'

type Book = {
  id: number
  title: string
  price: number
}

type StockTransfer = {
  id: number
  bookId: number
  bookTitle: string
  quantity: number
  source: string
  destination: string
  date: string
}

type ApiBook = {
  id: number
  title: string
  author: string | null
  price: number | null
  active: boolean
}


type ApiInventoryRow = {
  book_id: number
  title: string
  location_id: number
  location_name: string
  current_stock: number
}

type ApiLocation = {
  id: number
  name: string
  type: string
  member_id: number | null
  member_name: string | null
  active: boolean
}


const LOW_STOCK_LIMIT = 10

const menuItems = [
  { name: 'Dashboard', icon: '▦' },
  { name: 'Books', icon: '▤' },
  { name: 'Inventory', icon: '▣' },
  { name: 'Stock Transfers', icon: '⇄' },
  { name: 'Stall Reports', icon: '▧' },
  { name: 'Volunteers', icon: '♙' },
  { name: 'Reports', icon: '▥' },
]

function App() {
  const [activePage, setActivePage] = useState('Dashboard')
  const [search, setSearch] = useState('')
  const [inventorySearch, setInventorySearch] = useState('')
  const [transferSearch, setTransferSearch] = useState('')

  const [showAddBook, setShowAddBook] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newPrice, setNewPrice] = useState('')

  const [books, setBooks] = useState<Book[]>([])
  const [booksLoading, setBooksLoading] = useState(true)
  const [booksError, setBooksError] = useState('')


  const [inventoryRows, setInventoryRows] = useState<ApiInventoryRow[]>([])
  const [locations, setLocations] = useState<ApiLocation[]>([])
  const [inventoryLoading, setInventoryLoading] = useState(true)
  const [inventoryError, setInventoryError] = useState('')


  const [transfers, setTransfers] = useState<StockTransfer[]>([])

  const [transfersLoading, setTransfersLoading] = useState(true)
  const [transfersError, setTransfersError] = useState('')

  useEffect(() => {
    async function loadTransfers() {
      try {
        setTransfersLoading(true)
        setTransfersError('')

        const response = await fetch(`${API_BASE_URL}/transfers`)

        if (!response.ok) {
          throw new Error('Failed to load transfer history.')
        }

        const data: { transfers: StockTransfer[] } =
          await response.json()

        setTransfers(data.transfers)
      } catch (error) {
        setTransfersError(
          error instanceof Error
            ? error.message
            : 'Unable to load transfer history.',
        )
      } finally {
        setTransfersLoading(false)
      }
    }

    loadTransfers()
  }, [])

  const [transferBookId, setTransferBookId] = useState('')
  const [transferSource, setTransferSource] = useState('1')
  const [transferDestination, setTransferDestination] = useState('2')
  const [transferQuantity, setTransferQuantity] = useState('')


useEffect(() => {
  const loadBooks = async () => {
    try {
      setBooksLoading(true)
      setBooksError('')

      const response = await fetch(`${API_BASE_URL}/books`)

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`)
      }

      const data: { books: ApiBook[] } = await response.json()

      setBooks(
        data.books.map((book) => ({
          id: book.id,
          title: book.title,
          price: book.price ?? 0,
          stock: 0,
        })),
      )
    } catch (error) {
      setBooksError(
        error instanceof Error ? error.message : 'Unable to load books.',
      )
    } finally {
      setBooksLoading(false)
    }
  }

  void loadBooks()
}, [])


useEffect(() => {
  const loadInventory = async () => {
    try {
      setInventoryLoading(true)
      setInventoryError('')

      const [inventoryResponse, locationsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/inventory`),
        fetch(`${API_BASE_URL}/locations`),
      ])

      if (!inventoryResponse.ok || !locationsResponse.ok) {
        throw new Error('Failed to load inventory or locations.')
      }

      const inventoryData: { inventory: ApiInventoryRow[] } =
        await inventoryResponse.json()

      const locationsData: { locations: ApiLocation[] } =
        await locationsResponse.json()

      setInventoryRows(inventoryData.inventory)
      setLocations(
        locationsData.locations.filter((location) => location.active),
      )
    } catch (error) {
      setInventoryError(
        error instanceof Error
          ? error.message
          : 'Unable to load inventory.',
      )
    } finally {
      setInventoryLoading(false)
    }
  }

  void loadInventory()
}, [])


  const getLocationQuantity = (bookId: number, locationId: number) =>
  inventoryRows.find(
    (row) =>
      row.book_id === bookId &&
      row.location_id === locationId,
  )?.current_stock ?? 0

  const availableForTransfer = transferBookId
  ? getLocationQuantity(
      Number(transferBookId),
      Number(transferSource),
    )
  : 0

  const resetForm = () => {
    setNewTitle('')
    setNewPrice('')
    setShowAddBook(false)
    setEditingBook(null)
  }

  const refreshBooksFromApi = async () => {
    const response = await fetch(`${API_BASE_URL}/books`)
    if (!response.ok) {
      throw new Error('Book changes were saved, but the catalogue could not be refreshed. Refresh the page.')
    }
    const data: { books: ApiBook[] } = await response.json()
    setBooks(data.books.map((book) => ({
      id: book.id,
      title: book.title,
      price: book.price ?? 0,
    })))
  }

  const handleAddBook = async () => {
    if (!newTitle.trim() || newPrice === '') {
      alert('Please enter a book title and price.')
      return
    }

    const price = Number(newPrice)
    if (!Number.isFinite(price) || price <= 0) {
      alert('Enter a valid price greater than zero.')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), price }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.detail ?? 'The book could not be saved.')
      }
      await refreshBooksFromApi()
      resetForm()
      alert('Book saved to the database. Record initial stock separately when stock-receipt functionality is available.')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to save the book.')
    }
  }

  const handleEditClick = (book: Book) => {
    setEditingBook(book)
    setNewTitle(book.title)
    setNewPrice(String(book.price))
    setShowAddBook(false)
  }

  const handleUpdateBook = async () => {
    if (!editingBook || !newTitle.trim() || newPrice === '') {
      alert('Please enter a book title and price.')
      return
    }

    const price = Number(newPrice)
    if (!Number.isFinite(price) || price <= 0) {
      alert('Enter a valid price greater than zero.')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/books/${editingBook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), price }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.detail ?? 'The book could not be updated.')
      }
      await refreshBooksFromApi()
      resetForm()
      alert('Book details updated in the database.')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to update the book.')
    }
  }

  const handleDeleteBook = async (book: Book) => {
    if (!window.confirm(`Deactivate "${book.title}" from the catalogue? Its history will be preserved.`)) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/books/${book.id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.detail ?? 'The book could not be deactivated.')
      }
      await refreshBooksFromApi()
      alert(result.message ?? 'Book deactivated.')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to deactivate the book.')
    }
  }

  const filteredBooks = books.filter((book) =>
    book.title.toLowerCase().includes(search.toLowerCase()),
  )

  const inventoryBooks = books.map((book) => {
    const stockByLocation: Record<number, number> = {}

    for (const location of locations) {
      const matchingRow = inventoryRows.find(
        (row) =>
          row.book_id === book.id &&
          row.location_id === location.id,
      )

      stockByLocation[location.id] = matchingRow?.current_stock ?? 0
    }

    const totalStock = Object.values(stockByLocation).reduce(
      (total, quantity) => total + quantity,
      0,
    )

    return {
      id: book.id,
      title: book.title,
      stockByLocation,
      totalStock,
    }
  })

  const filteredInventory = inventoryBooks.filter((book) =>
    book.title.toLowerCase().includes(inventorySearch.toLowerCase()),
  )

  const liveLowStockBooks = inventoryBooks.filter(
    (book) => book.totalStock < LOW_STOCK_LIMIT,
  )

  const inventoryTotalCopies = inventoryBooks.reduce(
    (total, book) => total + book.totalStock,
    0,
  )

  const totalCopies = inventoryTotalCopies


  const filteredTransfers = transfers.filter((transfer) =>
    [
      transfer.bookTitle,
      transfer.source,
      transfer.destination,
    ].some((value) =>
      value.toLowerCase().includes(transferSearch.toLowerCase()),
    ),
  )

  const handleStockTransfer = async () => {
  const bookId = Number(transferBookId)
  const sourceId = Number(transferSource)
  const destinationId = Number(transferDestination)
  const quantity = Number(transferQuantity)

  const book = books.find((item) => item.id === bookId)

  if (!book) {
    alert('Please select a book.')
    return
  }

  if (
    !locations.some((location) => location.id === sourceId) ||
    !locations.some((location) => location.id === destinationId)
  ) {
    alert('Please select valid source and destination locations.')
    return
  }

  if (sourceId === destinationId) {
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

  const sourceStock = getLocationQuantity(bookId, sourceId)

  if (sourceStock < 0 || quantity > sourceStock) {
    alert(`Only ${sourceStock} copies of "${book.title}" are available at this source.`)
    return
  }

  try {
    // Record the transfer in PostgreSQL.
    const response = await fetch(`${API_BASE_URL}/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        book_id: bookId,
        from_location_id: sourceId,
        to_location_id: destinationId,
        quantity,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.detail ?? 'The transfer could not be completed.')
    }

    // Refresh inventory from the backend.
    const inventoryResponse = await fetch(`${API_BASE_URL}/inventory`)

    if (!inventoryResponse.ok) {
      throw new Error(
        'Transfer recorded, but inventory refresh failed. Refresh the page.',
      )
    }

    const inventoryData: { inventory: ApiInventoryRow[] } =
      await inventoryResponse.json()

    setInventoryRows(inventoryData.inventory)

    // Refresh transfer history from the backend.
    const transfersResponse = await fetch(`${API_BASE_URL}/transfers`)

    if (!transfersResponse.ok) {
      throw new Error(
        'Transfer recorded, but history refresh failed. Refresh the page.',
      )
    }

    const transfersData: { transfers: StockTransfer[] } =
      await transfersResponse.json()

    setTransfers(transfersData.transfers)
    setTransferQuantity('')

    alert('Stock transfer recorded successfully in the database.')
  } catch (error) {
    alert(
      error instanceof Error
        ? error.message
        : 'Unable to complete the transfer.',
    )
  }
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


            {booksLoading && <p>Loading books from the database...</p>}

            {booksError && (
              <p role="alert">
                Could not load books: {booksError}
              </p>
            )}


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
                          {inventoryBooks.find((item) => item.id === book.id)?.totalStock ?? 0} books
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
              Book details and stock totals are loaded from the backend database.
            </p>
          </section>
        ) : activePage === 'Inventory' ? (
          <section className="inventory-page">
            <div className="inventory-heading">
              <h2>Inventory overview</h2>
              <p>Monitor available stock and identify low-stock titles.</p>
            </div>

            {inventoryLoading && <p>Loading inventory...</p>}

            {inventoryError && (
              <p role="alert">{inventoryError}</p>
            )}



            <div className="inventory-summary">
              <div className="inventory-card">
                <span>Total Titles</span>
                <h2>{inventoryBooks.length}</h2>
                <p>Books in your catalogue</p>
              </div>
              <div className="inventory-card">
                <span>Total Copies</span>
                <h2>{inventoryTotalCopies}</h2>
                <p>Copies across all locations</p>
              </div>
              <div className="inventory-card low-stock-card">
                <span>Low-Stock Titles</span>
                <h2>{liveLowStockBooks.length}</h2>
                <p>Titles with fewer than {LOW_STOCK_LIMIT} copies</p>
              </div>
            </div>

            {liveLowStockBooks.length > 0 && (
              <div className="stock-alert">
                <strong>Low-stock alert</strong>
                <p>
                  {liveLowStockBooks.length} title(s) have fewer than{' '}
                  {LOW_STOCK_LIMIT} copies remaining.
                </p>
                <ul>
                  {liveLowStockBooks.map((book) => (
                    <li key={book.id}>
                      {book.title} — {book.totalStock} copies remaining
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
                      {locations.map((location) => (
                        <th key={location.id}>{location.name.toUpperCase()}</th>
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
                        {locations.map((location) => (
                          <td key={location.id}>
                            {book.stockByLocation[location.id] ?? 0}
                          </td>
                        ))}

                        <td>
                          <strong>
                            {book.totalStock}
                          </strong>
                        </td>
                      </tr>
                    ))}
                    {filteredInventory.length === 0 && (
                      <tr>
                        <td colSpan={locations.length + 2} className="empty-state">
                          No books match your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="sample-note">
                Stock quantities are calculated from the database transaction history.
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

            {transfersLoading && <p>Loading transfers...</p>}

            {transfersError && (
              <p role="alert">{transfersError}</p>
            )}

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
                <h2>{locations.length}</h2>
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

                    {locations.map((location) => (
                      <option key={location.id} value={String(location.id)}>
                        {location.name}
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
                    {locations.map((location) => (
                      <option key={location.id} value={String(location.id)}>
                        {location.name}
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
                    Book catalogue, inventory, and transfers are connected to the backend database.
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
