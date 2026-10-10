// Mirox beginner shared system. Data is stored in Supabase, not only in this browser.
const supabaseReady = window.supabase &&
  window.MIROX_SUPABASE_URL &&
  window.MIROX_SUPABASE_ANON_KEY &&
  !window.MIROX_SUPABASE_URL.includes("PASTE_") &&
  !window.MIROX_SUPABASE_ANON_KEY.includes("PASTE_");

const db = supabaseReady
  ? window.supabase.createClient(window.MIROX_SUPABASE_URL, window.MIROX_SUPABASE_ANON_KEY)
  : null;

let currentUser = null;
let currentProfile = null;
let files = [];
let investigators = [];
let assignments = [];
let expenses = [];

const $ = (id) => document.getElementById(id);
const money = (amount) => new Intl.NumberFormat("en-KE", {
  style: "currency", currency: "KES", minimumFractionDigits: 2
}).format(Number(amount || 0));
const today = () => new Date().toLocaleDateString("en-CA");
const safe = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

function showMessage(id, text, error = false) {
  const el = $(id);
  el.textContent = text;
  el.classList.toggle("error", error);
}
function isAdmin() { return currentProfile && currentProfile.role === "admin"; }

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(page => page.classList.add("hidden"));
  $(pageId)?.classList.remove("hidden");
  document.querySelectorAll(".tabs button").forEach(button =>
    button.classList.toggle("active", button.dataset.page === pageId));
}
document.querySelectorAll(".tabs button").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

function fillSelect(id, items, labelFn, valueFn, placeholder) {
  const select = $(id);
  const oldValue = select.value;
  select.innerHTML = `<option value="">${safe(placeholder)}</option>` +
    items.map(item => `<option value="${safe(valueFn(item))}">${safe(labelFn(item))}</option>`).join("");
  if (items.some(item => String(valueFn(item)) === oldValue)) select.value = oldValue;
}
function findFile(id) { return files.find(file => file.id === id); }
function findInvestigator(id) { return investigators.find(person => person.id === id); }
function myAssignments() { return assignments.filter(a => a.investigator_id === currentUser.id); }
function myAssignedFiles() {
  return myAssignments().map(a => findFile(a.file_id)).filter(Boolean);
}
function canEditExpense(expense) {
  return isAdmin() || expense.created_by === currentUser.id;
}

async function loadData() {
  const results = await Promise.all([
    db.from("profiles").select("*").order("first_name"),
    db.from("files").select("*").order("created_at", { ascending: false }),
    db.from("assignments").select("*").order("created_at", { ascending: false }),
    db.from("expenses").select("*").order("expense_date", { ascending: false })
  ]);
  for (const result of results) {
    if (result.error) throw result.error;
  }
  investigators = results[0].data || [];
  files = results[1].data || [];
  assignments = results[2].data || [];
  expenses = results[3].data || [];
  drawEverything();
}

function drawEverything() {
  $("welcomeTitle").textContent = `Welcome, ${currentProfile.first_name}`;
  $("userRole").textContent = isAdmin() ? "Administrator" : "Investigator";
  $("adminTabs").classList.toggle("hidden", !isAdmin());
  $("investigatorTabs").classList.toggle("hidden", isAdmin());
  if (isAdmin()) {
    drawFiles();
    drawAssignments();
    drawInvestigators();
    drawAllExpenses();
    showPage("filesPage");
  } else {
    drawMyFiles();
    drawExpenseFormOptions();
    drawMyExpenses();
    showPage("myFilesPage");
  }
}

