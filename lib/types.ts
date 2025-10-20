// 共享类型定义

export type DataType = "text" | "image" | "qa_pair" | "video" | "audio"
export type DataQuality = "high" | "medium" | "low"
export type QuantizationType = "FP16" | "INT8" | "INT4"
export type ModuleType = "resource" | "technical" | "business"
export type FeedbackType = "like" | "dislike"
export type GeneralFeedbackType = "bug" | "feature" | "improvement" | "other"

export interface EvaluationRequest {
  model: string
  hardware: string
  cardCount: number
  businessData: {
    volume: number
    dataTypes: DataType[]
    quality: DataQuality
  }
  businessScenario: string
  performanceRequirements: {
    qps: number
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
  detailedEvaluation?: {
    score: number
    summary: string
    dimensions: {
      modelTaskAlignment: {
        status: "matched" | "mismatched" | "partial"
        analysis: string
      }
      llmNecessity: {
        status: "necessary" | "unnecessary" | "debatable"
        analysis: string
        alternatives?: string
      }
      fineTuning: {
        necessary: boolean
        dataAdequacy: "sufficient" | "marginal" | "insufficient"
        analysis: string
      }
      implementationRoadmap: {
        feasible: boolean
        analysis: string
        phases: {
          shortTerm?: string[]
          midTerm?: string[]
          notRecommended?: string[]
        }
      }
      performanceRequirements: {
        reasonable: boolean
        analysis: string
      }
      costEfficiency: {
        level: "reasonable" | "high" | "excessive"
        analysis: string
      }
      domainConsiderations?: {
        applicable: boolean
        analysis: string
      }
    }
    criticalIssues: string[]
    warnings: string[]
    recommendations: string[]
  }
}

export interface BusinessValue {
  score: number
  analysis: string
  risks: string[]
  opportunities: string[]
}

export interface EvaluationResponse {
  evaluationId: string
  resourceFeasibility: ResourceFeasibility
  technicalFeasibility: TechnicalFeasibility
  businessValue: BusinessValue
  createdAt: string
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
  phone: string
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
