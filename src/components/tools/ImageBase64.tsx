"use client";

import { useCallback, useState } from "react";
import { Code, Upload, Copy, Download } from "lucide-react";

type Mode = "encode" | "decode";

export default function ImageBase64() {
  const [mode, setMode] = useState<Mode>("encode");

  // Encode state
  const [encodeFile, setEncodeFile] = useState<File | null>(null);
  const [encodeResult, setEncodeResult] = useState<string | null>(null);
  const [encodeCopied, setEncodeCopied] = useState(false);

  // Decode state
  const [decodeInput, setDecodeInput] = useState("");
  const [decodeResult, setDecodeResult] = useState<string | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);

  // Encode
  const handleEncodeFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setEncodeFile(file);
      setEncodeResult(null);
      const reader = new FileReader();
      reader.onload = () => {
        setEncodeResult(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  const handleEncodeDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = Array.from(e.dataTransfer.files).find((f) =>
        f.type.startsWith("image/"),
      );
      if (!file) return;
      setEncodeFile(file);
      setEncodeResult(null);
      const reader = new FileReader();
      reader.onload = () => setEncodeResult(reader.result as string);
      reader.readAsDataURL(file);
    },
    [],
  );

  const copyResult = useCallback(async () => {
    if (!encodeResult) return;
    try {
      await navigator.clipboard.writeText(encodeResult);
      setEncodeCopied(true);
      setTimeout(() => setEncodeCopied(false), 2000);
    } catch {}
  }, [encodeResult]);

  const downloadTextFile = useCallback(() => {
    if (!encodeResult) return;
    const blob = new Blob([encodeResult], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${encodeFile?.name ?? "image"}.b64.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [encodeResult, encodeFile]);

  // Decode
  const handleDecode = useCallback(() => {
    setDecodeError(null);
    setDecodeResult(null);
    try {
      let src = decodeInput.trim();
      // Accept raw base64 (no data URI prefix) — auto-add for common types
      if (!src.startsWith("data:")) {
        // Try to detect type from first bytes
        const raw = src.replace(/\s/g, "");
        // PNG magic: iVBORw0KGgo, JPEG magic: /9j/, GIF: R0lG
        let mime = "image/png";
        if (raw.startsWith("/9j/")) mime = "image/jpeg";
        else if (raw.startsWith("R0lG")) mime = "image/gif";
        else if (raw.startsWith("UklGR")) mime = "image/webp";
        src = `data:${mime};base64,${raw}`;
      }
      // Validate — try creating an Image
      const img = new Image();
      img.src = src;
      img.onload = () => setDecodeResult(src);
      img.onerror = () => setDecodeError("Invalid base64 image data.");
    } catch (e) {
      setDecodeError("Could not decode. Ensure the input is valid base64.");
    }
  }, [decodeInput]);

  const downloadDecoded = useCallback(() => {
    if (!decodeResult) return;
    const a = document.createElement("a");
    a.href = decodeResult;
    // Guess extension
    const ext = decodeResult.startsWith("data:image/jpeg")
      ? "jpg"
      : decodeResult.startsWith("data:image/png")
        ? "png"
        : decodeResult.startsWith("data:image/gif")
          ? "gif"
          : decodeResult.startsWith("data:image/webp")
            ? "webp"
            : "img";
    a.download = `decoded.${ext}`;
    a.click();
  }, [decodeResult]);

  return (
    <div className="flex flex-col gap-6">
      {/* Mode tabs */}
      <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
        {(["encode", "decode"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${
              mode === m
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
            }`}
          >
            {m === "encode" ? "Image → Base64" : "Base64 → Image"}
          </button>
        ))}
      </div>

      {mode === "encode" && (
        <div className="flex flex-col gap-4">
          <div
            onDrop={handleEncodeDrop}
            onDragOver={(e) => e.preventDefault()}
            className="relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-8 text-center hover:border-[var(--color-primary)] transition-colors cursor-pointer"
          >
            <Code className="h-8 w-8 text-[var(--color-text-muted)]" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-[var(--color-text-main)]">
              {encodeFile ? encodeFile.name : "Drop an image or click to upload"}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">JPG, PNG, WebP, GIF</p>
            <input
              type="file"
              accept="image/*"
              onChange={handleEncodeFile}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>

          {encodeResult && (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                <textarea
                  readOnly
                  value={encodeResult}
                  rows={6}
                  className="w-full resize-none bg-transparent font-mono text-xs text-[var(--color-text-muted)] outline-none break-all"
                />
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                Size: {(encodeResult.length / 1024).toFixed(1)} KB
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={copyResult}
                  className="btn-primary"
                >
                  <Copy className="h-4 w-4" />
                  {encodeCopied ? "Copied!" : "Copy base64"}
                </button>
                <button
                  type="button"
                  onClick={downloadTextFile}
                  className="btn-secondary"
                >
                  <Download className="h-4 w-4" />
                  Save .txt
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === "decode" && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
              Paste base64 string (data URI or raw)
            </label>
            <textarea
              value={decodeInput}
              onChange={(e) => setDecodeInput(e.target.value)}
              rows={6}
              placeholder="data:image/png;base64,iVBORw... or raw base64"
              className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 font-mono text-xs text-[var(--color-text-main)] outline-none focus:border-[var(--color-primary)] break-all"
            />
          </div>

          <button
            type="button"
            onClick={handleDecode}
            disabled={!decodeInput.trim()}
            className="btn-primary w-fit"
          >
            <Upload className="h-4 w-4" />
            Decode to image
          </button>

          {decodeError && (
            <p className="rounded-lg bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">
              {decodeError}
            </p>
          )}

          {decodeResult && (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2">
                <img
                  src={decodeResult}
                  alt="Decoded"
                  className="max-w-full rounded-lg mx-auto"
                />
              </div>
              <button
                type="button"
                onClick={downloadDecoded}
                className="btn-primary w-fit"
              >
                <Download className="h-4 w-4" />
                Download image
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
