# 🚀 多用户部署指南

本指南帮助你为不同用户创建多个独立的支出追踪系统实例。

## 📋 部署准备

每个用户需要独立的：
- ✅ Cloudflare Pages 项目
- ✅ D1 数据库实例
- ✅ 管理密码

## 🔧 部署步骤

### 方案1：同一个GitHub仓库，多个Pages项目

#### 1. 创建新的Pages项目
```bash
# 在Cloudflare Dashboard中：
# Pages → Create a project → Connect to Git
# 选择同一个GitHub仓库 (godarrenw/expense-tracker)
# 项目名称：expense-tracker-user2 (或其他名称)
```

#### 2. 为每个项目创建独立的D1数据库
```bash
# 使用Wrangler CLI为每个用户创建数据库
wrangler d1 create expense-tracker-user1
wrangler d1 create expense-tracker-user2
wrangler d1 create expense-tracker-user3
# ...记录每个数据库的ID
```

#### 3. 配置每个Pages项目

在每个Pages项目的设置中：

**Functions → D1 database bindings:**
- Variable name: `DB`
- D1 database: 选择对应用户的数据库

**Settings → Environment variables:**
- Variable name: `ADMIN_PASSWORD`
- Value: 为每个用户设置不同的密码

### 方案2：Fork仓库（推荐用于完全独立管理）

#### 1. 为每个用户Fork仓库
```bash
# 每个用户在GitHub上Fork你的仓库
# 或者你为每个用户创建独立的仓库副本
```

#### 2. 更新wrangler.toml
在每个仓库中更新对应的数据库ID：
```toml
[[env.production.d1_databases]]
binding = "DB"
database_name = "expense-tracker-userX"
database_id = "对应用户的数据库ID"
```

## 🎯 用户使用流程

### 首次设置
1. **访问管理后台**: `https://your-site.pages.dev/admin.html`
2. **输入管理密码**: 使用为该用户设置的密码
3. **初始化数据库**: 点击"一键初始化数据库"
4. **开始使用**: 添加支出记录或导入CSV

### 日常使用
- **查看统计**: 访问 `https://your-site.pages.dev/`
- **管理记录**: 访问 `https://your-site.pages.dev/admin.html`
- **退出登录**: 点击右上角"🚪 退出登录"按钮

## 📊 数据库管理

### 创建数据库的命令参考
```bash
# 创建数据库
wrangler d1 create expense-tracker-zhang
wrangler d1 create expense-tracker-wang  
wrangler d1 create expense-tracker-li

# 查看所有数据库
wrangler d1 list

# 查看数据库内容（调试用）
wrangler d1 execute expense-tracker-zhang --command "SELECT COUNT(*) FROM expenses"
```

### 备份数据库
```bash
# 导出数据
wrangler d1 execute expense-tracker-zhang --command "SELECT * FROM expenses" --json > backup.json

# 或导出为SQL
wrangler d1 export expense-tracker-zhang --output backup.sql
```

## 🔐 安全建议

1. **独立密码**: 为每个用户设置不同的强密码
2. **定期备份**: 定期备份重要的数据库
3. **访问控制**: 可以通过Cloudflare Zero Trust添加额外的访问控制
4. **监控使用**: 通过Cloudflare Analytics监控各个站点的使用情况

## 🚀 快速部署脚本

创建一个自动化脚本来快速为新用户部署：

```bash
#!/bin/bash
# deploy-new-user.sh

USER_NAME=$1
if [ -z "$USER_NAME" ]; then
    echo "使用方法: ./deploy-new-user.sh 用户名"
    exit 1
fi

echo "为用户 $USER_NAME 创建新的支出追踪系统..."

# 1. 创建D1数据库
echo "创建D1数据库..."
wrangler d1 create expense-tracker-$USER_NAME

# 2. 提示用户手动配置Pages项目
echo "请手动完成以下步骤："
echo "1. 在Cloudflare Pages中创建新项目"
echo "2. 连接到GitHub仓库 godarrenw/expense-tracker"
echo "3. 绑定刚创建的D1数据库"
echo "4. 设置环境变量 ADMIN_PASSWORD"
echo "5. 部署完成后访问 /admin.html 初始化数据库"

echo "部署完成！"
```

## 📝 用户交付清单

为每个用户提供：
- ✅ 网站访问地址
- ✅ 管理密码
- ✅ 使用说明
- ✅ CSV导入模板
- ✅ 技术支持联系方式

这样你就可以高效地为多个用户部署独立的支出追踪系统了！
