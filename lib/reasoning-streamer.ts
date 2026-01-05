import type { EvaluationRequest } from "./types"

/**
 * 开启一个流式的思考过程输出，只转发 delta.content 作为 reasoning 文本
 * 不影响主评估流程，错误会被吞掉
 */
export async function streamReasoning(
  req: EvaluationRequest,
  controller: ReadableStreamDefaultController,
  signal?: AbortSignal,
  moduleLabel: string = 'live'
) {
  const apiKey = process.env.QIANFAN_API_KEY
  if (!apiKey) return

  const model = "ernie-4.5-turbo-128k"
  const prompt = `你是AI评估助手，请用流式方式输出思考过程（只需 reasoning 文本），不要输出最终结论，保持简洁。

业务场景：${req.businessScenario}
模型：${req.model}
硬件：${req.hardware}，${req.machineCount}机×${req.cardsPerMachine}卡
精调数据：${req.businessData.description}
`

  try {
    const res = await fetch("https://qianfan.baidubce.com/v2/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "X-Appbuilder-Authorization": apiKey,
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [{ role: "user", content: prompt }],
      }),
      signal,
    })

    if (!res.ok || !res.body) {
      console.warn("实时思考流启动失败:", res.status)
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    const encoder = new TextEncoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split("\n\n")
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue
        const payload = line.slice(6)
        if (payload === "[DONE]") break
        try {
          const obj = JSON.parse(payload)
          const content = obj.choices?.[0]?.delta?.content
          if (content && controller.desiredSize !== null && !signal?.aborted) {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'live-reasoning',
                data: { chunk: content, module: moduleLabel }
              })}\n\n`))
            } catch (e) {
              // 流已关闭，终止
              return
            }
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
  } catch (error) {
    console.warn("实时思考流异常:", error)
  }
}
