const { db, logActivity } = require('./db');

function seedDatabase() {
  const bookCount = db.prepare('SELECT COUNT(*) as count FROM books').get().count;
  if (bookCount > 0) {
    return; // Already seeded
  }

  console.log('Seeding initial sample data for Library Management System...');

  // Sample Books
  const books = [
    {
      isbn: '978-0131103627',
      title: 'The C Programming Language',
      author: 'Brian W. Kernighan & Dennis M. Ritchie',
      category: 'Computer Science',
      publisher: 'Prentice Hall',
      published_year: 1988,
      shelf_location: 'Rack CS-01',
      total_copies: 5,
      available_copies: 3,
      description: 'The definitive classic reference for C programming by the inventors of the language.'
    },
    {
      isbn: '978-0262033848',
      title: 'Introduction to Algorithms (CLRS)',
      author: 'Thomas H. Cormen, Charles E. Leiserson',
      category: 'Computer Science',
      publisher: 'MIT Press',
      published_year: 2009,
      shelf_location: 'Rack CS-02',
      total_copies: 4,
      available_copies: 2,
      description: 'A comprehensive textbook on modern algorithm design and complexity analysis.'
    },
    {
      isbn: '978-0132350884',
      title: 'Clean Code: A Handbook of Agile Craftsmanship',
      author: 'Robert C. Martin',
      category: 'Software Engineering',
      publisher: 'Prentice Hall',
      published_year: 2008,
      shelf_location: 'Rack CS-03',
      total_copies: 3,
      available_copies: 2,
      description: 'Best practices for writing readable, maintainable, and elegant software code.'
    },
    {
      isbn: '978-0451524935',
      title: '1984',
      author: 'George Orwell',
      category: 'Fiction',
      publisher: 'Signet Classic',
      published_year: 1949,
      shelf_location: 'Rack FIC-12',
      total_copies: 4,
      available_copies: 4,
      description: 'A startling and haunting vision of the world under constant totalitarian surveillance.'
    },
    {
      isbn: '978-0062316097',
      title: 'Sapiens: A Brief History of Humankind',
      author: 'Yuval Noah Harari',
      category: 'History',
      publisher: 'Harper',
      published_year: 2014,
      shelf_location: 'Rack HIST-04',
      total_copies: 3,
      available_copies: 3,
      description: 'Explores how biology and history have defined what it means to be human.'
    },
    {
      isbn: '978-0321573513',
      title: 'Algorithms in C++',
      author: 'Robert Sedgewick',
      category: 'Computer Science',
      publisher: 'Addison-Wesley',
      published_year: 2002,
      shelf_location: 'Rack CS-04',
      total_copies: 2,
      available_copies: 2,
      description: 'Fundamental data structures and algorithms with concrete C++ implementations.'
    },
    {
      isbn: '978-0140449136',
      title: 'The Republic',
      author: 'Plato',
      category: 'Philosophy',
      publisher: 'Penguin Classics',
      published_year: 2003,
      shelf_location: 'Rack PHIL-01',
      total_copies: 2,
      available_copies: 2,
      description: 'Socratic dialogue on justice, the ideal state order, and human virtue.'
    }
  ];

  const insertBook = db.prepare(`
    INSERT INTO books (isbn, title, author, category, publisher, published_year, shelf_location, total_copies, available_copies, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const b of books) {
    insertBook.run(
      b.isbn, b.title, b.author, b.category, b.publisher,
      b.published_year, b.shelf_location, b.total_copies, b.available_copies, b.description
    );
  }

  // Sample Members
  const members = [
    {
      member_code: 'MEM-1001',
      name: 'Aarav Patel',
      email: 'aarav.patel@school.edu',
      phone: '+91 98765 43210',
      role: 'Student',
      department: 'Computer Science',
      status: 'Active',
      max_books: 3
    },
    {
      member_code: 'MEM-1002',
      name: 'Dr. Sunita Rao',
      email: 'sunita.rao@school.edu',
      phone: '+91 98111 22334',
      role: 'Faculty',
      department: 'Information Technology',
      status: 'Active',
      max_books: 5
    },
    {
      member_code: 'MEM-1003',
      name: 'Rohan Sharma',
      email: 'rohan.sharma@school.edu',
      phone: '+91 99223 34455',
      role: 'Student',
      department: 'Electrical Engineering',
      status: 'Active',
      max_books: 3
    },
    {
      member_code: 'MEM-1004',
      name: 'Priya Verma',
      email: 'priya.verma@school.edu',
      phone: '+91 97654 32198',
      role: 'Staff',
      department: 'Administration',
      status: 'Active',
      max_books: 3
    }
  ];

  const insertMember = db.prepare(`
    INSERT INTO members (member_code, name, email, phone, role, department, status, max_books)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const m of members) {
    insertMember.run(m.member_code, m.name, m.email, m.phone, m.role, m.department, m.status, m.max_books);
  }

  // Sample Loans
  // Dates: today, 5 days ago, 20 days ago (for overdue demo)
  const now = new Date();
  const formatDate = (d) => d.toISOString().split('T')[0];

  const today = formatDate(now);
  
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const sevenDaysAhead = new Date(now.getTime() + 7 * 86400000);

  const twentyDaysAgo = new Date(now.getTime() - 20 * 86400000);
  const sixDaysAgo = new Date(now.getTime() - 6 * 86400000); // overdue!

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 86400000);
  const tenDaysAgo = new Date(now.getTime() - 10 * 86400000);

  const insertLoan = db.prepare(`
    INSERT INTO loans (book_id, member_id, issue_date, due_date, return_date, status, fine_amount, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Active Loan 1: normal active loan
  insertLoan.run(1, 1, formatDate(sevenDaysAgo), formatDate(sevenDaysAhead), null, 'Issued', 0, 'Semester project study');

  // Active Loan 2: another normal active loan
  insertLoan.run(3, 2, formatDate(sevenDaysAgo), formatDate(sevenDaysAhead), null, 'Issued', 0, 'Curriculum review');

  // Active Loan 3: Overdue loan (due 6 days ago -> $6 fine!)
  insertLoan.run(1, 3, formatDate(twentyDaysAgo), formatDate(sixDaysAgo), null, 'Overdue', 6.0, 'Late reminder sent via email');

  // Active Loan 4: CLRS
  insertLoan.run(2, 1, formatDate(sevenDaysAgo), formatDate(sevenDaysAhead), null, 'Issued', 0, 'Algorithmic competition prep');

  // Returned Loan 5: Past loan
  insertLoan.run(2, 4, formatDate(thirtyDaysAgo), formatDate(fifteenDaysAgo), formatDate(tenDaysAgo), 'Returned', 0, 'Returned in pristine condition');

  logActivity('SYSTEM_INIT', 'Initial library catalog and member database seeded.');
  console.log('Sample data successfully seeded!');
}

module.exports = { seedDatabase };

