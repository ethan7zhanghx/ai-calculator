import type { EvaluationRequest } from "./types"
import { fetchWithRetry } from "./api-retry"

export interface IntentCheckResult {
  allowed: boolean
  reason?: string
}

// 轻量级本地检查：避免明显无效的输入继续触发模型调用
function basicIntentHeuristics(req: EvaluationRequest): IntentCheckResult {
  const scenario = (req.businessScenario || "").trim()
  const dataDesc = (req.businessData?.description || "").trim()

  if (scenario.length < 10 || dataDesc.length < 10) {
    return {
      allowed: false,
      reason: "业务场景和数据描述过于简短，请补充详细后再评估。",
    }
  }

  return { allowed: true }
}

function buildIntentPrompt(req: EvaluationRequest): string {
  const { model, hardware, machineCount, cardsPerMachine, businessScenario, businessData, performanceRequirements } = req

  return `你是安全审核与意图识别助手，负责判断下面的企业AI评估请求是否合理、合规，是否与构建企业级AI/大模型应用相关。
请仅在输入确实用于AI技术/业务评估、且内容清晰、无明显违法或恶意意图时返回 allow，否则返回 block。

需要检查的输入：
- 模型: ${model}
- 硬件: ${hardware}, 机器数量: ${machineCount}, 每机卡数: ${cardsPerMachine}
- 业务场景: ${businessScenario}
- 业务数据描述: ${businessData?.description}
- TPS: ${performanceRequirements?.tps}, 并发: ${performanceRequirements?.concurrency}

输出严格使用JSON：
{
  "intent": "allow" | "block",
  "reason": "简短说明原因（中文）"
}`
}

export async function checkEvaluationIntent(req: EvaluationRequest, modelName: string): Promise<IntentCheckResult> {
  // 本地规则先行
  const quickCheck = basicIntentHeuristics(req)
  if (!quickCheck.allowed) return quickCheck

  const apiKey = process.env.QIANFAN_API_KEY

  // 没有API密钥时放行，避免误杀
  if (!apiKey) {
    console.warn("未设置 QIANFAN_API_KEY，跳过意图识别，默认放行。")
    return { allowed: true }
  }

  try {
    const prompt = buildIntentPrompt(req)

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
            { role: "system", content: "你是企业AI评估的安全审核员，只输出JSON，不要额外解释。" },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        }),
      },
      {
        maxRetries: 3,
        timeout: 60000,
        onRetry: (attempt, error) => {
          console.log(`意图识别重试 (${attempt}/3):`, error.message)
        },
      }
    )

    const data = await response.json()

    if (data.error_code || data.error_msg) {
      throw new Error(`意图识别API错误: ${data.error_msg || data.error_code}`)
    }

    const content = data.choices?.[0]?.message?.content
    if (!content || typeof content !== "string") {
      throw new Error("意图识别返回内容为空或格式异常")
    }

    const parsed = JSON.parse(content)
    const allowed = parsed.intent === "allow" || parsed.allowed === true
    const reason = parsed.reason || parsed.explanation || "输入未通过意图校验，请完善后重试。"

    return {
      allowed,
      reason: allowed ? undefined : reason,
    }
  } catch (error) {
    console.error("意图识别失败，默认放行:", error)
    // 为避免误伤正常请求，发生错误时放行
    return { allowed: true }
  }
}
