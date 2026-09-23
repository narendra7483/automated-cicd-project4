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
const calendar = document.getElementById("calendar");
const drawer = document.getElementById("settings-drawer");
const backdrop = document.getElementById("drawer-backdrop");
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
  card.draggable = !archived;
  card.dataset.taskId = task.id;
  const overdue = isOverdue(task);
  card.innerHTML = `<div class="task-card-top"><span class="priority-dot"></span><span class="priority-label">${task.priority} priority</span>${overdue ? '<span class="overdue-label">Overdue</span>' : ""}</div><h3 class="task-title"></h3><div class="task-meta"><span>◉ ${task.assignee || "Team"}</span><span>◆ ${task.category || "General"}</span><span class="${overdue ? "date-overdue" : ""}">${archived ? "Archived" : formatDate(task.dueDate)}</span></div>`;
  card.querySelector(".task-title").textContent = task.title;
  if (!archived) {
    const actions = document.createElement("div"); actions.className = "card-actions";
    const statusSelect = document.createElement("select"); statusSelect.className = "card-status"; statusSelect.setAttribute("aria-label", `Change status for ${task.title}`);
    [{ value: "todo", label: "To do" }, { value: "progress", label: "In progress" }, { value: "review", label: "In review" }, { value: "done", label: "Completed" }].forEach((option) => { const element = document.createElement("option"); element.value = option.value; element.textContent = option.label; element.selected = task.status === option.value; statusSelect.appendChild(element); });
    statusSelect.addEventListener("change", () => updateTask(task.id, { status: statusSelect.value }));
    const edit = document.createElement("button"); edit.className = "text-button"; edit.textContent = "Edit"; edit.addEventListener("click", () => editTask(task));
    const comment = document.createElement("button"); comment.className = "text-button"; comment.textContent = "Comment"; comment.addEventListener("click", () => addComment(task));
    const attach = document.createElement("button"); attach.className = "text-button"; attach.textContent = "Attach"; attach.addEventListener("click", () => addAttachment(task));
    const archive = document.createElement("button"); archive.className = "text-button danger"; archive.textContent = "Archive"; archive.addEventListener("click", () => archiveTask(task));
    actions.append(statusSelect, edit, comment, attach, archive); card.appendChild(actions);
    card.addEventListener("dragstart", (event) => { event.dataTransfer.setData("text/task-id", String(task.id)); card.classList.add("dragging"); });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
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
    lane.addEventListener("dragover", (event) => { event.preventDefault(); lane.classList.add("drop-target"); });
    lane.addEventListener("dragleave", () => lane.classList.remove("drop-target"));
    lane.addEventListener("drop", async (event) => { event.preventDefault(); lane.classList.remove("drop-target"); const id = Number(event.dataTransfer.getData("text/task-id")); if (id) await updateTask(id, { status: column.id }); });
    lane.appendChild(cards); board.appendChild(lane);
  });
  emptyState.classList.toggle("hidden", visible.length > 0);
}

function renderCalendar() {
  const dated = state.tasks.filter((task) => task.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  calendar.innerHTML = `<div class="calendar-heading"><span>Upcoming delivery schedule</span><strong>${dated.length} dated task${dated.length === 1 ? "" : "s"}</strong></div>`;
  const list = document.createElement("div"); list.className = "calendar-list";
  dated.forEach((task) => { const item = document.createElement("div"); item.className = "calendar-item"; item.innerHTML = `<time>${formatDate(task.dueDate)}</time><strong></strong><span>${task.status} · ${task.assignee || "Team"}</span>`; item.querySelector("strong").textContent = task.title; list.appendChild(item); });
  if (!dated.length) list.innerHTML = '<p class="lane-empty">Add due dates to see the delivery calendar.</p>';
  calendar.appendChild(list);
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
async function addComment(task) { const text = prompt(`Comment on “${task.title}”`); if (!text || !text.trim()) return; await request(`/api/tasks/${task.id}/comments`, { method: "POST", body: JSON.stringify({ text }) }); await refresh(); notify("Comment added to activity"); }
async function addAttachment(task) { const name = prompt(`Attachment name for “${task.title}”`); if (!name || !name.trim()) return; await request(`/api/tasks/${task.id}/attachments`, { method: "POST", body: JSON.stringify({ name }) }); await refresh(); notify("Attachment added to task"); }

taskForm.addEventListener("submit", async (event) => { event.preventDefault(); clearError(); if (!taskInput.value.trim()) { showError("Enter a task title to get started."); return; } try { await addTask(); taskForm.reset(); document.getElementById("assignee-input").value = "Team"; } catch (error) { showError(error.message); } });
searchInput.addEventListener("input", renderBoard); filterInput.addEventListener("change", renderBoard);
document.getElementById("archive-toggle").addEventListener("click", async (event) => { state.archiveMode = !state.archiveMode; event.currentTarget.textContent = state.archiveMode ? "Back to board" : "View archive"; await loadArchive(); renderBoard(); });
document.getElementById("calendar-toggle").addEventListener("click", (event) => { const open = calendar.hidden; calendar.hidden = !open; board.hidden = open; event.currentTarget.textContent = open ? "Board" : "Calendar"; if (open) renderCalendar(); });
document.getElementById("export-button").addEventListener("click", () => { window.location.href = "/api/export.csv"; });
document.querySelectorAll("[data-drawer-target]").forEach((link) => link.addEventListener("click", async () => {
  const target = document.getElementById(link.dataset.drawerTarget);
  if (link.dataset.drawerTarget === "calendar-toggle" || link.dataset.drawerTarget === "archive-toggle") target.click();
  else target?.scrollIntoView({ behavior: "smooth", block: "start" });
  document.querySelectorAll(".drawer-link").forEach((item) => item.classList.remove("active")); link.classList.add("active"); setDrawer(false);
}));
document.getElementById("drawer-export").addEventListener("click", () => { window.location.href = "/api/export.csv"; setDrawer(false); });
document.getElementById("theme-toggle").addEventListener("click", (event) => { document.body.classList.toggle("dark-mode"); event.currentTarget.textContent = document.body.classList.contains("dark-mode") ? "☼" : "◐"; });
function setDrawer(open) { drawer.classList.toggle("open", open); backdrop.classList.toggle("visible", open); drawer.setAttribute("aria-hidden", String(!open)); }
document.getElementById("menu-toggle").addEventListener("click", () => setDrawer(true));
document.getElementById("settings-toggle").addEventListener("click", () => setDrawer(true));
document.getElementById("drawer-close").addEventListener("click", () => setDrawer(false));
backdrop.addEventListener("click", () => setDrawer(false));
document.getElementById("settings-dark").addEventListener("change", (event) => { document.body.classList.toggle("dark-mode", event.target.checked); document.getElementById("theme-toggle").textContent = event.target.checked ? "☼" : "◐"; });
document.getElementById("settings-motion").addEventListener("change", (event) => { document.body.classList.toggle("reduced-motion", event.target.checked); });
document.getElementById("settings-activity").addEventListener("change", (event) => { document.querySelector(".activity-panel").classList.toggle("settings-hidden", !event.target.checked); });
taskInput.addEventListener("keydown", (event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") taskForm.requestSubmit(); });

async function init() { await loadHealth(); await refresh(); }
init();