/**
 * 测试显存计算器的合理性
 */

import {
  MODEL_CONFIGS,
  GPU_SPECS,
  DataType,
  calculateInferenceMemory,
  calculateTrainingMemory,
  calculateLoRAMemory,
  calculateQLoRAMemory,
  estimateInferenceQPS,
} from "../lib/vram-calculator"

console.log("=".repeat(80))
console.log("显存计算器测试")
console.log("=".repeat(80))
console.log()

// 测试用例 1: Llama 3 8B 在单张 A100 40GB 上推理
console.log("📊 测试用例 1: Llama 3 8B + A100 40GB x1 (推理)")
console.log("-".repeat(80))
const llama8bConfig = MODEL_CONFIGS["Llama 3 8B"]
const a100_40gb = GPU_SPECS["NVIDIA A100 (40GB)"]

const llama8b_inference = calculateInferenceMemory(
  llama8bConfig,
  1, // batch=1
  2048, // seq_length
  DataType.FP16
)

console.log(`模型参数: ${llama8bConfig.parametersBillions}B`)
console.log(`GPU显存: ${a100_40gb.vramGB}GB`)
console.log()
console.log("显存分解 (FP16):")
console.log(`  - 模型权重: ${llama8b_inference.modelWeights.toFixed(2)} GB`)
console.log(`  - KV缓存: ${llama8b_inference.kvCache.toFixed(2)} GB`)
console.log(`  - 激活值: ${llama8b_inference.activations.toFixed(2)} GB`)
console.log(`  - 临时缓冲: ${llama8b_inference.tempBuffers.toFixed(2)} GB`)
console.log(`  - 总计: ${llama8b_inference.total.toFixed(2)} GB`)
console.log()
console.log(`可行性: ${llama8b_inference.total <= a100_40gb.vramGB ? "✅ 可行" : "❌ 不可行"}`)
console.log(`显存利用率: ${((llama8b_inference.total / a100_40gb.vramGB) * 100).toFixed(1)}%`)

const llama8b_qps = estimateInferenceQPS(
  llama8bConfig,
  1, // 1张GPU
  a100_40gb.tflops,
  1, // batch=1
  512, // input
  128, // output
  DataType.FP16
)
console.log(`预估QPS: ${llama8b_qps}`)
console.log()

// 测试用例 2: Llama 3 70B 在 8张 A100 80GB 上推理
console.log("📊 测试用例 2: Llama 3 70B + A100 80GB x8 (推理)")
console.log("-".repeat(80))
const llama70bConfig = MODEL_CONFIGS["Llama 3 70B"]
const a100_80gb = GPU_SPECS["NVIDIA A100 (80GB)"]
const gpuCount = 8

const llama70b_inference = calculateInferenceMemory(
  llama70bConfig,
  1,
  2048,
  DataType.FP16
)

console.log(`模型参数: ${llama70bConfig.parametersBillions}B`)
console.log(`GPU配置: ${a100_80gb.vramGB}GB x ${gpuCount} = ${a100_80gb.vramGB * gpuCount}GB`)
console.log()
console.log("显存分解 (FP16, 单GPU视角):")
console.log(`  - 模型权重: ${llama70b_inference.modelWeights.toFixed(2)} GB`)
console.log(`  - KV缓存: ${llama70b_inference.kvCache.toFixed(2)} GB`)
console.log(`  - 激活值: ${llama70b_inference.activations.toFixed(2)} GB`)
console.log(`  - 总计: ${llama70b_inference.total.toFixed(2)} GB`)
console.log()
console.log(`单GPU需求: ${llama70b_inference.total.toFixed(2)} GB`)
console.log(`可行性: ${llama70b_inference.total <= a100_80gb.vramGB ? "✅ 可行" : "❌ 不可行"}`)

const llama70b_qps = estimateInferenceQPS(
  llama70bConfig,
  gpuCount,
  a100_80gb.tflops,
  1,
  512,
  128,
  DataType.FP16
)
console.log(`预估QPS (8卡): ${llama70b_qps}`)
console.log()

// 测试用例 3: Llama 3 8B 全量微调 vs LoRA vs QLoRA
console.log("📊 测试用例 3: Llama 3 8B 微调方式对比 (A100 40GB x1)")
console.log("-".repeat(80))

