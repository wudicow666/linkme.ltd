#!/bin/bash
# 若 .app 双击无反应，可双击本文件启动（会短暂出现终端窗口）
cd "$(dirname "$0")" || exit 1
APP="$HOME/Desktop/圆形二维码生成.app"
if [ ! -d "$APP" ]; then
  APP="$(dirname "$0")/dist/圆形二维码生成.app"
fi
if [ ! -x "$APP/Contents/MacOS/圆形二维码生成" ]; then
  osascript -e 'display alert "未找到 圆形二维码生成.app，请先运行 desktop/build_mac.sh 打包" as critical'
  exit 1
fi
xattr -cr "$APP" 2>/dev/null || true
exec "$APP/Contents/MacOS/圆形二维码生成"
