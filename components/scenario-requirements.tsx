"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, XCircle, Info } from "lucide-react"

interface ScenarioRequirementsProps {
  scenarioRequirements: {
    needsInference: boolean
    needsFineTuning: boolean
    needsPretraining: boolean
    explanation: string
  }
}

export function ScenarioRequirements({ scenarioRequirements }: ScenarioRequirementsProps) {
  const { needsInference, needsFineTuning, needsPretraining, explanation } = scenarioRequirements

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          场景需求分析
        </CardTitle>
        <CardDescription>
          AI分析您的业务场景所需的技术环节
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 需求标记 */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            {needsInference ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground" />
            )}
            <Badge variant={needsInference ? "default" : "outline"}>推理</Badge>
          </div>

          <div className="flex items-center gap-2">
            {needsFineTuning ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground" />
            )}
            <Badge variant={needsFineTuning ? "default" : "outline"}>微调</Badge>
          </div>

          <div className="flex items-center gap-2">
            {needsPretraining ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground" />
            )}
            <Badge variant={needsPretraining ? "default" : "outline"}>预训练</Badge>
          </div>
        </div>

        {/* 说明文本 */}
        <div className="p-4 rounded-lg bg-muted/50">
          <p className="text-sm leading-relaxed">{explanation}</p>
        </div>

        {/* 预训练特殊说明 */}
        {needsPretraining && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>关于预训练硬件资源计算：</strong>
              预训练的硬件需求计算基于训练一个与您所选模型同等规模的基础模型。
              实际需求会因训练数据量、训练步数、批次大小等因素而有所不同。
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
