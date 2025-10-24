/**
 * 前端硬件资源计算工具
 * 实时计算硬件资源可行性，无需调用后端API
 */
import { MODEL_KNOWLEDGE } from "./model-knowledge-base"

// 硬件规格数据
const hardwareSpecs: Record<string, { vram: number }> = {
  "NVIDIA A100 (80GB)": { vram: 80 },
  "NVIDIA A100 (40GB)": { vram: 40 },
  "NVIDIA H100": { vram: 80 },
  "NVIDIA V100": { vram: 32 },
  "NVIDIA RTX 4090": { vram: 24 },
  "NVIDIA RTX 3090": { vram: 24 },
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
 * 根据模型参数量计算所需显存 (GB)
 * @param parameterSizeB - 模型参数量（十亿）
 * @param precision - 精度 (e.g., 16 for FP16, 8 for INT8)
 * @param overheadFactor - 额外开销因子 (e.g., 2 for Adam optimizer)
 * @returns 所需显存 (GB)
 */
function calculateVram(
  parameterSizeB: number,
  precisionBytes: number,
  overheadFactor: number = 1
): number {
  // 基础显存 = 参数量 * 每个参数的字节数
  // 额外开销包括激活、优化器状态等
  return parameterSizeB * precisionBytes * overheadFactor
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
  const modelSpec = MODEL_KNOWLEDGE[model]

  if (!hwSpec || !modelSpec || modelSpec.parameterSizeB === 0) {
    return null
  }

  const totalVRAM = hwSpec.vram * cardCount
  const paramsB = modelSpec.parameterSizeB

  // --- 评估各项任务所需显存 ---
  // 预训练: FP16/BF16 (2 bytes) + AdamW (16 bytes/param) -> ~18-20 bytes/param
  const pretrainingRequired = calculateVram(paramsB, 1, 20) // 估算为20倍参数量
  const pretrainingPercent = Math.min((totalVRAM / pretrainingRequired) * 100, 100)
  const pretrainingFeasible = totalVRAM >= pretrainingRequired

  // 全量微调: FP16/BF16 (2 bytes) + AdamW (16 bytes/param) -> ~18 bytes/param
  const finetuningRequired = calculateVram(paramsB, 1, 18) // 估算为18倍参数量
  const finetuningPercent = Math.min((totalVRAM / finetuningRequired) * 100, 100)
  const finetuningFeasible = totalVRAM >= finetuningRequired

  // 推理 (FP16): 2 bytes/param
  const inferenceRequired = calculateVram(paramsB, 2)
  const inferencePercent = Math.min((totalVRAM / inferenceRequired) * 100, 100)
  const inferenceFeasible = totalVRAM >= inferenceRequired

  // LoRA 微调: FP16 model (2 bytes) + 少量额外开销 (估算为1.2倍推理显存)
  const loraRequired = inferenceRequired * 1.2
  const loraFeasible = totalVRAM >= loraRequired

  // QLoRA 微调: INT4 model (0.5 bytes) + 少量额外开销 (估算为1.5倍4-bit推理显存)
  const qloraRequired = calculateVram(paramsB, 0.5) * 1.5
  const qloraFeasible = totalVRAM >= qloraRequired

  // --- QPS 计算 ---
  // 这是一个非常简化的估算，实际QPS受多种因素影响
  const baseQPS = cardCount * 10 // 假设基准QPS
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
      supportedQPS: Math.round(supportedQPS * 1.8), // INT8加速比
      meetsRequirements: supportedQPS * 1.8 >= qps,
    },
    {
      type: "INT4" as const,
      memoryUsagePercent: Math.round(Math.min(inferencePercent * 0.25, 100)),
      supportedQPS: Math.round(supportedQPS * 2.5), // INT4加速比
      meetsRequirements: supportedQPS * 2.5 >= qps,
    },
  ]

  return {
    pretraining: {
      feasible: pretrainingFeasible,
      memoryUsagePercent: Math.round(pretrainingPercent),
      memoryRequired: Math.round(pretrainingRequired),
      memoryAvailable: totalVRAM,
      suggestions: pretrainingFeasible
        ? ["硬件资源充足,可以进行预训练"]
        : ["显存不足,预训练需要极大资源，建议增加GPU数量或选择更小的模型"],
    },
    fineTuning: {
      feasible: finetuningFeasible,
      memoryUsagePercent: Math.round(finetuningPercent),
      memoryRequired: Math.round(finetuningRequired),
      memoryAvailable: totalVRAM,
      loraFeasible,
      qloraFeasible,
      suggestions: finetuningFeasible
        ? ["硬件资源可以支持全量微调"]
        : loraFeasible
        ? ["全量微调资源不足，建议使用LoRA进行参数高效微调"]
        : qloraFeasible
        ? ["LoRA微调资源不足，建议使用QLoRA进行量化微调"]
        : ["当前硬件无法支持任何微调,建议采购更多硬件或选择更小的模型"],
    },
    inference: {
      feasible: inferenceFeasible,
      memoryUsagePercent: Math.round(inferencePercent),
      memoryRequired: Math.round(inferenceRequired),
      memoryAvailable: totalVRAM,
      supportedThroughput: Math.round(supportedQPS * 10), // 简化估算
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
