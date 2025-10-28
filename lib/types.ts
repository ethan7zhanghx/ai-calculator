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
  // 完整的LLM商业价值评估结果（可选，用于详细展示）
  detailedEvaluation?: {
    score: number
    summary: string
    disclaimer: string
    dimensions: {
      problemSolutionFit: {
        score: number
        status: "strong" | "moderate" | "weak"
        analysis: string
        painPoints: string[]
        aiNecessity: "high" | "medium" | "low"
      }
      roiFeasibility: {
        score: number
        analysis: string
        considerations: string[]
      }
      competitiveAdvantage: {
        score: number
        level: "differentiated" | "parity" | "lagging"
        analysis: string
        barriers: string[]
      }
      scalability: {
        score: number
        level: "high" | "medium" | "low"
        analysis: string
        growthPotential: string[]
      }
      implementationRisk: {
        score: number
        level: "low" | "medium" | "high"
        analysis: string
        risks: {
          technical: string[]
          business: string[]
          compliance: string[]
          organizational: string[]
        }
        mitigations: string[]
      }
      marketTiming: {
        score: number
        status: "optimal" | "acceptable" | "poor"
        analysis: string
        urgency: "high" | "medium" | "low"
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
