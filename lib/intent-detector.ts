import type { EvaluationRequest } from "./types"
import { fetchWithRetry } from "./api-retry"

export interface IntentCheckResult {
  allowed: boolean
  reason: string
  severity: "info" | "warn" | "block"
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

  const prompt = `你是一个负责入口拦截的系统，需要判断用户输入是否符合“企业AI需求评估工具”的使用场景。

请基于以下信息判断：
- 业务场景描述：${req.businessScenario || "（未填写）"}
- 精调数据描述：${req.businessData?.description || "（未填写）"}

判定标准：
1) 符合：与企业/组织的AI项目规划、资源评估、模型选型、落地可行性相关。
2) 不符合（任一命中即不通过）：
   - 闲聊、无关话题、个人情感八卦、生活琐事
   - 非法/色情/极端/暴力等内容
   - 信息过于模糊或明显无意义：仅填重复字符/数字、空白、占位符，或两条信息总长度少于10个汉字且缺乏业务含义

请严格输出JSON：
{
  "allowed": true/false,
  "severity": "info" | "warn" | "block",
  "reason": "一句话说明是否符合定位及原因"
}`

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
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.1,
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

    const parsed = JSON.parse(data.choices[0].message.content)

    return {
      allowed: Boolean(parsed.allowed),
      reason: parsed.reason || "未提供原因",
      severity: parsed.severity || "info",
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
