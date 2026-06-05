import type { ShellTemplate } from "./shellTemplates";
import { getShellTemplateImageUrl } from "./shellTemplates";
import type { ShellOverlayText } from "./shellOverlayText";
import { drawShellOverlayText } from "./shellOverlayText";
import { loadImage } from "./qrRasterize";

/** 按用户手动位置/大小合成海报 */
export async function exportManualShellComposite(
  template: ShellTemplate,
  qrDataUrl: string,
  qrCenterX: number,
  qrCenterY: number,
  qrDiameter: number,
  options?: { overlay?: ShellOverlayText },
): Promise<string> {
  const [tplImg, qrImg] = await Promise.all([
    loadImage(getShellTemplateImageUrl(template)),
    loadImage(qrDataUrl),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = template.width;
  canvas.height = template.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 不可用");

  ctx.drawImage(tplImg, 0, 0);

  const x = qrCenterX - qrDiameter / 2;
  const y = qrCenterY - qrDiameter / 2;
  ctx.drawImage(qrImg, x, y, qrDiameter, qrDiameter);

  if (options?.overlay) {
    drawShellOverlayText(ctx, template.width, template.height, options.overlay);
  }

  return canvas.toDataURL("image/png");
}
