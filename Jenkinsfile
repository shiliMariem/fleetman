pipeline {
    agent any

    environment {
        KUBECONFIG = '/var/lib/jenkins/.kube/config'
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/shiliMariem/fleetman.git'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                script {
                    def scannerHome = tool 'SonarScanner'

                    withSonarQubeEnv('SonarQube') {
                        sh "${scannerHome}/bin/sonar-scanner"
                    }
                }
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
                sh 'kubectl apply -f queue.yaml'
                sh 'kubectl apply -f position-tracker.yaml'
                sh 'kubectl apply -f position-simulator.yaml'
                sh 'kubectl apply -f api-gateway.yaml'
                sh 'kubectl apply -f webapp-deployment.yaml'
                sh 'kubectl apply -f webapp-service.yaml'
                sh 'kubectl apply -f frontend/dashboard-deployment.yaml'
                sh 'kubectl apply -f frontend/dashboard-service.yaml'
            }
        }

        stage('Wait for Deployments') {
            steps {
                sh 'kubectl rollout status deployment/mongodb --timeout=180s'
                sh 'kubectl rollout status deployment/queue --timeout=180s'
                sh 'kubectl rollout status deployment/position-tracker --timeout=180s'
                sh 'kubectl rollout status deployment/position-simulator --timeout=180s'
                sh 'kubectl rollout status deployment/fleetman-api-gateway --timeout=180s'
                sh 'kubectl rollout status deployment/webapp --timeout=180s'
                sh 'kubectl rollout status deployment/fleetman-dashboard --timeout=180s'
            }
        }

        stage('Verify Deployment') {
            steps {
                sh 'kubectl get deployments'
                sh 'kubectl get pods -o wide'
                sh 'kubectl get services'
            }
        }
    }
}
