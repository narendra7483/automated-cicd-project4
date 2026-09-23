const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const board = document.getElementById("board");
const emptyState = document.getElementById("empty-state");
const formError = document.getElementById("form-error");
const searchInput = document.getElementById("search-input");
const filterInput = document.getElementById("filter-input");
const activityList = document.getElementById("activity-list");
const activityEmpty = document.getElementById("activity-empty");
const toast = document.getElementById("toast");
const state = { tasks: [], archived: [], archiveMode: false };
const columns = [{ id: "todo", label: "To do" }, { id: "progress", label: "In progress" }, { id: "review", label: "In review" }, { id: "done", label: "Completed" }];

async function request(url, options = {}) {
  const response = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function notify(message) { toast.textContent = message; toast.classList.add("visible"); setTimeout(() => toast.classList.remove("visible"), 2600); }
function showError(message) { formError.hidden = false; formError.textContent = message; }
function clearError() { formError.hidden = true; formError.textContent = ""; }
function isOverdue(task) { return task.dueDate && task.dueDate < new Date().toISOString().slice(0, 10) && task.status !== "done"; }
function formatDate(date) { return date ? new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "No due date"; }

function createTaskCard(task, archived = false) {
  const card = document.createElement("article");
  card.className = `task-card priority-${task.priority}${task.completed ? " completed" : ""}`;
  const overdue = isOverdue(task);
  card.innerHTML = `<div class="task-card-top"><span class="priority-dot"></span><span class="priority-label">${task.priority} priority</span>${overdue ? '<span class="overdue-label">Overdue</span>' : ""}</div><h3 class="task-title"></h3><div class="task-meta"><span>◉ ${task.assignee || "Team"}</span><span>◆ ${task.category || "General"}</span><span class="${overdue ? "date-overdue" : ""}">${archived ? "Archived" : formatDate(task.dueDate)}</span></div>`;
  card.querySelector(".task-title").textContent = task.title;
  if (!archived) {
    const actions = document.createElement("div"); actions.className = "card-actions";
    const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.checked = task.status === "done"; checkbox.setAttribute("aria-label", `Complete ${task.title}`); checkbox.addEventListener("change", () => updateTask(task.id, { status: checkbox.checked ? "done" : "todo" }));
    const edit = document.createElement("button"); edit.className = "text-button"; edit.textContent = "Edit"; edit.addEventListener("click", () => editTask(task));
    const archive = document.createElement("button"); archive.className = "text-button danger"; archive.textContent = "Archive"; archive.addEventListener("click", () => archiveTask(task));
    actions.append(checkbox, edit, archive); card.appendChild(actions);
  }
  return card;
}

function renderBoard() {
  const query = searchInput.value.trim().toLowerCase();
  const filter = filterInput.value;
  const visible = state.tasks.filter((task) => (!query || `${task.title} ${task.assignee} ${task.category}`.toLowerCase().includes(query)) && (filter === "all" || task.status === filter));
  board.innerHTML = "";
  if (state.archiveMode) {
    const archive = document.createElement("div"); archive.className = "archive-list";
    state.archived.forEach((task) => archive.appendChild(createTaskCard(task, true)));
    board.appendChild(archive); emptyState.classList.toggle("hidden", state.archived.length > 0); return;
  }
  columns.forEach((column) => {
    const lane = document.createElement("section"); lane.className = "lane";
    const laneTasks = visible.filter((task) => task.status === column.id);
    lane.innerHTML = `<div class="lane-heading"><h3>${column.label}</h3><span>${laneTasks.length}</span></div>`;
    const cards = document.createElement("div"); cards.className = "lane-cards";
    laneTasks.forEach((task) => cards.appendChild(createTaskCard(task)));
    if (!laneTasks.length) cards.innerHTML = `<p class="lane-empty">Nothing here yet</p>`;
    lane.appendChild(cards); board.appendChild(lane);
  });
  emptyState.classList.toggle("hidden", visible.length > 0);
}

function renderActivity(items) {
  activityList.innerHTML = ""; activityEmpty.classList.toggle("hidden", items.length > 0);
  items.slice(0, 6).forEach((event) => {
    const item = document.createElement("li");
    item.innerHTML = `<span class="activity-icon">${event.type === "created" ? "＋" : event.type === "archived" ? "✓" : "↗"}</span><div><strong></strong><small>${event.detail} · ${new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></div>`;
    item.querySelector("strong").textContent = event.taskTitle; activityList.appendChild(item);
  });
}

async function loadHealth() { try { const data = await request("/health"); document.getElementById("health-dot").className = "status-dot ok"; document.getElementById("health-text").textContent = "Live"; document.getElementById("health-value").textContent = data.status === "ok" ? "Healthy" : "Unavailable"; } catch { document.getElementById("health-dot").className = "status-dot error"; document.getElementById("health-text").textContent = "Offline"; document.getElementById("health-value").textContent = "Unavailable"; } }
async function loadTasks() { state.tasks = (await request("/api/tasks")).data; renderBoard(); }
async function loadStats() { const stats = (await request("/api/stats")).data; document.getElementById("stat-total").textContent = stats.total; document.getElementById("stat-active").textContent = stats.active; document.getElementById("stat-rate").textContent = `${stats.completionRate}%`; document.getElementById("stat-overdue").textContent = stats.overdue; document.getElementById("progress-bar").style.width = `${stats.completionRate}%`; }
async function loadActivity() { renderActivity((await request("/api/activity")).data); }
async function loadArchive() { state.archived = (await request("/api/archive")).data; }
async function refresh() { await Promise.all([loadTasks(), loadStats(), loadActivity(), loadArchive()]); }
async function addTask() { await request("/api/tasks", { method: "POST", body: JSON.stringify({ title: taskInput.value.trim(), priority: document.getElementById("priority-input").value, assignee: document.getElementById("assignee-input").value, dueDate: document.getElementById("due-date-input").value, category: document.getElementById("category-input").value }) }); await refresh(); notify("Task added to the board"); }
async function updateTask(id, changes) { await request(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(changes) }); await refresh(); notify("Task status updated"); }
async function archiveTask(task) { if (!confirm(`Archive “${task.title}”? It will remain in history.`)) return; await request(`/api/tasks/${task.id}`, { method: "DELETE" }); await refresh(); notify("Task archived, history preserved"); }
async function editTask(task) { const title = prompt("Update task title", task.title); if (title && title.trim() && title.trim() !== task.title) await updateTask(task.id, { title: title.trim() }); }

taskForm.addEventListener("submit", async (event) => { event.preventDefault(); clearError(); if (!taskInput.value.trim()) { showError("Enter a task title to get started."); return; } try { await addTask(); taskForm.reset(); document.getElementById("assignee-input").value = "Team"; } catch (error) { showError(error.message); } });
searchInput.addEventListener("input", renderBoard); filterInput.addEventListener("change", renderBoard);
document.getElementById("archive-toggle").addEventListener("click", async (event) => { state.archiveMode = !state.archiveMode; event.currentTarget.textContent = state.archiveMode ? "Back to board" : "View archive"; await loadArchive(); renderBoard(); });
document.getElementById("theme-toggle").addEventListener("click", (event) => { document.body.classList.toggle("dark-mode"); event.currentTarget.textContent = document.body.classList.contains("dark-mode") ? "☼" : "◐"; });
taskInput.addEventListener("keydown", (event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") taskForm.requestSubmit(); });

async function init() { await loadHealth(); await refresh(); }
init();