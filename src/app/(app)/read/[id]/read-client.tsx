"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AiMarkdown } from "./ai-markdown";

type Round = 1 | 2 | 3;

type Props = {
  title: string | null;
  sourceContent: string;
};

export function ReadClient({ title, sourceContent }: Props) {
  const [round, setRound] = useState<Round>(1);
  const [cache, setCache] = useState<Partial<Record<Round, string>>>({});
  const [loadingRound, setLoadingRound] = useState(false);
  const [roundError, setRoundError] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [followupText, setFollowupText] = useState<string | null>(null);
  const [loadingFollowup, setLoadingFollowup] = useState(false);
  const [followupError, setFollowupError] = useState<string | null>(null);

  const displayTitle = title?.trim() || "未命名文档";

  const fetchRound = useCallback(
    async (r: Round) => {
      setRoundError(null);
      setLoadingRound(true);
      try {
        const res = await fetch("/api/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: sourceContent, round: r }),
        });
        const data = (await res.json()) as { error?: string; text?: string };
        if (!res.ok) {
          setRoundError(data.error ?? "解读失败");
          return;
        }
        if (data.text) {
          setCache((prev) => ({ ...prev, [r]: data.text }));
        }
      } catch {
        setRoundError("网络错误");
      } finally {
        setLoadingRound(false);
      }
    },
    [sourceContent],
  );

  useEffect(() => {
    void fetchRound(1);
  }, [fetchRound]);

  const currentText = useMemo(() => cache[round], [cache, round]);

  async function onSelectRound(r: Round) {
    setRound(r);
    if (cache[r]) return;
    await fetchRound(r);
  }

  async function onFollowupSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setFollowupError(null);
    setFollowupText(null);
    setLoadingFollowup(true);
    try {
      const res = await fetch("/api/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, sourceContent }),
      });
      const data = (await res.json()) as { error?: string; text?: string };
      if (!res.ok) {
        setFollowupError(data.error ?? "回答失败");
        return;
      }
      setFollowupText(data.text ?? "");
    } catch {
      setFollowupError("网络错误");
    } finally {
      setLoadingFollowup(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/home"
            className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
          >
            ← 返回首页
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {displayTitle}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {([1, 2, 3] as const).map((r) => (
            <button
              key={r}
              type="button"
              disabled={loadingRound}
              onClick={() => void onSelectRound(r)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                round === r
                  ? "bg-emerald-600 text-white"
                  : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              } disabled:opacity-60`}
            >
              第{r}轮
            </button>
          ))}
        </div>
      </div>

      <article className="min-h-[200px] flex-1 rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
        {loadingRound && !currentText ? (
          <p className="text-sm text-zinc-500">正在生成第 {round} 轮解读…</p>
        ) : roundError ? (
          <p className="text-sm text-red-600 dark:text-red-400">{roundError}</p>
        ) : currentText ? (
          <AiMarkdown className="prose prose-zinc dark:prose-invert max-w-none text-sm leading-relaxed prose-headings:font-semibold prose-p:my-2 prose-li:my-0.5">
            {currentText}
          </AiMarkdown>
        ) : (
          <p className="text-sm text-zinc-500">暂无内容</p>
        )}
        {loadingRound && currentText ? (
          <p className="mt-4 text-xs text-zinc-400">正在更新本轮解读…</p>
        ) : null}
      </article>

      <section className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          追问（基于全文）
        </h2>
        <form onSubmit={onFollowupSubmit} className="mt-3 space-y-3">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            placeholder="输入你的问题…"
            className="w-full resize-y rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={loadingFollowup || !question.trim()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loadingFollowup ? "思考中…" : "提交追问"}
          </button>
        </form>
        {followupError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {followupError}
          </p>
        )}
        {followupText !== null && (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-200">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              回答
            </p>
            <AiMarkdown className="prose prose-zinc dark:prose-invert mt-2 max-w-none text-sm leading-relaxed prose-headings:font-semibold prose-p:my-2 prose-li:my-0.5">
              {followupText}
            </AiMarkdown>
          </div>
        )}
      </section>
    </div>
  );
}
