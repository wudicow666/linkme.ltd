export type ShellTemplate = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  width: number;
  height: number;
  /** 圆码初始位置（模板像素，可拖拽调整） */
  defaultQrX: number;
  defaultQrY: number;
  /** 圆码初始直径（模板像素，可缩放调整） */
  defaultQrDiameter: number;
};

export const SHELL_TEMPLATES: ShellTemplate[] = [
  {
    id: "douyin-shell",
    name: "抖音圆码海报",
    description: "手动拖拽、缩放圆码到合适位置",
    imageUrl: "/templates/douyin-shell.png",
    width: 743,
    height: 1024,
    defaultQrX: 368,
    defaultQrY: 344,
    defaultQrDiameter: 324,
  },
];

export const NO_TEMPLATE = "none";

export function getShellTemplate(id: string): ShellTemplate | undefined {
  return SHELL_TEMPLATES.find((t) => t.id === id);
}
