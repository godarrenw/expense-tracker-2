// API路由：处理费用记录的CRUD操作
export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    
    // 获取历史月份总和数据（排除当月）
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const result = await db.prepare(`
      SELECT month, total_amount, 1 as count
      FROM monthly_totals 
      WHERE month < ?
      ORDER BY month DESC
    `).bind(currentMonth).all();

    return Response.json({
      success: true,
      data: result.results || []
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

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
    const { date, amount, category, note } = body;

    // 验证必需字段
    if (!date || amount === undefined) {
      return Response.json({
        success: false,
        error: '日期和金额为必填项'
      }, { status: 400 });
    }

    // 插入新记录
    const result = await db.prepare(`
      INSERT INTO expenses (date, amount, category, note)
      VALUES (?, ?, ?, ?)
    `).bind(date, amount, category || '', note || '').run();

    return Response.json({
      success: true,
      data: { id: result.meta.last_row_id }
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  try {
    // 验证管理员权限
    const adminToken = context.request.headers.get('X-Admin-Token');
    if (!adminToken || adminToken !== context.env.ADMIN_PASSWORD) {
      return Response.json({
        success: false,
        error: '无权限访问'
      }, { status: 401 });
    }

    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return Response.json({
        success: false,
        error: '缺少记录ID'
      }, { status: 400 });
    }

    const db = context.env.DB;
    
    // 删除记录
    const result = await db.prepare(`
      DELETE FROM expenses WHERE id = ?
    `).bind(id).run();

    return Response.json({
      success: true,
      data: { deleted: result.meta.changes }
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
