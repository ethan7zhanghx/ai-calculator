/**
 * 显存计算库 - 基于真实的显存估算公式
 *
 * 参考资料:
 * - Transformer 模型显存计算: https://arxiv.org/abs/2001.08361
 * - LLM 推理显存分析: https://kipp.ly/blog/transformer-inference-arithmetic/
 * - 训练显存优化: https://huggingface.co/docs/transformers/perf_train_gpu_one
 */

// ============= 模型基础参数 =============

export interface ModelParams {
  name: string
  // 模型参数量 (十亿)
  parametersBillions: number
  // 隐藏层维度
  hiddenSize: number
  // 注意力头数
  numAttentionHeads: number
  // 层数
  numLayers: number
  // 词表大小
  vocabSize: number
  // 序列长度
  maxSeqLength: number
}

// 常见模型的参数配置
export const MODEL_CONFIGS: Record<string, ModelParams> = {
  "GPT-4": {
    name: "GPT-4",
    parametersBillions: 1700, // 估算值
    hiddenSize: 18432,
    numAttentionHeads: 144,
    numLayers: 120,
    vocabSize: 100000,
    maxSeqLength: 8192,
  },
  "GPT-3.5": {
    name: "GPT-3.5",
    parametersBillions: 175,
    hiddenSize: 12288,
    numAttentionHeads: 96,
    numLayers: 96,
    vocabSize: 50257,
    maxSeqLength: 4096,
  },
  "Claude 3 Opus": {
    name: "Claude 3 Opus",
    parametersBillions: 500, // 估算值
    hiddenSize: 16384,
    numAttentionHeads: 128,
    numLayers: 96,
    vocabSize: 100000,
    maxSeqLength: 200000,
  },
  "Claude 3 Sonnet": {
    name: "Claude 3 Sonnet",
    parametersBillions: 200, // 估算值
    hiddenSize: 12288,
    numAttentionHeads: 96,
    numLayers: 80,
    vocabSize: 100000,
    maxSeqLength: 200000,
  },
  "Llama 3 70B": {
    name: "Llama 3 70B",
    parametersBillions: 70,
    hiddenSize: 8192,
    numAttentionHeads: 64,
    numLayers: 80,
    vocabSize: 128256,
    maxSeqLength: 8192,
  },
  "Llama 3 8B": {
    name: "Llama 3 8B",
    parametersBillions: 8,
    hiddenSize: 4096,
    numAttentionHeads: 32,
    numLayers: 32,
    vocabSize: 128256,
    maxSeqLength: 8192,
  },
  "Mistral Large": {
    name: "Mistral Large",
    parametersBillions: 140,
    hiddenSize: 10240,
    numAttentionHeads: 80,
    numLayers: 80,
    vocabSize: 32000,
    maxSeqLength: 32768,
  },
  "Mistral 7B": {
    name: "Mistral 7B",
    parametersBillions: 7,
    hiddenSize: 4096,
    numAttentionHeads: 32,
    numLayers: 32,
    vocabSize: 32000,
    maxSeqLength: 32768,
  },
}

// ============= 数据类型的字节数 =============

export enum DataType {
  FP32 = "FP32",
  FP16 = "FP16",
  BF16 = "BF16",
  INT8 = "INT8",
  INT4 = "INT4",
}

export const BYTES_PER_PARAM: Record<DataType, number> = {
  [DataType.FP32]: 4, // 32位浮点
  [DataType.FP16]: 2, // 16位浮点
  [DataType.BF16]: 2, // BF16
  [DataType.INT8]: 1, // 8位整数
  [DataType.INT4]: 0.5, // 4位整数
}

// ============= 推理显存计算 =============

export interface InferenceMemoryBreakdown {
  // 模型权重
  modelWeights: number
  // KV缓存
  kvCache: number
  // 激活值
  activations: number
  // 梯度 (推理时为0)
  gradients: number
  // 优化器状态 (推理时为0)
  optimizerStates: number
  // 临时缓冲区
  tempBuffers: number
  // 总计
  total: number
}

/**
 * 计算推理所需显存
 *
 * 公式:
 * 1. 模型权重 = 参数量 × 字节数/参数
 * 2. KV缓存 = 2 × 层数 × 隐藏层维度 × 序列长度 × 批大小 × 字节数
 * 3. 激活值 = 批大小 × 序列长度 × 隐藏层维度 × 字节数 × 常数因子
 * 4. 临时缓冲区 = 总显存 × 10% (操作系统和框架开销)
 */
