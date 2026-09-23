# Automated Web Application CI/CD Pipeline

TaskFlow is a Node.js and Express task-management web application delivered through an automated CI/CD pipeline. A push to GitHub triggers tests and a Docker build in GitHub Actions. Jenkins builds the same image and deploys the latest `main` commit to AWS EC2 over SSH.

## Objective

Demonstrate a complete delivery path using HTML, CSS, JavaScript, Node.js, Express.js, Git, GitHub, GitHub Actions, Jenkins, Docker, Docker Compose, and AWS EC2.

## Features

- Create, list, complete, edit, and archive tasks
- Workflow statuses: To do, In progress, In review, and Completed
- Priority, owner, category, and due-date metadata
- Workspace metrics, completion progress, overdue indicators, search, and status filters
- Activity feed, archive history, delete confirmation, toast feedback, dark mode, and responsive motion
- Responsive frontend and JSON REST API
- `/health` endpoint
- Automated Node.js tests
- Multi-stage production Docker image
- GitHub Actions CI and Jenkins-to-EC2 continuous deployment

## Architecture

```text
Developer -> GitHub -> GitHub Actions -> Tests -> Docker Build
                              |
                              v
                         Jenkins -> SSH -> AWS EC2 -> Docker Container -> Live App
```

## Repository structure

```text
.
├── public/                  # Browser UI
├── tests/                   # Node test runner and Supertest tests
├── .github/workflows/ci.yml # GitHub Actions CI
├── jenkins/                 # Local Jenkins image and Compose file
├── server.js                # Express API and static-file server
├── package.json             # Scripts and dependencies
├── Dockerfile               # dependencies, test, and production stages
├── docker-compose.yml       # Local/EC2 application service
├── Jenkinsfile              # Build, test, and EC2 deployment pipeline
└── README.md
```

## Local setup

Run in the VS Code terminal or Mac Terminal from the project root:

```bash
npm ci
npm test
npm start
```

Open `http://localhost:3000`. Verify with `curl http://localhost:3000/health`.

## Git and GitHub setup

Run on the Mac after creating the GitHub repository:

```bash
git init
git branch -M main
git remote add origin https://github.com/GITHUB_USERNAME/automated-cicd-project.git
git add .
git commit -m "Complete automated CI/CD pipeline"
git push -u origin main
```

Use GitHub authentication when prompted. Never commit `.pem` files, passwords, tokens, or Jenkins secrets.

## Docker

The `Dockerfile` has `dependencies`, `test`, and `production` stages. The production image contains only production dependencies and runs as an unprivileged user.

Run on a machine with Docker:

```bash
docker build --target production -t taskflow-app:latest .
docker run -d --name taskflow-app --restart unless-stopped -p 3000:3000 taskflow-app:latest
curl http://localhost:3000/health
docker logs taskflow-app
docker rm -f taskflow-app
```

## Docker Compose

Run from the project root:

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f web
docker compose down
```

Compose publishes port `3000` and includes a container health check.

## GitHub Actions

`.github/workflows/ci.yml` runs on pushes to `main` and manual dispatch. It checks out the code, installs Node.js 22 dependencies with `npm ci`, runs `npm test`, and builds the Docker image. Results appear in the repository's **Actions** tab.

## Jenkins

Start local Jenkins from the VS Code terminal:

```bash
docker compose -f jenkins/docker-compose.yml up -d --build
docker compose -f jenkins/docker-compose.yml ps
```

Open `http://localhost:8080`. Create a Pipeline job using **Pipeline script from SCM**, the GitHub repository URL, branch `main`, and script path `Jenkinsfile`. Do not expose port 8080 publicly.

### Jenkins credentials

Create these under **Manage Jenkins > Credentials**:

| ID | Type | Value |
| --- | --- | --- |
| `ec2-ssh-key` | SSH Username with private key | Username `ubuntu` and EC2 private key contents |
| `ec2-host` | Secret text | EC2 public IPv4 address or DNS name |
| `github-repository-url` | Secret text | Public HTTPS GitHub repository URL |

The private key stays in Jenkins Credentials and is never stored in GitHub. The pipeline uses `ssh-keyscan` and a temporary known-hosts file with strict host verification. For a private GitHub repository, configure a Jenkins SSH key or GitHub token in Jenkins, not in the `Jenkinsfile`.

## AWS EC2 setup

These steps require an AWS account. AWS Console actions are labeled separately from shell commands.

