@echo off
chcp 65001 >nul
echo ============================================
echo  Book2Markdown Desktop - 环境初始化
echo ============================================
echo.

echo [1/3] 安装 Node.js 前端依赖...
cd /d "%~dp0"
call npm install
if errorlevel 1 (
    echo [ERROR] npm install 失败，请检查网络连接
    pause
    exit /b 1
)
echo [OK] 前端依赖已安装
echo.

echo [2/3] 安装 Python 后端依赖...
cd backend
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] pip install 失败，请检查网络连接
    pause
    exit /b 1
)
echo [OK] Python 依赖已安装
echo.

echo [3/3] 检查 Rust 工具链...
rustc --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Rust 未安装，Tauri 编译需要 Rust
    echo 请访问 https://rustup.rs 安装 Rust 工具链
) else (
    echo [OK] Rust 已安装
)
echo.

echo ============================================
echo  初始化完成！
echo  运行命令:
echo    npm run dev         - 启动前端开发服务器
echo    npm run tauri dev   - 启动 Tauri 桌面应用
echo ============================================
pause