export function calculateInferenceMemory(
  modelConfig: ModelParams,
  batchSize: number = 1,
  seqLength: number = 2048,
  dataType: DataType = DataType.FP16
): InferenceMemoryBreakdown {
  const bytesPerParam = BYTES_PER_PARAM[dataType]
  const paramsCount = modelConfig.parametersBillions * 1e9

  // 1. 模型权重显存 (GB)
  const modelWeights = (paramsCount * bytesPerParam) / (1024 ** 3)

  // 2. KV缓存显存
  // 公式: 2 (K和V) × 层数 × 批大小 × 序列长度 × 隐藏层维度 × 字节数
  const kvCacheBytes =
    2 *
    modelConfig.numLayers *
    batchSize *
    seqLength *
    modelConfig.hiddenSize *
    bytesPerParam
  const kvCache = kvCacheBytes / (1024 ** 3)

  // 3. 激活值显存
  // 公式: 批大小 × 序列长度 × 隐藏层维度 × 字节数 × 层数 × 12
  // 系数12来自: 注意力机制(Q,K,V,O) + FFN(上投影,下投影) + LayerNorm + 残差连接
  const activationBytes =
    batchSize *
    seqLength *
    modelConfig.hiddenSize *
    bytesPerParam *
    modelConfig.numLayers *
    12
  const activations = activationBytes / (1024 ** 3)

  // 4. 推理不需要梯度和优化器状态
  const gradients = 0
  const optimizerStates = 0

  // 5. 临时缓冲区 (框架开销、碎片等，约10%)
  const subtotal = modelWeights + kvCache + activations
  const tempBuffers = subtotal * 0.1

  const total = modelWeights + kvCache + activations + gradients + optimizerStates + tempBuffers

  return {
    modelWeights,
    kvCache,
    activations,
    gradients,
    optimizerStates,
    tempBuffers,
    total,
  }
}

// ============= 训练显存计算 =============

export interface TrainingMemoryBreakdown extends InferenceMemoryBreakdown {
  // 训练特有的额外显存
}

/**
 * 计算全量微调所需显存
 *
 * 公式 (AdamW优化器):
 * 1. 模型权重 = 参数量 × 字节数/参数
 * 2. 梯度 = 参数量 × 字节数/参数 (与权重相同)
 * 3. 优化器状态 = 参数量 × 字节数/参数 × 2 (AdamW保存m和v两个动量)
 * 4. 激活值 = 批大小 × 序列长度 × 隐藏层维度 × 层数 × 常数因子
 * 5. 临时缓冲区 = 总显存 × 15% (训练时开销更大)
 *
 * 总计 ≈ 模型权重 × (1 + 1 + 2) × 数据类型系数 + 激活值 + 缓冲区
 */
export function calculateTrainingMemory(
  modelConfig: ModelParams,
  batchSize: number = 1,
  seqLength: number = 2048,
  dataType: DataType = DataType.FP16,
  optimizerType: "AdamW" | "SGD" = "AdamW"
): TrainingMemoryBreakdown {
  const bytesPerParam = BYTES_PER_PARAM[dataType]
  const paramsCount = modelConfig.parametersBillions * 1e9

  // 1. 模型权重 (FP16/BF16)
  const modelWeights = (paramsCount * bytesPerParam) / (1024 ** 3)

  // 2. 梯度 (与权重相同精度)
  const gradients = modelWeights

  // 3. 优化器状态
  // AdamW: 需要2倍参数量 (一阶动量m + 二阶动量v, 通常用FP32存储)
  // SGD: 需要1倍参数量 (只有动量)
  let optimizerStates: number
  if (optimizerType === "AdamW") {
    // AdamW通常用FP32存储优化器状态
    optimizerStates = (paramsCount * 4 * 2) / (1024 ** 3)
  } else {
    optimizerStates = (paramsCount * 4) / (1024 ** 3)
  }

  // 4. 激活值 (训练时需要保存用于反向传播)
  // 公式: 批大小 × 序列长度 × 隐藏层维度 × 层数 × 系数
  // 系数约为34 (需要保存所有中间激活用于反向传播)
  const activationBytes =
    batchSize *
    seqLength *
    modelConfig.hiddenSize *
    bytesPerParam *
    modelConfig.numLayers *
    34
  const activations = activationBytes / (1024 ** 3)

  // 5. KV缓存 (训练时较小,因为是自回归训练)
  const kvCache = 0 // 训练时通常不需要KV缓存

  // 6. 临时缓冲区 (训练时约15%)
  const subtotal = modelWeights + gradients + optimizerStates + activations + kvCache
  const tempBuffers = subtotal * 0.15

  const total = modelWeights + gradients + optimizerStates + activations + kvCache + tempBuffers

  return {
    modelWeights,
    kvCache,
    activations,
    gradients,
    optimizerStates,
    tempBuffers,
    total,
  }
}

