export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).send('URL parameter is required');
  }

  try {
    // Decode and validate URL
    const decodedUrl = decodeURIComponent(url);
    const targetUrl = new URL(decodedUrl);

    // Special handling for WeChat articles - they often require authentication
    if (targetUrl.hostname.includes('weixin.qq.com') || targetUrl.hostname.includes('mp.weixin.qq.com')) {
      return res.status(403).send('微信公众号文章通常需要登录访问，无法直接抓取。\n\n解决方案：\n1. 在浏览器中打开该文章\n2. 右键点击页面 → "另存为" → 保存为 .html 文件\n3. 在"模板库"中点击上传按钮，上传保存的 HTML 文件\n\n这样可以完整保留文章的样式和布局。');
    }

    // Create AbortController for timeout
    // Vercel Hobby plan has 10s limit, so we must abort before that to return a proper error
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    // Fetch the URL content
    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Fetch failed: ${response.status} ${response.statusText}`);

      // Special handling for WeChat authentication errors
      if (response.status === 401 && targetUrl.hostname.includes('weixin.qq.com')) {
        return res.status(401).send('微信文章需要登录才能访问。请在浏览器中打开文章，右键"另存为"保存HTML文件，然后上传文件进行分析。');
      }

      return res.status(response.status).send(`Failed to fetch URL: ${response.statusText}`);
    }

    // Check content length if available
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) { // 5MB limit
      return res.status(413).send('URL content is too large (max 5MB)');
    }

    const contentType = response.headers.get('content-type');

    // Use arrayBuffer to handle potential encoding issues and limit size manually
    const buffer = await response.arrayBuffer();

    if (buffer.byteLength > 5 * 1024 * 1024) {
      return res.status(413).send('URL content is too large (max 5MB)');
    }

    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(buffer);

    // Set appropriate content type
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    } else {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }

    return res.status(200).send(text);

  } catch (error) {
    console.error('Fetch URL error:', error.name, error.message);

    if (error.name === 'AbortError') {
      return res.status(504).send('Request timeout - the URL took too long to respond (limit 9s)');
    }

    return res.status(500).send(`Error fetching URL: ${error.message}`);
  }
}
