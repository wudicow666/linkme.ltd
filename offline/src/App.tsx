import { useMemo } from "react";
import QRCodeGenerator from "@/components/QRCodeGenerator";

function readQueryInitialData(): Record<string, unknown> | undefined {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  const url = params.get("url");
  if (!url) return undefined;
  return {
    text: url,
    qrTrimCircle: true,
    qrTrimCircleRadius: 235,
    qrCodeSize: 470,
    canvasSize: 1000,
    borderWidth: 10,
    borderColor: "#000000",
    backgroundCoverage: 100,
    bgOption: "solid",
    bgColor: "#ffffff",
    qrColor: "#000000",
    roundness: 0,
    finderRoundness: 0,
    opacityVariation: 0,
    showText: false,
    borderTextEnabled: false,
  };
}

export default function App() {
  const initialData = useMemo(() => readQueryInitialData(), []);
  const autoMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("auto") === "1";

  if (autoMode) {
    return (
      <main className="min-h-screen bg-gray-100 p-4">
        <QRCodeGenerator initialData={initialData} />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b bg-white px-4 py-3 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">离线二维码生成器</h1>
        <p className="mt-1 text-sm text-gray-500">
          无需登录、无需联网；生成与导出均在本地浏览器完成
        </p>
      </header>
      <main>
        <QRCodeGenerator initialData={initialData} />
      </main>
    </div>
  );
}
