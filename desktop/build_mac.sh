#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
PROJECT="$(cd "$ROOT/.." && pwd)"
DESKTOP_OUT="$HOME/Desktop/圆形二维码生成.app"

echo "==> 构建离线网页..."
cd "$PROJECT/offline"
if [ ! -d node_modules ]; then
  npm install
fi
npm run build

echo "==> 安装 Python 依赖..."
cd "$ROOT"
python3 -m venv .venv
source .venv/bin/activate
pip install -q -r requirements.txt

echo "==> 打包 Mac 应用（无终端窗口）..."
pyinstaller --noconfirm --clean 圆形二维码生成.spec

rm -rf "$DESKTOP_OUT"
cp -R "$ROOT/dist/圆形二维码生成.app" "$DESKTOP_OUT"
xattr -cr "$DESKTOP_OUT" 2>/dev/null || true

LAUNCHER="$HOME/Desktop/启动圆形二维码生成.command"
cp "$ROOT/启动圆形二维码生成.command" "$LAUNCHER"
chmod +x "$LAUNCHER"
xattr -cr "$LAUNCHER" 2>/dev/null || true

chmod +x "$ROOT/create_launcher_app.sh"
"$ROOT/create_launcher_app.sh"

if command -v osacompile >/dev/null 2>&1; then
  osacompile -o "$HOME/Desktop/圆形二维码生成器(点我启动).app" "$ROOT/圆形二维码-启动.applescript" 2>/dev/null || true
  xattr -cr "$HOME/Desktop/圆形二维码生成器(点我启动).app" 2>/dev/null || true
fi
cp "$ROOT/修复双击-运行一次.command" "$HOME/Desktop/修复双击-运行一次.command"
chmod +x "$HOME/Desktop/修复双击-运行一次.command"

echo ""
echo "=========================================="
echo "  完成: $DESKTOP_OUT"
echo "  若 .app 双击无反应，请双击:"
echo "  $LAUNCHER"
echo "=========================================="
