// 共享类型定义

import type { TechnicalEvaluationResult } from "./technical-evaluator"

export type DataType = "text" | "image" | "qa_pair" | "video" | "audio"
export type DataQuality = "high" | "medium" | "low"
export type QuantizationType = "FP16" | "INT8" | "INT4"
export type ModuleType = "resource" | "technical" | "business"
export type FeedbackType = "like" | "dislike"
export type GeneralFeedbackType = "bug" | "feature" | "improvement" | "other"

export interface EvaluationRequest {
  model: string
  hardware: string
  machineCount: number
  cardsPerMachine: number
  businessData: {
    description: string
    quality: DataQuality
  }
  businessScenario: string
  performanceRequirements: {
    tps: number
    concurrency: number
  }
}

export interface QuantizationOption {
  type: QuantizationType
  memoryUsagePercent: number
  supportedQPS: number
  meetsRequirements: boolean
}

export interface ResourceModule {
  feasible: boolean
  memoryUsagePercent: number
  memoryRequired: number
  memoryAvailable: number
  suggestions: string[]
}

export interface FineTuningModule extends ResourceModule {
  loraFeasible: boolean
  qloraFeasible: boolean
}

export interface InferenceModule extends ResourceModule {
  supportedThroughput: number
  supportedQPS: number
  meetsRequirements: boolean
  quantizationOptions: QuantizationOption[]
}

export interface ResourceFeasibility {
  pretraining: ResourceModule
  fineTuning: FineTuningModule
  inference: InferenceModule
}

export interface TechnicalFeasibility {
  appropriate: boolean
  score: number
  issues: string[]
  recommendations: string[]
  // 完整的LLM评估结果（可选，用于详细展示）
  detailedEvaluation?: TechnicalEvaluationResult
}

export interface BusinessValue {
  score: number
  analysis: string
  risks: string[]
  opportunities: string[]
  // 完整的LLM场景价值评估结果（可选，用于详细展示）
  detailedEvaluation?: {
    score: number
    summary: string
    disclaimer: string
    dimensions: {
      // 1. 问题-场景聚焦程度 (15%)
      problemScenarioFocus: {
        score: number
        analysis: string
        painPointClarity: "clear" | "moderate" | "unclear"
        aiNecessity: "essential" | "helpful" | "unnecessary"
      }
      // 2. 技术壁垒优势 (15%)
      technicalBarrier: {
        score: number
        analysis: string
        differentiationLevel: "high" | "medium" | "low"
        competitiveAdvantages: string[]
      }
      // 3. 数据支撑潜力 (20%)
      dataSupportPotential: {
        score: number
        analysis: string
        dataCompleteness: number // 0-100
        dataAccuracy: number // 0-100
        dataTimeliness: number // 0-100
        flywheelPotential: "strong" | "moderate" | "weak"
      }
      // 4. AI人才储备 (20%)
      aiTalentReserve: {
        score: number
        analysis: string
        talentLevel: "strong" | "moderate" | "weak"
        capabilityGaps: string[]
        developmentSuggestions: string[]
      }
      // 5. ROI合理度 (15%)
      roiFeasibility: {
        score: number
        analysis: string
        investmentLevel: "high" | "medium" | "low"
        returnPath: string[]
      }
      // 6. 市场竞争力 (15%)
      marketCompetitiveness: {
        score: number
        analysis: string
        marketTiming: "optimal" | "acceptable" | "poor"
        competitivePosition: "leading" | "following" | "lagging"
      }
    }
    opportunities: string[]
    risks: string[]
    recommendations: string[]
  }
}

export interface EvaluationResponse {
  evaluationId: string
  resourceFeasibility: ResourceFeasibility
  technicalFeasibility: TechnicalFeasibility
  businessValue: BusinessValue | null
  createdAt: string
  hardwareScore?: number // 可选的硬件评分
}

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
}

export interface AuthRequest {
  email?: string
  phone?: string
  password: string
}

export interface AuthResponse {
  userId: string
  username?: string
  token: string
}

export interface ModuleFeedbackRequest {
  evaluationId: string
  moduleType: ModuleType
  feedbackType: FeedbackType
  comment?: string
}

export interface GeneralFeedbackRequest {
  type: GeneralFeedbackType
  title: string
  description: string
  email?: string
}
