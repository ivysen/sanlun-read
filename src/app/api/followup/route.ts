import { DEEPSEEK_MODEL, getDeepSeekClient } from "@/lib/ai/deepseek";
import { FOLLOWUP_SYSTEM_PROMPT } from "@/lib/ai/round-prompts";
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

  let body: { question?: unknown; sourceContent?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  const question =
    typeof body.question === "string" ? body.question.trim() : "";
  const sourceContent =
    typeof body.sourceContent === "string"
      ? body.sourceContent.trim()
      : "";

  if (!question) {
    return NextResponse.json({ error: "缺少问题 question" }, { status: 400 });
  }
  if (!sourceContent) {
    return NextResponse.json(
      { error: "缺少原文 sourceContent" },
      { status: 400 },
    );
  }
  if (sourceContent.length > MAX_SOURCE_CHARS) {
    return NextResponse.json(
      { error: `原文过长，请控制在 ${MAX_SOURCE_CHARS} 字以内` },
      { status: 400 },
    );
  }

  const userMessage = [
    "【原文】",
    "---",
    sourceContent,
    "---",
    "【用户问题】",
    question,
  ].join("\n");

  try {
    const client = getDeepSeekClient(process.env.DEEPSEEK_API_KEY);
    const completion = await client.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: FOLLOWUP_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.5,
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