function drawFiles() {
  $("filesTable").innerHTML = files.length ? `<table><thead><tr><th>File No.</th><th>Insured</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead><tbody>${
    files.map(file => `<tr><td>${safe(file.file_no)}</td><td>${safe(file.insured)}</td><td>${safe(file.description || "")}</td><td>${safe(file.status)}</td><td>
    <button class="small" onclick="editFile('${file.id}')">Edit</button>
    <button class="small danger" onclick="deleteFile('${file.id}')">Delete</button></td></tr>`).join("")
  }</tbody></table>` : "<p>No files registered yet.</p>";
  fillSelect("assignmentFile", files.filter(f => f.status === "Open"),
    f => `${f.file_no} — ${f.insured}`, f => f.id, "Choose an open file");
  fillSelect("expenseFile", myAssignedFiles().filter(f => f.status === "Open"),
    f => `${f.file_no} — ${f.insured}`, f => f.id, "Choose your open assigned file");
}
function drawAssignments() {
  $("assignmentsTable").innerHTML = assignments.length ? `<table><thead><tr><th>File</th><th>Investigator</th><th>Assigned</th><th>Action</th></tr></thead><tbody>${
    assignments.map(a => {
      const file = findFile(a.file_id), person = findInvestigator(a.investigator_id);
      return `<tr><td>${safe(file ? file.file_no + " — " + file.insured : "Deleted file")}</td><td>${safe(person ? person.first_name + " " + person.last_name : "Unknown")}</td><td>${safe(a.created_at ? a.created_at.slice(0, 10) : "")}</td><td><button class="small danger" onclick="deleteAssignment('${a.id}')">Remove</button></td></tr>`;
    }).join("")
  }</tbody></table>` : "<p>No assignments yet.</p>";
  fillSelect("assignmentInvestigator", investigators.filter(p => p.role === "investigator"),
    p => `${p.first_name} ${p.last_name}`, p => p.id, "Choose an investigator");
}
function drawInvestigators() {
  $("investigatorsTable").innerHTML = investigators.length ? `<table><thead><tr><th>Name</th><th>User ID</th><th>Role</th><th>Actions</th></tr></thead><tbody>${
    investigators.map(p => `<tr><td>${safe(p.first_name)} ${safe(p.last_name)}</td><td>${safe(p.id)}</td><td>${safe(p.role)}</td><td>
    <button class="small" onclick="editInvestigator('${p.id}')">Edit</button>
    <button class="small danger" onclick="deleteInvestigator('${p.id}')">Delete profile</button></td></tr>`).join("")
  }</tbody></table>` : "<p>No profiles yet.</p>";
}
function drawMyFiles() {
  const mine = myAssignments().map(a => ({ assignment: a, file: findFile(a.file_id) })).filter(x => x.file);
  $("myFilesTable").innerHTML = mine.length ? `<table><thead><tr><th>File No.</th><th>Insured</th><th>Description</th><th>Status</th><th>Total expenses</th></tr></thead><tbody>${
    mine.map(x => {
      const total = expenses.filter(e => e.file_id === x.file.id).reduce((sum, e) => sum + Number(e.amount), 0);
      return `<tr><td>${safe(x.file.file_no)}</td><td>${safe(x.file.insured)}</td><td>${safe(x.file.description || "")}</td><td>${safe(x.file.status)}</td><td>${money(total)}</td></tr>`;
    }).join("")
  }</tbody></table>` : "<p>No files have been assigned to you yet.</p>";
}
function drawExpenseFormOptions() {
  fillSelect("expenseFile", myAssignedFiles().filter(f => f.status === "Open"),
    f => `${f.file_no} — ${f.insured}`, f => f.id, "Choose your open assigned file");
}
function drawMyExpenses() {
  const mine = expenses.filter(e => e.created_by === currentUser.id);
  $("myExpensesTable").innerHTML = mine.length ? `<table><thead><tr><th>Date</th><th>File</th><th>Description</th><th>Amount</th><th>Actions</th></tr></thead><tbody>${
    mine.map(e => {
      const f = findFile(e.file_id);
      return `<tr><td>${safe(e.expense_date)}</td><td>${safe(f ? f.file_no : "Unknown")}</td><td>${safe(e.description)}</td><td>${money(e.amount)}</td><td>
      <button class="small" onclick="editExpense('${e.id}')">Edit</button>
      <button class="small danger" onclick="deleteExpense('${e.id}')">Delete</button></td></tr>`;
    }).join("")
  }</tbody></table>` : "<p>You have not recorded any expenses yet.</p>";
  $("myGrandTotal").textContent = money(mine.reduce((sum, e) => sum + Number(e.amount), 0));
  $("myTodayTotal").textContent = money(mine.filter(e => e.expense_date === today()).reduce((sum, e) => sum + Number(e.amount), 0));
}
function drawAllExpenses() {
  const grand = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const todaySum = expenses.filter(e => e.expense_date === today()).reduce((sum, e) => sum + Number(e.amount), 0);
  $("grandTotal").textContent = money(grand);
  $("todayTotal").textContent = money(todaySum);
  $("allExpensesTable").innerHTML = expenses.length ? `<table><thead><tr><th>Date</th><th>File</th><th>Investigator</th><th>Description</th><th>Amount</th><th>Actions</th></tr></thead><tbody>${
    expenses.map(e => {
      const f = findFile(e.file_id), p = findInvestigator(e.created_by);
      return `<tr><td>${safe(e.expense_date)}</td><td>${safe(f ? f.file_no : "Unknown")}</td><td>${safe(p ? p.first_name + " " + p.last_name : "Unknown")}</td><td>${safe(e.description)}</td><td>${money(e.amount)}</td><td>
      <button class="small" onclick="editExpense('${e.id}')">Edit</button><button class="small danger" onclick="deleteExpense('${e.id}')">Delete</button></td></tr>`;
    }).join("")
  }</tbody></table>` : "<p>No expenses recorded yet.</p>";

  const byFile = {};
  expenses.forEach(e => {
    const f = findFile(e.file_id), key = e.file_id;
    if (!byFile[key]) byFile[key] = { name: f ? `${f.file_no} — ${f.insured}` : "Unknown file", total: 0 };
    byFile[key].total += Number(e.amount);
  });
  $("fileTotalsTable").innerHTML = Object.keys(byFile).length ? `<table><thead><tr><th>File</th><th>Total expenses</th></tr></thead><tbody>${
    Object.values(byFile).map(x => `<tr><td>${safe(x.name)}</td><td>${money(x.total)}</td></tr>`).join("")
  }</tbody></table>` : "<p>No totals to show.</p>";

  const byDay = {};
  expenses.forEach(e => { byDay[e.expense_date] = (byDay[e.expense_date] || 0) + Number(e.amount); });
  const dates = Object.keys(byDay).sort().reverse();
  $("dailyTotalsTable").innerHTML = dates.length ? `<table><thead><tr><th>Date</th><th>Total expenses</th></tr></thead><tbody>${
    dates.map(date => `<tr><td>${safe(date)}</td><td>${money(byDay[date])}</td></tr>`).join("")
  }</tbody></table>` : "<p>No daily totals to show.</p>";
}

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!db) {
    $("setupNotice").classList.remove("hidden");
    showMessage("loginMessage", "Please complete config.js and the setup steps in README.txt.", true);
    return;
  }
  showMessage("loginMessage", "Signing in...");
  const { data, error } = await db.auth.signInWithPassword({
    email: $("loginEmail").value.trim(),
    password: $("loginPassword").value
  });
  if (error) return showMessage("loginMessage", error.message, true);
  currentUser = data.user;
  try {
    const { data: profile, error: profileError } = await db.from("profiles").select("*").eq("id", currentUser.id).single();
    if (profileError) throw profileError;
    currentProfile = profile;
    $("loginSection").classList.add("hidden");
    $("appSection").classList.remove("hidden");
    await loadData();
    showMessage("loginMessage", "");
  } catch (err) {
    await db.auth.signOut();
    currentUser = null; currentProfile = null;
    showMessage("loginMessage", "Could not load your profile. Ask the administrator to add your profile and role. Details: " + err.message, true);
  }
});

