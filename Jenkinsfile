pipeline {
  agent any

  environment {
    IMAGE_NAME = 'taskflow-app'
    IMAGE_TAG = "${env.BUILD_NUMBER}"
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
  }

  post {
    success {
      echo 'Jenkins pipeline succeeded. Tests passed and the Docker image was built.'
    }
    failure {
      echo 'Jenkins pipeline failed. Open Console Output for the failed stage.'
    }
  }
}
