@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"
set "ROOT=%~dp0"
set "PROJECT=%ROOT%.."
set "RELEASE=%ROOT%release"
set "OUT_NAME=圆形二维码生成"
set "ZIP_NAME=圆形二维码生成-Windows.zip"

echo.
echo ==========================================
echo   圆形二维码生成器 - Windows 打包
echo ==========================================
echo.

echo ==^> [1/4] 构建离线网页...
cd /d "%PROJECT%\offline"
if not exist node_modules (
  echo     首次运行：安装 npm 依赖...
  call npm install
  if errorlevel 1 goto :fail
)
call npm run build
if errorlevel 1 goto :fail
if not exist "dist\index.html" (
  echo 错误: offline\dist 未生成，请检查 npm build
  goto :fail
)

echo ==^> [2/4] 准备 Python 环境...
cd /d "%ROOT%"
if not exist ".venv\Scripts\python.exe" (
  python -m venv .venv
  if errorlevel 1 goto :fail
)
call .venv\Scripts\activate.bat
pip install -q -r requirements.txt
if errorlevel 1 goto :fail

echo ==^> [3/4] PyInstaller 打包（需数分钟）...
pyinstaller --noconfirm --clean "圆形二维码生成-win.spec"
if errorlevel 1 goto :fail
if not exist "dist\%OUT_NAME%\%OUT_NAME%.exe" (
  echo 错误: 未找到 dist\%OUT_NAME%\%OUT_NAME%.exe
  goto :fail
)

echo ==^> [4/4] 生成发布 zip...
if not exist "%RELEASE%" mkdir "%RELEASE%"
copy /Y "%ROOT%发给朋友的说明-Windows.txt" "dist\%OUT_NAME%\使用说明.txt" >nul

if exist "%RELEASE%\%ZIP_NAME%" del /f /q "%RELEASE%\%ZIP_NAME%"
powershell -NoProfile -Command "Compress-Archive -Path 'dist\%OUT_NAME%\*' -DestinationPath '%RELEASE%\%ZIP_NAME%' -Force"
if errorlevel 1 goto :fail

echo.
echo ==========================================
echo   打包完成
echo ==========================================
echo.
echo   文件夹: %ROOT%dist\%OUT_NAME%
echo   发给朋友: %RELEASE%\%ZIP_NAME%
echo.
echo   请把 zip 发给对方，解压后双击 exe（保持整个文件夹完整）。
echo ==========================================
pause
exit /b 0

:fail
echo.
echo 打包失败，请确认已安装 Node.js 与 Python 3.10+
pause
exit /b 1
