import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { PdfUpload } from "./pdf-upload";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("daily_read_remaining, last_usage_reset_at")
    .eq("id", user!.id)
    .maybeSingle();
  // 未执行 SQL 迁移时表不存在，不阻塞首页

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-1 flex-col px-4 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            首页
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            登录为：{user?.email}
          </p>
        </div>
        <LogoutButton />
      </header>

      <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          今日剩余次数（预留）
        </h2>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {profile?.daily_read_remaining ?? "—"}
        </p>
        <p className="mt-2 text-xs text-zinc-400">
          后续将按日重置；需在 Supabase 执行迁移并启用 profiles 表。
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          上传 PDF
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          选择文件后将提取正文并进入三轮阅读。公众号链接将在后续版本支持。
        </p>
        <PdfUpload />
      </section>
    </div>
  );
}
