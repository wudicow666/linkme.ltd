"use client";

import React, { useMemo, useState } from "react";

type QROptionType = "solid" | "gradient" | "multiple";

/** classic=三层方块；unifiedDots=圆点拼方框；cross=十字+弱化外框；sparse560=560 稀疏定位角 */
export type FinderRenderStyle =
    | "classic"
    | "unifiedDots"
    | "cross"
    | "sparse560";

/** 560 每个 7×7 定位角内仅保留的 17 个格（本地 lr,lc） */
const SPARSE560_FINDER_LOCAL = new Set([
    "2,3",
    "3,3",
    "4,3",
    "3,2",
    "3,4",
    "0,2",
    "0,3",
    "0,4",
    "6,2",
    "6,3",
    "6,4",
    "2,0",
    "3,0",
    "4,0",
    "2,6",
    "3,6",
    "4,6",
]);

/** 扫一扫优化时额外补 4 角（不补满框，避免方框感） */
const SPARSE560_SCAN_CORNER_LOCAL = new Set(["0,0", "0,6", "6,0", "6,6"]);

interface CircularQRCodeProps {
    qrcode: any;
    bgOption: "solid" | "gradient";
    bgColor: string;
    bgGradientType: "linear" | "conic";
    bgGradientColors: string[];
    bgGradientAngle: number;
    qrOption: QROptionType;
    qrColor: string;
    qrGradientType: "linear" | "conic";
    qrGradientColors: string[];
    qrGradientAngle: number;
    qrPalette: string[];
    finderPatternOption: "same" | "solid";
    finderPatternColor: string;
    finderRenderStyle: FinderRenderStyle;
    /** sparse560 下补全对齐块/定位角扫码暗点，兼顾微信与抖音扫一扫 */
    scanOptimized: boolean;
    showText: boolean;
    roundness: number;
    opacityVariation: number;
    finderRoundness: number;
    rectScaleX: number;
    rectScaleY: number;
    scaleVariation: number;
    rectRotation: number;
    uploadedImageDataUrl: string | null;
    imageScale: number;
    moduleSize: number;
    qrCodeSize: number;
    /** 82–100：在 qrCodeSize 基础上等比缩小圆码，增大外圈点阵占比 */
    qrCompactness: number;
    qrTrimCircle: boolean;
    qrTrimCircleRadius: number;
    moduleCount: number;
    borderColor: string;
    borderWidth: number;
    centerGapWidth: number;
    centerGapHeight: number;
    backgroundCoverage: number;
    svgRef: React.RefObject<SVGSVGElement | null>;
    secondBorderEnabled: boolean;
    secondBorderColor: string;
    secondBorderRange: [number, number];
    borderTextEnabled: boolean;
    textLine1: string;
    textLine2: string;
    numTextLines: 1 | 2;
    fontFamily: string;
    fontSize: number;
    textColor: string;
    fontWeight: string;
    letterSpacing: number;
    condensed: boolean;
    textPadding: number;
    canvasSize: number;
    barsEnabled: boolean;
    barsColor: string;
    barsWidth: number;
    barsGapDegrees: number;
    barsRoundEnds: boolean;
    barsRadiusOffset: number;

    /**
     * NEW: Gradient stops for background and QR code
     * (Used to dynamically generate <stop> elements in the <defs>)
     */
    bgGradientStops?: { color: string; position: number }[];
    qrGradientStops?: { color: string; position: number }[];
}

