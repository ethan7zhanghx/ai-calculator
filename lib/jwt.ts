import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production"
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d"

export interface JWTPayload {
  userId: string
  email: string
  iat?: number
  exp?: number
}

/**
 * 生成 JWT token
 * @param payload 用户信息
 * @returns JWT token
 */
export function signToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  })
}

/**
 * 验证 JWT token
 * @param token JWT token
 * @returns 解析后的 payload,如果 token 无效则返回 null
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    console.error("Token verification failed:", error)
    return null
  }
}

/**
 * 从请求头中提取 Bearer token
 * @param authHeader Authorization header
 * @returns token 或 null
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }
  return authHeader.substring(7) // 移除 "Bearer " 前缀
}
