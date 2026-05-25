export type CenterBlank = {
  cx: number;
  cy: number;
  radius: number;
};

const WHITE_THRESHOLD = 235;

function isWhite(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): boolean {
  const i = (y * width + x) * 4;
  return (
    data[i] >= WHITE_THRESHOLD &&
    data[i + 1] >= WHITE_THRESHOLD &&
    data[i + 2] >= WHITE_THRESHOLD
  );
}

function isDark(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): boolean {
  const i = (y * width + x) * 4;
  const l = (data[i] + data[i + 1] + data[i + 2]) / 3;
  return l < 128;
}

/** 圆周采样黑像素占比 */
function darkRatioOnCircle(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
): number {
  let dark = 0;
  let total = 0;
  for (let deg = 0; deg < 360; deg += 4) {
    const rad = (deg * Math.PI) / 180;
    const x = Math.round(cx + radius * Math.cos(rad));
    const y = Math.round(cy + radius * Math.sin(rad));
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    total++;
    if (isDark(data, width, x, y)) dark++;
  }
  return total ? dark / total : 1;
}

/** 中心头像/留白圆（限制泛洪半径，避免吃掉整圈码区） */
export function detectCenterBlankFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  seedX: number,
  seedY: number,
  maxBlankRadius: number,
): CenterBlank | null {
  const sx = Math.round(seedX);
  const sy = Math.round(seedY);
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) return null;

  let startX = sx;
  let startY = sy;
  if (!isWhite(data, width, startX, startY)) {
    let found = false;
    for (let r = 1; r < 60 && !found; r++) {
      for (let dx = -r; dx <= r && !found; dx++) {
        for (let dy = -r; dy <= r && !found; dy++) {
          const x = sx + dx;
          const y = sy + dy;
          if (x >= 0 && x < width && y >= 0 && y < height && isWhite(data, width, x, y)) {
            startX = x;
            startY = y;
            found = true;
          }
        }
      }
    }
    if (!found) return null;
  }

  const visited = new Uint8Array(width * height);
  const queue: number[] = [startY * width + startX];
  visited[startY * width + startX] = 1;

  let minX = startX;
  let maxX = startX;
  let minY = startY;
  let maxY = startY;

  while (queue.length > 0) {
    const idx = queue.pop()!;
    const x = idx % width;
    const y = (idx / width) | 0;

    for (const [nx, ny] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if ((nx - startX) ** 2 + (ny - startY) ** 2 > maxBlankRadius ** 2) continue;
      const ni = ny * width + nx;
      if (visited[ni]) continue;
      if (!isWhite(data, width, nx, ny)) continue;
      visited[ni] = 1;
      queue.push(ni);
      if (nx < minX) minX = nx;
      if (nx > maxX) maxX = nx;
      if (ny < minY) minY = ny;
      if (ny > maxY) maxY = ny;
    }
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  let radius = 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!visited[y * width + x]) continue;
      const d = Math.hypot(x - cx, y - cy);
      if (d > radius) radius = d;
    }
  }

  if (radius < 8) return null;
  return { cx, cy, radius };
}

/**
 * 圆码应落在的圆环外径：从中心留白外缘向外扫描，
 * 在黑色装饰条变密之前停止（与参考合成图一致）。
 */
export function detectQrRingOuterRadius(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  cx: number,
  cy: number,
  innerRadius: number,
  searchMax = 220,
): number {
  let lastLight = innerRadius + 4;
  for (let r = Math.round(innerRadius) + 8; r <= searchMax; r += 2) {
    const ratio = darkRatioOnCircle(data, width, height, cx, cy, r);
    if (ratio < 0.12) {
      lastLight = r;
    } else if (ratio > 0.22 && r > innerRadius + 18) {
      break;
    }
  }
  return Math.max(innerRadius + 12, lastLight - 2);
}

export async function detectCenterBlank(
  image: HTMLImageElement,
  seedX: number,
  seedY: number,
  maxBlankRadius: number,
): Promise<CenterBlank | null> {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return detectCenterBlankFromImageData(
    imageData.data,
    canvas.width,
    canvas.height,
    seedX,
    seedY,
    maxBlankRadius,
  );
}

export async function getTemplateImageData(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}
