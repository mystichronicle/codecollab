#!/bin/bash

# Setup script for CodeCollab project

set -e

echo "🚀 Setting up CodeCollab development environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOL
# Environment Configuration
ENVIRONMENT=development

# Database
POSTGRES_USER=codecollab
POSTGRES_PASSWORD=dev_password_change_in_prod
POSTGRES_DB=codecollab

# Security
SECRET_KEY=dev_secret_key_change_in_prod
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Redis
REDIS_PASSWORD=

# MongoDB
MONGO_INITDB_ROOT_USERNAME=codecollab
MONGO_INITDB_ROOT_PASSWORD=dev_password_change_in_prod

# RabbitMQ
RABBITMQ_DEFAULT_USER=codecollab
RABBITMQ_DEFAULT_PASS=dev_password_change_in_prod
EOL
    echo "✅ Created .env file"
else
    echo "✅ .env file already exists"
fi

# Initialize database scripts directory
mkdir -p infrastructure/init-db

# Create database initialization script
cat > infrastructure/init-db/01-init.sql << 'EOL'
-- Initialize databases
CREATE DATABASE IF NOT EXISTS codecollab;

-- Create extensions
\c codecollab;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    language VARCHAR(50) NOT NULL,
    description TEXT,
    owner_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_owner ON sessions(owner_id);

-- Insert a test user (password: 'password123' - hashed)
INSERT INTO users (username, email, password_hash, full_name)
VALUES ('testuser', 'test@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5RU5sYX7s0tSe', 'Test User')
ON CONFLICT DO NOTHING;
EOL

echo "✅ Created database initialization script"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Build and start services: docker-compose up --build"
echo "  2. Access the application:"
echo "     - Frontend: http://localhost:3000"
echo "     - API Gateway: http://localhost:8000"
echo "     - API Docs: http://localhost:8000/docs"
echo "     - RabbitMQ Management: http://localhost:15672 (user: codecollab, pass: dev_password_change_in_prod)"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop services: docker-compose down"
echo "  - Rebuild: docker-compose up --build"
echo ""
