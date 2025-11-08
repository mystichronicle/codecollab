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

# Start infrastructure
echo "📦 Starting infrastructure..."
docker-compose up -d postgres redis mongodb rabbitmq
sleep 5

# Start application services
echo "🔧 Starting application services..."
docker-compose up -d api-gateway collab-service

# Start execution service (Rust)
echo "⚙️  Starting Execution Service..."
cd services/execution-service
pkill -9 execution-service 2>/dev/null || true
if [ -f "target/release/execution-service" ]; then
    nohup ./target/release/execution-service > execution.log 2>&1 &
    echo "   ✓ Execution Service started"
else
    echo "   ⚠ Binary not found. Run: cargo build --release"
fi
cd ../..

# Start frontend
echo "🎨 Starting Frontend..."
cd services/frontend
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

if [ ! -d "node_modules" ]; then
    echo "   Installing dependencies..."
    npm install
fi

npm run dev > /dev/null 2>&1 &
cd ../..

sleep 3

echo ""
echo "✅ CodeCollab is ready!"
echo ""
echo "📍 Access:"
echo "   Frontend:   http://localhost:5173"
echo "   API Docs:   http://localhost:8000/docs"
echo "   Health:     http://localhost:8000/api/v1/health"
echo ""
echo "🔐 Default Login:"
echo "   Email:    admin@codecollab.dev"
echo "   Password: admin123"
echo ""
echo "📝 Stop: ./shutdown.sh"
echo ""
