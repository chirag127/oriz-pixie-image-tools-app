"use client";

import { useCallback, useRef, useState } from "react";
import { Pipette, Upload } from "lucide-react";

interface PickedColor {
  hex: string;
  r: number;
  g: number;
  b: number;
  a: number;
  x: number;
  y: number;
}

function toHex(n: number) {
  return n.toString(16).padStart(2, "0");
}

export default function ColorPicker() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [picked, setPicked] = useState<PickedColor | null>(null);
  const [history, setHistory] = useState<PickedColor[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const loadFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setPicked(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = Array.from(e.dataTransfer.files).find((f) =>
        f.type.startsWith("image/"),
      );
      if (f) loadFile(f);
    },
    [loadFile],
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) loadFile(e.target.files[0]);
    },
    [loadFile],
  );

  const handleImageLoad = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(img, 0, 0);
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
      const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      const color: PickedColor = { hex, r, g, b, a: Math.round((a / 255) * 100), x, y };
      setPicked(color);
      setHistory((prev) => [color, ...prev].slice(0, 20));
    },
    [],
  );

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {!imageUrl ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-10 text-center hover:border-[var(--color-primary)] transition-colors cursor-pointer"
        >
          <Pipette className="h-10 w-10 text-[var(--color-text-muted)]" strokeWidth={1.5} />
          <p className="font-semibold text-sm text-[var(--color-text-main)]">
            Drop an image here or click to upload
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            JPG, PNG, WebP — click any pixel to sample its color
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={handleInput}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-[var(--color-text-muted)]">
            Click anywhere on the image to pick a color.
          </p>
          <div className="relative overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
            {/* Hidden img for loading — canvas is the display */}
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Source"
              className="hidden"
              onLoad={handleImageLoad}
            />
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="max-w-full cursor-crosshair rounded-xl"
              style={{ display: "block" }}
            />
          </div>

          {picked && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex items-center gap-4">
              <div
                className="h-14 w-14 shrink-0 rounded-lg border border-[var(--color-border)]"
                style={{ backgroundColor: picked.hex }}
              />
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => copyToClipboard(picked.hex)}
                  className="text-left font-mono text-lg font-semibold text-[var(--color-text-main)] hover:text-[var(--color-primary)] transition-colors"
                  title="Copy HEX"
                >
                  {picked.hex.toUpperCase()}
                </button>
                <p className="font-mono text-sm text-[var(--color-text-muted)]">
                  rgb({picked.r}, {picked.g}, {picked.b})
                  {picked.a < 100 ? ` / ${picked.a}%` : ""}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Pixel ({picked.x}, {picked.y}) — click hex to copy
                </p>
              </div>
            </div>
          )}

          {history.length > 1 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-[var(--color-text-muted)]">
                Picked colors
              </p>
              <div className="flex flex-wrap gap-2">
                {history.map((c, i) => (
                  <button
                    key={`${c.hex}-${i}`}
                    type="button"
                    onClick={() => copyToClipboard(c.hex)}
                    title={`${c.hex.toUpperCase()} — click to copy`}
                    className="h-8 w-8 rounded-lg border border-[var(--color-border)] hover:scale-110 transition-transform"
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => { setImageUrl(null); setPicked(null); setHistory([]); }}
            className="btn-secondary w-fit"
          >
            <Upload className="h-4 w-4" />
            Load different image
          </button>
        </div>
      )}
    </div>
  );
}
