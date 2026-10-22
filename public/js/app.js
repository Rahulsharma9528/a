/**
 * Rahul Sharma & Mukesh Prajapati Library Management System
 * Full-Stack Frontend Controller
 */

// Application State
const state = {
  books: [],
  members: [],
  loans: [],
  categories: [],
  stats: {},
  settings: {},
  activeTab: 'dashboard',
  searchQuery: '',
  bookFilterCategory: 'All',
  bookFilterAvailability: 'all',
  loanFilterStatus: 'active',
  memberFilterRole: 'All',
  deleteTarget: null // { type: 'book' | 'member', id: number, name: string }
};

// Base API URL
const API_BASE = window.location.origin.includes('http') ? window.location.origin : 'http://localhost:3000';

/* ==========================================================================
   Toast Notification Helper
   ========================================================================== */
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;

  const iconClass = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info'
  }[type] || 'fa-bell';

  toast.innerHTML = `
    <i class="fa-solid ${iconClass} toast-icon"></i>
    <div class="toast-text">${message}</div>
    <button style="background:none;border:none;cursor:pointer;color:inherit;opacity:0.6;" onclick="this.parentElement.remove()">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ==========================================================================
   Modal Helpers
   ========================================================================== */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// Close modal when clicking on backdrop
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});

/* ==========================================================================
   Tab Navigation & Indicator
   ========================================================================== */
function initTabs() {
  const tabButtons = document.querySelectorAll('.nav-tab-btn');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-tab');
      activateTab(targetId);
    });
  });
}

function activateTab(tabId) {
  state.activeTab = tabId;

  // Toggle buttons
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });

  // Toggle content panels
  document.querySelectorAll('.tab-content-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabId}`);
  });

  // Refresh data for the specific tab
  if (tabId === 'dashboard') loadStats();
  if (tabId === 'books') loadBooks();
  if (tabId === 'members') loadMembers();
  if (tabId === 'loans') loadLoans();
  if (tabId === 'history') loadHistory();
  if (tabId === 'settings') loadSettings();
}

/* ==========================================================================
   Theme Management (Light / Dark)
   ========================================================================== */
function initTheme() {
  const themeToggle = document.getElementById('themeToggleBtn');
  const savedTheme = localStorage.getItem('library_theme') || 'light';
  applyTheme(savedTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('library_theme', next);
    });
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const themeToggle = document.getElementById('themeToggleBtn');
  if (themeToggle) {
    themeToggle.innerHTML = theme === 'dark' 
      ? '<i class="fa-solid fa-sun" title="Switch to Light Mode"></i>' 
      : '<i class="fa-solid fa-moon" title="Switch to Dark Mode"></i>';
  }
}

/* ==========================================================================
   Live Clock & System Health
   ========================================================================== */
function startClock() {
  const clockEl = document.getElementById('liveClockText');
  function updateTime() {
    if (!clockEl) return;
    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    clockEl.textContent = now.toLocaleDateString(undefined, options);
  }
  updateTime();
  setInterval(updateTime, 30000);
}

async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (res.ok) {
      const data = await res.json();
      const dot = document.getElementById('healthStatusDot');
      const text = document.getElementById('healthStatusText');
      if (dot) dot.style.background = '#10b981';
      if (text) text.textContent = 'SQLite Live';
    }
  } catch (err) {
    const dot = document.getElementById('healthStatusDot');
    const text = document.getElementById('healthStatusText');
    if (dot) dot.style.background = '#ef4444';
    if (text) text.textContent = 'Server Offline';
  }
}

/* ==========================================================================
   API Communication: Dashboard & Stats
   ========================================================================== */
