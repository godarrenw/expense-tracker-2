// 批量操作API：批量删除等功能
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
    const { action, data } = body;

    if (action === 'delete_all') {
      // 删除所有记录
      const confirmToken = data?.confirmToken;
      
      if (confirmToken !== 'CONFIRM_DELETE_ALL') {
        return Response.json({
          success: false,
          error: '需要确认令牌'
        }, { status: 400 });
      }

      // 先获取总记录数
      const countResult = await db.prepare('SELECT COUNT(*) as count FROM expenses').first();
      const totalCount = countResult.count;

      // 执行删除
      const deleteResult = await db.prepare('DELETE FROM expenses').run();

      return Response.json({
        success: true,
        data: {
          deletedCount: deleteResult.meta.changes,
          totalCount: totalCount
        }
      });
    }

    if (action === 'delete_by_ids') {
      // 按ID批量删除
      const ids = data?.ids;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return Response.json({
          success: false,
          error: '需要提供要删除的记录ID列表'
        }, { status: 400 });
      }

      let deletedCount = 0;
      const errors = [];

      for (const id of ids) {
        try {
          const result = await db.prepare('DELETE FROM expenses WHERE id = ?').bind(id).run();
          deletedCount += result.meta.changes;
        } catch (error) {
          errors.push({
            id: id,
            error: error.message
          });
        }
      }

      return Response.json({
        success: true,
        data: {
          deletedCount: deletedCount,
          errorCount: errors.length,
          errors: errors
        }
      });
    }

    if (action === 'delete_zero_amount') {
      // 删除金额为0的记录
      const result = await db.prepare('DELETE FROM expenses WHERE amount = 0 OR amount IS NULL').run();

      return Response.json({
        success: true,
        data: {
          deletedCount: result.meta.changes
        }
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
