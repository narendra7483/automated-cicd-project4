const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data", "taskflow.json");

let tasks = [];
let archivedTasks = [];
let activity = [];
let notifications = [];
let nextId = 1;

function saveState() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify({ tasks, archivedTasks, activity, notifications, nextId }, null, 2));
}

function loadState() {
  if (!fs.existsSync(DATA_FILE)) return;
  try {
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    tasks = saved.tasks || [];
    archivedTasks = saved.archivedTasks || [];
    activity = saved.activity || [];
    notifications = saved.notifications || [];
    nextId = saved.nextId || 1;
  } catch (error) {
    console.error("Could not load saved TaskFlow state", error);
  }
}

function resetTasks() {
  tasks = [];
  archivedTasks = [];
  activity = [];
  notifications = [];
  nextId = 1;
  if (fs.existsSync(DATA_FILE)) fs.rmSync(DATA_FILE);
}

function addActivity(type, task, detail) {
  activity.unshift({
    id: `${Date.now()}-${activity.length}`,
    type,
    taskId: task.id,
    taskTitle: task.title,
    detail,
    createdAt: new Date().toISOString()
  });
  notifications.unshift({ id: Date.now(), message: `${task.title}: ${detail}`, read: false, createdAt: new Date().toISOString() });
}

function normalizeTaskInput(body) {
  return {
    priority: ["low", "medium", "high"].includes(body.priority)
      ? body.priority
      : "medium",
    status: ["todo", "progress", "review", "done"].includes(body.status)
      ? body.status
      : "todo",
    assignee: typeof body.assignee === "string" ? body.assignee.trim().slice(0, 80) : "Team",
    category: typeof body.category === "string" ? body.category.trim().slice(0, 40) : "General",
    dueDate: typeof body.dueDate === "string" && body.dueDate ? body.dueDate : null
    ,comments: [], attachments: []
  };
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Task Manager API is healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get("/api/tasks", (req, res) => {
  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks
  });
});

app.get("/api/stats", (req, res) => {
  const completed = tasks.filter((task) => task.status === "done").length;
  const overdue = tasks.filter((task) => task.dueDate && task.dueDate < new Date().toISOString().slice(0, 10) && task.status !== "done").length;

  res.status(200).json({
    success: true,
    data: {
      total: tasks.length,
      completed,
      active: tasks.length - completed,
      overdue,
      completionRate: tasks.length ? Math.round((completed / tasks.length) * 100) : 0
    }
  });
});

app.get("/api/activity", (req, res) => {
  res.status(200).json({ success: true, data: activity.slice(0, 12) });
});

app.get("/api/archive", (req, res) => {
  res.status(200).json({ success: true, count: archivedTasks.length, data: archivedTasks });
});

app.get("/api/notifications", (req, res) => {
  res.status(200).json({ success: true, data: notifications.slice(0, 20) });
});

app.get("/api/export.csv", (req, res) => {
  const headers = ["id", "title", "status", "priority", "assignee", "category", "dueDate", "createdAt"];
  const rows = tasks.map((task) => headers.map((header) => JSON.stringify(task[header] || "")).join(","));
  res.type("text/csv").send([headers.join(","), ...rows].join("\n"));
});

app.post("/api/tasks", (req, res) => {
  const title = typeof req.body.title === "string" ? req.body.title.trim() : "";

  if (!title) {
    return res.status(400).json({
      success: false,
      error: "Task title is required"
    });
  }

  if (title.length > 200) {
    return res.status(400).json({
      success: false,
      error: "Task title must be 200 characters or fewer"
    });
  }

  const task = {
    id: nextId++,
    title,
    completed: false,
    ...normalizeTaskInput(req.body),
    createdAt: new Date().toISOString()
  };

  tasks.push(task);
  addActivity("created", task, "Task added to the workspace");
  saveState();

  return res.status(201).json({
    success: true,
    data: task
  });
});

app.patch("/api/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const task = tasks.find((item) => item.id === id);

  if (!task) {
    return res.status(404).json({
      success: false,
      error: "Task not found"
    });
  }

  if (typeof req.body.completed === "boolean") {
    task.completed = req.body.completed;
    task.status = req.body.completed ? "done" : "todo";
  }

  if (typeof req.body.title === "string") {
    const title = req.body.title.trim();

    if (!title) {
      return res.status(400).json({
        success: false,
        error: "Task title cannot be empty"
      });
    }

    task.title = title;
  }

  if (typeof req.body.status === "string" && ["todo", "progress", "review", "done"].includes(req.body.status)) {
    task.status = req.body.status;
    task.completed = req.body.status === "done";
  }

  if (typeof req.body.priority === "string" && ["low", "medium", "high"].includes(req.body.priority)) {
    task.priority = req.body.priority;
  }

  if (typeof req.body.assignee === "string") {
    task.assignee = req.body.assignee.trim().slice(0, 80) || "Team";
  }

  if (typeof req.body.category === "string") {
    task.category = req.body.category.trim().slice(0, 40) || "General";
  }

  if (typeof req.body.dueDate === "string") {
    task.dueDate = req.body.dueDate || null;
  }

  addActivity("updated", task, "Task details updated");
  saveState();

  return res.status(200).json({
    success: true,
    data: task
  });
});

app.delete("/api/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = tasks.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: "Task not found"
    });
  }

  const deletedTask = tasks.splice(index, 1)[0];
  const archivedTask = {
    ...deletedTask,
    archivedAt: new Date().toISOString()
  };
  archivedTasks.unshift(archivedTask);
  addActivity("archived", deletedTask, "Task moved to archive");
  saveState();

  return res.status(200).json({
    success: true,
    data: archivedTask
  });
});

app.post("/api/tasks/:id/comments", (req, res) => {
  const task = tasks.find((item) => item.id === Number(req.params.id));
  const text = typeof req.body.text === "string" ? req.body.text.trim().slice(0, 500) : "";
  if (!task) return res.status(404).json({ success: false, error: "Task not found" });
  if (!text) return res.status(400).json({ success: false, error: "Comment is required" });
  const comment = { id: Date.now(), text, author: "Team", createdAt: new Date().toISOString() };
  task.comments.push(comment);
  addActivity("commented", task, "Comment added");
  saveState();
  res.status(201).json({ success: true, data: comment });
});

app.post("/api/tasks/:id/attachments", (req, res) => {
  const task = tasks.find((item) => item.id === Number(req.params.id));
  const name = typeof req.body.name === "string" ? req.body.name.trim().slice(0, 120) : "";
  if (!task) return res.status(404).json({ success: false, error: "Task not found" });
  if (!name) return res.status(400).json({ success: false, error: "Attachment name is required" });
  const attachment = { id: Date.now(), name, createdAt: new Date().toISOString() };
  task.attachments.push(attachment);
  addActivity("attached", task, `Attachment added: ${name}`);
  saveState();
  res.status(201).json({ success: true, data: attachment });
});

app.use((req, res) => {
  if (req.path.startsWith("/api") || req.path === "/health") {
    return res.status(404).json({
      success: false,
      error: "Route not found"
    });
  }

  return res.status(404).send("Page not found");
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: "Internal server error"
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Task Manager running at http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

loadState();

app.resetTasks = resetTasks;

module.exports = app;
