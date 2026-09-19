pipeline {
    agent any

    environment {
        NODE_HOME = '/opt/homebrew/opt/node@18/bin'
        PATH = '/opt/homebrew/opt/node@18/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin'
        IMAGE_NAME = 'nodejs-goof'
        TEST_CONTAINER = 'nodejs-goof-test'
        TEST_DATABASE = 'nodejs-goof-test-mongo'
        TEST_NETWORK = 'nodejs-goof-test-network'
        PROD_CONTAINER = 'nodejs-goof-production'
        PROD_DATABASE = 'nodejs-goof-production-mongo'
        PROD_NETWORK = 'nodejs-goof-production-network'
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
                    node --check app.js
                    node tests/pipeline-smoke-test.js
                '''
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
                          -Dsonar.exclusions=node_modules/**,tests/**,coverage/**
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
                    node -e "const r=require('./reports/npm-audit.json'); const v=r.metadata.vulnerabilities; console.log('Security findings:', JSON.stringify(v)); console.log('Known vulnerable training application: findings recorded for review and mitigation.');"
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'reports/npm-audit.json',
                                     fingerprint: true
                }
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    docker rm -f "$TEST_CONTAINER" "$TEST_DATABASE" 2>/dev/null || true
                    docker network rm "$TEST_NETWORK" 2>/dev/null || true
                    docker network create "$TEST_NETWORK"

                    docker run -d \
                      --name "$TEST_DATABASE" \
                      --network "$TEST_NETWORK" \
                      --network-alias goof-mongo \
                      mongo:3

                    docker run -d \
                      --name "$TEST_CONTAINER" \
                      --network "$TEST_NETWORK" \
                      -e DOCKER=1 \
                      -p "$TEST_PORT:3001" \
                      "$IMAGE_NAME:$BUILD_NUMBER"

                    sleep 15
                    curl --fail --retry 5 --retry-delay 3 \
                      "http://localhost:$TEST_PORT/"
                '''
            }
        }

        stage('Release') {
            steps {
                sh '''
                    docker tag "$IMAGE_NAME:$BUILD_NUMBER" \
                      "$IMAGE_NAME:$RELEASE_VERSION"

                    docker rm -f "$PROD_CONTAINER" "$PROD_DATABASE" 2>/dev/null || true
                    docker network rm "$PROD_NETWORK" 2>/dev/null || true
                    docker network create "$PROD_NETWORK"

                    docker run -d \
                      --name "$PROD_DATABASE" \
                      --network "$PROD_NETWORK" \
                      --network-alias goof-mongo \
                      --restart unless-stopped \
                      mongo:3

                    docker run -d \
                      --name "$PROD_CONTAINER" \
                      --network "$PROD_NETWORK" \
                      -e DOCKER=1 \
                      --restart unless-stopped \
                      -p "$PROD_PORT:3001" \
                      "$IMAGE_NAME:$RELEASE_VERSION"

                    sleep 15
                    curl --fail --retry 5 --retry-delay 3 \
                      "http://localhost:$PROD_PORT/"
                '''
            }
        }

        stage('Monitoring') {
            steps {
                sh '''
                    mkdir -p reports
                    curl --fail --max-time 10 \
                      "http://localhost:$PROD_PORT/"
                    docker stats "$PROD_CONTAINER" --no-stream \
                      > reports/container-monitoring.txt
                    cat reports/container-monitoring.txt
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'reports/container-monitoring.txt',
                                     fingerprint: true
                }
            }
        }
    }

    post {
        success {
            echo "All seven stages completed successfully."
        }

        failure {
            echo "Pipeline failed. Review the failed stage log."
        }

        cleanup {
            sh '''
                docker rm -f "$TEST_CONTAINER" "$TEST_DATABASE" 2>/dev/null || true
                docker network rm "$TEST_NETWORK" 2>/dev/null || true
            '''
        }
    }
}