/**
 * 计算LoRA微调所需显存
 *
 * LoRA原理: 只训练低秩矩阵,冻结原模型权重
 * 显存需求 ≈ 模型权重(冻结,FP16) + LoRA参数(可训练,约1-2%) + 激活值 + 优化器状态(仅LoRA参数)
 */
export function calculateLoRAMemory(
  modelConfig: ModelParams,
  batchSize: number = 1,
  seqLength: number = 2048,
  loraRank: number = 8,
  loraAlpha: number = 16,
  dataType: DataType = DataType.FP16
): TrainingMemoryBreakdown {
  const bytesPerParam = BYTES_PER_PARAM[dataType]
  const paramsCount = modelConfig.parametersBillions * 1e9

  // 1. 冻结的模型权重 (FP16)
  const modelWeights = (paramsCount * bytesPerParam) / (1024 ** 3)

  // 2. LoRA参数数量
  // LoRA给每个注意力层的Q,K,V,O矩阵添加低秩适配器
  // 参数量 ≈ 4 (Q,K,V,O) × 层数 × 隐藏维度 × LoRA秩 × 2 (A和B矩阵)
  const loraParams = 4 * modelConfig.numLayers * modelConfig.hiddenSize * loraRank * 2
  const loraWeights = (loraParams * bytesPerParam) / (1024 ** 3)

  // 3. LoRA梯度 (只计算LoRA参数的梯度)
  const gradients = loraWeights

  // 4. 优化器状态 (只计算LoRA参数的优化器状态, AdamW = 2倍)
  const optimizerStates = (loraParams * 4 * 2) / (1024 ** 3)

  // 5. 激活值 (比全量训练小,因为大部分层是冻结的)
  const activationBytes =
    batchSize *
    seqLength *
    modelConfig.hiddenSize *
    bytesPerParam *
    modelConfig.numLayers *
    8 // 系数降低,因为冻结层不需要保存中间激活
  const activations = activationBytes / (1024 ** 3)

  // 6. KV缓存
  const kvCache = 0

  // 7. 临时缓冲区
  const subtotal = modelWeights + loraWeights + gradients + optimizerStates + activations
  const tempBuffers = subtotal * 0.12

  const total = modelWeights + loraWeights + gradients + optimizerStates + activations + kvCache + tempBuffers

  return {
    modelWeights: modelWeights + loraWeights,
    kvCache,
    activations,
    gradients,
    optimizerStates,
    tempBuffers,
    total,
  }
}

/**
 * 计算QLoRA微调所需显存
 *
 * QLoRA原理: 模型权重量化为4bit,LoRA参数用16bit训练
 * 显存需求 ≈ 模型权重(INT4) + LoRA参数(FP16) + 激活值 + 优化器状态(仅LoRA参数)
 */
