pipeline {
    agent any

    tools {
        nodejs 'NodeJS LTS'
    }

    environment {
        EC2_SERVER = '54.175.27.129'
        DEPLOY_USER = 'ubuntu'
        APP_DIR = '/home/ubuntu/order-service-ecommerce'
        APP_REPO_URL = 'https://github.com/donetrmteam/order-service-ecommerce.git'
        PORT_DEV = '3000'
        PORT_QA = '3001'
        PORT_MAIN = '3002'
    }

    stages {
        stage('Clone App Repo') {
            steps {
                script {
                    sh 'rm -rf app'
                    sh "git clone -b ${env.BRANCH_NAME} ${env.APP_REPO_URL} app"
                }
            }
        }

        stage('List Files') {
            steps {
                dir('app') {
                    sh 'ls -la'
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                dir('app') {
                    sh 'npm ci'
                }
            }
        }

        stage('Deploy') {
            steps {
                script {
                    def deployPort = ''
                    def serviceName = ''
                    def targetBranch = env.BRANCH_NAME

                    if (targetBranch == 'dev') {
                        deployPort = env.PORT_DEV
                        serviceName = 'user-service-dev'
                    } else if (targetBranch == 'qa') {
                        deployPort = env.PORT_QA
                        serviceName = 'user-service-qa'
                    } else if (targetBranch == 'main') {
                        deployPort = env.PORT_MAIN
                        serviceName = 'user-service-prod'
                    } else {
                        echo "No se desplegará la rama: ${targetBranch}"
                        return
                    }

                    withCredentials([sshUserPrivateKey(credentialsId: 'ssh-key-eu', keyFileVariable: 'SSH_KEY')]) {
                        sh """
                            ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no ${DEPLOY_USER}@${EC2_SERVER} '
                                # Actualizar repositorios
                                sudo apt update && sudo apt upgrade -y

                                # Instalar NVM si no existe
                                export NVM_DIR="\$HOME/.nvm"
                                if [ ! -d "\$NVM_DIR" ]; then
                                    echo "Instalando NVM..."
                                    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
                                fi

                                # Cargar NVM
                                [ -s "\$NVM_DIR/nvm.sh" ] && \\. "\$NVM_DIR/nvm.sh"
                                [ -s "\$NVM_DIR/bash_completion" ] && \\. "\$NVM_DIR/bash_completion"

                                # Instalar Node LTS
                                echo "Instalando Node.js LTS..."
                                nvm install --lts
                                nvm use --lts

                                # Verificar versiones
                                node --version
                                npm --version

                                # Instalar PM2 globalmente
                                npm install -g pm2
                                pm2 --version

                                # Instalar Git si no está presente
                                if ! command -v git &> /dev/null; then
                                    sudo apt install -y git
                                fi

                                # Crear directorio específico para la rama
                                APP_BRANCH_DIR="${APP_DIR}-${targetBranch}"
                                
                                # Clonar o actualizar repositorio
                                if [ ! -d \${APP_BRANCH_DIR} ]; then
                                    echo "Clonando repositorio..."
                                    git clone -b ${targetBranch} ${env.APP_REPO_URL} \${APP_BRANCH_DIR}
                                else
                                    echo "Actualizando repositorio..."
                                    cd \${APP_BRANCH_DIR}
                                    git fetch --all
                                    git checkout ${targetBranch}
                                    git pull origin ${targetBranch}
                                fi

                                # Cargar NVM en el entorno de ejecución
                                export NVM_DIR="\$HOME/.nvm"
                                [ -s "\$NVM_DIR/nvm.sh" ] && \\. "\$NVM_DIR/nvm.sh"
                                nvm use --lts

                                # Instalar dependencias
                                cd \${APP_BRANCH_DIR}
                                npm ci

                                # Compilar la aplicación NestJS
                                if grep -q "\\\"build\\\"" package.json; then
                                    echo "Ejecutando build..."
                                    npm run build
                                else
                                    echo "No hay script de build en package.json, omitiendo este paso"
                                fi

                                # Crear o actualizar archivo de configuración del entorno
                                echo "TCP_PORT=${deployPort}" > .env

                                # Reiniciar o iniciar con PM2
                                if pm2 list | grep -q "${serviceName}"; then
                                    echo "Reiniciando aplicación con PM2..."
                                    pm2 restart ${serviceName}
                                else
                                    echo "Iniciando aplicación con PM2 por primera vez..."
                                    pm2 start dist/main.js --name "${serviceName}" --env production
                                fi

                                # Guardar configuración de PM2
                                pm2 save
                            '
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            echo "Pipeline ejecutado con éxito!"
        }
        failure {
            echo "El pipeline ha fallado."
        }
    }
}