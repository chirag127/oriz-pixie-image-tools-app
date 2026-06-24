"use client";

import { useCallback, useState } from "react";
import { ScanLine, Upload } from "lucide-react";

interface ExifData {
  [key: string]: unknown;
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (val instanceof Date) return val.toLocaleString();
  if (typeof val === "object" && !Array.isArray(val)) {
    // GPS coordinate objects etc.
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) return val.join(", ");
  return String(val);
}

function formatKey(key: string): string {
  // Convert camelCase/PascalCase to readable
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

// Priority fields to show first
const PRIORITY_KEYS = [
  "Make", "Model", "Software", "DateTime", "DateTimeOriginal",
  "ExposureTime", "FNumber", "ISO", "ISOSpeedRatings", "FocalLength",
  "Flash", "WhiteBalance", "ExposureProgram", "MeteringMode",
  "GPSLatitude", "GPSLongitude", "GPSAltitude",
  "ImageWidth", "ImageHeight", "Orientation",
  "Copyright", "Artist",
];

export default function ExifViewer() {
  const [exifData, setExifData] = useState<ExifData | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const processFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setExifData(null);
    setFileName(file.name);
    try {
      // Dynamic import of exifr
      const exifr = await import("exifr");
      const data = await exifr.parse(file, {
        tiff: true, exif: true, gps: true, icc: false, iptc: true, jfif: false,
        translateKeys: true, translateValues: true, reviveValues: true,
        mergeOutput: true, sanitize: true,
      });
      if (!data || Object.keys(data).length === 0) {
        setError("No EXIF metadata found in this image.");
      } else {
        setExifData(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to read EXIF data.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) processFile(e.target.files[0]);
    },
    [processFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = Array.from(e.dataTransfer.files).find((f) =>
        f.type.startsWith("image/"),
      );
      if (file) processFile(file);
    },
    [processFile],
  );

  // Sort: priority keys first, then alphabetical
  const sortedEntries = exifData
    ? (() => {
        const entries = Object.entries(exifData);
        const priority = entries.filter(([k]) => PRIORITY_KEYS.includes(k));
        const rest = entries.filter(([k]) => !PRIORITY_KEYS.includes(k)).sort(([a], [b]) => a.localeCompare(b));
        return [
          ...PRIORITY_KEYS.flatMap((k) => {
            const found = priority.find(([ek]) => ek === k);
            return found ? [found] : [];
          }),
          ...rest,
        ];
      })()
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-8 text-center hover:border-[var(--color-primary)] transition-colors cursor-pointer"
      >
        <ScanLine className="h-10 w-10 text-[var(--color-text-muted)]" strokeWidth={1.5} />
        <p className="text-sm font-semibold text-[var(--color-text-main)]">
          {fileName ?? "Drop an image here or click to upload"}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          JPG, PNG, HEIC, TIFF — camera metadata, GPS, settings
        </p>
        <input
          type="file"
          accept="image/*"
          onChange={handleInput}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </div>

      {loading && (
        <p className="text-sm text-[var(--color-text-muted)] text-center">
          Reading metadata...
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-4 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}

      {exifData && sortedEntries.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--color-text-main)]">
              {sortedEntries.length} metadata fields — {fileName}
            </h3>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {sortedEntries.map(([key, value], i) => (
                  <tr
                    key={key}
                    className={
                      i % 2 === 0
                        ? "bg-[var(--color-surface)]"
                        : "bg-[var(--color-surface-2)]"
                    }
                  >
                    <td className="px-4 py-2 font-mono text-xs text-[var(--color-text-muted)] whitespace-nowrap w-40 align-top">
                      {formatKey(key)}
                    </td>
                    <td className="px-4 py-2 text-xs text-[var(--color-text-main)] break-all">
                      {formatValue(value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
