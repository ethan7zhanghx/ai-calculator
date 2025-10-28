/**
 * 商业价值评估模块
 * 使用百度千帆 ERNIE-4.5 API 进行深度商业分析
 * 采用两阶段架构：第一阶段生成详细评估，第二阶段根据评分生成摘要
 */

import type { EvaluationRequest } from "./types"
import { fetchWithRetry } from "./api-retry"

export interface BusinessValueResult {
  score: number
  summary?: string // 第二阶段生成的摘要（可选）
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
      dataCompleteness: number // 0-100，数据覆盖率
      dataAccuracy: number // 0-100，数据准确性
      dataTimeliness: number // 0-100，数据时效性
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

/**
 * 系统提示词（固定，会被千帆缓存）
 */
const SYSTEM_PROMPT = `你是一位资深的AI商业顾问，擅长评估AI项目的商业价值和投资回报。

## 评估原则

1. **客观性**：基于业务场景进行分析，不编造具体数据（如具体金额、百分比）
2. **实用性**：提供可操作的商业建议，而非空洞的理论
3. **全面性**：从多个商业维度综合评估
4. **连贯性**：用段落式叙述而非简单罗列，提供深入分析

## 评分标准

**总分范围：0-100分**

- 80-100分：极具商业价值，强烈建议投资
- 60-79分：有商业价值，可以推进但需优化
- 40-59分：商业价值存疑，需重新论证或调整方向
- 0-39分：商业价值低，不建议投入资源

## 评估维度

### 1. 问题-场景聚焦程度 (15%)
评估AI方案是否真正解决核心业务痛点：
**评分标准**：
- **90-100分**：问题痛点明确且严重，AI是唯一或最优解决方案，直击核心业务价值
- **70-89分**：问题痛点清晰，AI能有效解决，但可能存在其他替代方案
- **50-69分**：问题存在但不够聚焦，AI解决方案的必要性一般
- **< 50分**：问题不明确或AI并非合适的解决方案，属于过度设计

**评估重点**：
- **痛点明确性**：业务场景是否存在明确的、可量化的痛点？
- **AI必要性**：AI是必要手段还是过度设计？是否有更简单的非AI解决方案？
- **价值聚焦度**：方案是否直击核心业务价值，还是边缘优化？
- **问题-方案匹配**：AI的技术特性与业务痛点是否高度匹配？

### 2. 技术壁垒优势 (15%)
评估方案能否通过技术构建竞争壁垒：
**评分标准**：
- **90-100分**：具有显著的技术差异化，形成强竞争壁垒，难以被模仿
- **70-89分**：有一定技术优势，但壁垒不够高，存在被赶超的可能
- **50-69分**：技术优势有限，容易被竞争对手复制
- **< 50分**：无技术壁垒，或技术选型落后于竞争对手

**评估重点**：
- **差异化能力**：相比竞争对手，方案在技术上有何独特优势？
- **护城河深度**：技术壁垒的持久性如何？是否容易被模仿？
- **私有化价值**：私有化部署相比使用API，在数据主权、定制化等方面的优势
- **先发优势**：当前时点启动能否建立时间窗口优势？

### 3. 数据支撑潜力 (20%)
评估数据资产的质量和飞轮效应潜力：
**评分标准**：
- **90-100分**：数据完整、准确、时效性强，且能形成强大的数据飞轮效应
- **70-89分**：数据基本可用，有一定的飞轮潜力，但需要改进
- **50-69分**：数据存在明显缺陷，飞轮效应有限
- **< 50分**：数据严重不足或质量差，无法支撑业务发展

**评估重点**：
- **数据完整性评分 (0-100)**：数据覆盖率，是否涵盖核心业务场景和用户群体
- **数据准确性评分 (0-100)**：数据质量，标注准确性，是否经过治理
- **数据时效性评分 (0-100)**：数据的新鲜度，是否反映当前业务状态
- **数据飞轮潜力**：
  - **强**：使用越多数据越多，模型越好，体验越好，形成正循环
  - **中**：有一定数据积累效应，但增长曲线较平缓
  - **弱**：数据积累对业务改进的边际效用递减
- **数据合规性**：数据采集、存储、使用是否符合法律法规要求

### 4. AI人才储备 (20%)
评估企业的AI技术能力和人才储备：
**评分标准**：
- **90-100分**：拥有完整的AI团队（算法、工程、MLOps），有成功项目经验
- **70-89分**：有基础AI团队，但部分角色缺失，需要补强
- **50-69分**：AI人才储备薄弱，需要大量招聘或外部支持
- **< 50分**：几乎无AI人才储备，项目实施风险极高

**评估重点**：
- **团队完整性**：是否有算法工程师、ML工程师、数据工程师、MLOps工程师？
- **项目经验**：团队是否有类似项目的成功经验？
- **学习能力**：团队是否有快速学习新技术的能力？
- **能力缺口识别**：当前最缺乏哪些关键能力？
- **人才发展建议**：如何通过招聘、培训、外部合作来补强？

### 5. ROI合理度 (15%)
分析投入产出比的合理性（定性分析，不编造具体数字）：
**评分标准**：
- **90-100分**：投入合理，回报路径清晰，长期ROI显著为正
- **70-89分**：投入可接受，回报预期乐观，但存在一定不确定性
- **50-69分**：投入偏高，回报路径不够清晰，ROI存疑
- **< 50分**：投入过高或回报路径不明确，ROI很可能为负

**评估重点**：
- **投入规模评估**：
  - **私有化部署**：硬件采购、机房建设、电力成本、人力成本
  - **API模式**：调用成本、数据传输成本
  - **研发成本**：算法开发、工程实施、测试优化
- **回报路径**：
  - **成本节约型**：人力替代、效率提升、错误减少
  - **收入增长型**：新业务模式、用户体验提升、市场拓展
  - **战略价值型**：数据资产积累、技术能力建设、竞争壁垒构建
- **风险调整**：考虑技术风险、市场风险后的期望收益

### 6. 市场竞争力 (15%)
评估方案的市场地位和竞争优势：
**评分标准**：
- **90-100分**：市场时机最佳，具有领先优势，能快速占领市场
- **70-89分**：市场时机可接受，能保持竞争力，但优势不明显
- **50-69分**：市场时机一般，竞争激烈，难以建立优势
- **< 50分**：市场时机不佳，处于竞争劣势，不建议进入

**评估重点**：
- **市场时机判断**：
  - **最佳**：技术成熟、需求旺盛、竞争适中、资源就绪
  - **可接受**：部分条件成熟，但存在一定挑战
  - **不佳**：过早（技术不成熟）或过晚（市场已饱和）
- **竞争地位分析**：
  - **领先**：先发优势明显，技术或数据领先竞争对手
  - **跟随**：与竞争对手处于同一水平
  - **落后**：技术或市场进入时机晚于竞争对手
- **用户需求验证**：用户对该AI功能的真实需求程度和付费意愿

## 输出要求

**重要：本次评估不需要生成summary字段，请只返回各维度的详细评估结果。**

1. **禁止编造数据**：不要输出"节省成本70%"、"ROI达300%"、"准确率98%"等具体数字，除非用户输入中明确提供
2. **段落式分析**：每个维度用2-4句连贯的话进行深入分析，而非简单罗列要点
3. **平衡视角**：既要指出机会，也要提示风险
4. **可操作建议**：recommendations要具体可执行，而非泛泛而谈
5. **必须包含免责声明**：说明这是辅助决策工具，不构成投资建议

严格按照JSON Schema输出，确保所有字段完整。`

/**
 * Few-Shot评估案例（固定，会被千帆缓存）
 */
const FEW_SHOT_EXAMPLES = `# Few-Shot 评估案例

## 案例1：智能客服系统（高商业价值）

**输入：**
- 业务场景：我们是一家电商平台，目前有200人的客服团队处理售前咨询、订单查询、退换货等问题。客服人力成本持续攀升，且无法提供7x24小时服务。希望引入AI客服系统，处理常见问题，人工客服专注处理复杂投诉。
- 模型：Llama 3 70B
- 硬件配置：A100 80GB * 2
- 数据：10000条历史客服对话记录（已脱敏）
- 性能需求：QPS 50，并发100

**输出：**
\`\`\`json
{
  "score": 85,
  "disclaimer": "本评估基于AI模型分析生成，仅供决策参考，不构成投资建议。实际商业价值受市场环境、执行能力、技术迭代等多种因素影响，企业应结合自身情况审慎评估。建议在正式立项前进行更详细的可行性研究和ROI测算。",
  "dimensions": {
    "problemScenarioFocus": {
      "score": 92,
      "analysis": "电商客服场景存在非常明确的业务痛点。人工客服团队规模大、成本持续增长，且大量咨询属于重复性问题（如订单查询、物流跟踪、退换货政策等），这类问题完全适合由AI系统处理。更重要的是，用户对即时响应的需求与人工客服的工作时间限制之间存在矛盾，AI客服的7x24小时服务能力能够显著提升用户体验。从方案设计来看，采用人机协同模式而非完全替代人工，这种务实的定位既能发挥AI优势，又保留了人工客服处理复杂问题的能力，体现了对问题本质的深刻理解。",
      "painPointClarity": "clear",
      "aiNecessity": "essential"
    },
    "technicalBarrier": {
      "score": 88,
      "analysis": "在AI客服已成为行业标配的背景下，私有化部署开源模型能构建独特的竞争优势。核心优势在于数据主权和隐私保护——所有用户对话数据都保留在企业内部，避免了将敏感数据上传给第三方API服务商的风险，这对于重视用户隐私的品牌来说是巨大的加分项。其次，基于私有数据微调的模型能够更深度地理解企业独特的业务逻辑和用户话术，形成真正'懂你'的AI客服，这是通用API难以比拟的。最后，不受制于人的技术路线让企业在功能迭代和模型优化上拥有完全的自主权，可以更快地响应市场变化。",
      "differentiationLevel": "high",
      "competitiveAdvantages": [
        "数据资产的完全私有化和安全可控",
        "基于自有数据深度定制的模型效果",
        "不受制于第三方API提供商的技术自主权",
        "长期来看更低的边际推理成本"
      ]
    },
    "dataSupportPotential": {
      "score": 82,
      "analysis": "对于客服场景，外部知识库的质量是关键，而10000条QA对话数据则为后续优化提供了宝贵的资源。数据完整性方面，现有数据基本涵盖了常见咨询场景，但可能需要持续补充长尾问题；准确性方面，经过脱敏处理的历史对话记录质量较高，可用于评估或微调；时效性方面，历史数据能反映业务现状，但需要建立持续更新机制。更重要的是，随着系统运行，会持续积累用户咨询数据、问题反馈、知识库更新等，这些数据可以用于模型迭代优化，形成'数据越多-模型越好-用户越多-数据越多'的正向飞轮。",
      "dataCompleteness": 75,
      "dataAccuracy": 85,
      "dataTimeliness": 80,
      "flywheelPotential": "strong"
    },
    "aiTalentReserve": {
      "score": 70,
      "analysis": "从方案的技术选型和设计来看，企业应该具备一定的AI技术认知和基础能力，能够理解私有化部署和开源模型的价值。然而，成功实施该项目需要完整的AI团队，包括算法工程师（负责模型选型和微调）、ML工程师（负责推理优化和部署）、以及MLOps工程师（负责系统稳定性和监控）。如果当前团队中缺少关键角色，建议通过招聘或外部咨询来补强。此外，客服业务团队也需要培训，学习如何与AI系统协同工作，如何利用数据反馈来优化模型效果。",
      "talentLevel": "moderate",
      "capabilityGaps": [
        "可能缺少专业的MLOps工程师来保障系统高可用",
        "可能缺少对开源模型推理优化（如量化、剪枝）的深度经验",
        "客服团队需要培训以适应人机协同工作模式"
      ],
      "developmentSuggestions": [
        "优先招聘或培养1-2名核心MLOps工程师",
        "可考虑与专业咨询公司合作，加速技术落地",
        "建立内部AI培训计划，提升团队整体能力"
      ]
    },
    "roiFeasibility": {
      "score": 78,
      "analysis": "私有化部署开源模型的ROI分析与使用API有本质不同。投入主要包括：一次性的高端硬件采购成本（如2张A100服务器），持续的电力和机房托管费用，以及专业的AI/MLOps工程师的人力成本。虽然初期投入显著高于API模式，但长期来看，推理成本几乎为零，且不受外部API提供商的定价策略影响。收益方面，除了直接的人力成本节约，更重要的是将核心用户对话数据保留在企业内部，这些数据是优化产品、洞察用户需求的金矿。综合来看，对于有长期AI战略和数据资产化意识的企业，私有化部署的长期ROI更高，但需要企业有更强的技术能力和前期资金投入能力。",
      "investmentLevel": "high",
      "returnPath": [
        "人力成本节约：减少重复性咨询的人工处理",
        "用户体验提升：7x24小时即时响应，提高满意度",
        "数据资产积累：对话数据私有化，支撑长期业务优化",
        "技术能力沉淀：建立可复用的AI平台，支撑更多业务"
      ]
    },
    "marketCompetitiveness": {
      "score": 82,
      "analysis": "当前时点启动AI客服项目的时机较为理想。从技术成熟度看，Llama 3等顶级开源模型的性能已能与闭源模型媲美，且vLLM等推理框架的成熟也大大降低了部署门槛。从市场需求看，用户对线上服务的即时响应需求持续提升，AI客服的接受度已经很高。从竞争态势看，虽然多数企业在使用API构建AI客服，但通过私有化部署建立数据和技术壁垒的窗口期仍然存在。从企业资源看，拥有一定规模的客服团队和历史数据，具备了启动AI项目的基础条件。综合来看，现在启动既能享受开源技术红利，又能构建长期竞争优势。",
      "marketTiming": "optimal",
      "competitivePosition": "leading"
    }
  },
  "opportunities": [
    "显著降低客服人力成本，提升运营效率",
    "实现7x24小时全天候服务，提升用户体验和满意度",
    "将核心用户对话数据资产化，构建长期竞争壁垒",
    "建立自主可控的AI能力平台，支撑未来更多业务创新"
  ],
  "risks": [
    "私有化部署的技术门槛和前期投入较高",
    "需要专业的MLOps团队进行长期维护和优化",
    "硬件采购和部署周期可能长于预期",
    "如果业务量未达预期，可能导致硬件资源闲置"
  ],
  "recommendations": [
    "进行详细的TCO（总拥有成本）分析，对比私有化部署与使用主流API服务在3年内的成本差异",
    "优先招聘或培养1-2名核心MLOps工程师，负责技术方案的落地",
    "采用人机协同模式，先从FAQ、订单查询等低风险场景切入，逐步扩大AI覆盖范围",
    "建立完善的效果监控体系，包括准确率、用户满意度、转人工率等关键指标",
    "提前规划客服团队转型方案，将其定位为'AI训练师'和'复杂问题专家'"
  ]
}
\`\`\`

---

## 案例2：OCR发票识别（中等商业价值）

**输入：**
- 业务场景：我们公司每月需要处理5000张纸质发票的报销，财务人员手工录入效率低且容易出错。希望用OCR技术自动识别发票信息，提升财务效率。
- 模型：Qwen-VL-Max (多模态)
- 硬件配置：RTX 4090 * 1
- 数据：2000张发票图片样本
- 性能需求：QPS 10

**输出：**
\`\`\`json
{
  "score": 52,
  "disclaimer": "本评估基于AI模型分析生成，仅供决策参考，不构成投资建议。实际商业价值受市场环境、执行能力、技术迭代等多种因素影响，企业应结合自身情况审慎评估。建议在正式立项前进行更详细的可行性研究和ROI测算。",
  "dimensions": {
    "problemScenarioFocus": {
      "score": 75,
      "analysis": "发票手工录入的痛点是真实且明确的，财务人员重复性劳动时间长、容易出错、效率低下，这在企业管理中是常见问题。OCR自动识别确实能够有效解决这一痛点。然而，问题在于技术方案的选择。Qwen-VL是一个通用的多模态大模型，其核心优势在于复杂的视觉问答和内容生成，而非结构化的文字识别。对于发票这种格式相对固定、识别需求明确的场景，专业的OCR服务（如百度OCR、腾讯OCR等）经过海量数据训练，在特定版式上的准确率、响应速度和性价比都远优于通用大模型方案。因此，虽然问题识别准确，但解决方案的适配性存在偏差。",
      "painPointClarity": "clear",
      "aiNecessity": "helpful"
    },
    "technicalBarrier": {
      "score": 35,
      "analysis": "OCR发票识别在企业数字化转型中已经是非常成熟的应用，几乎不构成任何竞争优势。市场上存在大量成熟的解决方案，从SaaS服务到开源工具，选择丰富且价格透明。更重要的是，这属于企业内部流程优化，对外部用户和客户完全不可见，无法形成市场层面的差异化。如果说有任何潜在优势，那就是通过流程优化提升内部运营效率，间接降低成本，但这种优势是通过'做好基础设施'实现的，而非创造独特价值。使用通用大模型而非专业OCR更不会带来额外的竞争优势，反而因为成本更高而处于不利地位。",
      "differentiationLevel": "low",
      "competitiveAdvantages": [
        "该应用几乎不存在技术壁垒，市场上方案成熟"
      ]
    },
    "dataSupportPotential": {
      "score": 58,
      "analysis": "2000张发票图片样本对于训练或微调一个发票OCR模型来说，数据量是基本够用的，尤其是如果发票格式相对标准化。数据完整性方面，覆盖了常见的发票类型，但可能需要补充一些特殊格式；准确性方面，作为真实的业务数据，质量应该是可靠的；时效性方面，发票格式变化不大，历史数据的时效性问题不大。然而，发票OCR的数据飞轮效应非常弱——一旦模型训练完成，增量数据对模型改进的边际效用很小，不像客服或推荐系统那样能够形成持续优化的正循环。因此，数据的长期战略价值有限。",
      "dataCompleteness": 70,
      "dataAccuracy": 75,
      "dataTimeliness": 80,
      "flywheelPotential": "weak"
    },
    "aiTalentReserve": {
      "score": 45,
      "analysis": "该方案选择了技术门槛较高的路径（私有化部署多模态大模型），但发票OCR本身是一个相对标准化的任务，市面上有大量成熟的SaaS服务可以直接使用，无需专业的AI团队。如果企业确实要自己部署大模型来做OCR，那么需要具备模型部署、推理优化、系统运维等多方面能力，这对于大多数传统企业来说是一个巨大的挑战。更合理的做法是，直接使用专业的OCR API服务，由业务开发人员进行简单的接口集成即可，完全不需要AI专家。因此，当前方案与企业的实际人才储备可能存在错配。",
      "talentLevel": "weak",
      "capabilityGaps": [
        "可能缺少部署和优化多模态大模型的专业能力",
        "可能缺少高性能推理系统的运维经验",
        "对于发票OCR这种成熟场景，专业AI团队是过度配置"
      ],
      "developmentSuggestions": [
        "强烈建议调整技术方案，使用专业的OCR SaaS服务",
        "如果必须自建，建议招聘有OCR项目经验的工程师",
        "评估外包给专业团队的可行性，降低自建风险"
      ]
    },
    "roiFeasibility": {
      "score": 42,
      "analysis": "该方案的ROI存在明显的问题。从成本角度看，即使是使用消费级的RTX 4090，也需要承担硬件、电力和人力的成本。更重要的是，为了达到专用OCR服务的准确率，很可能需要对Qwen-VL模型进行微调，这又会带来额外的数据标注和训练成本。相比之下，专业的OCR服务按次计费，单次调用成本极低，且无需承担任何运维成本。从收益角度看，无论使用哪种技术，最终实现的业务价值（节省人工录入时间、减少错误）是相同的，但自部署大模型的TCO显著更高。因此，该方案的投入产出比不合理，建议重新评估技术路线。",
      "investmentLevel": "high",
      "returnPath": [
        "人工录入时间节约有限（每月5000张发票）",
        "错误率降低带来的价值改进",
        "但投入成本远高于使用专业OCR服务"
      ]
    },
    "marketCompetitiveness": {
      "score": 48,
      "analysis": "从时机角度看，现在启动发票OCR项目算不上最优但也可以接受。一方面，OCR技术已经非常成熟，市场上有大量现成方案可供选择，技术风险低，随时可以启动。另一方面，电子发票正在快速普及，国家也在推动发票电子化，未来纸质发票的占比可能持续下降，这意味着该项目的生命周期和价值回报期可能有限。因此，如果当前纸质发票处理确实是一个显著的痛点，现在启动项目可以立即获得收益；但如果痛点不够明显，也可以考虑等待电子发票更普及后，直接通过系统对接的方式解决。从竞争地位看，OCR属于基础设施，不构成竞争优势。",
      "marketTiming": "acceptable",
      "competitivePosition": "following"
    }
  },
  "opportunities": [
    "解放财务人员的重复性劳动，提升工作效率和满意度",
    "减少人工录入错误，提高财务数据准确性",
    "为财务数字化转型打下基础"
  ],
  "risks": [
    "技术选型不当（使用通用大模型而非专业OCR）导致TCO过高",
    "电子发票普及可能缩短项目价值回报期",
    "财务数据安全和隐私保护风险",
    "自建方案的维护成本可能被低估"
  ],
  "recommendations": [
    "强烈建议调整技术方案，使用专业的OCR SaaS服务（如百度OCR、腾讯OCR等）而非自部署大模型，大幅降低成本和技术门槛",
    "如果必须私有化部署，也应选择轻量级的、专门用于OCR的开源模型，而非通用多模态大模型",
    "建立人工复核机制，对识别结果进行抽查，确保数据准确性",
    "关注电子发票普及趋势，评估是否可通过系统对接方式更高效地解决问题",
    "进行详细的TCO对比分析，确保技术选择的经济合理性"
  ]
}
\`\`\`

---

## 案例3：医疗诊断助手（高风险低价值场景）

**输入：**
- 业务场景：我们是一家互联网医疗平台，希望开发AI诊断助手，用户输入症状后，AI给出可能的疾病判断和就医建议，减轻医生工作负担。
- 模型：ERNIE-4.5-VL-424B-A47B-PT
- 硬件配置: H800 80GB * 8
- 数据：5000条脱敏病例数据
- 性能需求：QPS 20

**输出：**
\`\`\`json
{
  "score": 28,
  "disclaimer": "本评估基于AI模型分析生成，仅供决策参考，不构成投资建议。实际商业价值受市场环境、执行能力、技术迭代等多种因素影响，企业应结合自身情况审慎评估。建议在正式立项前进行更详细的可行性研究和ROI测算。特别提醒：医疗健康领域受到严格监管，任何涉及诊断、治疗建议的AI应用均需通过相关部门审批，切勿擅自上线。",
  "dimensions": {
    "problemScenarioFocus": {
      "score": 35,
      "analysis": "医疗资源紧张、医生工作负担重确实是真实痛点，AI辅助诊疗在理论上也有巨大的应用前景。然而，当前方案存在根本性的问题：将AI定位为'诊断助手'并'给出疾病判断'，这已经跨越了辅助工具的界限，进入了医疗决策的核心区域。医疗诊断是一个高度复杂的过程，需要综合患者的病史、家族史、体征、实验室检查、影像学检查等多维度信息，单纯基于用户自述的症状进行判断，可靠性极低且风险极高。更重要的是，这种应用场景与AI的本质能力不匹配——大语言模型擅长的是信息整合和模式识别，但医疗诊断需要的是严谨的因果推理和风险评估，两者存在本质差异。建议将方案调整为'症状预筛查+导诊建议'，而非直接诊断。",
      "painPointClarity": "moderate",
      "aiNecessity": "unnecessary"
    },
    "technicalBarrier": {
      "score": 25,
      "analysis": "在AI医疗诊断领域，市场上已有大量专业机构和上市公司投入巨资研发，如IBM Watson Health、阿里健康、平安好医生等，这些机构拥有海量医疗数据、专业医学团队、监管审批经验等资源优势。相比之下，一个基于通用大模型和少量病例数据的方案，在技术深度、数据积累、合规能力等方面都处于明显劣势。更重要的是，医疗AI的竞争壁垒不仅在于技术，更在于数据、专家资源、医院合作关系、监管认证等，这些都需要长期积累。因此，当前方案不仅不具备竞争优势，反而在激烈竞争的市场中处于非常不利的位置。",
      "differentiationLevel": "low",
      "competitiveAdvantages": []
    },
    "dataSupportPotential": {
      "score": 30,
      "analysis": "5000条脱敏病例数据对于医疗诊断这种复杂场景来说是严重不足的。医疗领域的疾病种类繁多、症状复杂多样，5000条数据可能连常见病的冰山一角都无法覆盖。数据完整性方面，覆盖率极低，无法支撑可靠的诊断系统；准确性方面，脱敏处理可能损失了部分关键信息；时效性方面，医学知识和诊疗规范持续更新，历史数据的时效性存疑。更严重的是，医疗数据的飞轮效应在诊断场景中受到严格监管限制——不能随意使用用户数据来训练模型，必须经过严格的伦理审查和患者知情同意。因此，数据支撑严重不足。",
      "dataCompleteness": 20,
      "dataAccuracy": 40,
      "dataTimeliness": 35,
      "flywheelPotential": "weak"
    },
    "aiTalentReserve": {
      "score": 25,
      "analysis": "医疗AI项目不仅需要顶尖的AI技术能力，更需要深厚的医学专业知识。一个成功的医疗诊断AI团队应该包括：资深的医学专家（提供诊疗知识和临床指导）、算法科学家（开发可靠的诊断模型）、医疗数据工程师（处理复杂的医疗数据）、法律合规专家（确保符合医疗监管要求）、以及MLOps工程师（保障系统稳定性）。对于大多数互联网公司来说，最缺乏的就是医学专业人才和医疗合规经验。即使能够招聘到相关人才，团队的磨合和医工结合也需要长时间的积累。因此，人才储备是该项目面临的重大挑战之一。",
      "talentLevel": "weak",
      "capabilityGaps": [
        "严重缺乏医学专业人才和临床经验",
        "缺乏医疗AI的监管审批经验",
        "缺乏医疗数据处理和隐私保护的专业能力",
        "缺乏与医院和医生合作的资源和经验"
      ],
      "developmentSuggestions": [
        "必须组建医学专家团队，或与医疗机构深度合作",
        "招聘有NMPA审批经验的法律合规专家",
        "建议先从低风险的健康科普、导诊建议等场景切入，积累经验",
        "评估是否具备进入高监管行业的长期战略和资源投入"
      ]
    },
    "roiFeasibility": {
      "score": 15,
      "analysis": "该方案的ROI评估极不乐观。首先，从投入角度看，私有化部署顶级模型的硬件成本是天文数字（一个8卡H800服务器节点价值数百万），还需要持续的电力、运维和专业人力成本。其次，医疗AI需要通过NMPA的严格审批，这意味着大量的临床试验、数据收集、安全性验证等前期投入，周期可能长达数年，期间无法产生任何商业收益。再次，从风险成本看，一旦发生误诊导致的医疗事故，潜在的法律诉讼、赔偿、品牌损害等成本可能是无限的。最后，即使通过审批，实际应用范围也会受到严格限制，商业化变现路径不明确。综合来看，该项目的风险回报比极不平衡，投入很可能无法换来合规的、可商业化的产品。",
      "investmentLevel": "high",
      "returnPath": []
    },
    "marketCompetitiveness": {
      "score": 30,
      "analysis": "从时机角度看，现在启动AI诊断项目面临多重挑战。技术层面，虽然大语言模型能力提升迅速，但在医疗诊断这种需要极高准确性和可解释性的场景中，成熟度仍然不足，模型的幻觉问题在医疗场景中是致命的。监管层面，国内对医疗AI的监管日趋严格，审批要求越来越高，周期越来越长。市场层面，虽然需求存在，但用户教育成本高，对AI诊断的信任度和付费意愿不明确。竞争层面，大型医疗机构和科技公司已经占据先发优势，拥有数据、专家、医院关系等多重壁垒。综合来看，对于资源有限的团队，当前可能不是最佳时机，建议先从低风险的健康科普、导诊建议等外围场景切入。",
      "marketTiming": "poor",
      "competitivePosition": "lagging"
    }
  },
  "opportunities": [
    "如调整为导诊和健康科普，可降低风险同时提供价值",
    "积累用户健康咨询数据，为未来医疗AI应用打基础",
    "与医疗机构合作，以辅助工具定位切入市场"
  ],
  "risks": [
    "未经审批上线涉嫌违法，面临监管处罚",
    "误诊导致的医疗事故可能带来刑事责任和巨额赔偿",
    "品牌和信誉风险极高，一次事故可能导致企业倒闭",
    "私有化部署的巨额投入可能血本无归",
    "数据严重不足，模型可靠性无法保证"
  ],
  "recommendations": [
    "强烈建议调整产品定位，从'AI诊断助手'改为'健康咨询和导诊助手'，仅提供科室推荐和健康科普，不涉及诊断",
    "在所有用户界面显著位置添加免责声明，明确AI建议不构成医疗诊断",
    "咨询专业医疗法律顾问，确保产品设计、功能、宣传等全面合规",
    "如确实希望进入医疗诊断领域，建议与持证医疗机构合作，由AI提供初步筛查，专业医生进行最终诊断",
    "重新评估业务模式和风险承受能力，避免在高风险领域盲目投入",
    "大幅增加医疗数据积累（至少10万+高质量病例），并组建专业医学团队"
  ]
}
\`\`\`

请严格参考以上案例的风格和深度进行评估。`

/**
 * 为高分方案生成summary（≥ 70分）
 * 强调商业价值、投资回报、市场机会
 */
async function generateHighScoreBusinessSummary(
  result: BusinessValueResult,
  req: EvaluationRequest,
  modelName: string
): Promise<string> {
  const apiKey = process.env.QIANFAN_API_KEY
  if (!apiKey) {
    throw new Error("QIANFAN_API_KEY 环境变量未设置")
  }

  const prompt = `你是一位资深的AI商业顾问。现在需要你为一个商业价值评估报告生成核心摘要（summary）。

## 评估方案信息

**业务场景**：${req.businessScenario}

**技术选型**：
- 模型：${req.model}
- 硬件：${req.hardware}，${req.machineCount}机 × ${req.cardsPerMachine}卡
- 数据：${req.businessData.description}（${req.businessData.quality === 'high' ? '已治理' : '未治理'}）

**综合评分**：${result.score}/100（优秀方案）

**各维度评估结果**：
1. 问题-场景聚焦程度（${result.dimensions.problemScenarioFocus.score}分）：${result.dimensions.problemScenarioFocus.analysis}
2. 技术壁垒优势（${result.dimensions.technicalBarrier.score}分）：${result.dimensions.technicalBarrier.analysis}
3. 数据支撑潜力（${result.dimensions.dataSupportPotential.score}分）：${result.dimensions.dataSupportPotential.analysis}
4. AI人才储备（${result.dimensions.aiTalentReserve.score}分）：${result.dimensions.aiTalentReserve.analysis}
5. ROI合理度（${result.dimensions.roiFeasibility.score}分）：${result.dimensions.roiFeasibility.analysis}
6. 市场竞争力（${result.dimensions.marketCompetitiveness.score}分）：${result.dimensions.marketCompetitiveness.analysis}

## 摘要生成要求

由于这是一个高分优秀方案（${result.score}≥70分），请按以下要求生成摘要：

1. **突出商业价值**：
   - 明确指出该方案解决了什么核心业务痛点
   - 说明AI相比传统方案的独特优势
   - 强调长期的战略价值和竞争壁垒

2. **分析投资回报**：
   - 定性分析投入产出比的合理性
   - 说明回报的实现路径（成本节约、收入增长、战略价值）
   - ❌ 严格禁止编造具体数字（如"ROI达300%"、"节省成本70%"）

3. **评估市场机会**：
   - 说明市场时机和竞争地位
   - 指出可以抓住的商业机会
   - 提示需要关注的风险点

4. **给出行动建议**：
   - 提供具体的实施建议和优先级
   - 说明如何降低风险、提升成功率

5. **字数控制**：2-3句话，每句话50-80字，总共120-200字

请直接输出摘要文本，不要有任何前缀或解释。`

  try {
    const response = await fetchWithRetry(
      "https://qianfan.baidubce.com/v2/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-Appbuilder-Authorization": apiKey,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
        }),
      },
      {
        maxRetries: 3,
        timeout: 60000,
        onRetry: (attempt, error) => {
          console.log(`高分商业Summary生成API重试 (${attempt}/3):`, error.message)
        },
      }
    )

    const data = await response.json()
    if (data.error_code || data.error_msg) {
      throw new Error(`Summary生成API错误: ${data.error_msg || data.error_code}`)
    }

    return data.choices?.[0]?.message?.content || "（摘要生成失败）"
  } catch (error) {
    console.error("高分商业Summary生成失败:", error)
    return "商业价值评估完成，具体分析请参考各维度详情。"
  }
}

