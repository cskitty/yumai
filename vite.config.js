import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Custom plugin to proxy URL fetches
function urlProxyPlugin() {
  return {
    name: 'url-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/fetch-url?')) {
          const urlParam = new URL(req.url, 'http://localhost').searchParams.get('url');
          if (!urlParam) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'URL parameter required' }));
            return;
          }


          try {
            const targetUrl = new URL(urlParam);

            // Special handling for WeChat articles
            if (targetUrl.hostname.includes('weixin.qq.com') || targetUrl.hostname.includes('mp.weixin.qq.com')) {
              res.statusCode = 403;
              res.end('微信公众号文章通常需要登录访问，无法直接抓取。\n\n解决方案：\n1. 在浏览器中打开该文章\n2. 右键点击页面 → "另存为" → 保存为 .html 文件\n3. 在"模板库"中点击上传按钮，上传保存的 HTML 文件\n\n这样可以完整保留文章的样式和布局。');
              return;
            }

            const response = await fetch(urlParam, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            });
            const text = await response.text();

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(text);
          } catch (error) {
            res.statusCode = 500;
            res.end(error.message);
          }
          return;
        }
        next();
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), urlProxyPlugin()],
  define: {
    __firebase_config: JSON.stringify({
      apiKey: "demo-api-key",
      authDomain: "demo.firebaseapp.com",
      projectId: "demo-project",
      storageBucket: "demo.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:abc123"
    }),
    __app_id: JSON.stringify('demo-app-id'),
    __initial_auth_token: JSON.stringify('')
  }
})
