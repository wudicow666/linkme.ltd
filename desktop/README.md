# 桌面应用（双击即用，无需终端）

内嵌 `offline/dist` 离线网页，用系统原生窗口打开（pywebview），不是浏览器标签页。

## Mac：生成 `.app` 到桌面

```bash
chmod +x desktop/build_mac.sh
./desktop/build_mac.sh
```

完成后双击桌面 **`圆形二维码生成.app`**。

## Windows：打包 zip 发给朋友

**必须在 Windows 电脑上打包**（Mac 无法直接生成 `.exe`）。

在 Windows 上双击：

```text
desktop\build_win.bat
```

完成后将 **`desktop\release\圆形二维码生成-Windows.zip`** 发给对方；对方解压后双击 `圆形二维码生成.exe`（须保留整个文件夹）。

详细说明见 **[打包说明-Windows.md](./打包说明-Windows.md)**。  
仅有 Mac 时可用 GitHub Actions：仓库 **Actions → Build Windows App → Run workflow**，下载 Artifact。

## 说明

- 首次打包需本机已安装 **Node.js**（构建网页）和 **Python 3**（打包壳）。
- 打包后的 `.app` / `.exe` **可拷贝到其他电脑使用**，对方不需要再装 Node、不需要开终端。
- 对方电脑需能运行对应系统应用（Mac 11+；Windows 10+）。
