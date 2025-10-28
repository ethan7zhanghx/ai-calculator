import type { EvaluationRequest } from './types';

export const benchmarkCases: Record<string, EvaluationRequest> = {
  "case1_hardware_mismatch": {
    model: "Llama 3 70B",
    hardware: "NVIDIA RTX 3090",
    machineCount: 1,
    cardsPerMachine: 1,
    businessScenario: "我们希望为公司的法务团队（约10人）构建一个私有化的法律文书审阅助手。AI需要能够理解复杂的法律条款，并根据预设的规则进行合同风险审查。考虑到数据安全，必须本地化部署。",
    businessData: {
      description: "包含约1000份各类合同范本和公司的标准法务条款文档。",
      quality: "high"
    },
    performanceRequirements: {
      tps: 50,
      concurrency: 5
    }
  },
  "case2_cost_inefficiency": {
    model: "ERNIE-4.5-VL-28B-A3B-PT",
    hardware: "NVIDIA A100 (40GB)",
    machineCount: 1,
    cardsPerMachine: 1,
    businessScenario: "我们财务部门每月需要处理数千张各类发票的录入工作，希望通过AI自动识别发票上的关键字段（如发票代码、号码、金额、日期等）并录入系统，以提升效率。",
    businessData: {
      description: "有约5000张不同版式和清晰度的发票扫描件。",
      quality: "medium"
    },
    performanceRequirements: {
      tps: 15,
      concurrency: 30
    }
  },
  "case3_insufficient_data": {
    model: "Llama 3 8B",
    hardware: "NVIDIA RTX 4090",
    machineCount: 1,
    cardsPerMachine: 1,
    businessScenario: "我们是一家金融科技公司，希望针对信贷审批场景，微调一个模型来自动评估借款人的违约风险。我们希望模型能达到95%以上的准确率。",
    businessData: {
      description: "我们目前只有约500条标注好的历史信贷数据，包含用户基本信息和是否违约的标签。",
      quality: "high"
    },
    performanceRequirements: {
      tps: 20,
      concurrency: 50
    }
  },
  "case4_hidden_risk": {
    model: "Mistral 7B",
    hardware: "NVIDIA RTX 3090",
    machineCount: 1,
    cardsPerMachine: 1,
    businessScenario: "我们计划开发一款面向年轻人的“心情日记”App。用户可以自由记录每天的心情和想法，AI会给予共情和积极的反馈，并能识别用户潜在的负面情绪，提供一个温暖的交流伙伴。",
    businessData: {
      description: "无特定业务数据，依赖模型的通用对话能力。计划在用户使用过程中收集数据。",
      quality: "low"
    },
    performanceRequirements: {
      tps: 10,
      concurrency: 20
    }
  },
  "case5_architecture_understanding": {
    model: "ERNIE-4.5-21B-A3B-PT",
    hardware: "NVIDIA A100 (80GB)",
    machineCount: 2,
    cardsPerMachine: 1,
    businessScenario: "我们需要一个AI工具，用于处理超长篇幅的法律合同（通常超过10万字）。我们的设想是采用RAG（检索增强生成）模式：首先将合同文本向量化存入数据库，当用户提问时，系统检索最相关的合同片段，然后让大模型基于这些片段进行回答，而不是一次性处理整个文档。",
    businessData: {
      description: "大量的PDF和Word格式的法律合同，每份文件长度在5万到15万字不等。",
      quality: "high"
    },
    performanceRequirements: {
      tps: 2,
      concurrency: 5
    }
  },
  "case7_performance_trap": {
    model: "Llama 3 8B",
    hardware: "NVIDIA V100",
    machineCount: 1,
    cardsPerMachine: 1,
    businessScenario: "我们希望为公司内部的100名员工提供一个通用的内容创作助手，辅助他们构思、起草和润色日常的邮件和博客文章。这是一个内部工具，使用频率不高。",
    businessData: {
      description: "无特定业务数据，依赖模型的通用写作能力。",
      quality: "high"
    },
    performanceRequirements: {
      tps: 1000,
      concurrency: 2000
    }
  }
};
