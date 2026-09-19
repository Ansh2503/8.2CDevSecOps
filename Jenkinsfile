pipeline {
    agent any

    environment {
        NODE_HOME = '/opt/homebrew/opt/node@18/bin'
        APP_NAME = 'nodejs-goof'
        IMAGE_NAME = 'nodejs-goof'
        TEST_CONTAINER = 'nodejs-goof-test'
        PROD_CONTAINER = 'nodejs-goof-production'
        TEST_PORT = '3001'
        PROD_PORT = '3000'
        RELEASE_VERSION = "1.0.${BUILD_NUMBER}"
    }

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {
        stage('Build') {
            steps {
                sh '''
                    export PATH="$NODE_HOME:$PATH"
                    node --version
                    npm --version
                    npm ci
                    npm pack
                    docker build -t "$IMAGE_NAME:$BUILD_NUMBER" .
                '''
                archiveArtifacts artifacts: '*.tgz', fingerprint: true
            }
        }

        stage('Test') {
            steps {
                sh '''
                    export PATH="$NODE_HOME:$PATH"
                    npm test
                '''
            }
            post {
                always {
                    junit testResults: 'test-results/**/*.xml', allowEmptyResults: true
                }
            }
        }

        stage('Code Quality') {
            steps {
                withSonarQubeEnv('SonarCloud') {
                    sh '''
                        export PATH="$NODE_HOME:$PATH"
                        npx sonar-scanner \
                          -Dsonar.projectKey=Ansh2503_8.2CDevSecOps \
                          -Dsonar.organization=ansh2503 \
                          -Dsonar.sources=. \
                          -Dsonar.exclusions=node_modules/**,test/**,coverage/**
                    '''
                }
            }
        }

        stage('Security') {
            steps {
                sh '''
                    export PATH="$NODE_HOME:$PATH"
                    mkdir -p reports
                    npm audit --json > reports/npm-audit.json || true
                    npm audit --audit-level=critical
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'reports/npm-audit.json', fingerprint: true
                }
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    docker rm -f "$TEST_CONTAINER" 2>/dev/null || true
                    docker run -d --name "$TEST_CONTAINER" \
                      -p "$TEST_PORT:3000" \
                      "$IMAGE_NAME:$BUILD_NUMBER"
                    sleep 10
                    curl --fail --retry 5 --retry-delay 3 "http://localhost:$TEST_PORT/"
                '''
            }
        }

        stage('Release') {
            steps {
                sh '''
                    docker tag "$IMAGE_NAME:$BUILD_NUMBER" "$IMAGE_NAME:$RELEASE_VERSION"
                    docker rm -f "$PROD_CONTAINER" 2>/dev/null || true
                    docker run -d --name "$PROD_CONTAINER" \
                      --restart unless-stopped \
                      -p "$PROD_PORT:3000" \
                      "$IMAGE_NAME:$RELEASE_VERSION"
                '''
            }
        }

        stage('Monitoring') {
            steps {
                sh '''
                    mkdir -p reports
                    curl --fail --max-time 10 "http://localhost:$PROD_PORT/"
                    docker stats "$PROD_CONTAINER" --no-stream > reports/container-monitoring.txt
                    cat reports/container-monitoring.txt
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'reports/container-monitoring.txt', fingerprint: true
                }
            }
        }
    }

    post {
        success {
            echo "All seven stages completed successfully. Released version ${RELEASE_VERSION}."
        }
        failure {
            echo 'Pipeline failed. Review the stage log and archived reports.'
        }
        cleanup {
            sh 'docker rm -f "$TEST_CONTAINER" 2>/dev/null || true'
        }
    }
}
