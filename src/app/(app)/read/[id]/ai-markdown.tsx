"use client";

import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

type Props = {
  /** AI 返回的 Markdown 字符串 */
  children: string;
  className?: string;
};

/**
 * 阅读页 / 追问回答正文渲染（粗体、标题、换行等按 Markdown 解析）
 */
export function AiMarkdown({ children, className }: Props) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkBreaks]}>{children}</ReactMarkdown>
    </div>
  );
}
