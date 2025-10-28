import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables from .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { benchmarkCases } from '../lib/benchmark-cases';
import { evaluateTechnicalSolution } from '../lib/technical-evaluator';
import { evaluateBusinessValue } from '../lib/business-evaluator';
import type { TechnicalEvaluationResult } from '../lib/technical-evaluator';
import type { BusinessValueResult } from '../lib/business-evaluator';

// 在这里填入您想要测评的模型列表
const MODELS_TO_TEST = [
  "ernie-4.5-turbo-128k",
  "ernie-4.5-21b-a3b-thinking",
  "ernie-4.5-21b-a3b",
  "ernie-x1.1",
  "deepseek-v3",
  "kimi-k2-instruct",
  "qwen3-235b-a22b-instruct-2507",
];

interface BenchmarkResult {
  caseName: string;
  model: string;
  technicalEvaluation?: {
    duration: number;
    output: TechnicalEvaluationResult;
  };
  businessEvaluation?: {
    duration: number;
    output: BusinessValueResult;
  };
  error?: string;
}

async function runBenchmark() {
  const allResults: BenchmarkResult[] = [];
  const reportPath = path.join(process.cwd(), '模型横向测评报告.md');
  const resultsJsonPath = path.join(process.cwd(), 'benchmark-results.json');

  console.log(`开始模型横向测评...`);
  console.log(`待测模型: ${MODELS_TO_TEST.join(', ')}`);
  console.log(`测试用例: ${Object.keys(benchmarkCases).join(', ')}`);

  for (const model of MODELS_TO_TEST) {
    for (const [caseName, caseData] of Object.entries(benchmarkCases)) {
      console.log(`\n[模型: ${model}] - [用例: ${caseName}]`);
      const result: BenchmarkResult = { caseName, model };

      try {
        // 运行技术评估
        console.log('  -> 正在进行技术评估...');
        const techStartTime = Date.now();
        const technicalOutput = await evaluateTechnicalSolution(caseData, model);
        const techDuration = Date.now() - techStartTime;
        result.technicalEvaluation = { duration: techDuration, output: technicalOutput };
        console.log(`  -> 技术评估完成，耗时: ${techDuration}ms`);

        // 运行商业评估
        console.log('  -> 正在进行商业评估...');
        const bizStartTime = Date.now();
        const businessOutput = await evaluateBusinessValue(caseData, model);
        const bizDuration = Date.now() - bizStartTime;
        result.businessEvaluation = { duration: bizDuration, output: businessOutput };
        console.log(`  -> 商业评估完成，耗时: ${bizDuration}ms`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        result.error = errorMessage;
        console.error(`  -> 评估失败: ${errorMessage}`);
      }
      allResults.push(result);
      
      // 实时写入JSON结果，以便查看进度
      await fs.writeFile(resultsJsonPath, JSON.stringify(allResults, null, 2));
    }
  }

  // 最终确认保存
  console.log(`\n测评原始数据已实时写入并最终保存至: ${resultsJsonPath}`);

  // 生成Markdown报告
  await generateMarkdownReport(allResults, reportPath);
  console.log(`测评报告已生成: ${reportPath}`);
}

async function generateMarkdownReport(results: BenchmarkResult[], reportPath: string) {
  let reportContent = `# 大模型横向测评报告\n\n`;

  // 1. Executive Summary
  reportContent += `## 1. 核心摘要\n\n`;
  reportContent += `本次测评旨在对比不同大模型在AI项目评估任务中的表现，主要考察评估质量、响应速度两个维度。\n\n`;
  
  // Performance Summary Table
  const performanceData = MODELS_TO_TEST.map(model => {
    const modelResults = results.filter(r => r.model === model && !r.error);
    const avgTechDuration = modelResults.reduce((acc, r) => acc + (r.technicalEvaluation?.duration || 0), 0) / modelResults.length;
    const avgBizDuration = modelResults.reduce((acc, r) => acc + (r.businessEvaluation?.duration || 0), 0) / modelResults.length;
    return {
      model,
      avgTech: Math.round(avgTechDuration),
      avgBiz: Math.round(avgBizDuration),
      totalAvg: Math.round(avgTechDuration + avgBizDuration),
    };
  });

  reportContent += `### 性能总结 (平均响应时间)\n\n`;
  reportContent += `| 模型名称 | 技术评估平均耗时 (毫秒) | 商业评估平均耗时 (毫秒) | 总平均耗时 (毫秒) |\n`;
  reportContent += `| :--- | :--- | :--- | :--- |\n`;
  performanceData.forEach(d => {
    reportContent += `| \`${d.model}\` | ${d.avgTech} | ${d.avgBiz} | ${d.totalAvg} |\n`;
  });
  reportContent += `\n`;

  // 2. Detailed Results
  reportContent += `## 2. 详细测评结果\n\n`;

  reportContent += addTestCaseDesignRationale();

  for (const [caseName, caseData] of Object.entries(benchmarkCases)) {
    reportContent += `### 案例: ${caseName}\n\n`;
    reportContent += `**场景描述:** ${caseData.businessScenario}\n\n`;

    for (const model of MODELS_TO_TEST) {
      const result = results.find(r => r.caseName === caseName && r.model === model);
      if (!result) continue;

      reportContent += `#### 模型: \`${model}\`\n`;
      if (result.error) {
        reportContent += `*   **评估失败:** \`${result.error}\`\n\n`;
      } else {
        const techEval = result.technicalEvaluation;
        const bizEval = result.businessEvaluation;
        reportContent += `*   **技术评估耗时:** \`${techEval?.duration} ms\`\n`;
        reportContent += `*   **商业评估耗时:** \`${bizEval?.duration} ms\`\n`;
        reportContent += `*   **生成摘要片段 (技术):**\n`;
        reportContent += `    > ${techEval?.output.summary.substring(0, 100)}...\n`;
        reportContent += `*   **生成摘要片段 (商业):**\n`;
        reportContent += `    > ${bizEval?.output.summary.substring(0, 100)}...\n`;
        
        reportContent += `*   <details>\n`;
        reportContent += `    <summary>点击查看完整JSON输出</summary>\n\n`;
        reportContent += `    \`\`\`json\n`;
        reportContent += `    ${JSON.stringify({ technical: techEval?.output, business: bizEval?.output }, null, 2)}\n`;
        reportContent += `    \`\`\`\n`;
        reportContent += `    </details>\n\n`;
      }
    }
    reportContent += `---\n\n`;
  }

  await fs.writeFile(reportPath, reportContent);
}

function addTestCaseDesignRationale(): string {
  return `### 测试用例设计思路

为了全面评估不同模型的能力，我们设计了以下10个具有代表性的测试用例，每个用例都旨在考察模型的特定分析维度：

- **case1_baseline_ecommerce_rag**: **基准案例**。一个各方面都合理（模型、硬件、场景）的电商客服RAG方案，用于建立性能和质量的基准线。
- **case2_high_risk_medical_diagnosis**: **高风险场景识别**。测试模型在面对医疗诊断这类高风险、高合规要求的业务时，能否准确识别出其固有的法律、伦理和安全风险。
- **case3_overkill_sentiment_analysis**: **成本效益与过度设计判断**。通过用顶级大模型处理简单的文本分类任务，测试模型能否识别出“杀鸡用牛刀”式的资源浪费，并提出更具性价比的替代方案。
- **case4_mismatched_model_for_vision_task**: **模型能力边界认知（模态）**。使用纯文本模型处理图像任务，测试模型能否发现这种根本性的、跨模态的错误。
- **case5_insufficient_hardware_for_llm**: **硬件资源可行性评估**。使用消费级显卡运行大型模型，测试模型能否准确计算出显存不足的结论，并给出如量化、更换硬件等合理建议。
- **case6_specialized_ocr_task**: **专用模型与通用模型对比认知**。使用通用多模态模型处理成熟的OCR任务，测试模型是否具备“专业领域应使用专用模型”的认知，并推荐更高效、经济的专用OCR方案。
- **case7_low_quality_data_finetuning**: **数据质量重要性判断**。使用低质量、未清洗的数据进行微调，测试模型能否意识到“垃圾进，垃圾出”的风险，并强调数据清洗和治理的重要性。
- **case8_unrealistic_performance_req**: **性能需求与业务场景匹配度判断**。为一个低频内部工具设置极高的性能指标，测试模型能否识别出性能要求与实际业务需求不匹配的问题。
- **case9_long_context_challenge**: **上下文窗口（Context Window）认知**。选择一个上下文窗口远小于任务所需文本长度的模型，测试模型能否发现这一限制，并判断方案不可行。
- **case10_small_model_for_deep_knowledge**: **小模型能力边界认知（知识与推理）**。使用参数量极小的模型处理需要深度专业知识和复杂推理的任务，测试模型能否判断出其能力不足以胜任该任务。

---

`;
}

runBenchmark().catch(error => {
  console.error("测评脚本执行失败:", error);
  process.exit(1);
});