/**
 * 为低分方案生成summary（< 70分）
 * 直接指出问题、说明原因、提供正确方向
 */
async function generateLowScoreBusinessSummary(
  result: BusinessValueResult,
  req: EvaluationRequest,
  modelName: string
): Promise<string> {
  const apiKey = process.env.QIANFAN_API_KEY
  if (!apiKey) {
    throw new Error("QIANFAN_API_KEY 环境变量未设置")
  }

  const prompt = `你是一位资深的AI商业顾问。现在需要你为一个商业价值评估报告生成核心摘要（summary）。

## 评估方案信息

**业务场景**：${req.businessScenario}

**技术选型**：
- 模型：${req.model}
- 硬件：${req.hardware}，${req.machineCount}机 × ${req.cardsPerMachine}卡
- 数据：${req.businessData.description}（${req.businessData.quality === 'high' ? '已治理' : '未治理'}）

**综合评分**：${result.score}/100（存在问题）

**各维度评估结果**：
1. 问题-场景聚焦程度（${result.dimensions.problemScenarioFocus.score}分）：${result.dimensions.problemScenarioFocus.analysis}
2. 技术壁垒优势（${result.dimensions.technicalBarrier.score}分）：${result.dimensions.technicalBarrier.analysis}
3. 数据支撑潜力（${result.dimensions.dataSupportPotential.score}分）：${result.dimensions.dataSupportPotential.analysis}
4. AI人才储备（${result.dimensions.aiTalentReserve.score}分）：${result.dimensions.aiTalentReserve.analysis}
5. ROI合理度（${result.dimensions.roiFeasibility.score}分）：${result.dimensions.roiFeasibility.analysis}
6. 市场竞争力（${result.dimensions.marketCompetitiveness.score}分）：${result.dimensions.marketCompetitiveness.analysis}

**关键风险**：
${result.risks.map(risk => `- ${risk}`).join('\n')}

## 摘要生成要求

由于这是一个存在严重问题的方案（${result.score}<70分），请按以下要求生成摘要：

1. **直接指出核心问题**：
   - 可以使用"商业价值有限"、"不建议投入"、"需要重新论证"等明确判断
   - 无需回避问题，要坦诚指出方案的不足

2. **说明根本原因**：
   - 问题-方案不匹配（如AI并非必要）
   - 投入产出比不合理（如成本过高、回报不明确）
   - 竞争地位不利（如市场时机不佳、技术壁垒低）
   - 风险过高（如监管风险、技术风险、人才风险）

3. **提供正确方向**：
   - 如果不应该用AI，直接推荐更合适的传统方案
   - 如果方案需要调整，说明具体调整方向（换技术路线、降低成本、改变定位等）

4. **严格禁止编造数据**：
   - ❌ 绝对禁止：任何具体的ROI百分比、成本节约数字、市场份额数据
   - ✅ 允许：定性描述（如"投入过高"、"回报不明确"、"竞争力弱"）

5. **字数控制**：2-3句话，每句话50-80字，总共120-200字

请直接输出摘要文本，不要有任何前缀或解释。`

  try {
    const response = await fetchWithRetry(
      "https://qianfan.baidubce.com/v2/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-Appbuilder-Authorization": apiKey,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
        }),
      },
      {
        maxRetries: 3,
        timeout: 60000,
        onRetry: (attempt, error) => {
          console.log(`低分商业Summary生成API重试 (${attempt}/3):`, error.message)
        },
      }
    )

    const data = await response.json()
    if (data.error_code || data.error_msg) {
      throw new Error(`Summary生成API错误: ${data.error_msg || data.error_code}`)
    }

    return data.choices?.[0]?.message?.content || "（摘要生成失败）"
  } catch (error) {
    console.error("低分商业Summary生成失败:", error)
    return "商业价值评估存在严重问题，具体分析请参考各维度详情。"
  }
}

