// 代理外部API请求以解决CORS问题
export async function onRequestGet(context) {
  try {
    const EXTERNAL_API_URL = 'https://1252702612-6e2319h9m9.ap-guangzhou.tencentscf.com';
    
    // 请求外部API
    const response = await fetch(EXTERNAL_API_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Cloudflare-Worker)',
      }
    });

    if (!response.ok) {
      return Response.json({
        success: false,
        error: `外部API返回错误: ${response.status} ${response.statusText}`
      }, { 
        status: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    const data = await response.json();
    
    // 返回数据，添加CORS头
    return Response.json({
      success: true,
      data: data
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  } catch (error) {
    console.error('代理请求失败:', error);
    return Response.json({
      success: false,
      error: `代理请求失败: ${error.message}`
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }
}

// 处理OPTIONS预检请求
export async function onRequestOptions(context) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  });
}
