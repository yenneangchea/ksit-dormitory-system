@echo off
echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║   KSIT Dormitory - GitHub Repository Setup           ║
echo ╚════════════════════════════════════════════════════════╝
echo.

echo This script will help you push your code to GitHub.
echo.

REM Check if Git is configured
git config user.name >nul 2>&1
if %errorlevel% neq 0 (
    echo [Step 1] Git Configuration
    echo.
    set /p GIT_NAME="Enter your name (will appear in commits): "
    set /p GIT_EMAIL="Enter your email (use GitHub email): "
    
    git config --global user.name "%GIT_NAME%"
    git config --global user.email "%GIT_EMAIL%"
    
    echo.
    echo ✓ Git configured successfully!
    echo.
) else (
    echo [Step 1] Git already configured
    echo Name: 
    git config user.name
    echo Email: 
    git config user.email
    echo.
)

echo [Step 2] Repository Status
echo.
git status
echo.

echo [Step 3] Next Steps
echo.
echo After running this script, you need to:
echo.
echo 1. Create a PRIVATE repository on GitHub:
echo    https://github.com/new
echo.
echo    Repository name: ksit-dormitory-system
echo    Visibility: PRIVATE (important!)
echo    DO NOT initialize with README
echo.
echo 2. Run these commands to push:
echo.
echo    git remote add origin https://github.com/YOUR_USERNAME/ksit-dormitory-system.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo 3. Replace YOUR_USERNAME with your actual GitHub username
echo.
echo.
echo ⚠️  IMPORTANT: Make sure repository is set to PRIVATE!
echo.
echo For detailed instructions, see: GITHUB_SETUP.md
echo.

pause