$("logoutButton").addEventListener("click", async () => {
  if (db) await db.auth.signOut();
  currentUser = null; currentProfile = null;
  $("appSection").classList.add("hidden");
  $("loginSection").classList.remove("hidden");
});

$("fileForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = $("fileId").value;
  const record = {
    file_no: $("fileNo").value.trim(),
    insured: $("insured").value.trim(),
    description: $("claimDescription").value.trim(),
    status: $("fileStatus").value
  };
  const result = id ? await db.from("files").update(record).eq("id", id) : await db.from("files").insert(record);
  if (result.error) return showMessage("fileMessage", result.error.message, true);
  $("fileForm").reset(); $("fileId").value = ""; $("cancelFileEdit").classList.add("hidden");
  showMessage("fileMessage", "File saved.");
  await loadData();
});
window.editFile = (id) => {
  const f = findFile(id); if (!f) return;
  $("fileId").value = f.id; $("fileNo").value = f.file_no; $("insured").value = f.insured;
  $("claimDescription").value = f.description || ""; $("fileStatus").value = f.status;
  $("cancelFileEdit").classList.remove("hidden"); showPage("filesPage");
};
$("cancelFileEdit").addEventListener("click", () => { $("fileForm").reset(); $("fileId").value = ""; $("cancelFileEdit").classList.add("hidden"); });
window.deleteFile = async (id) => {
  if (!confirm("Delete this file and its related assignments/expenses?")) return;
  const { error } = await db.from("files").delete().eq("id", id);
  if (error) return alert(error.message);
  await loadData();
};

$("assignmentForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const record = { file_id: $("assignmentFile").value, investigator_id: $("assignmentInvestigator").value };
  const { error } = await db.from("assignments").insert(record);
  if (error) return showMessage("assignmentMessage", error.message, true);
  showMessage("assignmentMessage", "File assigned.");
  await loadData();
});
window.deleteAssignment = async (id) => {
  if (!confirm("Remove this assignment?")) return;
  const { error } = await db.from("assignments").delete().eq("id", id);
  if (error) return alert(error.message);
  await loadData();
};

