# 管理员账号设置指南

本文档说明如何在部署的服务上创建和管理超级管理员账号。

## 方法1：使用 API 端点（推荐用于生产环境）

### 步骤

1. **在网站上注册一个普通账号**
   - 访问你的网站
   - 使用手机号或邮箱注册一个账号
   - 记住你的登录凭证（手机号或邮箱）

2. **在部署平台设置环境变量**

   在 Vercel/Railway/其他平台的环境变量中添加：
   ```
   ADMIN_INIT_SECRET=你的强密码（至少32位）
   ```

3. **调用初始化 API**

   使用 curl 或 Postman 发送请求：

   ```bash
   curl -X POST https://your-domain.com/api/admin/init \
     -H "Content-Type: application/json" \
     -d '{
       "identifier": "你的手机号或邮箱",
       "secret": "你设置的ADMIN_INIT_SECRET"
     }'
   ```

   示例：
   ```bash
   curl -X POST https://ai-calculator.vercel.app/api/admin/init \
     -H "Content-Type: application/json" \
     -d '{
       "identifier": "13053797782",
       "secret": "your-super-secret-init-key-change-this"
     }'
   ```

4. **验证设置成功**

   如果设置成功，你会收到类似的响应：
   ```json
   {
     "success": true,
     "message": "成功设置超级管理员权限",
     "user": {
       "email": "user@example.com",
       "phone": "13053797782",
       "role": "super_admin"
     }
   }
   ```

5. **登录管理后台**
   - 访问 `https://your-domain.com/admin`
   - 使用你的账号登录
   - 现在你拥有完整的管理员权限

6. **（重要）删除初始化端点**

   设置完成后，为了安全起见，删除以下文件：
   ```
   app/api/admin/init/route.ts
   ```

   或者在环境变量中移除 `ADMIN_INIT_SECRET`

---

## 方法2：使用命令行脚本（本地或SSH访问）

如果你有服务器 SSH 访问权限：

1. **SSH 登录到服务器**
   ```bash
   ssh user@your-server.com
   ```

2. **进入项目目录**
   ```bash
   cd /path/to/ai-calculator
   ```

3. **运行设置脚本**
   ```bash
   npx tsx scripts/set-super-admin.ts <手机号或邮箱>
   ```

   示例：
   ```bash
   npx tsx scripts/set-super-admin.ts 13053797782
   ```

4. **查看输出确认**
   ```
   ✅ 成功设置超级管理员权限
   用户: user@example.com
   手机: 13053797782
   角色: super_admin
   ID: clxxx...
   ```

---

## 方法3：直接操作数据库

如果你使用云数据库（如 Vercel Postgres、Supabase），可以直接执行 SQL：

```sql
UPDATE "User"
SET role = 'super_admin'
WHERE phone = '你的手机号' OR email = '你的邮箱';
```

---

## 超级管理员权限

超级管理员拥有以下权限：

- ✅ 查看所有用户信息
- ✅ 禁用/启用用户账号
- ✅ 查看所有评估历史记录
- ✅ 查看和管理用户反馈
- ✅ 授予/撤销其他用户的管理员权限（仅超级管理员）
- ✅ 访问系统统计数据

---

## 角色说明

系统支持以下角色：

- **user** (默认) - 普通用户，可以使用评估功能
- **admin** - 普通管理员，可以查看后台数据，但不能管理其他管理员
- **super_admin** - 超级管理员，拥有所有权限

---

## 安全建议

1. **保护初始化密钥**
   - 使用强密码（至少32位）
   - 不要在代码中硬编码
   - 使用环境变量管理

2. **设置完成后删除初始化端点**
   - 删除 `app/api/admin/init/route.ts`
   - 或移除 `ADMIN_INIT_SECRET` 环境变量

3. **定期审计管理员账号**
   - 定期检查管理员列表
   - 移除不需要的管理员权限

4. **使用强密码**
   - 管理员账号应使用强密码
   - 定期更换密码

---

## 常见问题

### Q: 如何添加更多管理员？

A: 超级管理员登录后台后，可以在"管理员管理"页面授予其他用户管理员权限。

### Q: 忘记管理员账号怎么办？

A: 可以使用方法2或方法3重新设置任意已注册用户为管理员。

### Q: 初始化 API 返回 403 错误？

A: 检查 `ADMIN_INIT_SECRET` 环境变量是否正确设置，并确保请求中的 secret 参数匹配。

### Q: 如何撤销管理员权限？

A: 超级管理员可以在后台管理页面操作，或直接修改数据库：
```sql
UPDATE "User" SET role = 'user' WHERE id = '用户ID';
```

---

## 支持

如有问题，请查看项目文档或提交 Issue。
