export type ShellOverlayText = {
  enabled: boolean;
  text: string;
  fontSize: number;
  color: string;
};

export type ShellOverlayLayout = {
  marginRight: number;
  marginBottom: number;
};

export const DEFAULT_SHELL_OVERLAY_LAYOUT: ShellOverlayLayout = {
  marginRight: 28,
  marginBottom: 36,
};

export const DEFAULT_SHELL_OVERLAY: ShellOverlayText = {
  enabled: false,
  text: "",
  fontSize: 34,
  color: "#1a1a1a",
};

export function drawShellOverlayText(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  overlay: ShellOverlayText,
  layout: ShellOverlayLayout = DEFAULT_SHELL_OVERLAY_LAYOUT,
): void {
  const content = overlay.text.trim();
  if (!overlay.enabled || !content) return;

  const { marginRight, marginBottom } = layout;
  const fontSize = Math.max(8, Math.min(120, Math.round(overlay.fontSize)));

  ctx.save();
  ctx.font = `bold ${fontSize}px system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.fillStyle = overlay.color;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(content, canvasWidth - marginRight, canvasHeight - marginBottom);
  ctx.restore();
}
