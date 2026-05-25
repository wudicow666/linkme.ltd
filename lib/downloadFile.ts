/** 将 data URL 转为 Blob */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, body] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "application/octet-stream";
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export type DownloadResult =
  | { status: "saved" }
  | { status: "cancelled" }
  | { status: "failed"; message: string };

type SaveResponse = {
  ok?: boolean;
  cancelled?: boolean;
  error?: string;
  path?: string;
};

type PyWebViewApi = {
  save_data_url?: (payload: string) => SaveResponse | string | null;
  save_image_begin?: (filename: string) => SaveResponse;
  save_image_append?: (chunk: string) => SaveResponse;
  save_image_finish?: () => SaveResponse;
};

function getPyWebViewApi(): PyWebViewApi | null {
  const w = window as unknown as { pywebview?: { api?: PyWebViewApi } };
  return w.pywebview?.api ?? null;
}

function parseSaveResponse(res: unknown): DownloadResult {
  if (res && typeof res === "object") {
    const r = res as SaveResponse;
    if (r.ok) return { status: "saved" };
    if (r.cancelled) return { status: "cancelled" };
    return { status: "failed", message: r.error || "保存失败" };
  }
  if (typeof res === "string") {
    if (!res.trim()) return { status: "cancelled" };
    try {
      const parsed = JSON.parse(res) as SaveResponse;
      return parseSaveResponse(parsed);
    } catch {
      return { status: "saved" };
    }
  }
  if (res === null || res === undefined) return { status: "cancelled" };
  return { status: "failed", message: "保存接口返回异常" };
}

async function toDataUrl(input: string): Promise<string> {
  if (input.startsWith("data:")) return input;
  if (input.startsWith("blob:")) {
    const res = await fetch(input);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("读取文件失败"));
      reader.readAsDataURL(blob);
    });
  }
  throw new Error("不支持的文件地址");
}

/** 大图分块传给 Python，避免 pywebview 单次 JSON 过大导致保存失败 */
async function saveViaDesktopApi(
  api: PyWebViewApi,
  dataUrl: string,
  filename: string,
): Promise<DownloadResult> {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const useChunks =
    b64.length > 200_000 &&
    api.save_image_begin &&
    api.save_image_append &&
    api.save_image_finish;

  if (useChunks) {
    const begin = await api.save_image_begin!(filename);
    if (begin && typeof begin === "object" && !begin.ok) {
      return parseSaveResponse(begin);
    }
    const CHUNK = 300_000;
    for (let i = 0; i < b64.length; i += CHUNK) {
      await api.save_image_append!(b64.slice(i, i + CHUNK));
    }
    const done = await api.save_image_finish!();
    return parseSaveResponse(done);
  }

  if (api.save_data_url) {
    const payload = JSON.stringify({ data: dataUrl, name: filename });
    const res = await api.save_data_url(payload);
    return parseSaveResponse(res);
  }

  return { status: "failed", message: "桌面保存接口不可用" };
}

export function downloadResultMessage(
  result: DownloadResult,
  successMessage: string,
): string {
  if (result.status === "saved") return successMessage;
  if (result.status === "cancelled") return "已取消保存";
  return `保存失败：${result.message}`;
}

/**
 * 保存图片：桌面 App（pywebview）走系统保存对话框；浏览器走下载链接。
 */
export async function downloadFile(
  dataUrlOrBlobUrl: string,
  filename: string,
): Promise<DownloadResult> {
  const dataUrl = await toDataUrl(dataUrlOrBlobUrl);
  const api = getPyWebViewApi();
  if (api?.save_data_url || api?.save_image_begin) {
    return saveViaDesktopApi(api, dataUrl, filename);
  }

  try {
    const blob = dataUrlToBlob(dataUrl);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return { status: "saved" };
  } catch {
    window.open(dataUrl, "_blank");
    return {
      status: "failed",
      message: "浏览器无法自动下载，请在新窗口中右键图片另存为",
    };
  }
}