1. **AWS Console:** Launch **Ubuntu Server 24.04 LTS**, 64-bit x86. A `t3.micro` is suitable for a demonstration. Use at least an 8 GiB gp3 root volume.
2. **AWS Console:** Create/download an EC2 key pair. Create a security group with inbound TCP `22` from **My IP** only and TCP `3000` from the audience that needs the demo. Keep TCP `8080` closed. Allow outbound traffic for package updates.
3. **Mac Terminal:** protect the key and connect, replacing placeholders.

```bash
chmod 400 ~/Downloads/YOUR_KEY.pem
ssh -i ~/Downloads/YOUR_KEY.pem ubuntu@EC2_PUBLIC_IP
```

4. **EC2 server:** install Docker Engine, Compose, Git, and curl.

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
newgrp docker
docker --version
docker compose version
```

Compose is included as the `docker compose` plugin; no legacy `docker-compose` binary is required.

## Manual EC2 deployment

Run on the **EC2 server**. The clone URL must match the public repository URL.

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
curl --fail http://127.0.0.1:3000/health
docker ps
```

From a browser, open `http://EC2_PUBLIC_IP:3000`. If it fails, check the security group, instance public IP, and `docker logs taskflow-app`.

## Jenkins continuous deployment

The `Jenkinsfile` runs checkout, dependency-image build, tests, production-image build, and image verification. On `main` only, it connects to EC2, clones or updates `/opt/taskflow`, builds the latest source, replaces the old container, and verifies `/health`.

Jenkins needs Docker access and outbound SSH access. The EC2 security group must allow TCP 22 from the Jenkins machine's public IP, which may differ from your laptop.

## End-to-end test and evidence

1. **Mac:** change a visible string in `public/index.html`, run `npm test`, then `git add . && git commit -m "Verify deployment pipeline" && git push origin main`.
2. **GitHub:** confirm Actions is green, including tests and Docker build.
3. **Jenkins:** confirm all stages are green and the EC2 deployment log contains a successful `/health` response.
4. **Browser:** open `http://EC2_PUBLIC_IP:3000` and confirm the changed string is live.
5. **EC2 server:** run `docker ps`, `docker image ls taskflow-app`, and `curl http://127.0.0.1:3000/health`.

This proves CI because GitHub Actions tested and built the pushed commit, and proves CD because Jenkins deployed that commit to EC2 and the live page shows the change.

## Troubleshooting

| Problem | Diagnosis | Solution |
| --- | --- | --- |
| Node/npm error | `node --version`, `npm --version`, `npm ci` | Install Node.js 22 LTS and rerun `npm ci` |
| Tests fail | `npm test` | Fix the first failing test and rerun it |
| Docker daemon error | `docker info` | Start Docker Desktop or `sudo systemctl start docker` on EC2 |
| Compose error | `docker compose version` | Install the Docker Compose v2 plugin |
| Port 3000 conflict | `lsof -nP -iTCP:3000 -sTCP:LISTEN` | Stop the process or change the host mapping |
| Container stops | `docker ps -a`; `docker logs taskflow-app` | Fix the startup error, rebuild, and recreate |
| Actions failure | GitHub Actions job log | Reproduce with `npm ci`, `npm test`, and `docker build .` |
| Jenkins Docker problem | `docker info`; `docker logs jenkins` | Mount the Docker socket and provide Docker CLI access |
| EC2 SSH failure | `ssh -vvv -i KEY ubuntu@EC2_PUBLIC_IP` | Check key mode, username, IP, route, and TCP 22 |
| Jenkins cannot reach EC2 | Jenkins Console Output and SSH test | Allow TCP 22 from Jenkins's public IP; verify credentials |
| App inaccessible | EC2: `curl http://127.0.0.1:3000/health` | Allow TCP 3000 in the security group and check port mapping |
| GitHub auth failure | `git remote -v`; `git ls-remote origin` | Use a token or SSH deploy key, never source-controlled secrets |

## Final submission checklist

- GitHub repository and source code
- `Dockerfile`, both Compose files, workflow, and `Jenkinsfile`
- This `README.md`
- Live URL: `http://EC2_PUBLIC_IP:3000`
- GitHub commit and repository screenshot
- Green GitHub Actions tests/build screenshot
- Jenkins stage view and successful console output screenshot
- EC2 instance, security group, and `docker ps` screenshots
- Live application screenshot showing the final visible change
- `/health` output showing `status: ok`

## Current verification and future improvements

The local suite contains 8 passing tests. GitHub push, EC2 deployment, and an external Jenkins job require your repository, AWS account, and credentials. Future improvements include database persistence, HTTPS, monitoring, image scanning, backups, rollback, and least-privilege IAM.
