// 简单的千帆流式测试脚本
// 用法：
//   export QIANFAN_API_KEY=your_key
//   node scripts/test-qianfan-stream.js

const apiKey = process.env.QIANFAN_API_KEY

if (!apiKey) {
  console.error("缺少 QIANFAN_API_KEY 环境变量")
  process.exit(1)
}

async function main() {
  const res = await fetch("https://qianfan.baidubce.com/v2/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Appbuilder-Authorization": apiKey,
    },
    body: JSON.stringify({
      model: "ernie-4.5-turbo-128k", // 如需更换模型可修改此处
      stream: true,                  // 开启流式
      messages: [
        { role: "user", content: "请展示你的推理过程，并输出 reasoning 字段" }
      ],
    }),
  })

  if (!res.ok || !res.body) {
    console.error("请求失败", res.status, await res.text())
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  console.log("=== 开始读取流式响应 ===")
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    chunk.split("\n\n").forEach(line => {
      if (!line.startsWith("data: ")) return
      const payload = line.slice(6)
      if (payload === "[DONE]") {
        console.log("==== DONE ====")
        return
      }
      try {
        const obj = JSON.parse(payload)
        console.log("chunk:", JSON.stringify(obj, null, 2))
      } catch (e) {
        console.warn("无法解析 chunk:", payload)
      }
    })
  }
}

main().catch(err => console.error(err))
