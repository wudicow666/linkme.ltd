/** GitHub Pages 等子路径部署时补全 Vite base；Next/本地预览默认 / */
export function resolvePublicAsset(path: string): string {
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) {
    return path;
  }

  const relative = path.replace(/^\//, "");
  const base =
    typeof import.meta !== "undefined" &&
    typeof import.meta.env?.BASE_URL === "string"
      ? import.meta.env.BASE_URL
      : "/";

  return `${base.endsWith("/") ? base : `${base}/`}${relative}`;
}
