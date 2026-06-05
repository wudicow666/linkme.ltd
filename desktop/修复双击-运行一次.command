#!/bin/bash
# 在终端已能打开的前提下，运行本文件一次，修复访达双击（尽量）
set -e
echo "正在修复桌面 App 的启动注册…"
for app in "$HOME/Desktop/圆形二维码生成.app" "$HOME/Desktop/打开圆形二维码.app"; do
  [[ -d "$app" ]] || continue
  xattr -cr "$app" 2>/dev/null || true
  /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$app" 2>/dev/null || true
done
echo "完成。请再试双击「圆形二维码生成器(点我启动).app」或主程序 .app"
osascript -e 'display alert "修复完成，请再试双击桌面上的启动图标。" as informational'
