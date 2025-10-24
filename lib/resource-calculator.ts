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

  // --- 评估各项任务所需显存 (基于FP16精度) ---

  // 1. 推理 (Inference)
  // 公式: 参数量 * 2 bytes (FP16) * 1.2 (经验开销)
  const inferenceRequired = paramsB * 2 * 1.2
  const inferencePercent = (inferenceRequired / totalVRAM) * 100
  const inferenceFeasible = totalVRAM >= inferenceRequired

  // 2. 全参数微调 (Full Fine-tuning)
  // 公式: 参数量 * 2 bytes (FP16) * 4 (权重+梯度+Adam优化器)
  const finetuningRequired = paramsB * 2 * 4
  const finetuningPercent = (finetuningRequired / totalVRAM) * 100
  const finetuningFeasible = totalVRAM >= finetuningRequired

  // 3. 预训练 (Pre-training)
  // 预训练因其巨大的批处理大小，激活值会占用极高的显存，通常是微调的数倍。
  // 这里我们使用一个更符合业界实践的保守系数：8倍模型大小。
  // 公式: 参数量 * 2 bytes (FP16) * 8 (权重+梯度+Adam+巨大的激活开销)
  const pretrainingRequired = paramsB * 2 * 8
  const pretrainingPercent = (pretrainingRequired / totalVRAM) * 100
  const pretrainingFeasible = totalVRAM >= pretrainingRequired

  // 4. PEFT 微调 (LoRA & QLoRA)
  // LoRA 微调: 基于推理显存增加少量开销
  const loraRequired = inferenceRequired * 1.2
  const loraFeasible = totalVRAM >= loraRequired

  // QLoRA 微调: 基于4-bit量化推理显存增加少量开销
  // 4-bit模型权重显存 = 参数量 * 0.5 bytes
  const qloraBaseVram = paramsB * 0.5
  const qloraRequired = qloraBaseVram * 1.5 // 1.5倍开销
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

/**
 * 根据资源使用率计算一个0-100的非线性分数
 * @param utilizationPercent - 资源使用率 (%)
 * @returns 0-100的分数
 */
export function calculateResourceScore(utilizationPercent: number): number {
  if (utilizationPercent > 100) {
    return 0 // 不可行
  }
  if (utilizationPercent <= 60) {
    return 100 // 最佳范围
  }
  if (utilizationPercent <= 90) {
    // 61-90% 高效范围，分数线性下降
    return 100 - (utilizationPercent - 60) * 2
  }
  // 91-100% 警告范围，分数急剧下降
  return 40 - (utilizationPercent - 90) * 4
}