$("investigatorForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = $("investigatorRowId").value;
  const record = {
    id: $("investigatorUserId").value.trim(),
    first_name: $("investigatorFirstName").value.trim(),
    last_name: $("investigatorLastName").value.trim(),
    role: $("investigatorRole").value
  };
  // Supabase profile ID must match the user's ID in Authentication.
  const result = id
    ? await db.from("profiles").update({ first_name: record.first_name, last_name: record.last_name, role: record.role }).eq("id", id)
    : await db.from("profiles").insert(record);
  if (result.error) return showMessage("investigatorMessage", result.error.message, true);
  $("investigatorForm").reset(); $("investigatorRowId").value = ""; $("cancelInvestigatorEdit").classList.add("hidden");
  showMessage("investigatorMessage", "Profile saved.");
  await loadData();
});
window.editInvestigator = (id) => {
  const p = findInvestigator(id); if (!p) return;
  $("investigatorRowId").value = p.id; $("investigatorUserId").value = p.id;
  $("investigatorFirstName").value = p.first_name; $("investigatorLastName").value = p.last_name;
  $("investigatorRole").value = p.role; $("investigatorUserId").disabled = true;
  $("cancelInvestigatorEdit").classList.remove("hidden"); showPage("investigatorsPage");
};
$("cancelInvestigatorEdit").addEventListener("click", () => {
  $("investigatorForm").reset(); $("investigatorRowId").value = ""; $("investigatorUserId").disabled = false;
  $("cancelInvestigatorEdit").classList.add("hidden");
});
window.deleteInvestigator = async (id) => {
  if (id === currentUser.id) return alert("You cannot delete your own profile while signed in.");
  if (!confirm("Delete this profile? This does not delete the Authentication login.")) return;
  const { error } = await db.from("profiles").delete().eq("id", id);
  if (error) return alert(error.message);
  await loadData();
};

$("expenseForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = $("expenseId").value;
  const fileId = $("expenseFile").value;
  const assignedOpen = isAdmin()
    ? files.some(f => f.id === fileId && f.status === "Open")
    : myAssignedFiles().some(f => f.id === fileId && f.status === "Open");
  if (!assignedOpen) return showMessage("expenseMessage", isAdmin() ? "Choose an open file." : "Choose an open file assigned to you.", true);
  const record = {
    file_id: fileId,
    expense_date: $("expenseDate").value,
    description: $("expenseDescription").value.trim(),
    amount: Number($("expenseAmount").value)
  };
  let result;
  if (id) {
    result = await db.from("expenses").update(record).eq("id", id);
  } else {
    record.created_by = currentUser.id;
    result = await db.from("expenses").insert(record);
  }
  if (result.error) return showMessage("expenseMessage", result.error.message, true);
  $("expenseForm").reset(); $("expenseId").value = ""; $("expenseDate").value = today();
  $("cancelExpenseEdit").classList.add("hidden");
  showMessage("expenseMessage", "Expense saved.");
  await loadData();
});
window.editExpense = (id) => {
  const e = expenses.find(item => item.id === id); if (!e) return;
  if (!canEditExpense(e)) return alert("You can only edit expenses you entered.");
  if (!isAdmin() && !myAssignedFiles().some(f => f.id === e.file_id && f.status === "Open")) {
    return alert("You can only edit expenses for your currently assigned open files.");
  }
  if (isAdmin()) fillSelect("expenseFile", files.filter(f => f.status === "Open"), f => `${f.file_no} — ${f.insured}`, f => f.id, "Choose an open file");
  $("expenseId").value = e.id; $("expenseFile").value = e.file_id; $("expenseDate").value = e.expense_date;
  $("expenseDescription").value = e.description; $("expenseAmount").value = e.amount;
  $("cancelExpenseEdit").classList.remove("hidden"); showPage("myExpensesPage");
};
$("cancelExpenseEdit").addEventListener("click", () => {
  $("expenseForm").reset(); $("expenseId").value = ""; $("expenseDate").value = today();
  $("cancelExpenseEdit").classList.add("hidden");
});
window.deleteExpense = async (id) => {
  const e = expenses.find(item => item.id === id); if (!e) return;
  if (!canEditExpense(e)) return alert("You can only delete expenses you entered.");
  if (!confirm("Delete this expense?")) return;
  const { error } = await db.from("expenses").delete().eq("id", id);
  if (error) return alert(error.message);
  await loadData();
};

if (!db) $("setupNotice").classList.remove("hidden");
$("expenseDate").value = today();
