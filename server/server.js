const express = require('express');
const cors = require('cors');
const path = require('path');
const { db, logActivity, getSetting, setSetting } = require('./db');
const { seedDatabase } = require('./seedData');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize seed data on startup
seedDatabase();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from 'public' and root
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/backup', express.static(path.join(__dirname, '..', 'backup')));

// Date helper
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

// Automatically update overdue status on loans
function refreshLoanStatuses() {
  const today = getTodayString();
  const finePerDay = parseFloat(getSetting('fine_per_day') || '1.0');

  // Select all issued loans whose due_date is in the past
  const overdueLoans = db.prepare(`
    SELECT id, due_date FROM loans 
    WHERE status = 'Issued' AND due_date < ?
  `).all(today);

  const updateStmt = db.prepare(`
    UPDATE loans SET status = 'Overdue', fine_amount = ? WHERE id = ?
  `);

  for (const loan of overdueLoans) {
    const diffTime = Math.abs(new Date(today) - new Date(loan.due_date));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const fine = (diffDays * finePerDay).toFixed(2);
    updateStmt.run(parseFloat(fine), loan.id);
  }
}

// Run refresh on server start
refreshLoanStatuses();

// ----------------------------------------------------
// Health Check & System Status
// ----------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    sqlite: 'node:sqlite (Node.js 24 native)',
    libraryName: getSetting('library_name')
  });
});