/**
 * 构建用户评估Prompt（只包含当前用户的具体需求）
 */
function buildBusinessPrompt(req: EvaluationRequest): string {
  const dataDescription = req.businessData.description || "未提供数据描述"
  const qualityStr = req.businessData.quality === "high" ? "已治理" : "未治理"

  return `# 现在请评估以下项目的商业价值

## 业务场景
${req.businessScenario}

## 技术方案
- 模型选择：${req.model}
- 硬件配置：${req.hardware}，${req.machineCount}机 × ${req.cardsPerMachine}卡 = ${req.machineCount * req.cardsPerMachine}张
- 训练数据：${dataDescription}，数据质量：${qualityStr}
- 性能需求：TPS ${req.performanceRequirements.tps}，并发${req.performanceRequirements.concurrency}

请严格参考以上案例的评估深度和风格，对当前项目进行全面的商业价值评估。`
}

/**
 * 使用ERNIE-4.5评估商业价值
 */
export async function evaluateBusinessValue(
  req: EvaluationRequest,
  modelName: string
): Promise<BusinessValueResult> {
  const apiKey = process.env.QIANFAN_API_KEY

  if (!apiKey) {
    throw new Error("QIANFAN_API_KEY 环境变量未设置")
  }

  try {
    const prompt = buildBusinessPrompt(req)

    console.log(`商业评估Prompt长度: ${prompt.length} 字符`)

    // 第一阶段：生成详细评估
    const response = await fetchWithRetry(
      "https://qianfan.baidubce.com/v2/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-Appbuilder-Authorization": apiKey,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT, // 评估原则和输出要求（会被API缓存）
            },
            {
              role: "system",
              content: FEW_SHOT_EXAMPLES, // Few-Shot案例（会被API缓存）
            },
            {
              role: "user",
              content: prompt, // 只包含当前用户的具体需求
            },
          ],
          response_format: {
            type: "json_object",
          },
          temperature: 0.3,
        }),
      },
      {
        maxRetries: 6,
        timeout: 180000,
        initialDelay: 3000,
        onRetry: (attempt, error) => {
          console.log(`商业价值评估API重试 (${attempt}/6):`, error.message)
        },
      }
    )

    const data = await response.json()

    if (data.error_code || data.error_msg) {
      throw new Error(`千帆API错误: ${data.error_msg || data.error_code}`)
    }

    if (!data.choices?.[0]?.message?.content) {
      throw new Error("千帆API返回数据格式异常")
    }

    const content = data.choices[0].message.content

    console.log("商业评估AI返回原始内容长度:", content?.length || 0)

    if (!content || content.trim() === '') {
      throw new Error("AI返回了空内容，可能是API问题或prompt过长")
    }

    const result = JSON.parse(content) as BusinessValueResult

    // 第二阶段：根据评分生成summary
    console.log(`开始生成商业summary，当前评分: ${result.score}`)
    try {
      if (result.score >= 70) {
        // 高分方案：强调商业价值、投资回报、市场机会
        result.summary = await generateHighScoreBusinessSummary(result, req, modelName)
        console.log(`高分商业Summary生成成功`)
      } else {
        // 低分方案：直接指出问题、说明原因、提供正确方向
        result.summary = await generateLowScoreBusinessSummary(result, req, modelName)
        console.log(`低分商业Summary生成成功`)
      }
    } catch (summaryError) {
      console.error("商业Summary生成失败，使用默认摘要:", summaryError)
      // Summary生成失败不影响整体评估结果
      result.summary = result.score >= 70
        ? "商业价值评估完成，具体分析请参考各维度详情。"
        : "商业价值评估存在一些问题，具体分析请参考各维度详情。"
    }

    return result
  } catch (error) {
    console.error("商业价值评估失败:", error)

    if (error instanceof SyntaxError) {
      console.error("JSON解析错误详情:")
      console.error("- 错误消息:", error.message)
      throw new Error(`AI返回的JSON格式无效: ${error.message}`)
    }

    if (error instanceof Error) {
      throw error
    }

    throw new Error("商业价值评估服务暂时不可用，请稍后重试")
  }
}
