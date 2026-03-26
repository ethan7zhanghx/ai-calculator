import type { EvaluationRequest } from "./types"
import { fetchWithRetry } from "./api-retry"

export interface IntentCheckResult {
  allowed: boolean
  reason: string
  severity: "info" | "warn" | "block"
}

function normalizeText(value?: string): string {
  return value?.replace(/\s+/g, " ").trim() ?? ""
}

function normalizeAllowed(value: unknown): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (["true", "yes", "1", "allow", "allowed", "pass"].includes(normalized)) return true
    if (["false", "no", "0", "block", "blocked", "deny", "denied"].includes(normalized)) return false
  }
  return Boolean(value)
}

function normalizeSeverity(
  value: unknown,
  allowed: boolean
): "info" | "warn" | "block" {
  if (value === "info" || value === "warn" || value === "block") {
    return value
  }

  return allowed ? "info" : "block"
}

function parseIntentResponse(content: string): Record<string, unknown> {
  const trimmed = content.trim()

  try {
    return JSON.parse(trimmed)
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (!match) {
      throw new Error("意图检测返回的内容不是有效JSON")
    }
    return JSON.parse(match[0])
  }
}

/**
 * 使用LLM做简单的意图检测，判断用户输入是否符合产品定位（企业级AI需求评估）
 * 如出现与产品无关或明显违规的请求，可在前端做提示或记录。
 */
export async function checkIntent(
  req: EvaluationRequest,
  modelName: string
): Promise<IntentCheckResult> {
  const apiKey = process.env.QIANFAN_API_KEY

  // 没有密钥时不拦截，直接放行
  if (!apiKey) {
    return {
      allowed: true,
      reason: "缺少QIANFAN_API_KEY，跳过意图检测",
      severity: "info",
    }
  }

  const scenario = normalizeText(req.businessScenario)
  const dataDescription = normalizeText(req.businessData?.description)

  try {
    const response = await fetchWithRetry(
      "https://qianfan.baidubce.com/v2/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-Appbuilder-Authorization": apiKey,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: "system",
              content:
                `你是“企业AI需求评估工具”的 AI Judge，只负责入口意图判断。

任务：根据用户填写的 businessScenario 和 businessDataDescription，判断该输入是否应该进入“企业AI需求评估”流程。

判定标准：
1. 只要输入表达的是企业、团队、组织希望评估、建设、部署、优化某种 AI 能力、AI 系统、模型应用、知识库、智能客服、办公自动化、生产经营分析等需求，即使信息不完整，也应判定 allowed=true。
2. 只有在以下情况明确成立时，才判定 allowed=false：
   - 输入为空、纯空白、占位符、重复字符、重复数字、或明显无意义；
   - 输入违法违规；
   - 输入与企业AI需求评估明显无关，例如纯闲聊、个人生活琐事、情绪表达、娱乐闲谈。
3. “信息不足”不等于“无关”。方向相关但描述粗略时，也必须放行。
4. 只能依据用户实际提供的文本判断；不要臆测字段为空，不要把已填写文本误判为“输入为空”。

输出要求：
- 只能输出一个 JSON 对象
- 不要输出任何额外文字
- JSON 必须包含且仅包含字段：allowed, severity, reason
- allowed 为 boolean
- allowed=true 时 severity 必须是 "info"
- allowed=false 时 severity 必须是 "block"
- reason 用一句简短中文说明原因`,
            },
            {
              role: "user",
              content: `请对下面这份原始用户输入做意图判定，只输出 JSON：
{
  "businessScenario": ${JSON.stringify(scenario || "")},
  "businessDataDescription": ${JSON.stringify(dataDescription || "")}
}`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0,
        }),
      },
      {
        maxRetries: 3,
        timeout: 20000,
        onRetry: (attempt, error) => {
          console.log(`意图检测API重试 (${attempt}/3):`, error.message)
        },
      }
    )

    const data = await response.json()

    if (!data.choices?.[0]?.message?.content) {
      throw new Error("意图检测返回为空")
    }

    const parsed = parseIntentResponse(data.choices[0].message.content)
    const allowed = normalizeAllowed(
      parsed.allowed ?? parsed.isAllowed ?? parsed.pass ?? parsed.passed
    )
    const reason = String(parsed.reason ?? parsed.message ?? "未提供原因")
    const severity = normalizeSeverity(parsed.severity, allowed)

    return {
      allowed,
      reason,
      severity,
    }
  } catch (error) {
    console.error("意图检测失败，默认放行:", error)
    return {
      allowed: true,
      reason: "意图检测失败，默认放行",
      severity: "warn",
    }
  }
}
