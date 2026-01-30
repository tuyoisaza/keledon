@echo off
setlocal enabledelayedexpansion

echo "🔨 KELEDON Development Build Script"
echo "=================================="

:: Check if we're in right directory
if not exist "cloud\package.json" (
    echo "❌ Error: Please run this from C:\KELEDON root directory"
    echo "   Expected to find cloud\package.json"
    pause
    exit /b 1
)

echo.
echo "📦 Found KELEDON project structure:"
if exist "cloud" echo "   ✅ cloud/ - Backend (NestJS)"
if exist "landing" echo "   ✅ landing/ - Frontend (React)"
if exist "agent" echo "   ✅ agent/ - Chrome Extension"
if exist "contracts" echo "   ✅ contracts/ - Schemas & Types"

echo.
echo "🔧 Dependency Analysis and Installation..."

:: Clean all node_modules for fresh install
echo "🧹 Cleaning existing dependencies..."
if exist "cloud\node_modules" rmdir /s /q "cloud\node_modules"
if exist "landing\node_modules" rmdir /s /q "landing\node_modules"
if exist "agent\node_modules" rmdir /s /q "agent\node_modules"

:: Install backend dependencies
echo "📦 Installing cloud backend dependencies..."
cd cloud
npm install --progress=false
if !errorlevel! neq 0 (
    echo "❌ Failed to install cloud dependencies"
    pause
    exit /b 1
)
echo "✅ Cloud dependencies installed successfully"
cd ..

:: Install frontend dependencies
echo "📦 Installing landing frontend dependencies..."
cd landing
npm install --progress=false
if !errorlevel! neq 0 (
    echo "❌ Failed to install landing dependencies"
    pause
    exit /b 1
)
echo "✅ Landing dependencies installed successfully"
cd ..

:: Install agent dependencies
echo "📦 Installing agent Chrome extension dependencies..."
cd agent
npm install --progress=false
if !errorlevel! neq 0 (
    echo "❌ Failed to install agent dependencies"
    pause
    exit /b 1
)
echo "✅ Agent dependencies installed successfully"
cd ..

echo.
echo "🏗 Building all KELEDON components..."

:: Build backend
echo "🔨 Building backend (NestJS)..."
cd cloud
call npm run build
if !errorlevel! neq 0 (
    echo "❌ Backend build failed"
    echo "   Check the error messages above for details"
    echo "   Common issues:"
    echo "     - TypeScript errors in src/ files"
    echo "     - Missing dependencies"
    echo "     - Configuration issues"
    echo "   Trying to resolve..."
    cd ..
    goto :check_backend_build
)
echo "✅ Backend built successfully"
cd ..

:: Build frontend
echo "🎨 Building frontend (React)..."
cd landing
call npm run build
if !errorlevel! neq 0 (
    echo "❌ Frontend build failed"
    echo "   Check the error messages above for details"
    echo "   Common issues:"
    echo "     - TypeScript errors in src/ files"
    echo "     - Missing dependencies"
    echo "     - React component issues"
    echo "   Trying to resolve..."
    cd ..
    goto :check_frontend_build
)
echo "✅ Frontend built successfully"
cd ..

:: Build agent
echo "🔧 Building Chrome extension..."
cd agent
call npm run build
if !errorlevel! neq 0 (
    echo "❌ Agent build failed"
    echo "   Check the error messages above for details"
    echo "   Common issues:"
    echo "     - Manifest.json syntax errors"
    echo "     - JavaScript syntax errors"
    echo "     - Missing required files"
    echo "   Trying to resolve..."
    cd ..
    goto :check_agent_build
)
echo "✅ Chrome extension built successfully"
cd ..

:: Verification checks
echo "✅ All components built successfully!"
echo.
echo "🔍 Verifying build outputs..."

:check_backend_build
if exist "cloud\dist\node_modules" (
    echo "❌ Backend build failed - node_modules not created"
    goto :build_error
)
if exist "cloud\dist\main.js" (
    echo "❌ Backend build failed - main.js not created"
    goto :build_error
)
echo "✅ Backend build verification passed"

:check_frontend_build
if exist "landing\dist\index.html" (
    echo "❌ Frontend build failed - index.html not created"
    goto :build_error
)
if exist "landing\dist\assets" (
    echo "❌ Frontend build failed - assets folder not created"
    goto :build_error
)
echo "✅ Frontend build verification passed"

:check_agent_build
if exist "agent\dist\manifest.json" (
    echo "❌ Agent build failed - manifest.json not created"
    goto :build_error
)
if exist "agent\dist\background" (
    echo "❌ Agent build failed - background folder not created"
    goto :build_error
)
echo "✅ Agent build verification passed"

echo.
echo "📋 Build Summary:"
echo "   ✅ Backend: Built successfully"
echo "   ✅ Frontend: Built successfully"
echo "   ✅ Agent: Built successfully"
echo "   ✅ All verifications passed"
echo.
echo "🚀 Next steps:"
echo "   1. Run: run-dev.bat to start all services"
echo "   2. Open browser to http://localhost:5173"
echo "   3. Load Chrome extension from C:\KELEDON\agent\extension\"
echo "   4. Test the complete application"
echo.
echo "💡 Build outputs location:"
echo "   Backend: cloud\dist\"
echo "   Frontend: landing\dist\"
echo "   Agent: agent\dist\"
echo.
echo "Press any key to exit..."
pause >nul
exit /b 0

:build_error
echo.
echo "❌ BUILD FAILED"
echo "=================="
echo "Please check the error messages above"
echo "Common solutions:"
echo "1. Run: npm install in each directory"
echo "2. Check for TypeScript errors: npm run build --verbose"
echo "3. Clear caches: npm cache clean --force"
echo "4. Update dependencies: npm update"
echo.
echo "Press any key to exit..."
pause >nul
exit /b 1