const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../server");

test.beforeEach(() => {
  app.resetTasks();
});

test("GET /health returns a healthy status", async () => {
  const response = await request(app).get("/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
  assert.equal(response.body.message, "Task Manager API is healthy");
  assert.ok(response.body.timestamp);
});

test("GET / returns the frontend HTML", async () => {
  const response = await request(app).get("/");

  assert.equal(response.status, 200);
  assert.match(response.headers["content-type"], /html/);
  assert.match(response.text, /TaskFlow/);
});

test("GET /api/tasks returns an empty list initially", async () => {
  const response = await request(app).get("/api/tasks");

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.count, 0);
  assert.deepEqual(response.body.data, []);
});

test("POST /api/tasks creates a new task", async () => {
  const response = await request(app)
    .post("/api/tasks")
    .send({ title: "Write CI/CD notes" });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.title, "Write CI/CD notes");
  assert.equal(response.body.data.completed, false);
  assert.equal(response.body.data.id, 1);
});

test("POST /api/tasks rejects an empty title", async () => {
  const response = await request(app).post("/api/tasks").send({ title: "   " });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error, "Task title is required");
});

test("PATCH /api/tasks/:id marks a task as completed", async () => {
  const created = await request(app)
    .post("/api/tasks")
    .send({ title: "Run automated tests" });

  const response = await request(app)
    .patch(`/api/tasks/${created.body.data.id}`)
    .send({ completed: true });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.completed, true);
});

test("DELETE /api/tasks/:id removes a task", async () => {
  const created = await request(app)
    .post("/api/tasks")
    .send({ title: "Delete this task" });

  const response = await request(app).delete(
    `/api/tasks/${created.body.data.id}`
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);

  const list = await request(app).get("/api/tasks");
  assert.equal(list.body.count, 0);
});

test("PATCH /api/tasks/:id returns 404 for a missing task", async () => {
  const response = await request(app)
    .patch("/api/tasks/99")
    .send({ completed: true });

  assert.equal(response.status, 404);
  assert.equal(response.body.error, "Task not found");
});

test("POST /api/tasks stores workflow metadata", async () => {
  const response = await request(app)
    .post("/api/tasks")
    .send({
      title: "Validate checkout flow",
      priority: "high",
      status: "progress",
      assignee: "Asha",
      category: "Engineering",
      dueDate: "2026-10-01"
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.data.priority, "high");
  assert.equal(response.body.data.status, "progress");
  assert.equal(response.body.data.assignee, "Asha");
  assert.equal(response.body.data.category, "Engineering");
  assert.equal(response.body.data.dueDate, "2026-10-01");
});

test("GET /api/stats reports completion progress", async () => {
  await request(app).post("/api/tasks").send({ title: "Ship release" });
  const second = await request(app).post("/api/tasks").send({ title: "Write notes" });
  await request(app).patch(`/api/tasks/${second.body.data.id}`).send({ status: "done" });

  const response = await request(app).get("/api/stats");

  assert.equal(response.status, 200);
  assert.equal(response.body.data.total, 2);
  assert.equal(response.body.data.completed, 1);
  assert.equal(response.body.data.completionRate, 50);
});

test("deleted tasks remain available in the archive and activity feed", async () => {
  const created = await request(app)
    .post("/api/tasks")
    .send({ title: "Archive release notes" });

  await request(app).delete(`/api/tasks/${created.body.data.id}`);
  const archive = await request(app).get("/api/archive");
  const activity = await request(app).get("/api/activity");

  assert.equal(archive.body.count, 1);
  assert.equal(archive.body.data[0].title, "Archive release notes");
  assert.equal(activity.body.data[0].type, "archived");
});

test("tasks support comments, attachments, notifications, and CSV export", async () => {
  const created = await request(app)
    .post("/api/tasks")
    .send({ title: "Prepare release demo" });

  const comment = await request(app)
    .post(`/api/tasks/${created.body.data.id}/comments`)
    .send({ text: "Please include the deployment screenshot." });
  const attachment = await request(app)
    .post(`/api/tasks/${created.body.data.id}/attachments`)
    .send({ name: "release-checklist.pdf" });
  const notifications = await request(app).get("/api/notifications");
  const csv = await request(app).get("/api/export.csv");

  assert.equal(comment.status, 201);
  assert.equal(attachment.status, 201);
  assert.match(notifications.body.data[0].message, /release-checklist/);
  assert.match(csv.text, /Prepare release demo/);
  assert.match(csv.headers["content-type"], /text\/csv/);
});
