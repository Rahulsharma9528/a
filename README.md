# 📚 Enterprise Library Management System (v2.0)
### Developed for **Rahul Sharma & Mukesh Prajapati**

An enterprise-grade, high-performance, full-stack Library Management System engineered with **Node.js**, **Express**, **native SQLite (`node:sqlite`)**, and an ultra-modern, interactive, responsive web frontend.

---

## 🌟 Key Highlights & Improvements Over Previous Version

| Feature | Previous Version (v1.0) | Upgraded Version (v2.0) |
| :--- | :--- | :--- |
| **Backend Architecture** | ❌ None (Client-only `localStorage`) | ✅ **100% Working Express RESTful API** |
| **Database Engine** | ❌ None (browser volatile cache) | ✅ **ACID Compliant SQLite (`node:sqlite`)** |
| **Data Integrity** | ❌ Deleting books/members corrupted loans | ✅ **Foreign keys & active loan checks prevent data loss** |
| **Search & Filters** | ❌ None | ✅ **Live instant search by Title, Author, ISBN, Category & Roles** |
| **Overdue & Fines** | ❌ No fines or return fees | ✅ **Dynamic fine calculation ($1/day late), fine waiver options** |
| **Loan Operations** | ❌ Simple issue only | ✅ **Issue with +7d/+14d/+30d presets, 1-click Renew, Return modal** |
| **UI Design System** | ❌ Basic tables, no dark mode | ✅ **Modern SaaS UI, Dark/Light mode, Glassmorphism, Responsive** |
| **Data Export** | ❌ None | ✅ **1-Click CSV exports for Books, Members, and Loans** |
| **Audit & Logs** | ❌ None | ✅ **Real-time activity audit timeline tracking all transactions** |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v20+ or v22+ (v24 recommended, which includes built-in `node:sqlite`)
- **NPM**

### 2. Start the Server
From the project root directory, run:
```bash
npm start
```
The server will boot and display:
```
=======================================================
  Library Management System Backend Server
  URL: http://localhost:3000
  Database: node:sqlite engine connected
=======================================================
```

### 3. Open in Browser
Open your favorite browser and visit:
```
http://localhost:3000
```
*(You can also directly open `index.html` in your browser while the server is running on port 3000)*.

### 4. Run Automated Backend Tests
Verify that all API endpoints, database operations, and circulation transactions work with 100% precision:
```bash
npm test
```

---

## 🛠️ Technology Stack

- **Backend**:
  - **Node.js 24**
  - **Express.js**: Clean REST API routing, JSON parser, and static file serving
  - **`node:sqlite`**: Native SQLite engine built into modern Node.js, providing zero-dependency, lightning-fast database persistence in `library.db`
  - **CORS**: Cross-origin resource sharing support

- **Frontend**:
  - **HTML5 & CSS3**: Custom CSS variables, responsive design system, mobile-first layouts
  - **Typography**: Google Fonts (*Plus Jakarta Sans*)
  - **Icons**: Font Awesome 6
  - **Vanilla JavaScript**: Fast, reactive client controller with zero bulky framework overhead, debounced search, modal management, and custom toast notifications

---

## 📖 Module Walkthrough

### 1. 📊 Interactive Dashboard
- **Live Metrics (KPIs)**: Total Titles, Physical Copies in inventory, Registered Members, Active Loans, Overdue Alerts, and Accumulated Fines.
- **Visual Analytics**: Interactive category distribution progress bars and inventory circulation breakdown.
- **Circulation Watchlist**: Immediately see books approaching due dates or needing returns.
- **Recent System Audit Log**: Real-time event log recording additions, edits, loans, and returns.

### 2. 📚 Books Catalog Management
- Live search filtering by Title, Author, Category, or ISBN.
- Category filter dropdown and availability toggle (In Stock vs Out of Stock).
- Add new books with ISBN, Shelf/Rack Location, Publication Year, Total Copies, and Description.
- Edit existing book details and copy counts (with safety checks preventing copy reduction below active loan counts).
- Safe deletion with active loan locks.

### 3. 👥 Members Directory
- Register students, faculty, staff, and researchers with unique member codes (`MEM-XXXX`).
- Role-based borrow allowances (e.g. 5 for faculty, 3 for students).
- Member Profile Drawer: click "History" on any member to view every book they have ever borrowed or currently hold.
- Status toggle: Active vs Suspended.

### 4. 🔄 Circulation & Book Loans
- Smart Issue Modal: select books (only in-stock books selectable), select active members, choose due dates with 1-click +7d, +14d, +30d preset buttons.
- 1-Click Renew (+14 Days): extends loan duration instantly.
- Return Modal: calculates exact late days and fines based on the configurable daily penalty rate; supports optional fine waiver for special circumstances.

### 5. 📜 Returned History & CSV Export
- Complete historical record of all completed returns with return dates and fines assessed.
- Export library inventory, members directory, or circulation logs into standard CSV files at any time.

### 6. ⚙️ Institutional Settings
- Customize Library Name, Fine Per Day, Default Loan Duration, and Currency Symbol (`$`, `₹`, `€`, `£`).
- System credits to Rahul Sharma & Mukesh Prajapati.

---

## 📡 RESTful API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check and server status |
| `GET` | `/api/stats` | Dashboard KPIs, category distribution, circulation summary |
| `GET` | `/api/books` | List books (supports `?search=`, `?category=`, `?available=`) |
| `GET` | `/api/books/:id` | Single book details with borrow history |
| `POST` | `/api/books` | Add a new book to catalog |
| `PUT` | `/api/books/:id` | Update book metadata and copy inventory |
| `DELETE` | `/api/books/:id` | Delete book (blocked if copies are currently borrowed) |
| `GET` | `/api/members` | List members (supports `?search=`, `?role=`, `?status=`) |
| `GET` | `/api/members/:id` | Member profile and circulation history |
| `POST` | `/api/members` | Register new member |
| `PUT` | `/api/members/:id` | Update member profile |
| `DELETE` | `/api/members/:id` | Delete member (blocked if unreturned loans exist) |
| `GET` | `/api/loans` | List circulation loans (`?status=active|overdue|returned`) |
| `POST` | `/api/loans` | Issue a book to a member |
| `PUT` | `/api/loans/:id/return` | Mark book as returned, calculate late fines |
| `PUT` | `/api/loans/:id/renew` | Extend loan due date |
| `GET` | `/api/activities` | Audit trail of latest 50 system operations |
| `GET` | `/api/settings` | Retrieve institutional settings |
| `POST` | `/api/settings` | Update settings |
| `GET` | `/api/export/:type` | Download CSV for `books`, `members`, or `loans` |

---

## 🛡️ Original Code Backup
The original code has been preserved inside the `backup/` directory for historical reference:
- `backup/index.html`
- `backup/script.js`
- `backup/style.css`

