# 发给 Windows 朋友：打包与分发说明

## 重要前提

| 平台 | 能否在 Mac 上打包 | 能否在 Windows 上打包 |
|------|-------------------|------------------------|
| Mac `.app` | ✅ 可以 | ❌ 不行 |
| Windows `.exe` | ❌ **不行** | ✅ 可以 |

PyInstaller + pywebview **不能交叉编译**。要给 Windows 朋友用，必须在 **Windows 电脑**（实体机、虚拟机、云电脑均可）上执行打包。

---

## 方法一：在 Windows 上打包（推荐）

### 1. 准备环境（仅打包者需要）

1. 安装 [Node.js](https://nodejs.org/)（LTS）
2. 安装 [Python 3.10+](https://www.python.org/downloads/)，安装时勾选 **Add Python to PATH**
3. 把整个项目文件夹拷到 Windows（U 盘、网盘、Git 均可）

### 2. 一键打包

在资源管理器中进入项目的 `desktop` 文件夹，**双击**：

```text
build_win.bat
```

或在 cmd 中：

```cmd
cd 你的路径\erweima\desktop
build_win.bat
```

### 3. 打包结果

成功后会有：

| 路径 | 用途 |
|------|------|
| `desktop\dist\圆形二维码生成\` | 完整程序目录（含 exe 与 `_internal`） |
| `desktop\release\圆形二维码生成-Windows.zip` | **直接发给朋友的 zip** |

### 4. 发给朋友

- 发送 **`圆形二维码生成-Windows.zip`**（网盘、微信文件等）
- 提醒对方：**解压整个 zip**，双击里面的 `圆形二维码生成.exe`
- 不要只发一个 exe，必须保留同目录下的 `_internal` 等文件

---

## 方法二：你只有 Mac，没有 Windows

任选其一：

1. **虚拟机**：Parallels / UTM 装 Windows 10/11，在虚拟机里按「方法一」打包  
2. **请有 Windows 的同事/朋友**帮你在他电脑上运行 `build_win.bat`  
3. **GitHub 自动打包**（见下方「方法三」）

---

## 方法三：GitHub Actions 自动打 Windows 包（Mac 用户可用）

若项目已推到 GitHub，可在网页上触发工作流，下载 Windows zip，无需本机 Windows。

1. 推送代码到 GitHub  
2. 打开仓库 → **Actions** → **Build Windows App** → **Run workflow**  
3. 完成后在 Artifacts 下载 `圆形二维码生成-Windows.zip`

---

## 朋友电脑上怎么用

1. 解压 zip 到任意目录（路径尽量简单，可用英文）  
2. 双击 **`圆形二维码生成.exe`**  
3. 若提示「未知发布者」：点 **更多信息** → **仍要运行**  
4. 系统要求：**Windows 10/11 64 位**；若窗口白屏，安装 [WebView2 运行时](https://developer.microsoft.com/microsoft-edge/webview2/)

解压后目录内附有 **`使用说明.txt`**。

---

## 打包前请确认

在任意系统先构建好最新网页（Mac 上也可先执行）：

```bash
cd offline && npm run build
```

Windows 打包脚本会自动再执行一次 `npm run build`。

---

## 常见问题

**Q：zip 很大（一百多 MB）？**  
正常，内含 Python 运行时与网页资源。

**Q：杀毒软件报毒？**  
PyInstaller 打包的 exe 常被误报，可添加信任或使用代码签名（进阶）。

**Q：Mac 版能给 Windows 用吗？**  
不能，必须发 Windows zip。

**Q：Windows 版能给 Mac 用吗？**  
不能，Mac 需发 `.app`（用 `build_mac.sh` 打包）。
