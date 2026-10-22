let books = JSON.parse(localStorage.getItem("libraryBooks")) || [];
let members = JSON.parse(localStorage.getItem("libraryMembers")) || [];
let loans = JSON.parse(localStorage.getItem("libraryLoans")) || [];

const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");
const indicator = document.getElementById("tabIndicator");

function moveIndicator(button) {
  indicator.style.width = button.offsetWidth + "px";
  indicator.style.transform = `translateX(${button.offsetLeft}px)`;
}

function activateTab(button) {
  tabButtons.forEach(btn => btn.classList.remove("active"));
  tabPanels.forEach(panel => panel.classList.remove("active"));

  button.classList.add("active");
  document.getElementById(button.dataset.target).classList.add("active");
  moveIndicator(button);
}

tabButtons.forEach(button => {
  button.addEventListener("click", () => activateTab(button));
});

window.addEventListener("resize", () => {
  const active = document.querySelector(".tab-btn.active");
  moveIndicator(active);
});

function saveData() {
  localStorage.setItem("libraryBooks", JSON.stringify(books));
  localStorage.setItem("libraryMembers", JSON.stringify(members));
  localStorage.setItem("libraryLoans", JSON.stringify(loans));
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function availableCopies(book) {
  const issued = loans.filter(
    loan => loan.bookId === book.id && loan.status === "Issued"
  ).length;

  return book.copies - issued;
}

document.getElementById("bookForm").addEventListener("submit", event => {
  event.preventDefault();

  books.push({
    id: Date.now(),
    title: bookTitle.value.trim(),
    author: bookAuthor.value.trim(),
    category: bookCategory.value.trim(),
    copies: Number(bookCopies.value)
  });

  saveData();
  event.target.reset();
  renderAll();
});

document.getElementById("memberForm").addEventListener("submit", event => {
  event.preventDefault();

  members.push({
    id: Date.now(),
    name: memberName.value.trim(),
    email: memberEmail.value.trim(),
    phone: memberPhone.value.trim()
  });

  saveData();
  event.target.reset();
  renderAll();
});

document.getElementById("loanForm").addEventListener("submit", event => {
  event.preventDefault();

  const book = books.find(item => item.id == loanBook.value);
  const member = members.find(item => item.id == loanMember.value);

  if (!book || !member) return;

  if (availableCopies(book) <= 0) {
    alert("This book has no available copies.");
    return;
  }

  loans.push({
    id: Date.now(),
    bookId: book.id,
    memberId: member.id,
    issueDate: today(),
    dueDate: loanDueDate.value,
    returnDate: null,
    status: "Issued"
  });

  saveData();
  event.target.reset();
  renderAll();
});

function deleteBook(id) {
  books = books.filter(book => book.id !== id);
  saveData();
  renderAll();
}

function deleteMember(id) {
  members = members.filter(member => member.id !== id);
  saveData();
  renderAll();
}

function returnBook(id) {
  const loan = loans.find(item => item.id === id);

  if (loan) {
    loan.status = "Returned";
    loan.returnDate = today();
  }

  saveData();
  renderAll();
}

function renderBooks() {
  const tbody = document.getElementById("bookTable");
  tbody.innerHTML = "";

  if (!books.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">No books added yet.</td></tr>`;
    return;
  }

  books.forEach(book => {
    tbody.innerHTML += `
      <tr>
        <td>${book.title}</td>
        <td>${book.author}</td>
        <td>${book.category}</td>
        <td>${book.copies}</td>
        <td>${availableCopies(book)}</td>
        <td>
          <button class="small-btn delete" onclick="deleteBook(${book.id})">Delete</button>
        </td>
      </tr>
    `;
  });
}

function renderMembers() {
  const tbody = document.getElementById("memberTable");
  tbody.innerHTML = "";

  if (!members.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">No members added yet.</td></tr>`;
    return;
  }

  members.forEach(member => {
    tbody.innerHTML += `
      <tr>
        <td>${member.name}</td>
        <td>${member.email}</td>
        <td>${member.phone}</td>
        <td>
          <button class="small-btn delete" onclick="deleteMember(${member.id})">Delete</button>
        </td>
      </tr>
    `;
  });
}

function renderLoanOptions() {
  const bookSelect = document.getElementById("loanBook");
  const memberSelect = document.getElementById("loanMember");

  bookSelect.innerHTML = `<option value="">Select book</option>`;
  memberSelect.innerHTML = `<option value="">Select member</option>`;

  books.forEach(book => {
    bookSelect.innerHTML += `
      <option value="${book.id}">
        ${book.title} — ${availableCopies(book)} available
      </option>
    `;
  });

  members.forEach(member => {
    memberSelect.innerHTML += `
      <option value="${member.id}">${member.name}</option>
    `;
  });
}

function renderLoans() {
  const tbody = document.getElementById("loanTable");
  tbody.innerHTML = "";

  const activeLoans = loans.filter(loan => loan.status === "Issued");

  if (!activeLoans.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">No active loans.</td></tr>`;
    return;
  }

  activeLoans.forEach(loan => {
    const book = books.find(item => item.id === loan.bookId);
    const member = members.find(item => item.id === loan.memberId);
    const overdue = loan.dueDate < today();

    tbody.innerHTML += `
      <tr>
        <td>${book ? book.title : "Unknown"}</td>
        <td>${member ? member.name : "Unknown"}</td>
        <td>${loan.issueDate}</td>
        <td>${loan.dueDate}</td>
        <td>${overdue ? "Overdue" : "Issued"}</td>
        <td>
          <button class="small-btn return" onclick="returnBook(${loan.id})">Return</button>
        </td>
      </tr>
    `;
  });
}

function renderHistory() {
  const tbody = document.getElementById("historyTable");
  tbody.innerHTML = "";

  if (!loans.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">No loan history yet.</td></tr>`;
    return;
  }

  loans.forEach(loan => {
    const book = books.find(item => item.id === loan.bookId);
    const member = members.find(item => item.id === loan.memberId);

    tbody.innerHTML += `
      <tr>
        <td>${book ? book.title : "Unknown"}</td>
        <td>${member ? member.name : "Unknown"}</td>
        <td>${loan.issueDate}</td>
        <td>${loan.dueDate}</td>
        <td>${loan.returnDate || "-"}</td>
        <td>${loan.status}</td>
      </tr>
    `;
  });
}

function renderDashboard() {
  document.getElementById("totalBooks").textContent = books.length;
  document.getElementById("totalMembers").textContent = members.length;

  const active = loans.filter(loan => loan.status === "Issued");
  const returned = loans.filter(loan => loan.status === "Returned");

  document.getElementById("activeLoans").textContent = active.length;
  document.getElementById("returnedBooks").textContent = returned.length;

  const tbody = document.getElementById("dashboardLoanTable");
  tbody.innerHTML = "";

  if (!active.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">No books are currently issued.</td></tr>`;
    return;
  }

  active.forEach(loan => {
    const book = books.find(item => item.id === loan.bookId);
    const member = members.find(item => item.id === loan.memberId);

    tbody.innerHTML += `
      <tr>
        <td>${book ? book.title : "Unknown"}</td>
        <td>${member ? member.name : "Unknown"}</td>
        <td>${loan.issueDate}</td>
        <td>${loan.dueDate}</td>
      </tr>
    `;
  });
}

function renderAll() {
  renderBooks();
  renderMembers();
  renderLoanOptions();
  renderLoans();
  renderHistory();
  renderDashboard();
}

document.getElementById("loanDueDate").value = today();
renderAll();

window.addEventListener("load", () => {
  moveIndicator(document.querySelector(".tab-btn.active"));
});