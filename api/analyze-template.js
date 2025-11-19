const GEMINI_MODEL_NAME = "gemini-2.5-flash-preview-04-17";

async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status === 429 && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { fileContent, fileName } = req.body;

    if (!fileContent) {
      return res.status(400).json({ error: 'Missing file content' });
    }

    const analysisPrompt = `
      分析以下微信公众号文章的版式和设计风格。请识别：

      返回 JSON 格式，包含以下字段：
      {
        "templateName": "简洁明了的模板名称 (3-5个字)",
        "description": "简短描述模板特点和适用场景",
        "styleAnalysis": {
          "primaryColor": "#hex (主色调)",
          "secondaryColor": "#hex (背景/次要颜色)",
          "accentColor": "#hex (强调色)",
          "fontFamily": "字体风格描述",
          "overallStyle": "整体风格 (如：简约商务/活泼年轻/高端奢华/清新自然)"
        },
        "layoutStructure": [
          {
            "sectionType": "header/content/list/image-text/cta/contact",
            "elements": [
              { "type": "title", "style": "large/medium/small", "alignment": "left/center" },
              { "type": "image", "size": "full/large/medium/small", "position": "top/bottom/left/right" },
              { "type": "text", "style": "paragraph/quote/highlight" },
              { "type": "list", "style": "bullet/number/icon", "items": 3 }
            ]
          }
        ],
        "titleStyle": {
          "mainTitle": { "size": "large", "weight": "bold", "alignment": "center/left" },
          "sectionTitle": { "size": "medium", "weight": "bold", "alignment": "left" },
          "hasUnderline": false,
          "hasIcon": false
        },
        "listStyle": {
          "type": "bullet/number/icon/checkbox",
          "indentation": "normal/large",
          "spacing": "compact/normal/spacious"
        },
        "imageStyle": {
          "corners": "rounded/square",
          "shadow": true/false,
          "caption": true/false
        }
      }

      【分析要点】：
      - layoutStructure 数组应该按照文章从上到下的顺序，描述每个区块包含哪些元素
      - 每个区块的 elements 数组描述该区块内元素的排列顺序
      - 仔细观察图片是在文字上方还是下方、大小比例、是否有边框阴影等

      只返回 JSON，不要包含 markdown 标记。

      网页内容:
      ---
      ${fileContent.substring(0, 8000)}
      ---
    `;

    const payload = {
      contents: [{ parts: [{ text: analysisPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json"
      },
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${apiKey}`;

    const response = await fetchWithRetry(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'API request failed' });
    }

    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      return res.status(500).json({ error: 'AI未能成功分析内容' });
    }

    const parsedTemplate = JSON.parse(textResponse);

    return res.status(200).json({ template: parsedTemplate });

  } catch (error) {
    console.error('Analyze template error:', error);
    return res.status(500).json({ error: error.message });
  }
}
