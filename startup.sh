#!/bin/bash

# CodeCollab Platform - Startup Script
# Starts all services (backend + frontend)

set -e

echo "🚀 Starting CodeCollab Platform..."
echo ""

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker first."
    exit 1
fi

cd "$(dirname "$0")"

# Start all Docker services
echo "📦 Starting infrastructure..."
docker compose up -d postgres redis mongodb rabbitmq
sleep 5

echo "🔧 Starting application services..."
docker compose up -d api-gateway collab-service execution-service

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 3

# Check service health
echo "🏥 Health Check:"
for i in {1..5}; do
    if curl -s http://localhost:8000/api/v1/health > /dev/null 2>&1; then
        echo "   ✓ API Gateway is healthy"
        break
    fi
    if [ $i -eq 5 ]; then
        echo "   ⚠ API Gateway not responding"
    fi
    sleep 1
done

if curl -s http://localhost:8004/health > /dev/null 2>&1; then
    echo "   ✓ Execution Service is healthy"
else
    echo "   ⚠ Execution Service not responding"
fi

if curl -s http://localhost:8002/ > /dev/null 2>&1; then
    echo "   ✓ Collab Service is running"
else
    echo "   ⚠ Collab Service not responding"
fi

# Start frontend
echo "🎨 Starting Frontend..."
cd services/frontend
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "   Installing dependencies..."
    export NVM_DIR="$HOME/.config/nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm use 22 > /dev/null 2>&1
    npm install
fi

# Start dev server in background
export NVM_DIR="$HOME/.config/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 22 > /dev/null 2>&1
nohup npm run dev > frontend.log 2>&1 &
cd ../..

sleep 3

echo ""
echo "✅ CodeCollab is ready!"
echo ""
echo "📍 Access:"
echo "   Frontend:      http://localhost:3000"
echo "   API Gateway:   http://localhost:8000"
echo "   API Docs:      http://localhost:8000/docs"
echo "   Health Check:  http://localhost:8000/api/v1/health"
echo "   Collab WS:     ws://localhost:8002"
echo "   Execution:     http://localhost:8004"
echo ""
echo "🔐 Default Login:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "📝 Commands:"
echo "   View logs:  docker compose logs -f"
echo "   Stop all:   ./shutdown.sh"
echo ""
