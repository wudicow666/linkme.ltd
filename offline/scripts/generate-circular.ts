/**
 * 调用离线项目（Vite 构建 + CircularQRCode）生成圆形轮廓 PNG
 * 技术栈：qrcode-generator + CircularQRCode，不使用 npm 的 qrcode 包
 */
import fs from "fs";
import http from "http";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import { Resvg } from "@resvg/resvg-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const offlineDir = path.resolve(__dirname, "..");

const url =
  process.argv[2] ?? "https://work.weixin.qq.com/ca/cawcde7de43a0aa2f7";
const outPath = process.argv[3] ?? "/Users/wudicow/Desktop/二维码.png";
const exportSize = Number(process.argv[4] ?? "1024");
const port = 5199;

function waitForServer(ms = 60000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > ms) reject(new Error("预览服务启动超时"));
        else setTimeout(tick, 300);
      });
    };
    tick();
  });
}

function run(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: "inherit", shell: true });
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} 退出码 ${code}`)),
    );
  });
}

await run("npm", ["run", "build"], offlineDir);

const preview = spawn(
  "npm",
  ["run", "preview", "--", "--host", "127.0.0.1", "--port", String(port)],
  { cwd: offlineDir, stdio: "ignore", shell: true },
);

try {
  await waitForServer();
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
  });
  const page = await browser.newPage();
  const target = `http://127.0.0.1:${port}/?auto=1&url=${encodeURIComponent(url)}`;
  await page.goto(target, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => typeof (window as unknown as { __QR_SVG__?: string }).__QR_SVG__ === "string",
    { timeout: 30000 },
  );
  const svgString = await page.evaluate(
    () => (window as unknown as { __QR_SVG__: string }).__QR_SVG__,
  );
  await browser.close();

  const svg = svgString.startsWith("<?xml")
    ? svgString
    : `<?xml version="1.0" encoding="UTF-8"?>\n${svgString}`;
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: exportSize },
    background: "transparent",
  });
  fs.writeFileSync(outPath, resvg.render().asPng());
  console.log(`已保存: ${outPath} (${exportSize}px 宽)`);
  console.log(`链接: ${url}`);
} finally {
  preview.kill("SIGTERM");
}
