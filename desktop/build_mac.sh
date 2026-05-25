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

echo ""
echo "=========================================="
echo "  完成: $DESKTOP_OUT"
echo "  双击即可打开，无需终端"
echo "=========================================="
