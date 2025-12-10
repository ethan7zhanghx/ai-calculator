/**
 * 模型知识库
 * 提供模型的客观参数信息，用于LLM评估时的上下文
 */

export interface ModelInfo {
  parameterSizeB: number // 参数量（十亿为单位，用于计算）
  architecture: "dense" | "MoE" // 架构类型
  modality: "text" | "multimodal" // 模态类型
  contextWindow: string // 上下文窗口
}

export const MODEL_KNOWLEDGE: Record<string, ModelInfo> = {
  "DeepSeek-V3.2-Exp": {
    parameterSizeB: 685,
    architecture: "MoE",
    modality: "text",
    contextWindow: "128K"
  },
  "DeepSeek-R1-0528": {
    parameterSizeB: 685,
    architecture: "MoE",
    modality: "text",
    contextWindow: "128K"
  },
  "ERNIE-4.5-VL-424B-A47B": {
    parameterSizeB: 424,
    architecture: "MoE",
    modality: "multimodal",
    contextWindow: "128K",
  },
  "ERNIE-4.5-300B-A47B": {
    parameterSizeB: 300,
    architecture: "MoE",
    modality: "text",
    contextWindow: "128K",
  },
  "ERNIE-4.5-VL-28B-A3B": {
    parameterSizeB: 28,
    architecture: "MoE",
    modality: "multimodal",
    contextWindow: "128K",
  },
  "ERNIE-4.5-21B-A3B": {
    parameterSizeB: 21,
    architecture: "MoE",
    modality: "text",
    contextWindow: "128K",
  },
  "ERNIE-4.5-0.3B": {
    parameterSizeB: 0.36,
    architecture: "dense",
    modality: "text",
    contextWindow: "128K",
  },
  "PaddleOCR-VL": {
    parameterSizeB: 0.9,
    architecture: "dense",
    modality: "multimodal",
    contextWindow: "N/A"
  },
  "Llama 3 70B": {
    parameterSizeB: 70,
    architecture: "dense",
    modality: "text",
    contextWindow: "8K",
  },
  "Llama 3 8B": {
    parameterSizeB: 8,
    architecture: "dense",
    modality: "text",
    contextWindow: "8K",
  },
  "Mistral 7B": {
    parameterSizeB: 7,
    architecture: "dense",
    modality: "text",
    contextWindow: "8K",
  },
  "Qwen3-235B-A22B": {
    parameterSizeB: 235,
    architecture: "MoE",
    modality: "text",
    contextWindow: "",
  },
  "Qwen3-30B-A3B": {
    parameterSizeB: 30,
    architecture: "MoE",
    modality: "text",
    contextWindow: "",
  },
  "Qwen3-4B": {
    parameterSizeB: 4,
    architecture: "dense",
    modality: "text",
    contextWindow: "",
  },
  "Qwen3-32B": {
    parameterSizeB: 32,
    architecture: "dense",
    modality: "text",
    contextWindow: "",
  },
  "Qwen3-14B": {
    parameterSizeB: 14,
    architecture: "dense",
    modality: "text",
    contextWindow: "",
  },
  "Qwen3-8B": {
    parameterSizeB: 8,
    architecture: "dense",
    modality: "text",
    contextWindow: "",
  },
  "Qwen3-1.7B": {
    parameterSizeB: 1.7,
    architecture: "dense",
    modality: "text",
    contextWindow: "",
  },
  "Qwen3-0.6B": {
    parameterSizeB: 0.6,
    architecture: "dense",
    modality: "text",
    contextWindow: "",
  },
  "Qwen3-VL-235B-A22B": {
    parameterSizeB: 235,
    architecture: "MoE",
    modality: "multimodal",
    contextWindow: "",
  },
  "Qwen3-VL-30B-A3B": {
    parameterSizeB: 30,
    architecture: "MoE",
    modality: "multimodal",
    contextWindow: "",
  },
  "Qwen3-VL-8B": {
    parameterSizeB: 8,
    architecture: "dense",
    modality: "multimodal",
    contextWindow: "",
  },
  "Qwen3-VL-4B": {
    parameterSizeB: 4,
    architecture: "dense",
    modality: "multimodal",
    contextWindow: "",
  },
  "Qwen3-VL-2B": {
    parameterSizeB: 2,
    architecture: "dense",
    modality: "multimodal",
    contextWindow: "",
  },
  "Qwen3-VL-32B": {
    parameterSizeB: 32,
    architecture: "dense",
    modality: "multimodal",
    contextWindow: "",
  },
}

/**
 * 获取模型信息，如果模型不在知识库中返回默认信息
 */
export function getModelInfo(modelName: string): ModelInfo {
  return (
    MODEL_KNOWLEDGE[modelName] || {
      parameterSizeB: 0,
      architecture: "dense",
      modality: "text",
      contextWindow: "未知",
    }
  )
}

/**
 * 格式化模型参数量为可读字符串
 */
function formatParameterSize(sizeB: number): string {
  if (sizeB >= 1000) {
    return `${(sizeB / 1000).toFixed(1)}T`
  }
  return `${sizeB}B`
}

/**
 * 格式化模型信息为文本描述
 */
export function formatModelInfo(modelName: string): string {
  const info = getModelInfo(modelName)
  const hasVision = info.modality === "multimodal"
  return `${modelName}：
- 参数量：${formatParameterSize(info.parameterSizeB)}
- 架构：${info.architecture}
- 模态：${hasVision ? "多模态（文本+视觉）" : "纯文本"}
- 上下文窗口：${info.contextWindow}
- 视觉能力：${hasVision ? "支持" : "不支持"}`
}
