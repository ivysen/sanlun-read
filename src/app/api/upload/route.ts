import { extractText } from "unpdf";
import { EPub } from "epub2";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import * as tmp from "tmp";
import * as fs from "fs/promises";

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
      // 创建临时文件
      const tempFile = tmp.fileSync({ postfix: '.epub' });
      try {
        // 写入二进制数据到临时文件
        await fs.writeFile(tempFile.name, data);
        
        // 使用临时文件路径创建 EPub 实例
        const epub = new EPub(tempFile.name);
        await new Promise<void>((resolve, reject) => {
          epub.on('end', resolve);
          epub.on('error', reject);
          epub.parse();
        });
        
        // 提取文本内容
        const chapterTexts: string[] = [];
        for (const chapter of epub.flow) {
          const html = await new Promise<string>((resolve, reject) => {
            epub.getChapterRaw(chapter.id, (err, data) => {
              if (err) reject(err);
              else resolve(data || '');
            });
          });
          // 去掉 HTML 标签提取纯文字
          const plainText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          if (plainText) {
            chapterTexts.push(plainText);
          }
        }
        text = chapterTexts.join("\n\n").trim();
      } finally {
        // 无论成功失败都删除临时文件
        tempFile.removeCallback();
      }
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
