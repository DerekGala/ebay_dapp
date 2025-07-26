@echo off
REM DApp Frontend Installation Script for Windows

echo 🚀 Installing DApp Frontend Dependencies...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ Node.js and npm are installed

REM Install dependencies
echo 📦 Installing npm dependencies...
npm install

if %errorlevel% equ 0 (
    echo ✅ Dependencies installed successfully
) else (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo 🎉 Installation completed!
echo.
echo 📋 Next steps:
echo 1. Start your Ethereum network (Ganache, etc.)
echo 2. Start IPFS daemon: ipfs daemon
echo 3. Deploy smart contracts: truffle migrate
echo 4. Start the development server: npm run dev
echo 5. Open http://localhost:8080 in your browser
echo.
echo 🔧 Available commands:
echo    npm run dev    - Start development server
echo    npm run build  - Build for production
echo.
pause 