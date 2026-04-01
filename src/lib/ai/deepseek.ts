import OpenAI from "openai";

export const DEEPSEEK_MODEL = "deepseek-chat" as const;

/**
 * DeepSeek 使用 OpenAI 兼容接口。环境变量名：`DEEPSEEK_API_KEY`（见 .env.local）
 */
export function getDeepSeekClient(apiKey?: string) {
  const raw = apiKey ?? process.env.DEEPSEEK_API_KEY;
  const key = typeof raw === "string" ? raw.trim() : "";
  if (!key) {
    throw new Error(
      "缺少环境变量 DEEPSEEK_API_KEY（请在 .env.local 中配置并重启 dev 服务器）",
    );
  }
  return new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: key,
  });
}
