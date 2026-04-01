"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function PdfUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as {
        error?: string;
        id?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "上传失败");
        return;
      }
      if (!data.id) {
        setError("未返回文档 id");
        return;
      }
      router.push(`/read/${data.id}`);
      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mt-6">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf,application/epub+zip,.epub"
        className="hidden"
        disabled={loading}
        onChange={onFileChange}
      />
      <button
        type="button"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading ? "上传并解析中…" : "上传 PDF 或 EPUB"}
      </button>
      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
