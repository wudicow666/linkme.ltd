import type { ShellTemplate } from "./shellTemplates";
import { loadImage } from "./qrRasterize";

export type ShellPlacement = {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  qrDiameter: number;
  qrX: number;
  qrY: number;
};

export function resolveShellPlacement(template: ShellTemplate): ShellPlacement {
  const { cx, cy, innerRadius, outerRadius } = template.ring;
  const outerDrawR = outerRadius * template.qrFitRatio;
  const qrDiameter = outerDrawR * 2;

  if (outerDrawR <= innerRadius + 8) {
    throw new Error("圆环区域过小，请检查模板参数");
  }

  return {
    cx,
    cy,
    innerRadius,
    outerRadius: outerDrawR,
    qrDiameter,
    qrX: cx - qrDiameter / 2,
    qrY: cy - qrDiameter / 2,
  };
}

/** 把透明底圆码裁成圆环形状（离屏） */
function buildRingQrLayer(
  width: number,
  height: number,
  qrImg: HTMLImageElement,
  placement: ShellPlacement,
): HTMLCanvasElement {
  const { cx, cy, innerRadius, outerRadius, qrDiameter, qrX, qrY } =
    placement;

  const layer = document.createElement("canvas");
  layer.width = width;
  layer.height = height;
  const ctx = layer.getContext("2d");
  if (!ctx) throw new Error("Canvas 不可用");

  ctx.drawImage(qrImg, qrX, qrY, qrDiameter, qrDiameter);

  ctx.globalCompositeOperation = "destination-in";
  ctx.beginPath();
  ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
  ctx.fill();

  return layer;
}

/**
 * 合成顺序（对齐参考图）：
 * 1. 铺模板底图
 * 2. 圆环内铺白底 + 透明圆码（仅环带，不是中心方块）
 * 3. 用模板中心圆盖回 Logo 留白（不再盖住环内码点）
 */
export async function compositeQrOnShell(
  template: ShellTemplate,
  qrDataUrl: string,
  templateImage?: HTMLImageElement,
): Promise<string> {
  const tplImg =
    templateImage ?? (await loadImage(template.imageUrl));
  const qrImg = await loadImage(qrDataUrl);
  const placement = resolveShellPlacement(template);
  const { cx, cy, innerRadius, outerRadius } = placement;

  const ringQr = buildRingQrLayer(
    template.width,
    template.height,
    qrImg,
    placement,
  );

  const canvas = document.createElement("canvas");
  canvas.width = template.width;
  canvas.height = template.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 不可用");

  ctx.drawImage(tplImg, 0, 0);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
  ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2, true);
  ctx.clip("evenodd");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(ringQr, 0, 0);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(tplImg, 0, 0);
  ctx.restore();

  return canvas.toDataURL("image/png");
}
