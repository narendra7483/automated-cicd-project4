const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const taskCount = document.getElementById("task-count");
const formError = document.getElementById("form-error");
const healthDot = document.getElementById("health-dot");
const healthText = document.getElementById("health-text");

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

function showError(message) {
  formError.hidden = false;
  formError.textContent = message;
}

function clearError() {
  formError.hidden = true;
  formError.textContent = "";
}

function renderTasks(tasks) {
  taskList.innerHTML = "";
  taskCount.textContent = `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;
  emptyState.classList.toggle("hidden", tasks.length > 0);

  tasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = `task-item${task.completed ? " completed" : ""}`;

    const main = document.createElement("div");
    main.className = "task-main";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", `Mark ${task.title} as completed`);
    checkbox.addEventListener("change", () => toggleTask(task.id, checkbox.checked));

    const title = document.createElement("p");
    title.className = "task-title";
    title.textContent = task.title;

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-btn";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteTask(task.id));

    main.append(checkbox, title);
    item.append(main, deleteButton);
    taskList.appendChild(item);
  });
}

async function loadHealth() {
  try {
    const data = await request("/health");
    healthDot.className = "status-dot ok";
    healthText.textContent = data.status === "ok" ? "Healthy" : "Unavailable";
  } catch (error) {
    healthDot.className = "status-dot error";
    healthText.textContent = "Unavailable";
  }
}

async function loadTasks() {
  const result = await request("/api/tasks");
  renderTasks(result.data);
}

async function addTask(title) {
  await request("/api/tasks", {
    method: "POST",
    body: JSON.stringify({ title })
  });
  await loadTasks();
}

async function toggleTask(id, completed) {
  await request(`/api/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ completed })
  });
  await loadTasks();
}

async function deleteTask(id) {
  await request(`/api/tasks/${id}`, {
    method: "DELETE"
  });
  await loadTasks();
}

taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

  const title = taskInput.value.trim();

  if (!title) {
    showError("Please enter a task title.");
    return;
  }

  try {
    await addTask(title);
    taskInput.value = "";
    taskInput.focus();
  } catch (error) {
    showError(error.message);
  }
});

async function init() {
  await loadHealth();
  await loadTasks();
}

init();
