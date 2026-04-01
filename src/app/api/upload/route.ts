import { extractText } from "unpdf";
import { EPub } from "epub2";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function titleFromFilename(name: string) {
  const base = name.replace(/\.[^/.]+$/, "").trim();
  return base || "未命名文档";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "无法解析表单" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "请上传文件字段 file" }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "文件为空" }, { status: 400 });
  }

  const mime = file.type || "";
  const fileName = file.name || "";
  const isPdf = mime === "application/pdf" || mime.includes("pdf") || fileName.endsWith(".pdf");
  const isEpub = mime === "application/epub+zip" || mime.includes("epub") || fileName.endsWith(".epub");
  if (!isPdf && !isEpub) {
    return NextResponse.json({ error: "仅支持 PDF 和 EPUB 文件" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  let text = "";
  try {
    if (isPdf) {
      const { text: extracted } = await extractText(data, { mergePages: true });
      text = (typeof extracted === "string" ? extracted : "").trim();
    } else if (isEpub) {
      const epub = new EPub(data);
      await epub.parse();
      text = epub.flow.map(item => item.textContent).join("\n").trim();
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "文件解析失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json(
      { error: "未能从文件中提取文字（可能是扫描件、加密文件或格式不支持）" },
      { status: 400 },
    );
  }

  const title = titleFromFilename(file.name);

  const { data: row, error } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      title,
      content: text,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message || "保存失败，请确认已创建 documents 表" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: row.id,
    title,
    content: text,
  });
}