const llama8b_training = calculateTrainingMemory(
  llama8bConfig,
  1,
  2048,
  DataType.FP16
)

const llama8b_lora = calculateLoRAMemory(
  llama8bConfig,
  1,
  2048,
  8, // rank
  16 // alpha
)

const llama8b_qlora = calculateQLoRAMemory(
  llama8bConfig,
  1,
  2048,
  8,
  16
)

console.log("全量微调:")
console.log(`  - 模型权重: ${llama8b_training.modelWeights.toFixed(2)} GB`)
console.log(`  - 梯度: ${llama8b_training.gradients.toFixed(2)} GB`)
console.log(`  - 优化器状态: ${llama8b_training.optimizerStates.toFixed(2)} GB`)
console.log(`  - 激活值: ${llama8b_training.activations.toFixed(2)} GB`)
console.log(`  - 总计: ${llama8b_training.total.toFixed(2)} GB`)
console.log(`  - 可行性: ${llama8b_training.total <= a100_40gb.vramGB ? "✅" : "❌"}`)
console.log()

console.log("LoRA微调:")
console.log(`  - 总计: ${llama8b_lora.total.toFixed(2)} GB`)
console.log(`  - 可行性: ${llama8b_lora.total <= a100_40gb.vramGB ? "✅" : "❌"}`)
console.log(`  - 节省: ${((1 - llama8b_lora.total / llama8b_training.total) * 100).toFixed(1)}%`)
console.log()

console.log("QLoRA微调:")
console.log(`  - 总计: ${llama8b_qlora.total.toFixed(2)} GB`)
console.log(`  - 可行性: ${llama8b_qlora.total <= a100_40gb.vramGB ? "✅" : "❌"}`)
console.log(`  - 节省: ${((1 - llama8b_qlora.total / llama8b_training.total) * 100).toFixed(1)}%`)
console.log()

// 测试用例 4: INT8/INT4 量化的效果
console.log("📊 测试用例 4: Llama 3 70B 量化对比")
console.log("-".repeat(80))

const llama70b_fp16 = calculateInferenceMemory(llama70bConfig, 1, 2048, DataType.FP16)
const llama70b_int8 = calculateInferenceMemory(llama70bConfig, 1, 2048, DataType.INT8)
const llama70b_int4 = calculateInferenceMemory(llama70bConfig, 1, 2048, DataType.INT4)

console.log(`FP16: ${llama70b_fp16.total.toFixed(2)} GB (权重: ${llama70b_fp16.modelWeights.toFixed(2)} GB)`)
console.log(`INT8: ${llama70b_int8.total.toFixed(2)} GB (权重: ${llama70b_int8.modelWeights.toFixed(2)} GB)`)
console.log(`INT4: ${llama70b_int4.total.toFixed(2)} GB (权重: ${llama70b_int4.modelWeights.toFixed(2)} GB)`)
console.log()
console.log(`INT8节省: ${((1 - llama70b_int8.total / llama70b_fp16.total) * 100).toFixed(1)}%`)
console.log(`INT4节省: ${((1 - llama70b_int4.total / llama70b_fp16.total) * 100).toFixed(1)}%`)
console.log()

// 测试用例 5: H100 vs A100 性能对比
console.log("📊 测试用例 5: H100 vs A100 性能对比 (Llama 3 70B)")
console.log("-".repeat(80))

const h100 = GPU_SPECS["NVIDIA H100"]

const qps_a100 = estimateInferenceQPS(llama70bConfig, 1, a100_80gb.tflops, 1, 512, 128, DataType.FP16)
const qps_h100 = estimateInferenceQPS(llama70bConfig, 1, h100.tflops, 1, 512, 128, DataType.FP16)

console.log(`A100 (80GB): ${a100_80gb.tflops} TFLOPS → ${qps_a100} QPS`)
console.log(`H100 (80GB): ${h100.tflops} TFLOPS → ${qps_h100} QPS`)
console.log(`H100性能提升: ${((qps_h100 / qps_a100 - 1) * 100).toFixed(1)}%`)
console.log()

console.log("=".repeat(80))
console.log("✅ 测试完成")
console.log("=".repeat(80))