export function calculateQLoRAMemory(
  modelConfig: ModelParams,
  batchSize: number = 1,
  seqLength: number = 2048,
  loraRank: number = 8,
  loraAlpha: number = 16
): TrainingMemoryBreakdown {
  const paramsCount = modelConfig.parametersBillions * 1e9

  // 1. 量化后的模型权重 (4bit)
  const modelWeights = (paramsCount * BYTES_PER_PARAM[DataType.INT4]) / (1024 ** 3)

  // 2. LoRA参数 (FP16)
  const loraParams = 4 * modelConfig.numLayers * modelConfig.hiddenSize * loraRank * 2
  const loraWeights = (loraParams * BYTES_PER_PARAM[DataType.FP16]) / (1024 ** 3)

  // 3. LoRA梯度
  const gradients = loraWeights

  // 4. 优化器状态 (AdamW = 2倍, FP32)
  const optimizerStates = (loraParams * 4 * 2) / (1024 ** 3)

  // 5. 激活值 (使用FP16计算)
  const activationBytes =
    batchSize *
    seqLength *
    modelConfig.hiddenSize *
    BYTES_PER_PARAM[DataType.FP16] *
    modelConfig.numLayers *
    8
  const activations = activationBytes / (1024 ** 3)

  // 6. KV缓存
  const kvCache = 0

  // 7. 临时缓冲区
  const subtotal = modelWeights + loraWeights + gradients + optimizerStates + activations
  const tempBuffers = subtotal * 0.12

  const total = modelWeights + loraWeights + gradients + optimizerStates + activations + kvCache + tempBuffers

  return {
    modelWeights: modelWeights + loraWeights,
    kvCache,
    activations,
    gradients,
    optimizerStates,
    tempBuffers,
    total,
  }
}

// ============= QPS 估算 =============

/**
 * 估算推理QPS
 *
 * 简化公式:
 * QPS = GPU数量 × 单GPU吞吐量
 * 单GPU吞吐量 ≈ 1 / 单次推理延迟
 * 单次推理延迟 = prefill延迟 + decode延迟
 *
 * prefill延迟 (处理输入序列): 约 输入长度 / (GPU算力 / 模型参数量)
 * decode延迟 (生成输出): 约 输出长度 × (模型参数量 / GPU算力)
 *
 * 注: 这是粗略估算,实际QPS受硬件、框架、批处理等多种因素影响
 */
export function estimateInferenceQPS(
  modelConfig: ModelParams,
  gpuCount: number,
  gpuTFLOPS: number, // GPU算力 (TFLOPS)
  batchSize: number = 1,
  inputLength: number = 512,
  outputLength: number = 128,
  dataType: DataType = DataType.FP16
): number {
  const paramsCount = modelConfig.parametersBillions * 1e9

  // 每个token的计算量 (FLOPs) ≈ 2 × 参数量 (前向传播)
  const flopsPerToken = 2 * paramsCount

  // GPU实际算力 (FLOPS) = TFLOPS × 1e12
  // 考虑利用率(约60%)
  const effectiveFLOPS = gpuTFLOPS * 1e12 * 0.6

  // Prefill阶段: 并行处理输入token
  const prefillFLOPs = flopsPerToken * inputLength
  const prefillLatency = prefillFLOPs / effectiveFLOPS

  // Decode阶段: 自回归生成,每次生成1个token
  const decodeFLOPs = flopsPerToken * outputLength
  const decodeLatency = decodeFLOPs / effectiveFLOPS

  // 总延迟 (秒)
  const totalLatency = prefillLatency + decodeLatency

  // 单GPU QPS
  const singleGPUQPS = batchSize / totalLatency

  // 多GPU QPS (假设线性扩展,实际略低)
  const totalQPS = singleGPUQPS * gpuCount * 0.9 // 90%的扩展效率

  return Math.round(totalQPS)
}

// ============= 硬件规格数据 =============

export interface GPUSpec {
  name: string
  vramGB: number
  tflops: number // FP16/BF16算力
  bandwidth: number // 显存带宽 GB/s
}

export const GPU_SPECS: Record<string, GPUSpec> = {
  "NVIDIA A100 (80GB)": {
    name: "NVIDIA A100 (80GB)",
    vramGB: 80,
    tflops: 312,
    bandwidth: 2039
  },
  "NVIDIA A100 (40GB)": {
    name: "NVIDIA A100 (40GB)",
    vramGB: 40,
    tflops: 312,
    bandwidth: 1555
  },
  "NVIDIA H100": {
    name: "NVIDIA H100",
    vramGB: 80,
    tflops: 989,
    bandwidth: 3350
  },
  "NVIDIA V100": {
    name: "NVIDIA V100",
    vramGB: 32,
    tflops: 125,
    bandwidth: 900
  },
  "NVIDIA RTX 4090": {
    name: "NVIDIA RTX 4090",
    vramGB: 24,
    tflops: 165,
    bandwidth: 1008
  },
  "NVIDIA RTX 3090": {
    name: "NVIDIA RTX 3090",
    vramGB: 24,
    tflops: 71,
    bandwidth: 936
  },
}
