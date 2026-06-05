#!/usr/bin/env python3
"""双击启动：内嵌离线网页，无需终端。"""
from __future__ import annotations

import base64
import json
import re
import socket
import sys
import threading
import traceback
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path


def web_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS) / "web"
    return Path(__file__).resolve().parent.parent / "offline" / "dist"


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return int(s.getsockname()[1])


def make_handler(directory: Path):
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(directory), **kwargs)

        def log_message(self, fmt, *args):
            pass

    return Handler


def _pick_str(value, *, allow_non_data: bool = False) -> str | None:
    if value is None:
        return None
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    if isinstance(value, str):
        if allow_non_data or value.startswith("data:"):
            return value
        return value if allow_non_data else None
    if isinstance(value, (tuple, list)):
        parts = [_pick_str(v, allow_non_data=allow_non_data) for v in value]
        parts = [p for p in parts if p]
        if not parts:
            return None
        if allow_non_data:
            for p in parts:
                if not p.startswith("data:"):
                    return p
        data_parts = [p for p in parts if p.startswith("data:")]
        if data_parts:
            return max(data_parts, key=len)
        if allow_non_data and parts:
            return parts[-1]
        joined = "".join(parts)
        return joined if joined.startswith("data:") else None
    return None


def _parse_save_payload(*args, **kwargs) -> tuple[str | None, str]:
    suggested_name = _pick_str(
        kwargs.get("suggested_name") or kwargs.get("suggestedName"),
        allow_non_data=True,
    ) or "qrcode.png"

    data_url: str | None = None

    if len(args) == 1:
        only = args[0]
        if isinstance(only, str) and only.strip().startswith("{"):
            try:
                obj = json.loads(only)
                data_url = _pick_str(obj.get("data") or obj.get("dataUrl"))
                suggested_name = (
                    _pick_str(
                        obj.get("name")
                        or obj.get("filename")
                        or obj.get("suggestedName"),
                        allow_non_data=True,
                    )
                    or suggested_name
                )
            except json.JSONDecodeError:
                data_url = _pick_str(only)
        else:
            data_url = _pick_str(only)
            if not data_url and isinstance(only, (tuple, list)) and len(only) >= 2:
                data_url = _pick_str(only[0])
                suggested_name = (
                    _pick_str(only[1], allow_non_data=True) or suggested_name
                )
    elif len(args) >= 2:
        data_url = _pick_str(args[0])
        suggested_name = _pick_str(args[1], allow_non_data=True) or suggested_name

    if not data_url:
        data_url = _pick_str(kwargs.get("data_url") or kwargs.get("dataUrl"))

    if not isinstance(suggested_name, str) or not suggested_name.strip():
        suggested_name = "qrcode.png"

    return data_url, suggested_name.strip()


def _macos_clear_save_metadata(path: Path) -> None:
    """去掉导出文件上的隔离/来源标记，避免双击 PNG 无反应。"""
    if sys.platform != "darwin":
        return
    import subprocess

    try:
        subprocess.run(
            ["xattr", "-cr", str(path)],
            check=False,
            capture_output=True,
        )
    except OSError:
        pass


def _ext_for_mime(mime: str) -> str:
    if "jpeg" in mime or "jpg" in mime:
        return ".jpg"
    if "webp" in mime:
        return ".webp"
    if "svg" in mime:
        return ".svg"
    return ".png"


