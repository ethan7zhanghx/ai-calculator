import bcrypt from "bcryptjs"

const SALT_ROUNDS = 10

/**
 * 对密码进行哈希加密
 * @param password 明文密码
 * @returns 加密后的密码
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * 验证密码
 * @param password 明文密码
 * @param hashedPassword 加密后的密码
 * @returns 密码是否匹配
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}
