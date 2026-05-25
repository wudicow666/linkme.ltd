/**
 * 与离线项目 CircularQRCode 一致的圆形轮廓 SVG（qrcode-generator，不用 qrcode npm）
 */
import fs from "fs";
import { Resvg } from "@resvg/resvg-js";
import qrcodeFactory from "qrcode-generator";

const QRCode =
  typeof qrcodeFactory === "function"
    ? qrcodeFactory
    : (qrcodeFactory as { default: typeof qrcodeFactory }).default;

const url =
  process.argv[2] ?? "https://work.weixin.qq.com/ca/cawcde7de43a0aa2f7";
const outPath = process.argv[3] ?? "/Users/wudicow/Desktop/二维码.png";
const exportSize = Number(process.argv[4] ?? "1024");

const canvasSize = 1000;
const qrCodeSize = 470;
const borderWidth = 10;
const borderColor = "#000000";
const bgColor = "#ffffff";
const moduleColor = "#000000";

const qrcode = QRCode(0, "H");
qrcode.addData(url);
qrcode.make();
const moduleCount = qrcode.getModuleCount();
const moduleSize = qrCodeSize / moduleCount;
const offset = (canvasSize - qrCodeSize) / 2;
const trimRadius = qrCodeSize / 2 - moduleSize * 0.5;
const trimCx = offset + qrCodeSize / 2;
const trimCy = offset + qrCodeSize / 2;
const outerRadius = canvasSize / 2;
const center = canvasSize / 2;

const finderBases = [
  { row: 0, col: 0 },
  { row: 0, col: moduleCount - 7 },
  { row: moduleCount - 7, col: 0 },
];

function isFinder(row: number, col: number): boolean {
  return finderBases.some(
    (p) => row >= p.row && row < p.row + 7 && col >= p.col && col < p.col + 7,
  );
}

function rectHitsCircle(
  x: number,
  y: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  r: number,
): boolean {
  const closestX = Math.max(x, Math.min(cx, x + w));
  const closestY = Math.max(y, Math.min(cy, y + h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= r * r;
}

const parts: string[] = [];

parts.push(
  `<circle cx="${center}" cy="${center}" r="${outerRadius}" fill="${bgColor}"/>`,
);
parts.push(
  `<circle cx="${center}" cy="${center}" r="${outerRadius - borderWidth / 2}" fill="none" stroke="${borderColor}" stroke-width="${borderWidth}"/>`,
);

for (let row = 0; row < moduleCount; row++) {
  for (let col = 0; col < moduleCount; col++) {
    if (!qrcode.isDark(row, col) || isFinder(row, col)) continue;
    const x = offset + col * moduleSize;
    const y = offset + row * moduleSize;
    if (
      !rectHitsCircle(x, y, moduleSize, moduleSize, trimCx, trimCy, trimRadius)
    ) {
      continue;
    }
    parts.push(
      `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="${moduleColor}"/>`,
    );
  }
}

for (const pos of finderBases) {
  const x0 = offset + pos.col * moduleSize;
  const y0 = offset + pos.row * moduleSize;
  const s7 = moduleSize * 7;
  const s5 = moduleSize * 5;
  const s3 = moduleSize * 3;
  const m = (s7 - s5) / 2;
  const i = (s7 - s3) / 2;
  parts.push(
    `<rect x="${x0}" y="${y0}" width="${s7}" height="${s7}" fill="${moduleColor}"/>`,
    `<rect x="${x0 + m}" y="${y0 + m}" width="${s5}" height="${s5}" fill="${bgColor}"/>`,
    `<rect x="${x0 + i}" y="${y0 + i}" width="${s3}" height="${s3}" fill="${moduleColor}"/>`,
  );
}

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasSize} ${canvasSize}" width="${canvasSize}" height="${canvasSize}">
${parts.join("\n")}
</svg>`;

const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: exportSize },
  background: "transparent",
});
fs.writeFileSync(outPath, resvg.render().asPng());
console.log(`已保存: ${outPath} (${exportSize}px 宽)`);
console.log(`链接: ${url}`);