// ----------------------------------------------------
// Settings Endpoints
// ----------------------------------------------------
app.get('/api/settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const { library_name, fine_per_day, currency_symbol, default_loan_days } = req.body;
    if (library_name) setSetting('library_name', library_name);
    if (fine_per_day !== undefined) setSetting('fine_per_day', fine_per_day);
    if (currency_symbol) setSetting('currency_symbol', currency_symbol);
    if (default_loan_days) setSetting('default_loan_days', default_loan_days);

    logActivity('SETTINGS_UPDATED', 'System settings updated.');
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Dashboard & Analytics
// ----------------------------------------------------
app.get('/api/stats', (req, res) => {
  try {
    refreshLoanStatuses();

    const totalBooks = db.prepare('SELECT COUNT(*) as count FROM books').get().count;
    const copiesStats = db.prepare('SELECT SUM(total_copies) as totalCopies, SUM(available_copies) as availableCopies FROM books').get();
    const totalMembers = db.prepare('SELECT COUNT(*) as count FROM members').get().count;
    const activeLoans = db.prepare("SELECT COUNT(*) as count FROM loans WHERE status IN ('Issued', 'Overdue')").get().count;
    const overdueLoans = db.prepare("SELECT COUNT(*) as count FROM loans WHERE status = 'Overdue'").get().count;
    const returnedLoans = db.prepare("SELECT COUNT(*) as count FROM loans WHERE status = 'Returned'").get().count;
    const finesStats = db.prepare('SELECT SUM(fine_amount) as totalFines FROM loans').get();

    // Category distribution
    const categories = db.prepare(`
      SELECT category, COUNT(*) as bookCount, SUM(total_copies) as copies 
      FROM books 
      GROUP BY category 
      ORDER BY copies DESC
    `).all();

    // Recent active loans preview (top 5)
    const recentLoans = db.prepare(`
      SELECT l.id, l.issue_date, l.due_date, l.status, l.fine_amount,
             b.title as book_title, b.isbn as book_isbn,
             m.name as member_name, m.member_code, m.email as member_email
      FROM loans l
      JOIN books b ON l.book_id = b.id
      JOIN members m ON l.member_id = m.id
      WHERE l.status IN ('Issued', 'Overdue')
      ORDER BY l.due_date ASC
      LIMIT 6
    `).all();

    res.json({
      totalBooks,
      totalCopies: copiesStats.totalCopies || 0,
      availableCopies: copiesStats.availableCopies || 0,
      borrowedCopies: (copiesStats.totalCopies || 0) - (copiesStats.availableCopies || 0),
      totalMembers,
      activeLoans,
      overdueLoans,
      returnedBooks: returnedLoans,
      totalFines: (finesStats.totalFines || 0).toFixed(2),
      currency: getSetting('currency_symbol') || '$',
      categories,
      recentLoans
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Books API
// ----------------------------------------------------
app.get('/api/books', (req, res) => {
  try {
    const { search, category, available } = req.query;
    let query = 'SELECT * FROM books WHERE 1=1';
    const params = [];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ? OR category LIKE ?)';
      params.push(term, term, term, term);
    }

    if (category && category !== 'All') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (available === 'true') {
      query += ' AND available_copies > 0';
    } else if (available === 'false') {
      query += ' AND available_copies = 0';
    }

    query += ' ORDER BY id DESC';

    const books = db.prepare(query).all(...params);

    // Get distinct categories for filter buttons
    const categories = db.prepare('SELECT DISTINCT category FROM books ORDER BY category ASC').all().map(r => r.category);

    res.json({ books, categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/books/:id', (req, res) => {
  try {
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    // History for this book
    const loans = db.prepare(`
      SELECT l.*, m.name as member_name, m.member_code 
      FROM loans l
      JOIN members m ON l.member_id = m.id
      WHERE l.book_id = ?
      ORDER BY l.id DESC
    `).all(req.params.id);

    res.json({ book, loans });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/books', (req, res) => {
  try {
    const { isbn, title, author, category, publisher, published_year, shelf_location, total_copies, description } = req.body;

    if (!title || !author || !category) {
      return res.status(400).json({ error: 'Title, Author, and Category are required.' });
    }

    const cleanIsbn = (isbn && isbn.trim()) ? isbn.trim() : `ISBN-${Date.now()}`;
    const copies = parseInt(total_copies, 10) || 1;

    // Check duplicate ISBN
    const existing = db.prepare('SELECT id FROM books WHERE isbn = ?').get(cleanIsbn);
    if (existing) {
      return res.status(400).json({ error: `Book with ISBN '${cleanIsbn}' already exists.` });
    }

    const insert = db.prepare(`
      INSERT INTO books (isbn, title, author, category, publisher, published_year, shelf_location, total_copies, available_copies, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      cleanIsbn,
      title.trim(),
      author.trim(),
      category.trim(),
      (publisher || '').trim(),
      parseInt(published_year, 10) || new Date().getFullYear(),
      (shelf_location || 'General').trim(),
      copies,
      copies,
      (description || '').trim()
    );

    logActivity('BOOK_ADDED', `Added book "${title.trim()}" (ISBN: ${cleanIsbn}, Copies: ${copies})`);

    const newBook = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, book: newBook });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/books/:id', (req, res) => {
  try {
    const bookId = req.params.id;
    const current = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
    if (!current) return res.status(404).json({ error: 'Book not found.' });

    const { isbn, title, author, category, publisher, published_year, shelf_location, total_copies, description } = req.body;

    const newTotal = total_copies !== undefined ? parseInt(total_copies, 10) : current.total_copies;
    const borrowedCount = current.total_copies - current.available_copies;

    if (newTotal < borrowedCount) {
      return res.status(400).json({
        error: `Cannot reduce total copies below currently borrowed count (${borrowedCount} copies currently borrowed).`
      });
    }

    const newAvailable = newTotal - borrowedCount;

    const update = db.prepare(`
      UPDATE books 
      SET isbn = ?, title = ?, author = ?, category = ?, publisher = ?, 
          published_year = ?, shelf_location = ?, total_copies = ?, available_copies = ?, description = ?
      WHERE id = ?
    `);

    update.run(
      (isbn || current.isbn).trim(),
      (title || current.title).trim(),
      (author || current.author).trim(),
      (category || current.category).trim(),
      publisher !== undefined ? publisher.trim() : current.publisher,
      published_year !== undefined ? parseInt(published_year, 10) : current.published_year,
      shelf_location !== undefined ? shelf_location.trim() : current.shelf_location,
      newTotal,
      newAvailable,
      description !== undefined ? description.trim() : current.description,
      bookId
    );

    logActivity('BOOK_UPDATED', `Updated details for book "${title || current.title}".`);

    const updatedBook = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
    res.json({ success: true, book: updatedBook });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/books/:id', (req, res) => {
  try {
    const bookId = req.params.id;
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    // Check if any active loans exist
    const activeLoan = db.prepare(`
      SELECT COUNT(*) as count FROM loans 
      WHERE book_id = ? AND status IN ('Issued', 'Overdue')
    `).get(bookId);

    if (activeLoan.count > 0) {
      return res.status(400).json({
        error: `Cannot delete "${book.title}" because ${activeLoan.count} copy/copies are currently issued and in circulation.`
      });
    }

    // Delete associated past loans records or cascade
    db.prepare('DELETE FROM loans WHERE book_id = ?').run(bookId);
    db.prepare('DELETE FROM books WHERE id = ?').run(bookId);

    logActivity('BOOK_DELETED', `Deleted book "${book.title}" (ID: ${bookId}).`);
    res.json({ success: true, message: `Book "${book.title}" deleted successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Members API
// ----------------------------------------------------
app.get('/api/members', (req, res) => {
  try {
    const { search, role, status } = req.query;
    let query = `
      SELECT m.*, 
        (SELECT COUNT(*) FROM loans l WHERE l.member_id = m.id AND l.status IN ('Issued', 'Overdue')) as active_loans_count
      FROM members m 
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ' AND (m.name LIKE ? OR m.email LIKE ? OR m.phone LIKE ? OR m.member_code LIKE ?)';
      params.push(term, term, term, term);
    }

    if (role && role !== 'All') {
      query += ' AND m.role = ?';
      params.push(role);
    }

    if (status && status !== 'All') {
      query += ' AND m.status = ?';
      params.push(status);
    }

    query += ' ORDER BY m.id DESC';

    const members = db.prepare(query).all(...params);
    res.json({ members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/members/:id', (req, res) => {
  try {
    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found.' });

    const loans = db.prepare(`
      SELECT l.*, b.title as book_title, b.isbn as book_isbn 
      FROM loans l
      JOIN books b ON l.book_id = b.id
      WHERE l.member_id = ?
      ORDER BY l.id DESC
    `).all(req.params.id);

    res.json({ member, loans });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/members', (req, res) => {
  try {
    const { name, email, phone, role, department, status, max_books } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'Name, Email, and Phone number are required.' });
    }

    // Check unique email
    const existing = db.prepare('SELECT id FROM members WHERE email = ?').get(email.trim());
    if (existing) {
      return res.status(400).json({ error: `Member with email '${email.trim()}' already exists.` });
    }

    const memberCode = `MEM-${Math.floor(1000 + Math.random() * 9000)}`;

    const insert = db.prepare(`
      INSERT INTO members (member_code, name, email, phone, role, department, status, max_books)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      memberCode,
      name.trim(),
      email.trim(),
      phone.trim(),
      role || 'Student',
      department ? department.trim() : 'General',
      status || 'Active',
      parseInt(max_books, 10) || (role === 'Faculty' ? 5 : 3)
    );

    logActivity('MEMBER_ADDED', `Registered new member "${name.trim()}" (${memberCode}, ${role || 'Student'})`);

    const newMember = db.prepare('SELECT * FROM members WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, member: newMember });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/members/:id', (req, res) => {
  try {
    const memberId = req.params.id;
    const current = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
    if (!current) return res.status(404).json({ error: 'Member not found.' });

    const { name, email, phone, role, department, status, max_books } = req.body;

    if (email && email.trim() !== current.email) {
      const existing = db.prepare('SELECT id FROM members WHERE email = ? AND id != ?').get(email.trim(), memberId);
      if (existing) return res.status(400).json({ error: 'Another member already uses this email.' });
    }

    const update = db.prepare(`
      UPDATE members 
      SET name = ?, email = ?, phone = ?, role = ?, department = ?, status = ?, max_books = ?
      WHERE id = ?
    `);

    update.run(
      (name || current.name).trim(),
      (email || current.email).trim(),
      (phone || current.phone).trim(),
      role || current.role,
      department !== undefined ? department.trim() : current.department,
      status || current.status,
      max_books !== undefined ? parseInt(max_books, 10) : current.max_books,
      memberId
    );

    logActivity('MEMBER_UPDATED', `Updated profile of member "${name || current.name}".`);

    const updatedMember = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
    res.json({ success: true, member: updatedMember });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/members/:id', (req, res) => {
  try {
    const memberId = req.params.id;
    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
    if (!member) return res.status(404).json({ error: 'Member not found.' });

    // Check if member has active loans
    const active = db.prepare(`
      SELECT COUNT(*) as count FROM loans 
      WHERE member_id = ? AND status IN ('Issued', 'Overdue')
    `).get(memberId);

    if (active.count > 0) {
      return res.status(400).json({
        error: `Cannot delete member "${member.name}" because they have ${active.count} unreturned book(s).`
      });
    }

    db.prepare('DELETE FROM loans WHERE member_id = ?').run(memberId);
    db.prepare('DELETE FROM members WHERE id = ?').run(memberId);

    logActivity('MEMBER_DELETED', `Deleted member "${member.name}" (${member.member_code}).`);
    res.json({ success: true, message: `Member "${member.name}" deleted successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Loans & Circulation API
// ----------------------------------------------------
app.get('/api/loans', (req, res) => {
  try {
    refreshLoanStatuses();
    const { status, search } = req.query;

    let query = `
      SELECT l.*, 
             b.title as book_title, b.isbn as book_isbn, b.category as book_category, b.shelf_location,
             m.name as member_name, m.member_code, m.email as member_email, m.phone as member_phone
      FROM loans l
      JOIN books b ON l.book_id = b.id
      JOIN members m ON l.member_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (status === 'active') {
      query += " AND l.status IN ('Issued', 'Overdue')";
    } else if (status === 'overdue') {
      query += " AND l.status = 'Overdue'";
    } else if (status === 'returned') {
      query += " AND l.status = 'Returned'";
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ' AND (b.title LIKE ? OR b.isbn LIKE ? OR m.name LIKE ? OR m.member_code LIKE ?)';
      params.push(term, term, term, term);
    }

    query += ' ORDER BY l.id DESC';

    const loans = db.prepare(query).all(...params);
    res.json({ loans });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Issue a Book
app.post('/api/loans', (req, res) => {
  try {
    const { book_id, member_id, due_date, notes } = req.body;

    if (!book_id || !member_id || !due_date) {
      return res.status(400).json({ error: 'Book, Member, and Due Date are required.' });
    }

    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(book_id);
    if (!book) return res.status(404).json({ error: 'Selected book was not found.' });

    if (book.available_copies <= 0) {
      return res.status(400).json({ error: `"${book.title}" currently has no copies available to borrow.` });
    }

    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(member_id);
    if (!member) return res.status(404).json({ error: 'Selected member was not found.' });

    if (member.status !== 'Active') {
      return res.status(400).json({ error: `Member account "${member.name}" is ${member.status} and cannot borrow books.` });
    }

    // Check borrow limit
    const activeCount = db.prepare(`
      SELECT COUNT(*) as count FROM loans 
      WHERE member_id = ? AND status IN ('Issued', 'Overdue')
    `).get(member_id).count;

    if (activeCount >= member.max_books) {
      return res.status(400).json({
        error: `Member "${member.name}" has reached the maximum borrowing limit of ${member.max_books} books.`
      });
    }

    // Perform transaction: Insert loan and decrement available copies
    const issueDate = getTodayString();
    
    db.exec('BEGIN TRANSACTION;');
    try {
      const insertLoan = db.prepare(`
        INSERT INTO loans (book_id, member_id, issue_date, due_date, status, fine_amount, notes)
        VALUES (?, ?, ?, ?, 'Issued', 0, ?)
      `);
      const result = insertLoan.run(book_id, member_id, issueDate, due_date, (notes || '').trim());

      db.prepare('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?').run(book_id);

      db.exec('COMMIT;');

      logActivity('BOOK_ISSUED', `Issued "${book.title}" to ${member.name} (${member.member_code}). Due on ${due_date}.`);

      const loanRecord = db.prepare(`
        SELECT l.*, b.title as book_title, m.name as member_name 
        FROM loans l
        JOIN books b ON l.book_id = b.id
        JOIN members m ON l.member_id = m.id
        WHERE l.id = ?
      `).get(result.lastInsertRowid);

      res.status(201).json({ success: true, loan: loanRecord });
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Return a Book
app.put('/api/loans/:id/return', (req, res) => {
  try {
    const loanId = req.params.id;
    const loan = db.prepare(`
      SELECT l.*, b.title as book_title, b.id as b_id, m.name as member_name 
      FROM loans l
      JOIN books b ON l.book_id = b.id
      JOIN members m ON l.member_id = m.id
      WHERE l.id = ?
    `).get(loanId);

    if (!loan) return res.status(404).json({ error: 'Loan record not found.' });
    if (loan.status === 'Returned') {
      return res.status(400).json({ error: 'This book has already been marked as returned.' });
    }

    const returnDate = getTodayString();
    const finePerDay = parseFloat(getSetting('fine_per_day') || '1.0');
    
    // Calculate final fine
    let fine = 0.0;
    if (returnDate > loan.due_date) {
      const diffTime = Math.abs(new Date(returnDate) - new Date(loan.due_date));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      fine = parseFloat((diffDays * finePerDay).toFixed(2));
    }

    // Override or waive fine if requested in body
    if (req.body.waiveFine) {
      fine = 0.0;
    } else if (req.body.customFine !== undefined) {
      fine = parseFloat(req.body.customFine);
    }

    const returnNote = req.body.notes ? `${loan.notes ? loan.notes + ' | ' : ''}Returned note: ${req.body.notes}` : loan.notes;

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(`
        UPDATE loans 
        SET status = 'Returned', return_date = ?, fine_amount = ?, notes = ?
        WHERE id = ?
      `).run(returnDate, fine, returnNote, loanId);

      db.prepare(`
        UPDATE books 
        SET available_copies = MIN(total_copies, available_copies + 1)
        WHERE id = ?
      `).run(loan.book_id);

      db.exec('COMMIT;');

      logActivity('BOOK_RETURNED', `Returned "${loan.book_title}" from ${loan.member_name}. Return date: ${returnDate}${fine > 0 ? `, Fine: $${fine}` : ''}.`);

      res.json({
        success: true,
        message: `Book "${loan.book_title}" returned successfully.`,
        fine: fine
      });
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Renew a Loan
app.put('/api/loans/:id/renew', (req, res) => {
  try {
    const loanId = req.params.id;
    const loan = db.prepare(`
      SELECT l.*, b.title as book_title, m.name as member_name 
      FROM loans l
      JOIN books b ON l.book_id = b.id
      JOIN members m ON l.member_id = m.id
      WHERE l.id = ?
    `).get(loanId);

    if (!loan) return res.status(404).json({ error: 'Loan record not found.' });
    if (loan.status === 'Returned') return res.status(400).json({ error: 'Cannot renew a returned loan.' });

    const defaultDays = parseInt(getSetting('default_loan_days') || '14', 10);
    const extensionDays = parseInt(req.body.days, 10) || defaultDays;

    // Extend from current due date or today, whichever is later
    const baseDate = new Date(loan.due_date) > new Date() ? new Date(loan.due_date) : new Date();
    baseDate.setDate(baseDate.getDate() + extensionDays);
    const newDueDate = baseDate.toISOString().split('T')[0];

    db.prepare(`
      UPDATE loans 
      SET due_date = ?, status = 'Issued', fine_amount = 0, renew_count = renew_count + 1
      WHERE id = ?
    `).run(newDueDate, loanId);

    logActivity('LOAN_RENEWED', `Extended due date for "${loan.book_title}" borrowed by ${loan.member_name} to ${newDueDate}.`);

    res.json({ success: true, message: `Loan renewed until ${newDueDate}.`, newDueDate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Activity Logs
// ----------------------------------------------------
app.get('/api/activities', (req, res) => {
  try {
    const logs = db.prepare('SELECT * FROM activity_logs ORDER BY id DESC LIMIT 50').all();
    res.json({ activities: logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// CSV Data Export
// ----------------------------------------------------
app.get('/api/export/:type', (req, res) => {
  try {
    const { type } = req.params;
    let filename = '';
    let csvData = '';

    if (type === 'books') {
      filename = `books-catalog-${getTodayString()}.csv`;
      const rows = db.prepare('SELECT id, isbn, title, author, category, total_copies, available_copies, shelf_location FROM books').all();
      csvData = 'ID,ISBN,Title,Author,Category,Total Copies,Available Copies,Shelf Location\n' +
        rows.map(r => `"${r.id}","${r.isbn}","${r.title.replace(/"/g, '""')}","${r.author.replace(/"/g, '""')}","${r.category}","${r.total_copies}","${r.available_copies}","${r.shelf_location}"`).join('\n');
    } else if (type === 'members') {
      filename = `members-directory-${getTodayString()}.csv`;
      const rows = db.prepare('SELECT id, member_code, name, email, phone, role, department, status FROM members').all();
      csvData = 'ID,Member Code,Name,Email,Phone,Role,Department,Status\n' +
        rows.map(r => `"${r.id}","${r.member_code}","${r.name.replace(/"/g, '""')}","${r.email}","${r.phone}","${r.role}","${r.department}","${r.status}"`).join('\n');
    } else if (type === 'loans') {
      filename = `circulation-records-${getTodayString()}.csv`;
      const rows = db.prepare(`
        SELECT l.id, b.title as book_title, m.name as member_name, m.member_code, l.issue_date, l.due_date, l.return_date, l.status, l.fine_amount
        FROM loans l
        JOIN books b ON l.book_id = b.id
        JOIN members m ON l.member_id = m.id
      `).all();
      csvData = 'Loan ID,Book Title,Member Name,Member Code,Issue Date,Due Date,Return Date,Status,Fine\n' +
        rows.map(r => `"${r.id}","${r.book_title.replace(/"/g, '""')}","${r.member_name.replace(/"/g, '""')}","${r.member_code}","${r.issue_date}","${r.due_date}","${r.return_date || ''}","${r.status}","${r.fine_amount}"`).join('\n');
    } else {
      return res.status(400).send('Invalid export type. Use books, members, or loans.');
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  Library Management System Backend Server`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`  Database: node:sqlite engine connected`);
  console.log(`=======================================================`);
});