async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/api/stats`);
    if (!res.ok) throw new Error('Failed to fetch statistics');
    const data = await res.json();
    state.stats = data;

    // Update KPI counters
    document.getElementById('statTotalBooks').textContent = data.totalBooks || 0;
    document.getElementById('statTotalCopies').textContent = data.totalCopies || 0;
    document.getElementById('statTotalMembers').textContent = data.totalMembers || 0;
    document.getElementById('statActiveLoans').textContent = data.activeLoans || 0;
    document.getElementById('statOverdueLoans').textContent = data.overdueLoans || 0;
    document.getElementById('statReturnedBooks').textContent = data.returnedBooks || 0;
    document.getElementById('statTotalFines').textContent = `${data.currency || '$'}${data.totalFines || '0.00'}`;

    // Update Tab Badges
    const bBadge = document.getElementById('badgeBooksCount');
    const mBadge = document.getElementById('badgeMembersCount');
    const lBadge = document.getElementById('badgeLoansCount');
    if (bBadge) bBadge.textContent = data.totalBooks || 0;
    if (mBadge) mBadge.textContent = data.totalMembers || 0;
    if (lBadge) lBadge.textContent = data.activeLoans || 0;

    // Render category visual bars
    renderCategoryBars(data.categories || [], data.totalCopies || 1);

    // Render circulation donut / breakdown
    renderCirculationStats(data);

    // Render active preview table on dashboard
    renderDashboardLoans(data.recentLoans || []);

    // Load recent activity logs
    loadActivities();
  } catch (err) {
    console.error('Stats error:', err);
  }
}

function renderCategoryBars(categories, totalCopies) {
  const container = document.getElementById('categoryBarsContainer');
  if (!container) return;

  if (!categories.length) {
    container.innerHTML = `<div class="table-empty-state"><p>No category data yet.</p></div>`;
    return;
  }

  const colors = ['', 'green', 'amber', 'indigo', 'purple'];

  container.innerHTML = categories.map((cat, index) => {
    const pct = Math.round((cat.copies / (totalCopies || 1)) * 100);
    const colorClass = colors[index % colors.length];
    return `
      <div class="category-bar-item">
        <div class="category-bar-label">
          <span><i class="fa-solid fa-folder-closed" style="margin-right:6px; opacity:0.7;"></i>${escapeHTML(cat.category)}</span>
          <span>${cat.copies} copies (${pct}%)</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill ${colorClass}" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderCirculationStats(data) {
  const availEl = document.getElementById('circStatAvailable');
  const borrowedEl = document.getElementById('circStatBorrowed');
  const overdueEl = document.getElementById('circStatOverdue');

  if (availEl) availEl.textContent = data.availableCopies || 0;
  if (borrowedEl) borrowedEl.textContent = data.borrowedCopies || 0;
  if (overdueEl) overdueEl.textContent = data.overdueLoans || 0;
}

