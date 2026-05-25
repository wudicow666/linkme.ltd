export type RasterizeComponent = "full" | "foreground" | "background";

export function cloneSvgForExport(
  svg: SVGSVGElement,
  component: RasterizeComponent,
): SVGSVGElement {
  const el = svg.cloneNode(true) as SVGSVGElement;
  if (component === "full") return el;

  if (component === "foreground") {
    el.querySelectorAll(
      ".backgroundRects, .circle-background, .borderText",
    ).forEach((node) => node.parentNode?.removeChild(node));
    const overlay = el.querySelector(".overlayImage");
    overlay?.parentNode?.removeChild(overlay);
  } else {
    el.querySelectorAll(
      ".qrcode, .finderPatterns, .qrRects, .overlayImage, .finderBars",
    ).forEach((node) => node.parentNode?.removeChild(node));
  }
  return el;
}

export function svgElementToDataUrl(
  svg: SVGSVGElement,
  resolution: number,
  format: "png" | "webp" = "png",
  quality = 0.92,
): Promise<string> {
  const svgString = new XMLSerializer().serializeToString(svg);
  const url =
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = resolution;
      canvas.height = resolution;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 不可用"));
        return;
      }
      ctx.clearRect(0, 0, resolution, resolution);
      ctx.drawImage(img, 0, 0, resolution, resolution);
      resolve(
        canvas.toDataURL(
          `image/${format}`,
          format === "png" ? undefined : quality,
        ),
      );
    };
    img.onerror = () => reject(new Error("SVG 转图片失败"));
    img.src = url;
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = src;
  });
}
