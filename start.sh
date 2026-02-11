#!/bin/bash
# Start Budget Dashboard - Local Development

echo "🚀 Starting Budget Dashboard..."
echo ""

# Start Backend
echo "📦 Starting Backend (Spring Boot)..."
cd "$(dirname "$0")/backend"
mvn package -DskipTests -q
java -jar target/budget-backend-0.0.1-SNAPSHOT.jar &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to start
echo "   Waiting for backend to initialize..."
sleep 8

# Start Frontend
echo ""
echo "🎨 Starting Frontend (React)..."
cd ../frontend
npm start &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

echo ""
echo "✅ Budget Dashboard is starting!"
echo ""
echo "   📊 Dashboard: http://localhost:3000"
echo "   🔌 Backend API: http://localhost:8080"
echo "   💾 H2 Console: http://localhost:8080/h2-console"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
