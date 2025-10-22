/**
 * 前端硬件资源计算工具
 * 实时计算硬件资源可行性，无需调用后端API
 */

// 硬件规格数据
const hardwareSpecs: Record<string, { vram: number }> = {
  "NVIDIA A100 (80GB)": { vram: 80 },
  "NVIDIA A100 (40GB)": { vram: 40 },
  "NVIDIA H100": { vram: 80 },
  "NVIDIA V100": { vram: 32 },
  "NVIDIA RTX 4090": { vram: 24 },
  "NVIDIA RTX 3090": { vram: 24 },
}

// 模型规格数据
const modelSpecs: Record<
  string,
  {
    vramPerGPU: number
    minGPUs: number
    paramSize: string
  }
> = {
  "GPT-4": { vramPerGPU: 80, minGPUs: 8, paramSize: "1.7T" },
  "GPT-3.5": { vramPerGPU: 40, minGPUs: 2, paramSize: "175B" },
  "Claude 3 Opus": { vramPerGPU: 80, minGPUs: 8, paramSize: "~500B" },
  "Claude 3 Sonnet": { vramPerGPU: 40, minGPUs: 2, paramSize: "~200B" },
  "Llama 3 70B": { vramPerGPU: 80, minGPUs: 4, paramSize: "70B" },
  "Llama 3 8B": { vramPerGPU: 16, minGPUs: 1, paramSize: "8B" },
  "Mistral Large": { vramPerGPU: 80, minGPUs: 4, paramSize: "~140B" },
  "Mistral 7B": { vramPerGPU: 14, minGPUs: 1, paramSize: "7B" },
}

export interface ResourceFeasibility {
  pretraining: {
    feasible: boolean
    memoryUsagePercent: number
    memoryRequired: number
    memoryAvailable: number
    suggestions: string[]
  }
  fineTuning: {
    feasible: boolean
    memoryUsagePercent: number
    memoryRequired: number
    memoryAvailable: number
    loraFeasible: boolean
    qloraFeasible: boolean
    suggestions: string[]
  }
  inference: {
    feasible: boolean
    memoryUsagePercent: number
    memoryRequired: number
    memoryAvailable: number
    supportedThroughput: number
    supportedQPS: number
    meetsRequirements: boolean
    quantizationOptions: Array<{
      type: "FP16" | "INT8" | "INT4"
      memoryUsagePercent: number
      supportedQPS: number
      meetsRequirements: boolean
    }>
    suggestions: string[]
  }
}

/**
 * 计算硬件资源可行性
 */
export function calculateResourceFeasibility(
  model: string,
  hardware: string,
  cardCount: number,
  qps: number
): ResourceFeasibility | null {
  const hwSpec = hardwareSpecs[hardware]
  const modelSpec = modelSpecs[model]

  if (!hwSpec || !modelSpec) {
    return null
  }

  // 计算资源可行性
  const totalVRAM = hwSpec.vram * cardCount

  // 预训练评估
  const pretrainingRequired = modelSpec.vramPerGPU * modelSpec.minGPUs * 1.5
  const pretrainingPercent = Math.min((totalVRAM / pretrainingRequired) * 100, 100)
  const pretrainingFeasible = totalVRAM >= pretrainingRequired

  // 微调评估
  const finetuningRequired = modelSpec.vramPerGPU * modelSpec.minGPUs * 1.2
  const finetuningPercent = Math.min((totalVRAM / finetuningRequired) * 100, 100)
  const finetuningFeasible = totalVRAM >= finetuningRequired

  // LoRA/QLoRA评估
  const loraRequired = modelSpec.vramPerGPU * modelSpec.minGPUs * 0.6
  const qloraRequired = modelSpec.vramPerGPU * modelSpec.minGPUs * 0.4
  const loraFeasible = totalVRAM >= loraRequired
  const qloraFeasible = totalVRAM >= qloraRequired

  // 推理评估
  const inferenceRequired = modelSpec.vramPerGPU * modelSpec.minGPUs
  const inferencePercent = Math.min((totalVRAM / inferenceRequired) * 100, 100)
  const inferenceFeasible = totalVRAM >= inferenceRequired

  // 计算QPS
  const baseQPS = cardCount * 10
  const supportedQPS = inferenceFeasible ? baseQPS * (totalVRAM / inferenceRequired) : 0
  const meetsQPSRequirements = supportedQPS >= qps

  // 量化选项
  const quantizationOptions = [
    {
      type: "FP16" as const,
      memoryUsagePercent: Math.round(inferencePercent),
      supportedQPS: Math.round(supportedQPS),
      meetsRequirements: meetsQPSRequirements,
    },
    {
      type: "INT8" as const,
      memoryUsagePercent: Math.round(Math.min(inferencePercent * 0.5, 100)),
      supportedQPS: Math.round(supportedQPS * 1.5),
      meetsRequirements: supportedQPS * 1.5 >= qps,
    },
    {
      type: "INT4" as const,
      memoryUsagePercent: Math.round(Math.min(inferencePercent * 0.25, 100)),
      supportedQPS: Math.round(supportedQPS * 2),
      meetsRequirements: supportedQPS * 2 >= qps,
    },
  ]

  return {
    pretraining: {
      feasible: pretrainingFeasible,
      memoryUsagePercent: Math.round(pretrainingPercent),
      memoryRequired: pretrainingRequired,
      memoryAvailable: totalVRAM,
      suggestions: pretrainingFeasible
        ? ["硬件资源充足,可以进行预训练"]
        : ["显存不足,建议增加GPU数量或选择更小的模型"],
    },
    fineTuning: {
      feasible: finetuningFeasible,
      memoryUsagePercent: Math.round(finetuningPercent),
      memoryRequired: finetuningRequired,
      memoryAvailable: totalVRAM,
      loraFeasible,
      qloraFeasible,
      suggestions: finetuningFeasible
        ? ["硬件资源可以支持全量微调"]
        : loraFeasible
        ? ["建议使用LoRA进行参数高效微调"]
        : qloraFeasible
        ? ["建议使用QLoRA进行量化微调"]
        : ["当前硬件无法支持微调,建议采购更多硬件或选择更小的模型"],
    },
    inference: {
      feasible: inferenceFeasible,
      memoryUsagePercent: Math.round(inferencePercent),
      memoryRequired: inferenceRequired,
      memoryAvailable: totalVRAM,
      supportedThroughput: Math.round(supportedQPS * 10),
      supportedQPS: Math.round(supportedQPS),
      meetsRequirements: meetsQPSRequirements,
      quantizationOptions,
      suggestions: meetsQPSRequirements
        ? ["当前配置可以满足QPS要求"]
        : quantizationOptions.find((q) => q.meetsRequirements)
        ? [
            `建议使用${
              quantizationOptions.find((q) => q.meetsRequirements)?.type
            }量化以满足QPS要求`,
          ]
        : ["即使使用量化也无法满足QPS要求,建议增加GPU数量"],
    },
  }
}
