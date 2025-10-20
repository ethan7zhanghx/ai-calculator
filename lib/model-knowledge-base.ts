/**
 * 模型知识库
 * 提供模型的客观参数信息，用于LLM评估时的上下文
 */

export interface ModelInfo {
  parameters: string // 参数量
  architecture: "dense" | "MoE" // 架构类型
  modality: "text" | "multimodal" // 模态类型
  contextWindow: string // 上下文窗口
  hasVision: boolean // 是否支持视觉
  openSource?: boolean // 是否开源
}

export const MODEL_KNOWLEDGE: Record<string, ModelInfo> = {
  "GPT-4": {
    parameters: "1.7T（估计）",
    architecture: "dense",
    modality: "multimodal",
    contextWindow: "128K",
    hasVision: true,
  },

  "GPT-3.5": {
    parameters: "175B",
    architecture: "dense",
    modality: "text",
    contextWindow: "16K",
    hasVision: false,
  },

  "Claude 3 Opus": {
    parameters: "500B（估计）",
    architecture: "dense",
    modality: "multimodal",
    contextWindow: "200K",
    hasVision: true,
  },

  "Claude 3 Sonnet": {
    parameters: "200B（估计）",
    architecture: "dense",
    modality: "multimodal",
    contextWindow: "200K",
    hasVision: true,
  },

  "Llama 3 70B": {
    parameters: "70B",
    architecture: "dense",
    modality: "text",
    contextWindow: "8K",
    hasVision: false,
    openSource: true,
  },

  "Llama 3 8B": {
    parameters: "8B",
    architecture: "dense",
    modality: "text",
    contextWindow: "8K",
    hasVision: false,
    openSource: true,
  },

  "Mistral Large": {
    parameters: "140B（估计）",
    architecture: "MoE",
    modality: "text",
    contextWindow: "32K",
    hasVision: false,
  },

  "Mistral 7B": {
    parameters: "7B",
    architecture: "dense",
    modality: "text",
    contextWindow: "8K",
    hasVision: false,
    openSource: true,
  },
}

/**
 * 获取模型信息，如果模型不在知识库中返回默认信息
 */
export function getModelInfo(modelName: string): ModelInfo {
  return (
    MODEL_KNOWLEDGE[modelName] || {
      parameters: "未知",
      architecture: "dense",
      modality: "text",
      contextWindow: "未知",
      hasVision: false,
    }
  )
}

/**
 * 格式化模型信息为文本描述
 */
export function formatModelInfo(modelName: string): string {
  const info = getModelInfo(modelName)
  return `${modelName}：
- 参数量：${info.parameters}
- 架构：${info.architecture}
- 模态：${info.modality === "multimodal" ? "多模态（文本+视觉）" : "纯文本"}
- 上下文窗口：${info.contextWindow}
- 视觉能力：${info.hasVision ? "支持" : "不支持"}${info.openSource ? "\n- 开源模型" : ""}`
}
