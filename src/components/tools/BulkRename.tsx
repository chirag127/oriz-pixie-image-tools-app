"use client";

import { useCallback, useState } from "react";
import { FileText, Copy, Download } from "lucide-react";

interface RenameResult {
  original: string;
  renamed: string;
}

type PatternToken = "name" | "index" | "ext" | "upper" | "lower" | "date";

const TOKENS: { token: PatternToken; label: string; example: string }[] = [
  { token: "name", label: "{name}", example: "original name without ext" },
  { token: "index", label: "{index}", example: "zero-padded number (001, 002…)" },
  { token: "ext", label: "{ext}", example: "original extension (jpg, png…)" },
  { token: "date", label: "{date}", example: "today's date (2024-01-15)" },
];

function applyPattern(
  filename: string,
  pattern: string,
  index: number,
  total: number,
  date: string,
): string {
  const lastDot = filename.lastIndexOf(".");
  const name = lastDot >= 0 ? filename.slice(0, lastDot) : filename;
  const ext = lastDot >= 0 ? filename.slice(lastDot + 1) : "";
  const pad = String(index + 1).padStart(String(total).length, "0");

  let result = pattern;
  result = result.replaceAll("{name}", name);
  result = result.replaceAll("{index}", pad);
  result = result.replaceAll("{ext}", ext);
  result = result.replaceAll("{date}", date);

  // Ensure extension: if pattern doesn't include {ext} and file had an ext, append
  if (!pattern.includes("{ext}") && ext) {
    result = `${result}.${ext}`;
  }

  return result;
}

export default function BulkRename() {
  const [rawInput, setRawInput] = useState("");
  const [pattern, setPattern] = useState("{index}_{name}.{ext}");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [copied, setCopied] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const filenames = rawInput
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const results: RenameResult[] = filenames.map((original, i) => {
    let pat = pattern;
    if (prefix) pat = `${prefix}${pat}`;
    if (suffix) {
      // Insert suffix before extension placeholder if present
      const extIdx = pat.lastIndexOf("{ext}");
      if (extIdx >= 0) {
        pat = `${pat.slice(0, extIdx)}${suffix}.{ext}`;
      } else {
        const lastDot = pat.lastIndexOf(".");
        if (lastDot >= 0) {
          pat = `${pat.slice(0, lastDot)}${suffix}${pat.slice(lastDot)}`;
        } else {
          pat = `${pat}${suffix}`;
        }
      }
    }
    return {
      original,
      renamed: applyPattern(original, pat, i, filenames.length, today),
    };
  });

  const copyResults = useCallback(async () => {
    const text = results.map((r) => r.renamed).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [results]);

  const downloadCsv = useCallback(() => {
    const csv = ["Original,Renamed", ...results.map((r) => `"${r.original}","${r.renamed}"`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rename-plan.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
            Paste filenames (one per line)
          </label>
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            rows={8}
            placeholder={"photo001.jpg\nIMG_2045.png\nvideo_clip.mp4"}
            className="w-full resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 font-mono text-xs text-[var(--color-text-main)] outline-none focus:border-[var(--color-primary)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
            Rename pattern
          </label>
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 font-mono text-sm text-[var(--color-text-main)] outline-none focus:border-[var(--color-primary)]"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {TOKENS.map(({ token, label, example }) => (
              <button
                key={token}
                type="button"
                onClick={() => setPattern((p) => `${p}{${token}}`)}
                title={example}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1 font-mono text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--color-text-muted)]">
              Prefix (optional)
            </label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="e.g. vacation_"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-main)] outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--color-text-muted)]">
              Suffix (optional, before ext)
            </label>
            <input
              type="text"
              value={suffix}
              onChange={(e) => setSuffix(e.target.value)}
              placeholder="e.g. _edited"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-main)] outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--color-text-main)]">
              Preview — {results.length} file{results.length > 1 ? "s" : ""}
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyResults}
                className="btn-secondary text-xs py-1 px-3"
              >
                <Copy className="h-3 w-3" />
                {copied ? "Copied!" : "Copy names"}
              </button>
              <button
                type="button"
                onClick={downloadCsv}
                className="btn-secondary text-xs py-1 px-3"
              >
                <Download className="h-3 w-3" />
                CSV
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-surface-2)]">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--color-text-muted)]">
                    Original
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--color-text-muted)]">
                    Renamed
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr
                    key={`${r.original}-${i}`}
                    className={
                      i % 2 === 0
                        ? "bg-[var(--color-surface)]"
                        : "bg-[var(--color-surface-2)]"
                    }
                  >
                    <td className="px-4 py-2 font-mono text-xs text-[var(--color-text-muted)] break-all">
                      {r.original}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-[var(--color-text-main)] break-all">
                      {r.renamed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filenames.length === 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-6 text-center">
          <FileText className="h-8 w-8 mx-auto mb-3 text-[var(--color-text-muted)]" strokeWidth={1.5} />
          <p className="text-sm text-[var(--color-text-muted)]">
            Paste filenames above to see the rename preview.
          </p>
        </div>
      )}
    </div>
  );
}