const CircularQRCode: React.FC<CircularQRCodeProps> = ({
                                                           qrcode,
                                                           bgOption,
                                                           bgColor,
                                                           bgGradientType,
                                                           bgGradientColors,
                                                           bgGradientAngle,
                                                           qrOption,
                                                           qrColor,
                                                           qrGradientType,
                                                           qrGradientColors,
                                                           qrGradientAngle,
                                                           qrPalette,
                                                           finderPatternOption,
                                                           finderPatternColor,
                                                           finderRenderStyle,
                                                           scanOptimized,
                                                           showText,
                                                           roundness,
                                                           opacityVariation,
                                                           finderRoundness,
                                                           rectScaleX,
                                                           rectScaleY,
                                                           scaleVariation,
                                                           rectRotation,
                                                           uploadedImageDataUrl,
                                                           imageScale,
                                                           moduleSize,
                                                           qrCodeSize,
                                                           qrCompactness,
                                                           qrTrimCircle,
                                                           qrTrimCircleRadius,
                                                           moduleCount,
                                                           borderColor,
                                                           borderWidth,
                                                           centerGapWidth,
                                                           centerGapHeight,
                                                           backgroundCoverage,
                                                           svgRef,
                                                           secondBorderEnabled,
                                                           secondBorderColor,
                                                           secondBorderRange,
                                                           borderTextEnabled,
                                                           textLine1,
                                                           textLine2,
                                                           numTextLines,
                                                           fontFamily,
                                                           fontSize,
                                                           textColor,
                                                           fontWeight,
                                                           letterSpacing,
                                                           condensed,
                                                           textPadding,
                                                           canvasSize,
                                                           barsEnabled,
                                                           barsColor,
                                                           barsWidth,
                                                           barsGapDegrees,
                                                           barsRoundEnds,
                                                           barsRadiusOffset,

                                                           // NEW optional props for gradient stops
                                                           bgGradientStops = [],
                                                           qrGradientStops = [],
                                                       }) => {
    // -----------------------------
    // NEW or UPDATED: Track which rects have been "removed"
    // -----------------------------
    const [removedRectIds, setRemovedRectIds] = useState<Set<string>>(
        () => new Set()
    );

    const handleRectClick = (id: string) => {
        setRemovedRectIds((prev) => {
            const newSet = new Set(prev);
            newSet.add(id);
            return newSet;
        });
    };

    // Generate unique IDs for gradients
    const bgGradientId = `bgGradient-${Date.now()}`;
    const qrGradientId = `qrGradient-${Date.now()}`;

    // Background fill
    const bgFill = bgOption === "solid" ? bgColor : `url(#${bgGradientId})`;

    // QR fill
    const qrFill = useMemo(() => {
        if (qrOption === "solid") {
            return qrColor;
        } else if (qrOption === "gradient") {
            return `url(#${qrGradientId})`;
        }
        // "multiple" => handled in the rect loop with random picks
        return null;
    }, [qrOption, qrColor, qrGradientId]);

    // Basic geometry / calculations
    const compactnessFactor = qrCompactness / 100;
    const effectiveQrCodeSize = qrCodeSize * compactnessFactor;
    const qrCodeOffsetX = (canvasSize - effectiveQrCodeSize) / 2;
    const qrCodeOffsetY = (canvasSize - effectiveQrCodeSize) / 2;
    const qrGroupTransform = `translate(${qrCodeOffsetX}px, ${qrCodeOffsetY}px) scale(${compactnessFactor})`;
    const rxRy = (roundness / 100) * (moduleSize / 2);

    // Variation parameters
    const minOpacity = 0.7;
    const maxOpacityVariation = (opacityVariation / 100) * (1 - minOpacity);

    // Finder pattern positions for typical QR
    const finderPatternPositions = [
        { row: 0, col: 0 },
        { row: 0, col: moduleCount - 7 },
        { row: moduleCount - 7, col: 0 },
    ];

    // Center gap
    const centerGapX = (qrCodeSize - centerGapWidth) / 2;
    const centerGapY = (qrCodeSize - centerGapHeight) / 2;

    // Rectangles intersection helper
    const rectanglesIntersect = (
        r1: { x: number; y: number; width: number; height: number },
        r2: { x: number; y: number; width: number; height: number }
    ): boolean => {
        return !(
            r2.x > r1.x + r1.width ||
            r2.x + r2.width < r1.x ||
            r2.y > r1.y + r1.height ||
            r2.y + r2.height < r1.y
        );
    };

    function rectangleIntersectsCircle(
        rect: { x: number; y: number; width: number; height: number },
        circle: { x: number; y: number; radius: number }
    ): boolean {
        // Find the closest point on the rectangle to the circle's center
        const closestX = clamp(circle.x, rect.x, rect.x + rect.width);
        const closestY = clamp(circle.y, rect.y, rect.y + rect.height);

        // Compute the distance from that point to the circle's center
        const distX = circle.x - closestX;
        const distY = circle.y - closestY;
        const distanceSquared = distX * distX + distY * distY;
        const radiusSquared = circle.radius * circle.radius;

        return distanceSquared <= radiusSquared;
    }

    function clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(value, max));
    }

    const isFinderModule = (row: number, col: number) =>
        finderPatternPositions.some(
            (pos) =>
                row >= pos.row &&
                row < pos.row + 7 &&
                col >= pos.col &&
                col < pos.col + 7
        );

    const resolveModuleFill = (): string => {
        if (qrOption === "multiple") {
            const randomIndex = Math.floor(Math.random() * qrPalette.length);
            return qrPalette[randomIndex];
        }
        return qrFill || qrColor || "#000000";
    };

    const shouldSkipModuleForGapOrTrim = (
        row: number,
        col: number
    ): boolean => {
        const x = col * moduleSize;
        const y = row * moduleSize;
        const moduleRect = { x, y, width: moduleSize, height: moduleSize };
        const gapRect = {
            x: centerGapX,
            y: centerGapY,
            width: centerGapWidth,
            height: centerGapHeight,
        };
        if (rectanglesIntersect(moduleRect, gapRect)) {
            return true;
        }
        const trimCircle = {
            x: qrCodeSize / 2,
            y: qrCodeSize / 2,
            radius: qrTrimCircleRadius,
        };
        return !rectangleIntersectsCircle(moduleRect, trimCircle) && qrTrimCircle;
    };

    const getFinderLocalCoords = (
        row: number,
        col: number
    ): { pos: { row: number; col: number }; lr: number; lc: number } | null => {
        const pos = finderPatternPositions.find(
            (p) =>
                row >= p.row &&
                row < p.row + 7 &&
                col >= p.col &&
                col < p.col + 7
        );
        if (!pos) {
            return null;
        }
        return {
            pos,
            lr: row - pos.row,
            lc: col - pos.col,
        };
    };

    const isSparse560FinderDot = (row: number, col: number): boolean => {
        const local = getFinderLocalCoords(row, col);
        if (!local) {
            return false;
        }
        const key = `${local.lr},${local.lc}`;
        if (SPARSE560_FINDER_LOCAL.has(key)) {
            return true;
        }
        return (
            scanOptimized && SPARSE560_SCAN_CORNER_LOCAL.has(key)
        );
    };

    const isSparse560AccentDot = (row: number, col: number): boolean => {
        const local = getFinderLocalCoords(row, col);
        if (!local) {
            return false;
        }
        return SPARSE560_FINDER_LOCAL.has(`${local.lr},${local.lc}`);
    };

    const getCrossFinderVisual = (
        row: number,
        col: number
    ): { scale: number; opacity: number } => {
        const pos = finderPatternPositions.find(
            (p) =>
                row >= p.row &&
                row < p.row + 7 &&
                col >= p.col &&
                col < p.col + 7
        );
        if (!pos) {
            return { scale: 1, opacity: 1 };
        }

        const lr = row - pos.row;
        const lc = col - pos.col;

        // 十字主轴：保持清晰可扫
        if (lr === 3 || lc === 3) {
            return { scale: 1, opacity: 1 };
        }

        // 外框（非十字交点）：略弱化但仍足够扫码
        if (lr === 0 || lr === 6 || lc === 0 || lc === 6) {
            return { scale: 0.48, opacity: 0.62 };
        }

        // 内框四角
        if ((lr === 2 || lr === 4) && (lc === 2 || lc === 4)) {
            return { scale: 0.42, opacity: 0.55 };
        }

        // 内框边（非十字）
        if (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4) {
            return { scale: 0.5, opacity: 0.58 };
        }

        return { scale: 0.45, opacity: 0.55 };
    };

    const distanceToQrBoundingBox = (
        px: number,
        py: number
    ): number => {
        const left = qrCodeOffsetX;
        const right = qrCodeOffsetX + effectiveQrCodeSize;
        const top = qrCodeOffsetY;
        const bottom = qrCodeOffsetY + effectiveQrCodeSize;
        const dx =
            px < left ? left - px : px >= right ? px - right : 0;
        const dy =
            py < top ? top - py : py >= bottom ? py - bottom : 0;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const ALIGNMENT_PATTERN = [
        [1, 1, 1, 1, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 1, 1, 1],
        [1, 0, 1, 1, 1],
        [1, 1, 1, 1, 1],
    ];

    const alignmentPatternOrigins = useMemo(() => {
        if (!qrcode || moduleCount < 21) {
            return [] as { row: number; col: number }[];
        }

        const origins: { row: number; col: number }[] = [];

        for (let r = 0; r <= moduleCount - 5; r++) {
            for (let c = 0; c <= moduleCount - 5; c++) {
                let overlapsFinder = false;
                for (let dr = 0; dr < 5; dr++) {
                    for (let dc = 0; dc < 5; dc++) {
                        if (isFinderModule(r + dr, c + dc)) {
                            overlapsFinder = true;
                            break;
                        }
                    }
                    if (overlapsFinder) break;
                }
                if (overlapsFinder) continue;

                let matches = true;
                for (let dr = 0; dr < 5; dr++) {
                    for (let dc = 0; dc < 5; dc++) {
                        const shouldBeDark = ALIGNMENT_PATTERN[dr][dc] === 1;
                        if (qrcode.isDark(r + dr, c + dc) !== shouldBeDark) {
                            matches = false;
                            break;
                        }
                    }
                    if (!matches) break;
                }
                if (matches) {
                    origins.push({ row: r, col: c });
                }
            }
        }

        return origins;
    }, [qrcode, moduleCount, finderPatternPositions]);

    const isAlignmentModule = (row: number, col: number) =>
        alignmentPatternOrigins.some(
            (origin) =>
                row >= origin.row &&
                row < origin.row + 5 &&
                col >= origin.col &&
                col < origin.col + 5
        );

    const getCrossAlignmentVisual = (
        row: number,
        col: number
    ): { scale: number; opacity: number } => {
        const origin = alignmentPatternOrigins.find(
            (o) =>
                row >= o.row &&
                row < o.row + 5 &&
                col >= o.col &&
                col < o.col + 5
        );
        if (!origin) {
            return { scale: 0.32, opacity: 0.3 };
        }

        const lr = row - origin.row;
        const lc = col - origin.col;

        if (lr === 2 && lc === 2) {
            return { scale: 0.42, opacity: 0.38 };
        }

        if (lr === 0 || lr === 4 || lc === 0 || lc === 4) {
            return { scale: 0.38, opacity: 0.48 };
        }

        return { scale: 0.4, opacity: 0.5 };
    };

    const getCrossDataVisual = (): { scale: number; opacity: number } => ({
        scale: 0.96,
        opacity: 1,
    });

    /** 560 稀疏定位角主轴 17 点：略大一点便于肉眼辨认 */
    const getSparse560AccentVisual = (): { scale: number; opacity: number } => ({
        scale: 1,
        opacity: 1,
    });

    /** 对齐块：介于弱化与全实心之间，避免微信/抖音扫一扫互斥 */
    const getScanBalancedAlignmentVisual = (): { scale: number; opacity: number } => ({
        scale: 0.93,
        opacity: 0.96,
    });

    const decorStrokeColor =
        qrOption === "solid" ? qrColor : qrFill || qrColor || "#000000";

    const clockHourToRad = (hour: number) =>
        -Math.PI / 2 + (hour / 12) * 2 * Math.PI;

    const uses560VisualStack =
        finderRenderStyle === "cross" || finderRenderStyle === "sparse560";

    const outerDecorations = useMemo(() => {
        if (!uses560VisualStack) {
            return null;
        }

        const cx = canvasSize / 2;
        const cy = canvasSize / 2;
        const outerR = canvasSize / 2;
        // 放在 QR 数据区之外、靠近外边框，避免与三个定位角重叠
        const decorRadius =
            outerR - borderWidth - Math.max(moduleSize * 1.2, 8);
        const ringR = moduleSize * 0.72;
        const dotR = moduleSize * 0.22;
        const strokeW = Math.max(0.8, moduleSize * 0.07);
        const decorOpacity = 0.42;

        const anchors = [10, 4, 8].map((hour) => {
            const angle = clockHourToRad(hour);
            const x = cx + decorRadius * Math.cos(angle);
            const y = cy + decorRadius * Math.sin(angle);
            return (
                <g key={`decor-anchor-${hour}`} opacity={decorOpacity}>
                    <circle
                        cx={x}
                        cy={y}
                        r={ringR}
                        fill="none"
                        stroke={decorStrokeColor}
                        strokeWidth={strokeW}
                    />
                    <circle cx={x} cy={y} r={dotR} fill={decorStrokeColor} />
                </g>
            );
        });

        const largeAngle = clockHourToRad(2);
        const largeX = cx + decorRadius * Math.cos(largeAngle);
        const largeY = cy + decorRadius * Math.sin(largeAngle);
        const largeRing = (
            <circle
                key="decor-large-ring"
                cx={largeX}
                cy={largeY}
                r={moduleSize * 1.55}
                fill="none"
                stroke={decorStrokeColor}
                strokeWidth={strokeW}
                opacity={decorOpacity * 0.85}
            />
        );

        return (
            <g className="outerDecorations" pointerEvents="none">
                {anchors}
                {largeRing}
            </g>
        );
    }, [
        uses560VisualStack,
        canvasSize,
        moduleSize,
        borderWidth,
        decorStrokeColor,
    ]);

    const renderModuleDot = (
        row: number,
        col: number,
        rectId: string,
        options?: {
            clickable?: boolean;
            opacity?: number;
            scale?: number;
        }
    ): React.ReactNode | null => {
        if (removedRectIds.has(rectId)) {
            return null;
        }
        if (shouldSkipModuleForGapOrTrim(row, col)) {
            return null;
        }

        const x = col * moduleSize;
        const y = row * moduleSize;
        const inFinder = isFinderModule(row, col);
        const inAlignment = isAlignmentModule(row, col);

        let moduleVisual: { scale: number; opacity: number } | null = null;
        if (finderRenderStyle === "sparse560") {
            if (inFinder) {
                if (!isSparse560FinderDot(row, col)) {
                    return null;
                }
                moduleVisual = isSparse560AccentDot(row, col)
                    ? getSparse560AccentVisual()
                    : getCrossDataVisual();
            } else if (inAlignment) {
                moduleVisual = scanOptimized
                    ? getScanBalancedAlignmentVisual()
                    : getCrossAlignmentVisual(row, col);
            } else {
                moduleVisual = getCrossDataVisual();
            }
        } else if (finderRenderStyle === "cross") {
            if (inFinder) {
                moduleVisual = getCrossFinderVisual(row, col);
            } else if (inAlignment) {
                moduleVisual = getCrossAlignmentVisual(row, col);
            } else {
                moduleVisual = getCrossDataVisual();
            }
        }

        const opacity =
            options?.opacity ??
            (moduleVisual
                ? moduleVisual.opacity
                : 1 - Math.random() * maxOpacityVariation);

        const fillColor = resolveModuleFill();

        const scaleFactor =
            options?.scale ??
            (moduleVisual
                ? moduleVisual.scale
                : 1 - Math.random() * (scaleVariation / 100));

        const finalScaleX = rectScaleX * scaleFactor;
        const finalScaleY = rectScaleY * scaleFactor;
        const clickable = options?.clickable ?? true;

        return (
            <g
                key={rectId}
                onClick={clickable ? () => handleRectClick(rectId) : undefined}
                transform={`
              translate(${x + moduleSize / 2}, ${y + moduleSize / 2})
              rotate(${rectRotation})
              scale(${finalScaleX}, ${finalScaleY})
              translate(${-moduleSize / 2}, ${-moduleSize / 2})
            `}
            >
                <rect
                    width={moduleSize}
                    height={moduleSize}
                    rx={rxRy}
                    ry={rxRy}
                    fill={fillColor}
                    style={{
                        shapeRendering: "crispEdges",
                        opacity,
                        cursor: clickable ? "pointer" : "default",
                    }}
                />
            </g>
        );
    };


    // -----------------------------
    // QR modules (non-finder)
    // -----------------------------
    const qrRects = useMemo(() => {
        const rects: React.ReactNode[] = [];

        for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
                if (!qrcode.isDark(row, col)) {
                    continue;
                }

                if (
                    isFinderModule(row, col) &&
                    finderRenderStyle === "classic"
                ) {
                    continue;
                }

                const rectId = `qr-${row}-${col}`;
                const dot = renderModuleDot(row, col, rectId);
                if (dot) {
                    rects.push(dot);
                }
            }
        }
        return rects;
    }, [
        moduleCount,
        moduleSize,
        qrcode,
        rxRy,
        maxOpacityVariation,
        qrFill,
        qrColor,
        finderPatternPositions,
        centerGapX,
        centerGapY,
        centerGapWidth,
        centerGapHeight,
        qrOption,
        qrPalette,
        rectScaleX,
        rectScaleY,
        scaleVariation,
        rectRotation,
        qrTrimCircle,
        qrTrimCircleRadius,
        finderRenderStyle,
        scanOptimized,
        removedRectIds,
        alignmentPatternOrigins,
    ]);

    // -----------------------------
    // Finder Patterns
    // (These could also be made clickable, if you want them removable too.)
    // -----------------------------
    const finderPatterns = useMemo(() => {
        const patterns: React.ReactNode[] = [];

        finderPatternPositions.forEach((pos, index) => {
            const xOuter = pos.col * moduleSize;
            const yOuter = pos.row * moduleSize;
            const sizeOuter = moduleSize * 7;
            const sizeMiddle = moduleSize * 5;
            const sizeInner = moduleSize * 3;
            const maxRadius = sizeInner / 2;

            const rxRyFinder = Math.min(
                (finderRoundness / 100) * (sizeOuter / 2),
                maxRadius
            );

            const offsetMiddle = (sizeOuter - sizeMiddle) / 2;
            const offsetInner = (sizeOuter - sizeInner) / 2;

            // Decide finder fill
            let finderFill =
                finderPatternOption === "solid" ? finderPatternColor : qrFill;

            if (finderPatternOption === "same") {
                if (qrOption === "multiple") {
                    const randomIndex = Math.floor(Math.random() * qrPalette.length);
                    finderFill = qrPalette[randomIndex];
                } else if (qrOption === "gradient") {
                    finderFill = `url(#${qrGradientId})`;
                } else {
                    finderFill = qrColor;
                }
            }

            patterns.push(
                <g key={`finder-${index}`}>
                    {/* Outer + Middle squares */}
                    <path
                        d={`
              M ${xOuter + rxRyFinder},${yOuter}
              h ${sizeOuter - 2 * rxRyFinder}
              q ${rxRyFinder},0 ${rxRyFinder},${rxRyFinder}
              v ${sizeOuter - 2 * rxRyFinder}
              q 0,${rxRyFinder} -${rxRyFinder},${rxRyFinder}
              h -${sizeOuter - 2 * rxRyFinder}
              q -${rxRyFinder},0 -${rxRyFinder},-${rxRyFinder}
              v -${sizeOuter - 2 * rxRyFinder}
              q 0,-${rxRyFinder} ${rxRyFinder},-${rxRyFinder}
              z

              M ${xOuter + offsetMiddle + rxRyFinder},${yOuter + offsetMiddle}
              h ${sizeMiddle - 2 * rxRyFinder}
              q ${rxRyFinder},0 ${rxRyFinder},${rxRyFinder}
              v ${sizeMiddle - 2 * rxRyFinder}
              q 0,${rxRyFinder} -${rxRyFinder},${rxRyFinder}
              h -${sizeMiddle - 2 * rxRyFinder}
              q -${rxRyFinder},0 -${rxRyFinder},-${rxRyFinder}
              v -${sizeMiddle - 2 * rxRyFinder}
              q 0,-${rxRyFinder} ${rxRyFinder},-${rxRyFinder}
              z
            `}
                        fill={finderFill!}
                        fillRule="evenodd"
                    />
                    {/* Inner square */}
                    <rect
                        x={xOuter + offsetInner}
                        y={yOuter + offsetInner}
                        width={sizeInner}
                        height={sizeInner}
                        rx={rxRyFinder}
                        ry={rxRyFinder}
                        fill={finderFill!}
                    />
                </g>
            );
        });

        return patterns;
    }, [
        moduleSize,
        finderRoundness,
        finderPatternPositions,
        qrFill,
        qrOption,
        qrPalette,
        finderPatternOption,
        finderPatternColor,
        qrColor,
        qrGradientId,
    ]);

    // -----------------------------
    // Background rects
    // -----------------------------
    const backgroundRects = useMemo(() => {
        const rects: React.ReactNode[] = [];
        const gridCount = Math.ceil(canvasSize / moduleSize);
        const radius = canvasSize / 2;

        const coverageRadius = (backgroundCoverage / 100) * radius;
        const maxDistanceAllowed =
            coverageRadius - (moduleSize * Math.SQRT2) / 2; // approximate

        for (let row = 0; row < gridCount; row++) {
            for (let col = 0; col < gridCount; col++) {
                const x = col * moduleSize;
                const y = row * moduleSize;
                const rectCenterX = x + moduleSize / 2;
                const rectCenterY = y + moduleSize / 2;
                const dx = rectCenterX - radius;
                const dy = rectCenterY - radius;
                const distanceToCenter = Math.sqrt(dx * dx + dy * dy);

                // Outside coverage area => skip
                if (distanceToCenter > maxDistanceAllowed) {
                    continue;
                }

                if (uses560VisualStack) {
                    const cellCenterX = x + moduleSize / 2;
                    const cellCenterY = y + moduleSize / 2;

                    // 严禁在 QR 矩阵区域内绘制背景点（含静区/留白格）
                    if (
                        distanceToQrBoundingBox(cellCenterX, cellCenterY) <
                        moduleSize * 0.5
                    ) {
                        continue;
                    }

                    const edgeDist = distanceToQrBoundingBox(
                        cellCenterX,
                        cellCenterY
                    );
                    const inBlendRing = edgeDist < moduleSize * 4.5;

                    const backgroundSpawnRate = inBlendRing ? 0.72 : 0.5;
                    if (Math.random() >= backgroundSpawnRate) {
                        continue;
                    }

                    // 与 QR 数据点同色同尺度：实心黑、不透明度 1，仅通过疏密区分区域
                    const dataVisual = getCrossDataVisual();
                    const opacity = dataVisual.opacity;
                    const randScaleFactor =
                        dataVisual.scale * (0.97 + Math.random() * 0.06);

                    let fillColor: string | null = qrFill || "#000000";
                    if (qrOption === "multiple") {
                        const randomIndex = Math.floor(
                            Math.random() * qrPalette.length
                        );
                        fillColor = qrPalette[randomIndex];
                    }

                    const rectId = `bg-${row}-${col}`;
                    if (removedRectIds.has(rectId)) {
                        continue;
                    }

                    const finalScaleX = rectScaleX * randScaleFactor;
                    const finalScaleY = rectScaleY * randScaleFactor;

                    rects.push(
                        <g
                            key={rectId}
                            onClick={() => handleRectClick(rectId)}
                            transform={`
                translate(${x + moduleSize / 2}, ${y + moduleSize / 2})
                rotate(${rectRotation})
                scale(${finalScaleX}, ${finalScaleY})
                translate(${-moduleSize / 2}, ${-moduleSize / 2})
              `}
                        >
                            <rect
                                width={moduleSize}
                                height={moduleSize}
                                rx={rxRy}
                                ry={rxRy}
                                fill={fillColor!}
                                style={{
                                    opacity,
                                    cursor: "pointer",
                                }}
                            />
                        </g>
                    );
                    continue;
                }

                const referenceSize = 440;
                const referenceOffset = 15;

                if (
                    x >=
                        qrCodeOffsetX -
                            (effectiveQrCodeSize / referenceSize) * referenceOffset &&
                    x < qrCodeOffsetX + effectiveQrCodeSize &&
                    y >=
                        qrCodeOffsetY -
                            (effectiveQrCodeSize / referenceSize) * referenceOffset &&
                    y < qrCodeOffsetY + effectiveQrCodeSize
                ) {
                    continue;
                }

                if (Math.random() < 0.5) {
                    const opacity = 1 - Math.random() * maxOpacityVariation;
                    let fillColor: string | null = qrFill || "#000000";

                    if (qrOption === "multiple") {
                        const randomIndex = Math.floor(Math.random() * qrPalette.length);
                        fillColor = qrPalette[randomIndex];
                    }

                    // Scale Variation
                    const randScaleFactor =
                        1 - Math.random() * (scaleVariation / 100);
                    const finalScaleX = rectScaleX * randScaleFactor;
                    const finalScaleY = rectScaleY * randScaleFactor;

                    // NEW or UPDATED: unique ID for background rect
                    const rectId = `bg-${row}-${col}`;

                    if (removedRectIds.has(rectId)) {
                        continue;
                    }

                    rects.push(
                        <g
                            key={rectId}
                            onClick={() => handleRectClick(rectId)}
                            transform={`
                translate(${x + moduleSize / 2}, ${y + moduleSize / 2})
                rotate(${rectRotation})
                scale(${finalScaleX}, ${finalScaleY})
                translate(${-moduleSize / 2}, ${-moduleSize / 2})
              `}
                        >
                            <rect
                                width={moduleSize}
                                height={moduleSize}
                                rx={rxRy}
                                ry={rxRy}
                                fill={fillColor!}
                                style={{
                                    opacity: opacity,
                                    cursor: "pointer", // optional for clarity
                                }}
                            />
                        </g>
                    );
                }
            }
        }

        return rects;
    }, [
        canvasSize,
        moduleSize,
        qrCodeOffsetX,
        qrCodeOffsetY,
        qrCodeSize,
        effectiveQrCodeSize,
        rxRy,
        maxOpacityVariation,
        qrFill,
        backgroundCoverage,
        qrOption,
        qrPalette,
        rectScaleX,
        rectScaleY,
        scaleVariation,
        rectRotation,
        removedRectIds,
        finderRenderStyle,
        qrTrimCircle,
        qrTrimCircleRadius,
    ]);

    // -----------------------------
    // Circular border geometry
    // -----------------------------
    const outerRadius = canvasSize / 2;
    const innerRadius = outerRadius - borderWidth;

    // Helper to create annulus path
    const generateAnnulusPath = (
        cx: number,
        cy: number,
        rOuter: number,
        rInner: number
    ): string => {
        return `
      M ${cx + rOuter}, ${cy}
      A ${rOuter},${rOuter} 0 1,0 ${cx - rOuter},${cy}
      A ${rOuter},${rOuter} 0 1,0 ${cx + rOuter},${cy}
      M ${cx + rInner}, ${cy}
      A ${rInner},${rInner} 0 1,1 ${cx - rInner},${cy}
      A ${rInner},${rInner} 0 1,1 ${cx + rInner},${cy}
      Z
    `;
    };

    let secondBorderPath = "";
    if (secondBorderEnabled) {
        const secondBorderOuterRadius =
            outerRadius - (secondBorderRange[0] / 100) * borderWidth;
        const secondBorderInnerRadius =
            outerRadius - (secondBorderRange[1] / 100) * borderWidth;

        secondBorderPath = generateAnnulusPath(
            canvasSize / 2,
            canvasSize / 2,
            secondBorderOuterRadius,
            secondBorderInnerRadius
        );
    }

    // -----------------------------
    // Border text
    // -----------------------------
    const textPaths = useMemo(() => {
        const paths: React.ReactNode[] = [];
        if (borderTextEnabled) {
            const textRadius = outerRadius - borderWidth / 2 - textPadding;
            const textPathId1 = `textPath1-${Date.now()}`;
            const textPathId2 = `textPath2-${Date.now()}`;

            // Top semicircle
            paths.push(
                <defs key="textDefs">
                    <path
                        id={textPathId1}
                        d={`
              M ${canvasSize / 2 - textRadius}, ${canvasSize / 2}
              A ${textRadius},${textRadius} 0 0,1 ${
                            canvasSize / 2 + textRadius
                        }, ${canvasSize / 2}
            `}
                    />
                </defs>
            );

            paths.push(
                <text
                    className="borderText"
                    textAnchor="middle"
                    fontFamily={fontFamily}
                    fontSize={fontSize}
                    fontWeight={fontWeight}
                    letterSpacing={letterSpacing}
                    fill={textColor}
                    style={{
                        fontStretch: condensed ? "condensed" : "normal",
                    }}
                    key="borderText1"
                >
                    <textPath
                        xlinkHref={`#${textPathId1}`}
                        startOffset="50%"
                        dominantBaseline="middle"
                    >
                        {textLine1}
                    </textPath>
                </text>
            );

            if (numTextLines === 2) {
                // Bottom semicircle
                paths.push(
                    <defs key="textDefs2">
                        <path
                            id={textPathId2}
                            d={`
                M ${canvasSize / 2 - textRadius}, ${canvasSize / 2}
                A ${textRadius},${textRadius} 0 0,0 ${
                                canvasSize / 2 + textRadius
                            }, ${canvasSize / 2}
              `}
                        />
                    </defs>
                );

                paths.push(
                    <text
                        className="borderText"
                        textAnchor="middle"
                        fontFamily={fontFamily}
                        fontSize={fontSize}
                        fontWeight={fontWeight}
                        letterSpacing={letterSpacing}
                        fill={textColor}
                        style={{
                            fontStretch: condensed ? "condensed" : "normal",
                        }}
                        key="borderText2"
                    >
                        <textPath
                            xlinkHref={`#${textPathId2}`}
                            startOffset="50%"
                            dominantBaseline="middle"
                        >
                            {textLine2}
                        </textPath>
                    </text>
                );
            }
        }
        return paths;
    }, [
        borderTextEnabled,
        textLine1,
        textLine2,
        numTextLines,
        fontFamily,
        fontSize,
        fontWeight,
        letterSpacing,
        condensed,
        textColor,
        textPadding,
        outerRadius,
        canvasSize,
        borderWidth,
    ]);

    // -----------------------------
    // Finder Bars
    // -----------------------------
    const finderBars = useMemo(() => {
        if (!barsEnabled) return null;
        const cx = canvasSize / 2;
        const cy = canvasSize / 2;

        // Calculate the center positions of each finder pattern
        const fps = finderPatternPositions.map((pos) => {
            const fx = pos.col + 3.5; // center of finder
            const fy = pos.row + 3.5;
            const canvasX = qrCodeOffsetX + fx * moduleSize;
            const canvasY = qrCodeOffsetY + fy * moduleSize;
            return { x: canvasX, y: canvasY };
        });

        const anglesAndDistances = fps.map((p) => {
            const dx = p.x - cx;
            const dy = p.y - cy;
            const angle = Math.atan2(dy, dx);
            const dist = Math.sqrt(dx * dx + dy * dy);
            return { angle, dist };
        });

        // Sort by angle ascending
        anglesAndDistances.sort((a, b) => a.angle - b.angle);

        // Determine the furthest distance
        const maxDist = Math.max(...anglesAndDistances.map((ad) => ad.dist));
        const radius = maxDist + barsRadiusOffset;

        // Convert gap in degrees to radians
        const gapRad = (barsGapDegrees * Math.PI) / 180;

        const arcs: React.ReactNode[] = [];
        for (let i = 0; i < anglesAndDistances.length; i++) {
            const start = anglesAndDistances[i].angle;
            // If last point, connect around 2π back to the first
            const end =
                i === anglesAndDistances.length - 1
                    ? anglesAndDistances[0].angle + 2 * Math.PI
                    : anglesAndDistances[i + 1].angle;

            // Trim angles by gap
            const startAngle = start + gapRad;
            const endAngle = end - gapRad;
            if (endAngle <= startAngle) {
                continue;
            }

            const xStart = cx + radius * Math.cos(startAngle);
            const yStart = cy + radius * Math.sin(startAngle);
            const xEnd = cx + radius * Math.cos(endAngle);
            const yEnd = cy + radius * Math.sin(endAngle);

            const arcAngle = endAngle - startAngle;
            const largeArcFlag = arcAngle > Math.PI ? 1 : 0;

            arcs.push(
                <path
                    key={`bar-arc-${i}`}
                    d={`M ${xStart},${yStart} A ${radius},${radius} 0 ${largeArcFlag},1 ${xEnd},${yEnd}`}
                    fill="none"
                    stroke={barsColor}
                    strokeWidth={barsWidth}
                    strokeLinecap={barsRoundEnds ? "round" : "butt"}
                />
            );
        }

        return <g className="finderBars">{arcs}</g>;
    }, [
        barsEnabled,
        barsColor,
        barsWidth,
        barsGapDegrees,
        barsRoundEnds,
        barsRadiusOffset,
        canvasSize,
        finderPatternPositions,
        moduleSize,
        qrCodeOffsetX,
        qrCodeOffsetY,
    ]);

    // -----------------------------
    // RENDER
    // -----------------------------
    return (
        <svg
            ref={svgRef}
            className="frame"
            viewBox={`0 0 ${canvasSize} ${canvasSize}`}
            width={canvasSize}
            height={canvasSize}
        >
            <defs>
                {/* Background Gradient */}
                {bgOption === "gradient" && (
                    <>
                        {bgGradientType === "linear" && (
                            <linearGradient
                                id={bgGradientId}
                                gradientUnits="userSpaceOnUse"
                                x1="0%"
                                y1="0%"
                                x2="100%"
                                y2="0%"
                                gradientTransform={`rotate(${bgGradientAngle}, ${
                                    canvasSize / 2
                                }, ${canvasSize / 2})`}
                            >
                                {bgGradientStops.map((stop, index) => (
                                    <stop
                                        key={index}
                                        offset={`${stop.position}%`}
                                        stopColor={stop.color}
                                    />
                                ))}
                            </linearGradient>
                        )}
                        {bgGradientType === "conic" && (
                            <radialGradient
                                id={bgGradientId}
                                gradientUnits="userSpaceOnUse"
                                cx="50%"
                                cy="50%"
                                r="50%"
                                fx="50%"
                                fy="50%"
                            >
                                {bgGradientStops.map((stop, index) => (
                                    <stop
                                        key={index}
                                        offset={`${stop.position}%`}
                                        stopColor={stop.color}
                                    />
                                ))}
                            </radialGradient>
                        )}
                    </>
                )}

                {/* QR Code Gradient */}
                {qrOption === "gradient" && (
                    <>
                        {qrGradientType === "linear" && (
                            <linearGradient
                                id={qrGradientId}
                                gradientUnits="userSpaceOnUse"
                                x1="0%"
                                y1="0%"
                                x2="100%"
                                y2="0%"
                                gradientTransform={`rotate(${qrGradientAngle}, ${
                                    canvasSize / 2
                                }, ${canvasSize / 2})`}
                            >
                                {qrGradientStops.map((stop, index) => (
                                    <stop
                                        key={index}
                                        offset={`${stop.position}%`}
                                        stopColor={stop.color}
                                    />
                                ))}
                            </linearGradient>
                        )}
                        {qrGradientType === "conic" && (
                            <radialGradient
                                id={qrGradientId}
                                gradientUnits="userSpaceOnUse"
                                cx="50%"
                                cy="50%"
                                r="50%"
                                fx="50%"
                                fy="50%"
                            >
                                {qrGradientStops.map((stop, index) => (
                                    <stop
                                        key={index}
                                        offset={`${stop.position}%`}
                                        stopColor={stop.color}
                                    />
                                ))}
                            </radialGradient>
                        )}
                    </>
                )}
            </defs>

            {/* Background Circle (solid or gradient) */}
            {(bgOption === "solid" || bgOption === "gradient") && (
                <circle
                    className="circle-background"
                    cx={canvasSize / 2}
                    cy={canvasSize / 2}
                    r={canvasSize / 2}
                    fill={bgFill}
                ></circle>
            )}

            {/* Optional Background Rects */}
            <g className="backgroundRects" id="backgroundRects">
                {backgroundRects}
            </g>

            {/* 外圈装饰（在 QR 下层，避免遮挡码点） */}
            {outerDecorations}

            {/* Outer Border */}
            <circle
                cx={canvasSize / 2}
                cy={canvasSize / 2}
                r={outerRadius - borderWidth / 2}
                fill="none"
                stroke={borderColor}
                strokeWidth={borderWidth}
            />

            {/* Second Border (annulus) */}
            {secondBorderEnabled && (
                <path d={secondBorderPath} fill={secondBorderColor} />
            )}

            {/* Text on Border */}
            {borderTextEnabled && <g className="borderText">{textPaths}</g>}

            {/* Finder Bars */}
            {barsEnabled && finderBars}

            {/* QR Code: modules + finder patterns */}
            <g
                className="qrcode"
                style={{
                    transform: qrGroupTransform,
                }}
            >
                {/* Non-finder modules */}
                <g className="qrRects">{qrRects}</g>

                {finderRenderStyle === "classic" && (
                    <g className="finderPatterns">{finderPatterns}</g>
                )}
            </g>

            {/* Optional center image */}
            {uploadedImageDataUrl && (
                <g
                    className="overlayImage"
                    style={{
                        transform: qrGroupTransform,
                    }}
                >
                    <image
                        href={uploadedImageDataUrl}
                        x={(qrCodeSize - qrCodeSize * 0.3 * imageScale) / 2}
                        y={(qrCodeSize - qrCodeSize * 0.3 * imageScale) / 2}
                        width={qrCodeSize * 0.3 * imageScale}
                        height={qrCodeSize * 0.3 * imageScale}
                        // preserveAspectRatio="xMidYMid slice"
                        style={{ pointerEvents: "none" }}
                    />
                </g>
            )}
        </svg>
    );
};

export default CircularQRCode;

