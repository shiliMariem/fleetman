pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/shiliMariem/fleetman.git'
            }
        }

        stage('Verify Kubernetes') {
            steps {
                sh 'kubectl get nodes'
                sh 'kubectl get pods'
            }
        }

        stage('Deploy Fleetman') {
            steps {
                sh 'kubectl apply -f fleetman-config.yaml'
                sh 'kubectl apply -f storage.yaml'
                sh 'kubectl apply -f mongo.yaml'
                sh 'kubectl apply -f mongo-service.yaml'
                sh 'kubectl apply -f position-tracker.yaml'
                sh 'kubectl apply -f api-gateway.yaml'
                sh 'kubectl apply -f webapp-deployment.yaml'
                sh 'kubectl apply -f webapp-service.yaml'
            }
        }

        stage('Verify Deployment') {
            steps {
                sh 'kubectl get pods'
                sh 'kubectl get services'
            }
        }
    }
}
