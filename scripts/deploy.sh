#!/usr/bin/env bash
set -euo pipefail

echo "=== 登录功能上线部署脚本 ==="
echo ""

# Step 1: Create D1 database (run once)
echo "[1/5] 创建 D1 数据库..."
echo "  运行: npx wrangler d1 create lanshu-wiki-db"
echo "  ⚠️  将输出的 database_id 填入 wrangler.jsonc 的 d1_databases[0].database_id"
echo ""

# Step 2: Apply migrations
echo "[2/5] 执行数据库迁移..."
echo "  运行: npx wrangler d1 migrations apply lanshu-wiki-db --remote"
echo ""

# Step 3: Set secrets
echo "[3/5] 配置环境变量/密钥..."
echo "  必需:"
echo "    npx wrangler secret put ALIYUN_ACCESS_KEY_ID"
echo "    npx wrangler secret put ALIYUN_ACCESS_KEY_SECRET"
echo "    npx wrangler secret put ALIYUN_SMS_SIGN_NAME"
echo "    npx wrangler secret put ALIYUN_SMS_TEMPLATE_CODE"
echo "    npx wrangler secret put CRON_SECRET"
echo "  可选 (设置后启用阿里云短信，否则使用 DevMock):"
echo "    npx wrangler secret put SMS_PROVIDER (值设为 aliyun)"
echo ""

# Step 4: Build and deploy
echo "[4/5] 构建并部署..."
echo "  运行: pnpm deploy"
echo ""

# Step 5: Verify
echo "[5/5] 上线验证..."
echo "  1. 发送验证码: curl -X POST <URL>/api/auth/sms/send -H 'Content-Type: application/json' -d '{\"phone\":\"13800138000\"}'"
echo "  2. 登录: curl -X POST <URL>/api/auth/sms/login -H 'Content-Type: application/json' -d '{\"phone\":\"13800138000\",\"code\":\"<code>\"}'"
echo "  3. 登出: curl -X POST <URL>/api/auth/logout -H 'Authorization: Bearer <token>'"
echo "  4. 清理过期数据: curl <URL>/api/cron/cleanup -H 'X-Cron-Secret: <secret>'"
echo ""

echo "=== 回滚方案 ==="
echo "  回滚命令: npx wrangler deployments rollback"
echo "  或: git revert <merge-commit> && pnpm deploy"
