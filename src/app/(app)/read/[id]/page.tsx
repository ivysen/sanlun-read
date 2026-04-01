import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
// AI 轮次解读与追问回答的正文由 ReadClient → AiMarkdown（react-markdown）渲染
import { ReadClient } from "./read-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReadPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: doc, error } = await supabase
    .from("documents")
    .select("id, title, content, user_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !doc) {
    redirect("/home");
  }
  if (doc.user_id !== user.id) {
    redirect("/home");
  }

  return <ReadClient title={doc.title} sourceContent={doc.content} />;
}
