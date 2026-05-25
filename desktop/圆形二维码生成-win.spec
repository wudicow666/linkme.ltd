# -*- mode: python ; coding: utf-8 -*-
# Windows 打包用（在 Windows 上执行 pyinstaller 圆形二维码生成-win.spec）
from pathlib import Path

SPEC_DIR = Path(SPECPATH).resolve()
PROJECT = SPEC_DIR.parent
WEB = PROJECT / "offline" / "dist"

if not (WEB / "index.html").is_file():
    raise SystemExit(f"请先构建离线页: cd {PROJECT / 'offline'} && npm run build")

a = Analysis(
    ["launcher.py"],
    pathex=[str(SPEC_DIR)],
    binaries=[],
    datas=[(str(WEB), "web")],
    hiddenimports=["webview", "webview.platforms.winforms", "webview.platforms.edgechromium"],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="圆形二维码生成",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name="圆形二维码生成",
)