class DesktopApi:
    """供网页调用：系统保存对话框（解决 pywebview 内无法直接下载）。"""

    def __init__(self) -> None:
        self._chunks: list[str] = []
        self._filename = "qrcode.png"

    def _normalize_dialog_path(self, path) -> str | None:
        if not path:
            return None
        if isinstance(path, str):
            s = path.strip()
            return s or None
        if isinstance(path, (tuple, list)):
            candidates = [x.strip() for x in path if isinstance(x, str) and x.strip()]
            if not candidates:
                return None
            for c in candidates:
                if "/" in c or c.endswith((".png", ".jpg", ".jpeg", ".webp", ".svg")):
                    return c
            return candidates[0]
        return None

    def _save_bytes_with_dialog(self, raw: bytes, suggested_name: str, mime: str):
        import webview

        ext = _ext_for_mime(mime)
        name = suggested_name if suggested_name else "qrcode.png"
        if not isinstance(name, str):
            name = "qrcode.png"
        if not name.lower().endswith(ext):
            name = Path(name).stem + ext

        win = webview.active_window()
        if win is None:
            return {"ok": False, "error": "窗口未就绪"}

        path = win.create_file_dialog(
            webview.SAVE_DIALOG,
            save_filename=name,
        )
        normalized = self._normalize_dialog_path(path)
        if not normalized:
            return {"ok": False, "cancelled": True}

        out = Path(normalized)
        if not out.suffix:
            out = out.with_suffix(ext)
        out.write_bytes(raw)
        _macos_clear_save_metadata(out)
        return {"ok": True, "path": str(out)}

    def save_image_begin(self, filename="qrcode.png"):
        self._chunks = []
        picked = _pick_str(filename, allow_non_data=True)
        self._filename = picked or "qrcode.png"
        return {"ok": True}

    def save_image_append(self, chunk):
        if isinstance(chunk, (tuple, list)):
            text = "".join(str(x) for x in chunk if x is not None)
        else:
            text = str(chunk) if chunk is not None else ""
        self._chunks.append(text)
        return {"ok": True}

    def save_image_finish(self):
        try:
            b64 = "".join(self._chunks)
            if not b64:
                return {"ok": False, "error": "没有收到图片数据"}
            raw = base64.b64decode(b64)
            return self._save_bytes_with_dialog(raw, self._filename, "image/png")
        except Exception as e:
            traceback.print_exc()
            return {"ok": False, "error": str(e)}

    def save_data_url(self, *args, **kwargs):
        try:
            data_url, suggested_name = _parse_save_payload(*args, **kwargs)
            if not data_url:
                return {"ok": False, "error": "无法解析图片数据，请重新打包 App 后再试"}

            match = re.match(r"data:([^;]+);base64,(.+)", data_url, re.DOTALL)
            if not match:
                return {"ok": False, "error": "图片数据格式不正确"}
            mime, b64 = match.group(1), match.group(2)
            raw = base64.b64decode(b64)
            return self._save_bytes_with_dialog(raw, suggested_name, mime)
        except Exception as e:
            traceback.print_exc()
            return {"ok": False, "error": str(e)}


def _write_startup_error(msg: str) -> None:
    """双击无提示失败时，在桌面留下说明文件。"""
    text = (
        "圆形二维码生成器未能启动。\n\n"
        f"{msg}\n\n"
        "可尝试：\n"
        "1. 右键「圆形二维码生成.app」→ 打开 → 再点「打开」\n"
        "2. 双击桌面「启动圆形二维码生成.command」\n"
        "3. 重新运行 desktop/build_mac.sh 打包\n"
    )
    for log in (
        Path.home() / "Desktop" / "圆形二维码生成-启动失败.txt",
        Path.home() / "圆形二维码生成-启动失败.txt",
    ):
        try:
            log.write_text(text, encoding="utf-8")
            break
        except OSError:
            continue


def main() -> None:
    try:
        root = web_root()
        if not (root / "index.html").is_file():
            msg = f"缺少网页资源: {root}\n请先执行 offline 目录下的 npm run build"
            _write_startup_error(msg)
            sys.exit(msg)

        port = free_port()
        handler = make_handler(root)
        httpd = ThreadingHTTPServer(("127.0.0.1", port), handler)
        threading.Thread(target=httpd.serve_forever, daemon=True).start()

        url = f"http://127.0.0.1:{port}/"
        import webview

        webview.create_window(
            "圆形二维码生成器",
            url,
            width=1280,
            height=900,
            min_size=(900, 700),
            js_api=DesktopApi(),
        )
        webview.start()
        httpd.shutdown()
    except Exception as e:
        traceback.print_exc()
        _write_startup_error(str(e))
        raise


if __name__ == "__main__":
    main()
