# Automated Web Application CI/CD Pipeline

TaskFlow is a simple task management web application built for the assigned project **Automated Web Application CI/CD Pipeline**.

## Tech stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express.js
- Version control: Git, GitHub
- CI/CD: GitHub Actions, Jenkins
- Containers: Docker, Docker Compose
- Deployment: AWS EC2 (next milestone)

## Features

- Add a task
- Display tasks
- Mark a task as completed
- Delete a task
- Responsive user interface
- REST API
- Health-check endpoint at `/health`

## Project structure

```text
automated-cicd-project/
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── tests/
│   └── app.test.js
├── .github/workflows/ci.yml
├── jenkins/
│   ├── Dockerfile
│   └── docker-compose.yml
├── server.js
├── package.json
├── Dockerfile
├── docker-compose.yml
├── Jenkinsfile
├── .gitignore
├── .dockerignore
└── README.md
```

## Run locally

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Run tests

```bash
npm test
```

## Docker

```bash
docker build -t taskflow-app:latest .
docker run -d --name taskflow-app -p 3000:3000 taskflow-app:latest
```

## Docker Compose

```bash
docker compose up -d
```

## GitHub Actions

The workflow in `.github/workflows/ci.yml` runs on every push to `main`. It installs dependencies, runs tests, and builds the Docker image.

## Jenkins

Run Jenkins locally with Docker:

```bash
cd jenkins
docker compose up -d --build
```

Then open [http://localhost:8080](http://localhost:8080).

## API endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Application health check |
| GET | `/api/tasks` | List all tasks |
| POST | `/api/tasks` | Create a task |
| PATCH | `/api/tasks/:id` | Update or complete a task |
| DELETE | `/api/tasks/:id` | Delete a task |