function renderDashboardLoans(loans) {
  const tbody = document.getElementById('dashboardLoansTableBody');
  if (!tbody) return;

  if (!loans.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="table-empty-state">
          <i class="fa-regular fa-calendar-check"></i>
          <div>All books are in shelf! No active loans at this moment.</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = loans.map(loan => {
    const isOverdue = loan.status === 'Overdue';
    return `
      <tr>
        <td>
          <span class="table-main-title">${escapeHTML(loan.book_title)}</span>
          <span class="table-sub-detail">ISBN: ${escapeHTML(loan.book_isbn)}</span>
        </td>
        <td>
          <span class="table-main-title">${escapeHTML(loan.member_name)}</span>
          <span class="table-sub-detail">${escapeHTML(loan.member_code)}</span>
        </td>
        <td>${loan.issue_date}</td>
        <td>
          <strong>${loan.due_date}</strong>
          ${isOverdue ? `<span class="tag-badge tag-overdue" style="margin-left:6px;"><i class="fa-solid fa-triangle-exclamation"></i> Overdue ($${loan.fine_amount})</span>` : ''}
        </td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="promptReturnBook(${loan.id}, '${escapeHTML(loan.book_title)}')">
            <i class="fa-solid fa-arrow-rotate-left"></i> Return
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

/* ==========================================================================
   API Communication: Books Management
   ========================================================================== */
async function loadBooks() {
  try {
    const params = new URLSearchParams();
    if (state.searchQuery) params.append('search', state.searchQuery);
    if (state.bookFilterCategory && state.bookFilterCategory !== 'All') params.append('category', state.bookFilterCategory);
    if (state.bookFilterAvailability === 'available') params.append('available', 'true');
    if (state.bookFilterAvailability === 'out_of_stock') params.append('available', 'false');

    const res = await fetch(`${API_BASE}/api/books?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load books');
    const data = await res.json();
    state.books = data.books || [];
    state.categories = data.categories || [];

    renderBooksTable(state.books);
    populateCategoryFilters(state.categories);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderBooksTable(books) {
  const tbody = document.getElementById('booksTableBody');
  if (!tbody) return;

  if (!books.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="table-empty-state">
          <i class="fa-solid fa-book-open"></i>
          <div>No books matched your criteria. Try adjusting the search query or add a new book!</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = books.map(book => {
    const isOut = book.available_copies <= 0;
    const isLow = book.available_copies > 0 && book.available_copies <= 1;
    const statusClass = isOut ? 'tag-overdue' : (isLow ? 'tag-category' : 'tag-available');
    const statusText = isOut ? 'Out of Stock' : `${book.available_copies} Available`;
    const stockFillClass = isOut ? 'empty' : (isLow ? 'low' : '');
    const stockPct = Math.round((book.available_copies / book.total_copies) * 100);

    return `
      <tr>
        <td>
          <span class="table-main-title">${escapeHTML(book.title)}</span>
          <span class="table-sub-detail">ISBN: ${escapeHTML(book.isbn)} • Year: ${book.published_year || '-'}</span>
        </td>
        <td>${escapeHTML(book.author)}</td>
        <td>
          <span class="tag-badge tag-category">${escapeHTML(book.category)}</span>
        </td>
        <td>
          <span class="tag-badge tag-location"><i class="fa-solid fa-location-dot"></i> ${escapeHTML(book.shelf_location || 'General')}</span>
        </td>
        <td>
          <div class="mini-stock-indicator">
            <div class="mini-stock-bar">
              <div class="mini-stock-fill ${stockFillClass}" style="width: ${stockPct}%"></div>
            </div>
            <span><strong>${book.available_copies}</strong> / ${book.total_copies}</span>
          </div>
        </td>
        <td>
          <span class="tag-badge ${statusClass}">${statusText}</span>
        </td>
        <td>
          <div class="table-action-cell">
            ${book.available_copies > 0 ? `
              <button class="btn btn-primary btn-sm" onclick="promptIssueBook(${book.id})" title="Issue to member">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> Issue
              </button>
            ` : `
              <button class="btn btn-secondary btn-sm" disabled style="opacity:0.5;">
                <i class="fa-solid fa-ban"></i> Issued
              </button>
            `}
            <button class="btn btn-secondary btn-sm btn-icon-only" onclick="openEditBookModal(${book.id})" title="Edit details">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn btn-danger btn-sm btn-icon-only" onclick="confirmDelete('book', ${book.id}, '${escapeHTML(book.title)}')" title="Delete book">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function populateCategoryFilters(categories) {
  const select = document.getElementById('bookCategoryFilterSelect');
  if (!select) return;

  const current = select.value;
  select.innerHTML = '<option value="All">All Categories</option>';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    if (cat === current) opt.selected = true;
    select.appendChild(opt);
  });
}

// Add Book Form Handler
document.getElementById('addBookForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = {
    title: document.getElementById('bookInputTitle').value,
    author: document.getElementById('bookInputAuthor').value,
    isbn: document.getElementById('bookInputIsbn').value,
    category: document.getElementById('bookInputCategory').value,
    shelf_location: document.getElementById('bookInputShelf').value,
    total_copies: document.getElementById('bookInputCopies').value,
    published_year: document.getElementById('bookInputYear').value,
    publisher: document.getElementById('bookInputPublisher').value,
    description: document.getElementById('bookInputDesc').value
  };

  try {
    const res = await fetch(`${API_BASE}/api/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add book');

    showToast(`Book "${data.book.title}" added successfully!`, 'success');
    e.target.reset();
    closeModal('addBookModal');
    loadBooks();
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Edit Book
async function openEditBookModal(bookId) {
  const book = state.books.find(b => b.id === bookId);
  if (!book) return;

  document.getElementById('editBookId').value = book.id;
  document.getElementById('editBookTitle').value = book.title;
  document.getElementById('editBookAuthor').value = book.author;
  document.getElementById('editBookIsbn').value = book.isbn;
  document.getElementById('editBookCategory').value = book.category;
  document.getElementById('editBookShelf').value = book.shelf_location || '';
  document.getElementById('editBookCopies').value = book.total_copies;
  document.getElementById('editBookYear').value = book.published_year || '';
  document.getElementById('editBookPublisher').value = book.publisher || '';
  document.getElementById('editBookDesc').value = book.description || '';

  openModal('editBookModal');
}

document.getElementById('editBookForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const bookId = document.getElementById('editBookId').value;
  const formData = {
    title: document.getElementById('editBookTitle').value,
    author: document.getElementById('editBookAuthor').value,
    isbn: document.getElementById('editBookIsbn').value,
    category: document.getElementById('editBookCategory').value,
    shelf_location: document.getElementById('editBookShelf').value,
    total_copies: document.getElementById('editBookCopies').value,
    published_year: document.getElementById('editBookYear').value,
    publisher: document.getElementById('editBookPublisher').value,
    description: document.getElementById('editBookDesc').value
  };

  try {
    const res = await fetch(`${API_BASE}/api/books/${bookId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update book');

    showToast(`Book "${data.book.title}" updated successfully!`, 'success');
    closeModal('editBookModal');
    loadBooks();
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

/* ==========================================================================
   API Communication: Members Directory
   ========================================================================== */
async function loadMembers() {
  try {
    const params = new URLSearchParams();
    if (state.searchQuery) params.append('search', state.searchQuery);
    if (state.memberFilterRole && state.memberFilterRole !== 'All') params.append('role', state.memberFilterRole);

    const res = await fetch(`${API_BASE}/api/members?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load members');
    const data = await res.json();
    state.members = data.members || [];

    renderMembersTable(state.members);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderMembersTable(members) {
  const tbody = document.getElementById('membersTableBody');
  if (!tbody) return;

  if (!members.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="table-empty-state">
          <i class="fa-solid fa-users"></i>
          <div>No members found. Click "Add Member" to register students or faculty.</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = members.map(m => {
    const isActive = m.status === 'Active';
    const activeLoans = m.active_loans_count || 0;
    const maxBooks = m.max_books || 3;
    const atCapacity = activeLoans >= maxBooks;

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:38px;height:38px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;">
              ${escapeHTML(m.name.substring(0, 2).toUpperCase())}
            </div>
            <div>
              <span class="table-main-title">${escapeHTML(m.name)}</span>
              <span class="table-sub-detail">${escapeHTML(m.member_code)}</span>
            </div>
          </div>
        </td>
        <td>
          <span class="table-main-title">${escapeHTML(m.email)}</span>
          <span class="table-sub-detail">${escapeHTML(m.phone)}</span>
        </td>
        <td>
          <span class="tag-badge ${m.role === 'Faculty' ? 'tag-location' : 'tag-category'}">${escapeHTML(m.role)}</span>
          <span class="table-sub-detail" style="margin-top:4px;">${escapeHTML(m.department || 'General')}</span>
        </td>
        <td>
          <span class="tag-badge ${atCapacity ? 'tag-overdue' : 'tag-borrowed'}">
            <i class="fa-solid fa-book"></i> ${activeLoans} / ${maxBooks}
          </span>
        </td>
        <td>
          <span class="tag-badge ${isActive ? 'tag-available' : 'tag-overdue'}">${m.status}</span>
        </td>
        <td>
          <div class="table-action-cell">
            <button class="btn btn-secondary btn-sm" onclick="viewMemberHistory(${m.id})" title="View borrowing records">
              <i class="fa-solid fa-clock-rotate-left"></i> History
            </button>
            <button class="btn btn-secondary btn-sm btn-icon-only" onclick="openEditMemberModal(${m.id})" title="Edit profile">
              <i class="fa-solid fa-user-pen"></i>
            </button>
            <button class="btn btn-danger btn-sm btn-icon-only" onclick="confirmDelete('member', ${m.id}, '${escapeHTML(m.name)}')" title="Delete member">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Add Member
document.getElementById('addMemberForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = {
    name: document.getElementById('memberInputName').value,
    email: document.getElementById('memberInputEmail').value,
    phone: document.getElementById('memberInputPhone').value,
    role: document.getElementById('memberInputRole').value,
    department: document.getElementById('memberInputDept').value,
    max_books: document.getElementById('memberInputLimit').value,
    status: 'Active'
  };

  try {
    const res = await fetch(`${API_BASE}/api/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add member');

    showToast(`Member "${data.member.name}" enrolled successfully!`, 'success');
    e.target.reset();
    closeModal('addMemberModal');
    loadMembers();
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Edit Member
async function openEditMemberModal(memberId) {
  const member = state.members.find(m => m.id === memberId);
  if (!member) return;

  document.getElementById('editMemberId').value = member.id;
  document.getElementById('editMemberName').value = member.name;
  document.getElementById('editMemberEmail').value = member.email;
  document.getElementById('editMemberPhone').value = member.phone;
  document.getElementById('editMemberRole').value = member.role;
  document.getElementById('editMemberDept').value = member.department || '';
  document.getElementById('editMemberLimit').value = member.max_books || 3;
  document.getElementById('editMemberStatus').value = member.status;

  openModal('editMemberModal');
}

document.getElementById('editMemberForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const memberId = document.getElementById('editMemberId').value;
  const formData = {
    name: document.getElementById('editMemberName').value,
    email: document.getElementById('editMemberEmail').value,
    phone: document.getElementById('editMemberPhone').value,
    role: document.getElementById('editMemberRole').value,
    department: document.getElementById('editMemberDept').value,
    max_books: document.getElementById('editMemberLimit').value,
    status: document.getElementById('editMemberStatus').value
  };

  try {
    const res = await fetch(`${API_BASE}/api/members/${memberId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update member');

    showToast(`Member "${data.member.name}" updated successfully!`, 'success');
    closeModal('editMemberModal');
    loadMembers();
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Member History Modal
async function viewMemberHistory(memberId) {
  try {
    const res = await fetch(`${API_BASE}/api/members/${memberId}`);
    if (!res.ok) throw new Error('Failed to fetch member details');
    const data = await res.json();

    document.getElementById('memberHistoryName').textContent = data.member.name;
    document.getElementById('memberHistoryCode').textContent = `${data.member.member_code} • ${data.member.role}`;

    const listEl = document.getElementById('memberHistoryLoansList');
    if (!data.loans.length) {
      listEl.innerHTML = `<div class="table-empty-state"><p>No borrowing history found for this member.</p></div>`;
    } else {
      listEl.innerHTML = data.loans.map(loan => `
        <div style="padding:12px; border:1px solid var(--border-color); border-radius:var(--radius-sm); margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong>${escapeHTML(loan.book_title)}</strong>
            <div style="font-size:12px; color:var(--text-muted);">
              Issued: ${loan.issue_date} • Due: ${loan.due_date} ${loan.return_date ? `• Returned: ${loan.return_date}` : ''}
            </div>
          </div>
          <span class="tag-badge ${loan.status === 'Issued' ? 'tag-borrowed' : (loan.status === 'Overdue' ? 'tag-overdue' : 'tag-available')}">
            ${loan.status}
          </span>
        </div>
      `).join('');
    }

    openModal('memberHistoryModal');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ==========================================================================
   API Communication: Circulation / Loans
   ========================================================================== */
async function loadLoans() {
  try {
    const params = new URLSearchParams();
    if (state.searchQuery) params.append('search', state.searchQuery);
    if (state.loanFilterStatus) params.append('status', state.loanFilterStatus);

    const res = await fetch(`${API_BASE}/api/loans?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load circulation records');
    const data = await res.json();
    state.loans = data.loans || [];

    renderLoansTable(state.loans);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderLoansTable(loans) {
  const tbody = document.getElementById('loansTableBody');
  if (!tbody) return;

  if (!loans.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="table-empty-state">
          <i class="fa-solid fa-arrows-rotate"></i>
          <div>No active loans matching criteria.</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = loans.map(loan => {
    const isOverdue = loan.status === 'Overdue';
    const statusTag = isOverdue ? 'tag-overdue' : (loan.status === 'Returned' ? 'tag-returned' : 'tag-borrowed');

    return `
      <tr>
        <td>
          <span class="table-main-title">${escapeHTML(loan.book_title)}</span>
          <span class="table-sub-detail">Shelf: ${escapeHTML(loan.shelf_location || 'General')} • ISBN: ${escapeHTML(loan.book_isbn)}</span>
        </td>
        <td>
          <span class="table-main-title">${escapeHTML(loan.member_name)}</span>
          <span class="table-sub-detail">${escapeHTML(loan.member_code)} • ${escapeHTML(loan.member_phone)}</span>
        </td>
        <td>${loan.issue_date}</td>
        <td>
          <strong>${loan.due_date}</strong>
          ${loan.renew_count > 0 ? `<span class="tag-badge tag-category" style="margin-left:4px; font-size:10px;">Renewed ${loan.renew_count}x</span>` : ''}
        </td>
        <td>
          <span class="tag-badge ${statusTag}">
            ${isOverdue ? `<i class="fa-solid fa-triangle-exclamation"></i> Overdue ($${loan.fine_amount})` : loan.status}
          </span>
        </td>
        <td>
          <div class="table-action-cell">
            ${loan.status !== 'Returned' ? `
              <button class="btn btn-success btn-sm" onclick="promptReturnBook(${loan.id}, '${escapeHTML(loan.book_title)}')">
                <i class="fa-solid fa-arrow-down-left-and-up-right-to-center"></i> Return
              </button>
              <button class="btn btn-secondary btn-sm" onclick="renewLoan(${loan.id})">
                <i class="fa-solid fa-clock-rotate-left"></i> +14 Days
              </button>
            ` : `
              <span class="table-sub-detail">Completed on ${loan.return_date || '-'}</span>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Prompt Issue Book Modal with Smart Select Options
async function promptIssueBook(preselectedBookId = null) {
  // Ensure fresh book list and member list
  const [bRes, mRes] = await Promise.all([
    fetch(`${API_BASE}/api/books`),
    fetch(`${API_BASE}/api/members`)
  ]);

  const bData = await bRes.json();
  const mData = await mRes.json();

  const bookSelect = document.getElementById('issueBookSelect');
  const memberSelect = document.getElementById('issueMemberSelect');
  const dueDateInput = document.getElementById('issueDueDateInput');

  // Populate Books (only available ones)
  bookSelect.innerHTML = '<option value="">-- Choose a Book --</option>';
  bData.books.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = `${b.title} (${b.available_copies} available) [${b.isbn}]`;
    if (b.available_copies <= 0) opt.disabled = true;
    if (preselectedBookId && b.id === preselectedBookId) opt.selected = true;
    bookSelect.appendChild(opt);
  });

  // Populate Members
  memberSelect.innerHTML = '<option value="">-- Select Member --</option>';
  mData.members.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.name} (${m.member_code} - ${m.role})`;
    if (m.status !== 'Active') opt.disabled = true;
    memberSelect.appendChild(opt);
  });

  // Default due date: +14 days from today
  const defaultDue = new Date();
  defaultDue.setDate(defaultDue.getDate() + 14);
  dueDateInput.value = defaultDue.toISOString().split('T')[0];

  openModal('issueBookModal');
}

// Preset due date buttons in modal
function setIssueDuePreset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  document.getElementById('issueDueDateInput').value = d.toISOString().split('T')[0];
}

// Issue Book Form Handler
document.getElementById('issueBookForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    book_id: document.getElementById('issueBookSelect').value,
    member_id: document.getElementById('issueMemberSelect').value,
    due_date: document.getElementById('issueDueDateInput').value,
    notes: document.getElementById('issueNotesInput').value
  };

  try {
    const res = await fetch(`${API_BASE}/api/loans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to issue book');

    showToast(`Book issued successfully to ${data.loan.member_name}!`, 'success');
    closeModal('issueBookModal');
    loadLoans();
    loadBooks();
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Prompt Return Book Modal
function promptReturnBook(loanId, bookTitle) {
  const loan = state.loans.find(l => l.id === loanId);
  const fine = loan && loan.fine_amount ? loan.fine_amount : 0;

  document.getElementById('returnLoanId').value = loanId;
  document.getElementById('returnBookTitleText').textContent = bookTitle || 'Book';
  document.getElementById('returnCalculatedFine').textContent = fine > 0 ? `$${fine.toFixed(2)}` : '$0.00';
  document.getElementById('waiveFineCheckbox').checked = false;
  document.getElementById('returnNotesInput').value = '';

  openModal('returnBookModal');
}

// Return Book Confirmation Form
document.getElementById('returnBookForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const loanId = document.getElementById('returnLoanId').value;
  const waiveFine = document.getElementById('waiveFineCheckbox').checked;
  const notes = document.getElementById('returnNotesInput').value;

  try {
    const res = await fetch(`${API_BASE}/api/loans/${loanId}/return`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waiveFine, notes })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to process return');

    showToast(data.message, 'success');
    closeModal('returnBookModal');
    loadLoans();
    loadBooks();
    loadStats();
    loadHistory();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Renew a loan with 1 click
async function renewLoan(loanId) {
  try {
    const res = await fetch(`${API_BASE}/api/loans/${loanId}/renew`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: 14 })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to renew loan');

    showToast(data.message, 'success');
    loadLoans();
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ==========================================================================
   API Communication: History & Activity Log
   ========================================================================== */
async function loadHistory() {
  try {
    const res = await fetch(`${API_BASE}/api/loans?status=returned`);
    if (!res.ok) throw new Error('Failed to load history');
    const data = await res.json();

    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;

    if (!data.loans.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="table-empty-state">
            <i class="fa-solid fa-clock-rotate-left"></i>
            <div>No past loan returns logged yet.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.loans.map(loan => `
      <tr>
        <td>
          <span class="table-main-title">${escapeHTML(loan.book_title)}</span>
          <span class="table-sub-detail">ISBN: ${escapeHTML(loan.book_isbn)}</span>
        </td>
        <td>
          <span class="table-main-title">${escapeHTML(loan.member_name)}</span>
          <span class="table-sub-detail">${escapeHTML(loan.member_code)}</span>
        </td>
        <td>${loan.issue_date}</td>
        <td>${loan.due_date}</td>
        <td><strong style="color:var(--success);">${loan.return_date || '-'}</strong></td>
        <td>${loan.fine_amount > 0 ? `<span class="tag-badge tag-overdue">$${loan.fine_amount}</span>` : '<span class="tag-badge tag-available">None</span>'}</td>
        <td><span class="tag-badge tag-returned">${escapeHTML(loan.status)}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadActivities() {
  try {
    const res = await fetch(`${API_BASE}/api/activities`);
    if (!res.ok) return;
    const data = await res.json();
    const container = document.getElementById('activityTimelineContainer');
    if (!container) return;

    if (!data.activities.length) {
      container.innerHTML = `<div class="table-empty-state"><p>No activity records logged.</p></div>`;
      return;
    }

    const actionIcons = {
      BOOK_ADDED: 'fa-book-medical',
      BOOK_UPDATED: 'fa-pen-to-square',
      BOOK_DELETED: 'fa-trash-can',
      MEMBER_ADDED: 'fa-user-plus',
      MEMBER_UPDATED: 'fa-user-pen',
      MEMBER_DELETED: 'fa-user-minus',
      BOOK_ISSUED: 'fa-arrow-up-right-from-square',
      BOOK_RETURNED: 'fa-arrow-down-left-and-up-right-to-center',
      LOAN_RENEWED: 'fa-clock-rotate-left',
      SETTINGS_UPDATED: 'fa-gear',
      SYSTEM_INIT: 'fa-database'
    };

    container.innerHTML = data.activities.slice(0, 15).map(act => `
      <div class="timeline-entry">
        <div class="timeline-bullet">
          <i class="fa-solid ${actionIcons[act.action] || 'fa-bell'}"></i>
        </div>
        <div class="timeline-body">
          <p>${escapeHTML(act.details)}</p>
          <span>${new Date(act.timestamp).toLocaleString()}</span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load activities:', err);
  }
}

/* ==========================================================================
   API Communication: Settings
   ========================================================================== */
async function loadSettings() {
  try {
    const res = await fetch(`${API_BASE}/api/settings`);
    if (!res.ok) throw new Error('Failed to load settings');
    const settings = await res.json();
    state.settings = settings;

    document.getElementById('settingLibraryName').value = settings.library_name || '';
    document.getElementById('settingFinePerDay').value = settings.fine_per_day || '1.00';
    document.getElementById('settingDefaultDays').value = settings.default_loan_days || '14';
    document.getElementById('settingCurrency').value = settings.currency_symbol || '$';
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.getElementById('settingsForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    library_name: document.getElementById('settingLibraryName').value,
    fine_per_day: document.getElementById('settingFinePerDay').value,
    default_loan_days: document.getElementById('settingDefaultDays').value,
    currency_symbol: document.getElementById('settingCurrency').value
  };

  try {
    const res = await fetch(`${API_BASE}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update settings');

    showToast('Library configuration updated successfully!', 'success');
    document.getElementById('headerLibraryName').textContent = payload.library_name;
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

/* ==========================================================================
   Delete Confirmation Dialog
   ========================================================================== */
function confirmDelete(type, id, name) {
  state.deleteTarget = { type, id, name };
  document.getElementById('deleteConfirmTargetName').textContent = `${type.toUpperCase()}: "${name}"`;
  openModal('deleteConfirmModal');
}

document.getElementById('confirmDeleteExecuteBtn')?.addEventListener('click', async () => {
  if (!state.deleteTarget) return;
  const { type, id, name } = state.deleteTarget;

  try {
    const endpoint = type === 'book' ? `/api/books/${id}` : `/api/members/${id}`;
    const res = await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || `Failed to delete ${type}`);

    showToast(data.message, 'success');
    closeModal('deleteConfirmModal');
    state.deleteTarget = null;

    if (type === 'book') loadBooks();
    if (type === 'member') loadMembers();
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

/* ==========================================================================
   CSV Export
   ========================================================================== */
function exportData(type) {
  window.open(`${API_BASE}/api/export/${type}`, '_blank');
}

/* ==========================================================================
   Search & Filter Event Listeners
   ========================================================================== */
function setupSearchAndFilters() {
  // Global search input in active tab
  const searchInput = document.getElementById('universalSearchInput');
  let searchTimer;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.searchQuery = e.target.value.trim();
        if (state.activeTab === 'books') loadBooks();
        if (state.activeTab === 'members') loadMembers();
        if (state.activeTab === 'loans') loadLoans();
      }, 250);
    });
  }

  // Category filter
  document.getElementById('bookCategoryFilterSelect')?.addEventListener('change', (e) => {
    state.bookFilterCategory = e.target.value;
    loadBooks();
  });

  // Book Availability filter
  document.getElementById('bookAvailabilityFilterSelect')?.addEventListener('change', (e) => {
    state.bookFilterAvailability = e.target.value;
    loadBooks();
  });

  // Member Role filter
  document.getElementById('memberRoleFilterSelect')?.addEventListener('change', (e) => {
    state.memberFilterRole = e.target.value;
    loadMembers();
  });

  // Loan Status filter
  document.getElementById('loanStatusFilterSelect')?.addEventListener('change', (e) => {
    state.loanFilterStatus = e.target.value;
    loadLoans();
  });
}

// Utility: Escape HTML to avoid XSS
function escapeHTML(str) {
  if (typeof str !== 'string') return str || '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

/* ==========================================================================
   Initialization on DOM Ready
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  startClock();
  initTabs();
  setupSearchAndFilters();
  checkHealth();
  loadStats();
});

