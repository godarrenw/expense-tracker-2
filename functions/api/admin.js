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
      // 初始化历史月份总和表
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS monthly_totals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          month TEXT NOT NULL UNIQUE,
          total_amount REAL NOT NULL DEFAULT 0,
          note TEXT DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      // 创建索引
      await db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_monthly_totals_month ON monthly_totals(month)
      `).run();

      // 初始化从2025年8月开始的月份数据
      const startDate = new Date('2025-08-01');
      const currentDate = new Date();
      currentDate.setDate(1); // 设置为当月第一天
      
      const months = [];
      let date = new Date(startDate);
      
      while (date <= currentDate) {
        const monthStr = date.toISOString().slice(0, 7); // YYYY-MM格式
        months.push(monthStr);
        date.setMonth(date.getMonth() + 1);
      }

      // 插入月份数据（如果不存在）
      for (const month of months) {
        await db.prepare(`
          INSERT OR IGNORE INTO monthly_totals (month, total_amount, note)
          VALUES (?, 0, '历史月份数据')
        `).bind(month).run();
      }

      return Response.json({
        success: true,
        message: '数据库初始化成功，已创建月份总和表'
      });
    }

    if (action === 'update_monthly_total') {
      const { month, total_amount, note } = body.data || {};
      
      if (!month || total_amount === undefined) {
        return Response.json({
          success: false,
          error: '月份和金额为必填项'
        }, { status: 400 });
      }

      // 更新月份总和
      const result = await db.prepare(`
        UPDATE monthly_totals 
        SET total_amount = ?, note = ?, updated_at = CURRENT_TIMESTAMP
        WHERE month = ?
      `).bind(total_amount, note || '', month).run();

      if (result.meta.changes === 0) {
        // 如果月份不存在，则插入新记录
        await db.prepare(`
          INSERT INTO monthly_totals (month, total_amount, note)
          VALUES (?, ?, ?)
        `).bind(month, total_amount, note || '').run();
      }

      return Response.json({
        success: true,
        message: '月份总和更新成功'
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

    if (action === 'list_monthly_totals') {
      // 获取所有月份总和数据
      const result = await db.prepare(`
        SELECT id, month, total_amount, note, updated_at
        FROM monthly_totals 
        ORDER BY month DESC
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
