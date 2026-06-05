# 离线 / 网页二维码生成器

与桌面 App **同款** 圆形二维码界面，在浏览器中运行：

- **不需要** Clerk 登录、数据库、Redis
- 生成、预览、下载 PNG/SVG 在**浏览器本地**完成
- 可部署为 **公网网址**（见 [部署网页版.md](./部署网页版.md)）

## 第一次使用（需要 Node.js，仅需联网安装依赖一次）

```bash
cd offline
npm install
npm run build
```

## 日常使用

### 方式一：本地 / 局域网网页

```bash
cd offline
npm run preview
```

- 电脑：**http://127.0.0.1:5173**
- 手机（同一 WiFi）：使用终端里 `Network:` 开头的地址

### 方式二：公网网址

见 **[部署网页版.md](./部署网页版.md)**（Vercel / GitHub Pages / 静态托管）。

### 方式三：Mac 桌面 App

```bash
./desktop/build_mac.sh
```

打开桌面 `圆形二维码生成.app`（功能相同，保存走系统对话框）。

### 方式四：纯静态目录

把 `offline/dist` 复制到任意服务器，或用：

```bash
cd offline/dist && python3 -m http.server 8765
```

## 开发调试

```bash
cd offline
npm run dev
```

## 与完整版 linkme.ltd 的区别

| 功能 | 离线版 | 完整版（npm run dev） |
|------|--------|----------------------|
| 自定义样式 / 圆形码 / 导出 | ✅ | ✅ |
| 账号登录 | ❌ | ✅ |
| 保存到云端 / 短链统计 | ❌ | ✅ |
