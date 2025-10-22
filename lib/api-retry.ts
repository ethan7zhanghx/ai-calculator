/**
 * API 重试工具 - 处理网络不稳定和临时故障
 */

export interface RetryOptions {
  maxRetries?: number // 最大重试次数,默认3次
  initialDelay?: number // 初始延迟(毫秒),默认1000ms
  maxDelay?: number // 最大延迟(毫秒),默认10000ms
  backoffMultiplier?: number // 退避倍数,默认2
  timeout?: number // 单次请求超时(毫秒),默认30000ms
  onRetry?: (attempt: number, error: Error) => void // 重试回调
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  timeout: 30000,
  onRetry: () => {},
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 计算退避延迟 (指数退避)
 */
function getBackoffDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  const exponentialDelay = initialDelay * Math.pow(multiplier, attempt - 1)
  // 添加随机抖动 (±20%) 避免雷鸣群羊效应
  const jitter = exponentialDelay * 0.2 * (Math.random() * 2 - 1)
  const delayWithJitter = exponentialDelay + jitter
  return Math.min(delayWithJitter, maxDelay)
}

/**
 * 判断错误是否可重试
 */
function isRetryableError(error: any): boolean {
  // 网络错误
  if (error.code === "ECONNREFUSED") return true
  if (error.code === "ETIMEDOUT") return true
  if (error.code === "ENOTFOUND") return true
  if (error.code === "ECONNRESET") return true

  // fetch 超时
  if (error.name === "AbortError") return true
  if (error.message?.includes("fetch failed")) return true
  if (error.message?.includes("Timeout")) return true
  if (error.message?.includes("timeout")) return true
  if (error.message?.includes("Connect Timeout")) return true

  // HTTP 错误状态码
  if (error.response?.status >= 500 && error.response?.status < 600) return true
  if (error.response?.status === 429) return true // 限流
  if (error.response?.status === 503) return true // 服务不可用
  if (error.response?.status === 502) return true // 网关错误
  if (error.response?.status === 504) return true // 网关超时

  // 百度千帆 API 特定错误
  if (error.message?.includes("Service Unavailable")) return true
  if (error.message?.includes("Internal Server Error")) return true
  if (error.message?.includes("Bad Gateway")) return true
  if (error.message?.includes("Gateway Timeout")) return true

  // 特定错误信息
  if (error.message?.includes("terminated")) return true
  if (error.message?.includes("closed")) return true
  if (error.message?.includes("ECONNABORTED")) return true

  return false
}

/**
 * 带重试的异步函数包装器
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: Error

  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      // 创建一个带超时的 Promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`请求超时 (${opts.timeout}ms)`))
        }, opts.timeout)
      })

      // 竞速: 哪个先完成就用哪个
      const result = await Promise.race([fn(), timeoutPromise])

      // 成功则返回
      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // 如果是最后一次尝试,或者错误不可重试,则抛出
      if (attempt > opts.maxRetries || !isRetryableError(lastError)) {
        throw lastError
      }

      // 计算延迟时间
      const delayMs = getBackoffDelay(
        attempt,
        opts.initialDelay,
        opts.maxDelay,
        opts.backoffMultiplier
      )

      console.log(
        `API调用失败 (第${attempt}/${opts.maxRetries}次重试), ${Math.round(delayMs)}ms后重试...`,
        lastError.message
      )

      // 调用重试回调
      opts.onRetry(attempt, lastError)

      // 延迟后重试
      await delay(delayMs)
    }
  }

  throw lastError!
}

/**
 * 带重试的 fetch 包装器
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  return withRetry(async () => {
    const response = await fetch(url, init)

    // 检查 HTTP 状态
    if (!response.ok) {
      const error: any = new Error(
        `HTTP ${response.status}: ${response.statusText}`
      )
      error.response = response
      throw error
    }

    return response
  }, options)
}
