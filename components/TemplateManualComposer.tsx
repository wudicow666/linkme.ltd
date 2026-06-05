"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { getShellTemplate } from "@/lib/shellTemplates";
import {
  DEFAULT_SHELL_OVERLAY_LAYOUT,
  type ShellOverlayText,
} from "@/lib/shellOverlayText";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

const QR_DIAMETER_MIN = 80;
const QR_DIAMETER_MAX = 500;

function clampDiameter(value: number): number {
  return Math.min(QR_DIAMETER_MAX, Math.max(QR_DIAMETER_MIN, Math.round(value)));
}

function clampCoord(value: number, max: number): number {
  return Math.min(max, Math.max(0, Math.round(value)));
}

export type ManualShellTransform = {
  qrX: number;
  qrY: number;
  qrDiameter: number;
};

type Props = {
  templateId: string;
  transform: ManualShellTransform;
  onTransformChange: (t: ManualShellTransform) => void;
  overlay: ShellOverlayText;
  /** 实时 SVG 预览（随链接/样式即时更新） */
  qrPreview: React.ReactNode;
  /** 与 CircularQRCode 的 canvasSize 一致，用于缩放 */
  qrCanvasSize: number;
};

const TemplateManualComposer: React.FC<Props> = ({
  templateId,
  transform,
  onTransformChange,
  overlay,
  qrPreview,
  qrCanvasSize,
}) => {
  const template = getShellTemplate(templateId);
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayScale, setDisplayScale] = useState(1);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !template) return;
    const ro = new ResizeObserver(() => {
      setDisplayScale(el.clientWidth / template.width);
    });
    ro.observe(el);
    setDisplayScale(el.clientWidth / template.width);
    return () => ro.disconnect();
  }, [template]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!template) return;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        originX: transform.qrX,
        originY: transform.qrY,
      };
    },
    [template, transform.qrX, transform.qrY],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!template) return;
      if (!d?.active) return;
      const dx = (e.clientX - d.startX) / displayScale;
      const dy = (e.clientY - d.startY) / displayScale;
      onTransformChange({
        ...transform,
        qrX: d.originX + dx,
        qrY: d.originY + dy,
      });
    },
    [displayScale, onTransformChange, template, transform],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (dragRef.current) dragRef.current.active = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  if (!template) return null;

  const { qrX, qrY, qrDiameter } = transform;
  const overlayContent = overlay.text.trim();
  const layout = DEFAULT_SHELL_OVERLAY_LAYOUT;
  const displayD = qrDiameter * displayScale;
  const left = qrX * displayScale - displayD / 2;
  const top = qrY * displayScale - displayD / 2;
  const previewScale = displayD / qrCanvasSize;

  return (
    <div className="space-y-4 w-full">
      <div
        ref={containerRef}
        className="relative w-full mx-auto select-none touch-none rounded-lg overflow-hidden bg-gray-100 shadow-inner"
        style={{ aspectRatio: `${template.width} / ${template.height}` }}
      >
        <img
          src={template.imageUrl}
          alt={template.name}
          className="block w-full h-full pointer-events-none"
          draggable={false}
        />
        <div
          className="absolute cursor-move overflow-hidden"
          style={{
            width: displayD,
            height: displayD,
            left,
            top,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            className="pointer-events-none origin-top-left"
            style={{
              width: qrCanvasSize,
              height: qrCanvasSize,
              transform: `scale(${previewScale})`,
            }}
          >
            {qrPreview}
          </div>
        </div>
        {overlay.enabled && overlayContent && (
          <span
            className="absolute pointer-events-none font-bold select-none whitespace-pre"
            style={{
              right: layout.marginRight * displayScale,
              bottom: layout.marginBottom * displayScale,
              fontSize: overlay.fontSize * displayScale,
              color: overlay.color,
              lineHeight: 1,
            }}
          >
            {overlayContent}
          </span>
        )}
      </div>

      <div className="space-y-3 rounded-lg border p-4 bg-gray-50">
        <div className="space-y-2">
          <Label>圆码大小（模板像素）</Label>
          <div className="flex items-center gap-3">
            <Slider
              value={[qrDiameter]}
              onValueChange={([v]) =>
                onTransformChange({
                  ...transform,
                  qrDiameter: clampDiameter(v),
                })
              }
              min={QR_DIAMETER_MIN}
              max={QR_DIAMETER_MAX}
              step={1}
              className="flex-1"
            />
            <div className="flex items-center gap-1 shrink-0">
              <Input
                type="number"
                min={QR_DIAMETER_MIN}
                max={QR_DIAMETER_MAX}
                step={1}
                value={Math.round(qrDiameter)}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  onTransformChange({
                    ...transform,
                    qrDiameter: clampDiameter(n),
                  });
                }}
                className="w-20 h-9 text-right tabular-nums"
              />
              <span className="text-sm text-gray-600">px</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>水平位置 X（模板像素）</Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                max={template.width}
                step={1}
                value={Math.round(qrX)}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  onTransformChange({
                    ...transform,
                    qrX: clampCoord(n, template.width),
                  });
                }}
                className="w-full h-9 text-right tabular-nums"
              />
              <span className="text-sm text-gray-600 shrink-0">px</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>垂直位置 Y（模板像素）</Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                max={template.height}
                step={1}
                value={Math.round(qrY)}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  onTransformChange({
                    ...transform,
                    qrY: clampCoord(n, template.height),
                  });
                }}
                className="w-full h-9 text-right tabular-nums"
              />
              <span className="text-sm text-gray-600 shrink-0">px</span>
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() =>
            onTransformChange({
              qrX: template.defaultQrX,
              qrY: template.defaultQrY,
              qrDiameter: template.defaultQrDiameter,
            })
          }
        >
          重置位置与大小
        </Button>
        <p className="text-xs text-gray-500">
          在预览图上拖动圆码，或用下方数值调整位置（X/Y 为圆心在模板上的坐标）与大小。对准留白/圆环后导出 PNG。
        </p>
      </div>
    </div>
  );
};

export default TemplateManualComposer;
