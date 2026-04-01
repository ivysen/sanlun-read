import { DEEPSEEK_MODEL, getDeepSeekClient } from "@/lib/ai/deepseek";
import { getRoundSystemPrompt } from "@/lib/ai/round-prompts";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_SOURCE_CHARS = 120_000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: { content?: unknown; round?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  const content =
    typeof body.content === "string" ? body.content.trim() : "";
  const roundNum = Number(body.round);
  if (!content) {
    return NextResponse.json({ error: "缺少文本内容 content" }, { status: 400 });
  }
  if (content.length > MAX_SOURCE_CHARS) {
    return NextResponse.json(
      { error: `正文过长，请控制在 ${MAX_SOURCE_CHARS} 字以内` },
      { status: 400 },
    );
  }
  if (roundNum !== 1 && roundNum !== 2 && roundNum !== 3) {
    return NextResponse.json(
      { error: "round 必须为 1、2 或 3" },
      { status: 400 },
    );
  }

  const round = roundNum as 1 | 2 | 3;

  const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
  if (process.env.NODE_ENV === "development") {
    const k = typeof deepseekApiKey === "string" ? deepseekApiKey.trim() : "";
    console.log(
      "[api/read] DEEPSEEK_API_KEY:",
      k.length > 0
        ? `${k.slice(0, 7)}… (length=${k.length})`
        : "MISSING 或为空 — 请检查 .env.local 是否为 DEEPSEEK_API_KEY=... 并已重启 npm run dev",
    );
  }

  const system = getRoundSystemPrompt(round);
  const userMessage = [
    "以下是用户要阅读的原文（请基于原文解读，不要编造原文没有的信息）：",
    "---",
    content,
    "---",
    `请输出第 ${round} 轮解读。`,
  ].join("\n");

  try {
    const client = getDeepSeekClient(deepseekApiKey);
    const completion = await client.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
      temperature: 0.6,
    });
    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!text) {
      return NextResponse.json({ error: "模型未返回内容" }, { status: 502 });
    }
    return NextResponse.json({ text });
  } catch (e) {
    const message = e instanceof Error ? e.message : "DeepSeek 调用失败";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
