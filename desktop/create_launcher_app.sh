#!/bin/bash
# 生成「打开圆形二维码.app」— 用于 .app 双击无反应时
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
OUT="$HOME/Desktop/打开圆形二维码.app"
MAIN_APP="$HOME/Desktop/圆形二维码生成.app"

mkdir -p "$OUT/Contents/MacOS"

cat > "$OUT/Contents/MacOS/run" << 'EOF'
#!/bin/bash
LOG="$HOME/Desktop/圆形二维码-启动日志.txt"
MAIN="$HOME/Desktop/圆形二维码生成.app"
EXEC="$MAIN/Contents/MacOS/圆形二维码生成"

{
  echo "======== $(date) ========"
  if [[ ! -x "$EXEC" ]]; then
    echo "ERROR: 找不到 $EXEC"
    osascript -e 'display alert "未找到桌面上的 圆形二维码生成.app，请先运行 build_mac.sh 打包。" as critical'
    exit 1
  fi
  xattr -cr "$MAIN" 2>/dev/null || true
  echo "启动: $EXEC"
  "$EXEC" &
  PID=$!
  sleep 2
  if kill -0 "$PID" 2>/dev/null; then
    echo "OK: 进程 $PID 已启动"
    osascript -e 'display notification "若未见窗口，请点 Dock 或 Cmd+Tab 切换" with title "圆形二维码已启动"'
  else
    echo "ERROR: 进程已退出"
    osascript -e 'display alert "程序启动后立即退出，请查看桌面上的 圆形二维码-启动日志.txt" as critical'
  fi
} >> "$LOG" 2>&1
EOF

chmod +x "$OUT/Contents/MacOS/run"

/usr/libexec/PlistBuddy -c "Clear dict" "$OUT/Contents/Info.plist" 2>/dev/null || true
cat > "$OUT/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>run</string>
  <key>CFBundleIdentifier</key>
  <string>local.linkme.qr.launcher</string>
  <key>CFBundleName</key>
  <string>打开圆形二维码</string>
  <key>CFBundleDisplayName</key>
  <string>打开圆形二维码</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>11.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
EOF

xattr -cr "$OUT" 2>/dev/null || true
echo "已创建: $OUT"
echo "请双击桌面「打开圆形二维码.app」（比 .command 更容易被系统执行）"
