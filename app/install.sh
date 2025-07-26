#!/bin/bash

# DApp Frontend Installation Script

echo "🚀 Installing DApp Frontend Dependencies..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Check if IPFS is running
echo "🔍 Checking IPFS connection..."
curl -s http://localhost:5001/api/v0/version > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ IPFS is running"
else
    echo "⚠️  IPFS is not running. Please start IPFS daemon:"
    echo "   ipfs daemon"
fi

# Check if Ganache/Truffle is running
echo "🔍 Checking Ethereum network..."
curl -s http://localhost:8545 > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Ethereum network is accessible"
else
    echo "⚠️  Ethereum network is not accessible. Please start Ganache or your preferred network."
fi

echo ""
echo "🎉 Installation completed!"
echo ""
echo "📋 Next steps:"
echo "1. Start your Ethereum network (Ganache, etc.)"
echo "2. Start IPFS daemon: ipfs daemon"
echo "3. Deploy smart contracts: truffle migrate"
echo "4. Start the development server: npm run dev"
echo "5. Open http://localhost:8080 in your browser"
echo ""
echo "🔧 Available commands:"
echo "   npm run dev    - Start development server"
echo "   npm run build  - Build for production"
echo "" 