pipeline {
  agent any

  environment {
    IMAGE_NAME = 'taskflow-app'
    IMAGE_TAG = "${env.BUILD_NUMBER}"
    EC2_USER = 'ubuntu'
    EC2_APP_DIR = '/opt/taskflow'
  }

  options {
    timestamps()
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install dependencies') {
      steps {
        sh 'docker build --target dependencies -t ${IMAGE_NAME}:deps .'
      }
    }

    stage('Run tests') {
      steps {
        sh 'docker build --target test -t ${IMAGE_NAME}:test .'
      }
    }

    stage('Build Docker image') {
      steps {
        sh 'docker build --target production -t ${IMAGE_NAME}:${IMAGE_TAG} -t ${IMAGE_NAME}:latest .'
      }
    }

    stage('Verify Docker image') {
      steps {
        sh '''
          docker image inspect ${IMAGE_NAME}:${IMAGE_TAG}
          docker images ${IMAGE_NAME}
          echo "Verified Docker image ${IMAGE_NAME}:${IMAGE_TAG}"
        '''
      }
    }

    stage('Deploy to EC2') {
      when {
        branch 'main'
      }
      steps {
        withCredentials([
          sshUserPrivateKey(
            credentialsId: 'ec2-ssh-key',
            keyFileVariable: 'EC2_KEY_FILE',
            usernameVariable: 'EC2_CREDENTIAL_USER'
          ),
          string(credentialsId: 'ec2-host', variable: 'EC2_HOST'),
          string(credentialsId: 'github-repository-url', variable: 'REPOSITORY_URL')
        ]) {
          sh '''
            set -eu
            remote_user="${EC2_CREDENTIAL_USER:-${EC2_USER}}"
            known_hosts_file="$(mktemp)"
            trap 'rm -f "${known_hosts_file}"' EXIT
            ssh-keyscan -H "${EC2_HOST}" > "${known_hosts_file}"
            ssh_options="-i ${EC2_KEY_FILE} -o BatchMode=yes -o UserKnownHostsFile=${known_hosts_file} -o StrictHostKeyChecking=yes"

            ssh ${ssh_options} "${remote_user}@${EC2_HOST}" \
              bash -s -- "${REPOSITORY_URL}" "${EC2_APP_DIR}" "${IMAGE_NAME}" <<'REMOTE_SCRIPT'
            set -eu
            REPOSITORY_URL="$1"
            APP_DIR="$2"
            IMAGE_NAME="$3"

            if [ ! -d "${APP_DIR}/.git" ]; then
              sudo mkdir -p "${APP_DIR}"
              sudo chown "$(id -u):$(id -g)" "${APP_DIR}"
              git clone "${REPOSITORY_URL}" "${APP_DIR}"
            fi

            cd "${APP_DIR}"
            git fetch origin main
            git reset --hard origin/main
            docker build --target production -t "${IMAGE_NAME}:latest" .
            docker rm -f "${IMAGE_NAME}" 2>/dev/null || true
            docker run -d --name "${IMAGE_NAME}" --restart unless-stopped -p 3000:3000 "${IMAGE_NAME}:latest"
            sleep 3
            curl --fail --silent --show-error http://127.0.0.1:3000/health
            REMOTE_SCRIPT
          '''
        }
      }
    }
  }

  post {
    success {
      echo 'Jenkins pipeline succeeded. Tests passed, the image was built, and main was deployed to EC2.'
    }
    failure {
      echo 'Jenkins pipeline failed. Open Console Output for the failed stage.'
    }
  }
}
