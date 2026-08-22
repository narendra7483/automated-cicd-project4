const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

let tasks = [];
let nextId = 1;

function resetTasks() {
  tasks = [];
  nextId = 1;
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
    createdAt: new Date().toISOString()
  };

  tasks.push(task);

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

  return res.status(200).json({
    success: true,
    data: deletedTask
  });
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

app.resetTasks = resetTasks;

module.exports = app;
