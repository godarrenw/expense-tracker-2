# 💰 个人支出追踪系统

基于 Cloudflare Pages + Functions + D1 的「最小可用」费用追踪应用。

## ✨ 功能特点

- 📊 **公共展示页面**: 显示每月支出总额的趋势图表，无需登录
- 🔐 **管理后台**: 密码保护的管理界面，支持添加/删除支出记录
- 📱 **响应式设计**: 支持桌面和移动端访问
- ⚡ **无服务器架构**: 基于 Cloudflare 全栈解决方案，免运维
- 🗄️ **SQLite 存储**: 使用 Cloudflare D1 数据库，支持 SQL 查询

## 🏗️ 技术架构

- **前端**: 原生 HTML/CSS/JavaScript + Chart.js
- **后端**: Cloudflare Pages Functions (边缘计算)
- **数据库**: Cloudflare D1 (分布式 SQLite)
- **部署**: Cloudflare Pages (CDN + 静态托管)

## 📁 项目结构

```
expense-tracker/
├── functions/                 # Cloudflare Functions API
│   ├── _middleware.js        # CORS 中间件
│   └── api/
│       ├── expenses.js       # 支出记录 CRUD API
│       └── admin.js          # 管理员 API (初始化数据库等)
├── index.html                # 公共展示页面
├── admin.html                # 管理后台页面
├── wrangler.toml            # Cloudflare 配置文件
└── README.md                # 说明文档
```

## 🚀 部署步骤

### 1. 准备代码仓库

```bash
# 将项目推送到 GitHub
git init
git add .
git commit -m "Initial commit: Expense tracker app"
git remote add origin https://github.com/YOUR_USERNAME/expense-tracker.git
git push -u origin main
```

### 2. 创建 Cloudflare Pages 项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Pages** → **Create a project**
3. 选择 **Connect to Git** → 选择你的 GitHub 仓库
4. 配置构建设置:
   - **Framework preset**: None
   - **Build command**: 留空
   - **Build output directory**: `/`

### 3. 创建 D1 数据库

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 创建 D1 数据库
wrangler d1 create expense-tracker-db
```

记录返回的 `database_id`，更新 `wrangler.toml` 中的配置。

### 4. 绑定数据库和设置环境变量

在 Cloudflare Pages 项目设置中:

1. **Functions** → **D1 database bindings**:
   - Variable name: `DB`
   - D1 database: 选择刚创建的 `expense-tracker-db`

2. **Settings** → **Environment variables**:
   - Variable name: `ADMIN_PASSWORD`
   - Value: 设置你的管理密码 (建议使用强密码)

### 5. 初始化数据库

1. 部署完成后，访问 `https://your-site.pages.dev/admin.html`
2. 输入你设置的管理密码
3. 点击 **"一键初始化数据库"** 按钮
4. 看到成功提示后即可开始使用

## 📖 使用说明

### 公共页面 (`/`)

- 显示最近12个月的支出趋势图表
- 展示本月、上月、月均支出等统计信息
- 无需登录，任何人都可以查看（但只显示总额，不显示明细）

### 管理后台 (`/admin.html`)

- 需要输入管理密码才能访问
- 支持添加新的支出记录（日期、金额、分类、备注）
- 查看和删除已有记录
- 一键初始化数据库功能

### API 接口

- `GET /api/expenses` - 获取按月聚合的支出数据（公共接口）
- `POST /api/expenses` - 添加新支出记录（需要管理员权限）
- `DELETE /api/expenses?id=<id>` - 删除支出记录（需要管理员权限）
- `POST /api/admin` - 管理员操作（如初始化数据库）
- `GET /api/admin?action=list_all` - 获取所有记录详情（需要管理员权限）

## 🔒 安全特性

- **密码保护**: 管理功能需要环境变量中设置的密码
- **CORS 配置**: 正确配置跨域访问
- **权限控制**: 写入操作需要管理员 Token
- **数据隐私**: 公共页面只显示聚合数据，不泄露明细

## 🛠️ 本地开发

```bash
# 安装依赖
npm install -g wrangler

# 本地开发服务器
wrangler pages dev . --d1 DB=expense-tracker-db

# 访问本地应用
open http://localhost:8788
```

## 🔧 自定义扩展

### 添加新的支出分类

编辑 `admin.html` 中的分类选项:

```html
<select id="expenseCategory">
    <option value="新分类">新分类</option>
    <!-- 其他分类... -->
</select>
```

### 修改图表样式

在 `index.html` 中找到 Chart.js 配置部分，可以自定义:
- 图表类型 (`type: 'line'` → `'bar'`)
- 颜色主题
- 显示选项

### 增强安全性

可以通过 Cloudflare Zero Trust 为 `/admin.html` 添加额外的身份验证:

1. Cloudflare Dashboard → Zero Trust → Access → Applications
2. 创建新应用，保护 `your-domain.pages.dev/admin.html`
3. 设置认证方式（邮箱、OTP、SSO 等）

## 📊 数据库结构

```sql
CREATE TABLE expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,           -- 支出日期 (YYYY-MM-DD)
    amount REAL NOT NULL,         -- 支出金额
    category TEXT DEFAULT '',     -- 支出分类
    note TEXT DEFAULT '',         -- 备注
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);
```

## 🎯 后续扩展建议

- 📈 添加分类饼图分析
- 📅 支持月度/年度对比分析
- 📤 CSV 数据导入/导出功能
- 📱 PWA 支持，可安装到手机桌面
- 🔔 支出预算提醒功能
- 📊 更多图表类型和统计维度

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

## 📄 许可证

MIT License - 可自由使用和修改。
