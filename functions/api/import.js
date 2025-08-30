// CSV导入API：支持UTF-8/GBK编码，自动检测表头
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

    const formData = await context.request.formData();
    const file = formData.get('csvFile');
    
    if (!file || !file.name.toLowerCase().endsWith('.csv')) {
      return Response.json({
        success: false,
        error: '请上传CSV文件'
      }, { status: 400 });
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // 尝试不同编码解析
    let csvText = '';
    let encoding = 'utf-8';
    
    try {
      // 首先尝试UTF-8
      csvText = new TextDecoder('utf-8', { fatal: true }).decode(uint8Array);
    } catch (e) {
      try {
        // 如果UTF-8失败，尝试GBK
        csvText = new TextDecoder('gbk').decode(uint8Array);
        encoding = 'gbk';
      } catch (e2) {
        // 如果都失败，使用默认UTF-8（非严格模式）
        csvText = new TextDecoder('utf-8').decode(uint8Array);
      }
    }

    // 解析CSV内容
    const parseResult = parseCSV(csvText);
    
    if (!parseResult.success) {
      return Response.json({
        success: false,
        error: parseResult.error
      }, { status: 400 });
    }

    // 检查重复记录
    const db = context.env.DB;
    const duplicates = [];
    const newRecords = [];

    for (const record of parseResult.data) {
      // 检查是否存在重复记录（相同日期、金额、备注）
      const existing = await db.prepare(`
        SELECT id FROM expenses 
        WHERE date = ? AND amount = ? AND note = ?
        LIMIT 1
      `).bind(record.date, record.amount, record.note).first();

      if (existing) {
        duplicates.push({
          ...record,
          existingId: existing.id
        });
      } else {
        newRecords.push(record);
      }
    }

    // 批量插入新记录
    let insertedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const record of newRecords) {
      try {
        await db.prepare(`
          INSERT INTO expenses (date, amount, category, note)
          VALUES (?, ?, ?, ?)
        `).bind(record.date, record.amount, record.category, record.note).run();
        insertedCount++;
      } catch (error) {
        errorCount++;
        errors.push({
          record: record,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      data: {
        encoding: encoding,
        totalRecords: parseResult.data.length,
        insertedCount: insertedCount,
        duplicateCount: duplicates.length,
        errorCount: errorCount,
        duplicates: duplicates.slice(0, 10), // 返回前10个重复记录
        errors: errors.slice(0, 10) // 只返回前10个错误
      }
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// CSV解析函数
function parseCSV(csvText) {
  try {
    const lines = csvText.trim().split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return { success: false, error: 'CSV文件为空' };
    }

    const records = [];
    let startIndex = 0;

    // 检测是否有表头
    const firstLine = lines[0].trim();
    const hasHeader = detectHeader(firstLine);
    
    if (hasHeader) {
      startIndex = 1;
    }

    // 解析数据行
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const record = parseCSVLine(line);
      if (record) {
        records.push(record);
      }
    }

    return {
      success: true,
      data: records
    };

  } catch (error) {
    return {
      success: false,
      error: '解析CSV文件失败: ' + error.message
    };
  }
}

// 检测是否有表头
function detectHeader(line) {
  const fields = parseCSVFields(line);
  if (fields.length < 3) return false;
  
  // 检查第一个字段是否像日期
  const firstField = fields[0].toLowerCase();
  if (firstField.includes('date') || firstField.includes('日期') || firstField.includes('时间')) {
    return true;
  }
  
  // 检查第二个字段是否像金额
  const secondField = fields[1].toLowerCase();
  if (secondField.includes('amount') || secondField.includes('金额') || secondField.includes('价格')) {
    return true;
  }
  
  return false;
}

// 解析CSV行
function parseCSVLine(line) {
  const fields = parseCSVFields(line);
  
  if (fields.length < 3) {
    return null; // 至少需要日期、描述、金额三个字段
  }

  // 解析日期 - 支持多种格式
  let date = '';
  const dateStr = fields[0].trim();
  
  if (dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
    // MM-DD-YYYY 格式
    const parts = dateStr.split('-');
    date = `${parts[2]}-${parts[0]}-${parts[1]}`;
  } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // YYYY-MM-DD 格式
    date = dateStr;
  } else if (dateStr.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
    // YYYY/M/D 格式
    const parts = dateStr.split('/');
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    date = `${parts[0]}-${month}-${day}`;
  } else {
    // 尝试解析其他格式
    const dateObj = new Date(dateStr);
    if (!isNaN(dateObj.getTime())) {
      date = dateObj.toISOString().split('T')[0];
    } else {
      // 如果无法解析，使用今天的日期
      date = new Date().toISOString().split('T')[0];
    }
  }

  // 解析备注（第2个字段）
  const note = fields[1].trim();

  // 解析金额（第3个字段）- 移除货币符号和空格
  let amount = 0;
  const amountStr = fields[2].replace(/[\$¥,\s]/g, '');
  const amountNum = parseFloat(amountStr);
  if (!isNaN(amountNum)) {
    amount = Math.abs(amountNum); // 确保金额为正数
  }

  // 解析分类
  let category = '';
  if (fields.length >= 4) {
    // 第4个字段是分类
    category = fields[3].trim();
  } else {
    // 没有分类字段，根据描述猜测
    category = guessCategory(note);
  }

  return {
    date: date,
    amount: amount,
    category: category,
    note: note
  };
}

// 解析CSV字段（处理逗号和引号）
function parseCSVFields(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  fields.push(current.trim());
  return fields;
}

// 判断是否为分类
function isCategory(text) {
  const categories = ['餐饮', '交通', '购物', '娱乐', '医疗', '教育', '住房', '其他', '保险', '旅行', '礼物'];
  return categories.some(cat => text.includes(cat));
}

// 根据描述猜测分类
function guessCategory(description) {
  const desc = description.toLowerCase();
  
  if (desc.includes('餐') || desc.includes('饭') || desc.includes('食') || desc.includes('咖啡') || desc.includes('奶茶') || desc.includes('饮料')) {
    return '餐饮';
  }
  if (desc.includes('车') || desc.includes('打车') || desc.includes('公交') || desc.includes('地铁') || desc.includes('火车') || desc.includes('快递')) {
    return '交通';
  }
  if (desc.includes('购物') || desc.includes('超市') || desc.includes('商店') || desc.includes('便利店')) {
    return '购物';
  }
  if (desc.includes('电影') || desc.includes('游戏') || desc.includes('娱乐') || desc.includes('门票')) {
    return '娱乐';
  }
  if (desc.includes('医') || desc.includes('药') || desc.includes('保健')) {
    return '医疗';
  }
  if (desc.includes('学') || desc.includes('教育') || desc.includes('培训')) {
    return '教育';
  }
  if (desc.includes('房') || desc.includes('租') || desc.includes('水电')) {
    return '住房';
  }
  if (desc.includes('保险')) {
    return '保险';
  }
  if (desc.includes('酒店') || desc.includes('旅') || desc.includes('景区')) {
    return '旅行';
  }
  if (desc.includes('礼物') || desc.includes('送礼')) {
    return '礼物';
  }
  
  return '其他';
}
