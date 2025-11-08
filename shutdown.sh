#!/bin/bash

# CodeCollab Platform - Shutdown Script
# Stops all services gracefully

echo "🛑 Stopping CodeCollab Platform..."
echo ""

cd "$(dirname "$0")"

# Stop frontend
echo "📱 Stopping Frontend..."
pkill -f "vite" 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Stop execution service
echo "⚙️  Stopping Execution Service..."
pkill -9 execution-service 2>/dev/null || true

# Stop Docker services
echo "🐳 Stopping Docker services..."
docker-compose down

echo ""
echo "✅ All services stopped"
echo ""
