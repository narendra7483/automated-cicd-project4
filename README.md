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

## AWS EC2 deployment

Create an **Ubuntu Server 24.04 LTS** EC2 instance. A `t3.micro` is suitable for a demonstration when available; use at least 8 GiB gp3 storage. Allow SSH TCP 22 from **My IP** only and application TCP 3000 for a public demo. Do not expose Jenkins port 8080 publicly.

From the Mac Terminal:

```bash
chmod 400 ~/Downloads/YOUR_KEY.pem
ssh -i ~/Downloads/YOUR_KEY.pem ubuntu@EC2_PUBLIC_IP
```

Run on the EC2 server:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc >/dev/null
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
newgrp docker
docker --version
docker compose version
```

Deploy on EC2:

```bash
sudo mkdir -p /opt/taskflow
sudo chown "$USER:$USER" /opt/taskflow
git clone https://github.com/GITHUB_USERNAME/automated-cicd-project.git /opt/taskflow
cd /opt/taskflow
git fetch origin main
git reset --hard origin/main
docker build --target production -t taskflow-app:latest .
docker rm -f taskflow-app 2>/dev/null || true
docker run -d --name taskflow-app --restart unless-stopped -p 3000:3000 taskflow-app:latest
curl http://127.0.0.1:3000/health
```

Replace `YOUR_KEY.pem`, `GITHUB_USERNAME`, and `EC2_PUBLIC_IP`. Open `http://EC2_PUBLIC_IP:3000` in a browser.

## Jenkins continuous deployment

Start Jenkins locally from the project root:

```bash
docker compose -f jenkins/docker-compose.yml up -d --build
```

Create a Pipeline job using **Pipeline script from SCM**, Git, branch `main`, and script path `Jenkinsfile`.

Add these Jenkins credentials. Keep private keys and passwords in Jenkins Credentials, never in GitHub:

- `ec2-ssh-key`: SSH Username with private key, using EC2 user `ubuntu` and the `.pem` key
- `ec2-host`: Secret text containing the EC2 public IPv4 address or DNS name
- `github-repository-url`: Secret text containing the public HTTPS GitHub repository URL

The Jenkinsfile tests and builds the image, then on `main` connects to EC2 over SSH, fetches the latest commit, replaces the old container, and verifies `/health`.

## CI/CD workflow

```text
Developer -> GitHub -> GitHub Actions -> Tests -> Docker Build
									  -> Jenkins -> SSH -> EC2 -> Docker Container
```

## End-to-end test

1. Change a visible string in `public/index.html`.
2. Run `npm test`.
3. Commit and push: `git add . && git commit -m "Verify deployment pipeline" && git push`.
4. Confirm GitHub Actions is green and includes tests and Docker build.
5. Confirm Jenkins deploys EC2 and reports a successful health check.
6. Open `http://EC2_PUBLIC_IP:3000` and confirm the changed text appears.
7. Capture screenshots of the GitHub commit, Actions run, Jenkins stages, EC2 instance, running container, and live page.

## Troubleshooting

| Problem | Diagnosis | Solution |
| --- | --- | --- |
| Node or npm error | `node --version`, `npm ci` | Install Node.js 22 LTS and rerun `npm ci`. |
| Tests fail | `npm test` | Read the first failing test and reproduce it locally. |
| Docker daemon error | `docker info` | Start Docker Desktop and retry. |
| Compose unavailable | `docker compose version` | Install or update Docker Desktop with Compose v2. |
| Port 3000 busy | `lsof -nP -iTCP:3000 -sTCP:LISTEN` | Stop the conflicting process or change the host port. |
| Container stops | `docker logs taskflow-app` | Fix the startup error and rebuild the image. |
| Actions fails | GitHub Actions job log | Reproduce with `npm ci`, `npm test`, or `docker build`. |
| Jenkins permission error | Jenkins Console Output | Check Docker socket access and credential IDs. |
| EC2 SSH error | `ssh -i KEY ubuntu@EC2_PUBLIC_IP` | Check key mode, user, IP, route, and security group port 22. |
| App inaccessible | EC2: `docker ps`, `curl localhost:3000/health` | Check the container and security group TCP 3000. |
| Jenkins cannot reach EC2 | Jenkins Console Output | Check all three credential IDs and EC2 SSH access. |
| GitHub push error | `git remote -v`, `git push` | Use a GitHub token for HTTPS or configure SSH authentication. |

## Submission checklist

- GitHub repository and complete source code
- `Dockerfile`, Docker Compose files, workflow, and `Jenkinsfile`
- Final `README.md`
- Live EC2 URL: `http://EC2_PUBLIC_IP:3000`
- AWS EC2 and security group screenshots
- Passing GitHub Actions screenshot
- Passing Jenkins stages and console output screenshot
- Running EC2 container screenshot
- Live application screenshot showing the final change

## Future improvements

- Persist tasks in a database or managed storage service.
- Add HTTPS, monitoring, rollback, image scanning, and least-privilege deployment credentials.
