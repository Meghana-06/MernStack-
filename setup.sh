#!/bin/bash

echo "🚀 Setting up Event Analytics Dashboard..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if MongoDB is running
if ! command -v mongosh &> /dev/null; then
    echo "⚠️  MongoDB is not installed locally. You can use Docker instead."
    echo "   Run: docker run -d -p 27017:27017 --name mongodb mongo:6.0"
else
    echo "✅ MongoDB found"
fi

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Create environment file
echo "🔧 Setting up environment variables..."
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env file"
    echo "   Please edit backend/.env with your configuration"
else
    echo "✅ backend/.env already exists"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs
mkdir -p uploads

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with your configuration"
echo "2. Start MongoDB (local or Docker)"
echo "3. Seed the database: cd backend && npm run seed"
echo "4. Start the application: npm run dev"
echo ""
echo "Demo accounts will be available after seeding:"
echo "- Admin: admin@eventanalytics.com / admin123"
echo "- Host: host1@eventanalytics.com / host123"
echo ""
echo "Happy coding! 🚀"