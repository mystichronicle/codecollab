#!/bin/bash

# Stop all services

echo "🛑 Stopping CodeCollab services..."

docker compose down

echo "✅ All services stopped"
