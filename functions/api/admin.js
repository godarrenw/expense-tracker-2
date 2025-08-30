// 管理员API：初始化数据库和获取详细记录
export async function onRequestPost(context) {
  try {
    // 验证管理员权限
    const adminToken = context.request.headers.get('X-Admin-Token');
    if (!adminToken || adminToken !== context.env.ADMIN_PASSWORD) {
      return Response.json({
        success: false,
        error: '无权限访问'
      }, { status: 401 });
    }

    const db = context.env.DB;
    const body = await context.request.json();
    const { action } = body;

    if (action === 'init_db') {
      // 初始化数据库表
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          amount REAL NOT NULL,
          category TEXT DEFAULT '',
          note TEXT DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      // 创建索引以优化查询性能
      await db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)
      `).run();

      await db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category)
      `).run();

      return Response.json({
        success: true,
        message: '数据库初始化成功'
      });
    }

    return Response.json({
      success: false,
      error: '未知操作'
    }, { status: 400 });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function onRequestGet(context) {
  try {
    // 验证管理员权限
    const adminToken = context.request.headers.get('X-Admin-Token');
    if (!adminToken || adminToken !== context.env.ADMIN_PASSWORD) {
      return Response.json({
        success: false,
        error: '无权限访问'
      }, { status: 401 });
    }

    const db = context.env.DB;
    const url = new URL(context.request.url);
    const action = url.searchParams.get('action');

    if (action === 'list_all') {
      // 获取所有记录（管理员查看）
      const result = await db.prepare(`
        SELECT id, date, amount, category, note, created_at
        FROM expenses 
        ORDER BY date DESC, created_at DESC
        LIMIT 100
      `).all();

      return Response.json({
        success: true,
        data: result.results || []
      });
    }

    return Response.json({
      success: false,
      error: '未知操作'
    }, { status: 400 });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
