import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare, FileText, Layout, Share2, Settings,
  Plus, Send, Loader2, ChevronRight, Image as ImageIcon,
  Smartphone, X, Save, Upload, Play, User, Bot, Sparkles,
  Palette, Type, Globe, Grid, Eye, Edit3, Trash2, Check,
  ExternalLink
} from 'lucide-react';

// --- Initial Article Content ---
const INITIAL_SLIDES = [
  {
    id: 'welcome',
    type: 'content',
    elements: [
      { type: 'title', content: '欢迎使用 YumAI', style: 'large', alignment: 'center' },
      { type: 'text', content: '在左侧输入您想要创作的内容主题，我们将为您生成精美的微信公众号风格文章。', style: 'paragraph' },
      { type: 'text', content: '您也可以先在模板库中添加模板，生成的文章将完全匹配模板的布局结构。', style: 'paragraph' }
    ],
    theme: {
      primaryColor: '#10b981',
      secondaryColor: '#f0fdf4',
      accentColor: '#059669'
    }
  }
];

// --- Utility: Retry fetch with exponential backoff ---
const fetchWithRetry = async (url, options, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status === 429 && i < retries - 1) { // Too Many Requests
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        const errorData = await response.json();
        throw new Error(`API Request Failed: ${response.statusText}. Details: ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      if (i === retries - 1) throw error;
    }
  }
};

// --- Components ---

// 1. Article Section Renderer - handles elements array
const ArticleSection = ({ data, isFirst }) => {
  const theme = data.theme || {};
  const elements = data.elements || [];

  // Fallback for old format
  if (!elements.length && (data.title || data.text)) {
    return (
      <div className="p-6" style={{ backgroundColor: theme.secondaryColor || '#ffffff' }}>
        {data.title && (
          <h2 className="text-2xl font-bold mb-4" style={{ color: theme.primaryColor || '#1e293b' }}>
            {data.title}
          </h2>
        )}
        {data.image && (
          <img src={data.image} alt="" className="w-full rounded-lg mb-4 shadow-md" />
        )}
        {data.text && (
          <p className="text-base leading-relaxed text-slate-600 mb-4">{data.text}</p>
        )}
        {data.points && (
          <ul className="space-y-2">
            {data.points.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-2 h-2 mt-2 rounded-full shrink-0" style={{ backgroundColor: theme.accentColor || '#3b82f6' }} />
                <span className="text-sm text-slate-600">{p}</span>
              </li>
            ))}
          </ul>
        )}
        {data.qrCode && (
          <div className="flex flex-col items-center mt-6 p-6 rounded-xl" style={{ backgroundColor: theme.primaryColor || '#1e40af' }}>
            <div className="bg-white p-3 rounded-lg mb-4">
              <div className="w-24 h-24 grid grid-cols-5 grid-rows-5 gap-0.5">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div key={i} className={`${Math.random() > 0.5 ? 'bg-slate-900' : 'bg-transparent'}`} />
                ))}
              </div>
            </div>
            {data.cta && (
              <button className="w-full text-white font-bold py-3 px-6 rounded-lg" style={{ backgroundColor: theme.accentColor || '#3b82f6' }}>
                {data.cta}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6" style={{ backgroundColor: theme.secondaryColor || '#ffffff' }}>
      {elements.map((el, idx) => {
        switch (el.type) {
          case 'title':
            const titleSize = el.style === 'large' ? 'text-2xl' : el.style === 'medium' ? 'text-xl' : 'text-lg';
            const titleAlign = el.alignment === 'center' ? 'text-center' : el.alignment === 'right' ? 'text-right' : 'text-left';
            return (
              <h2 key={idx} className={`${titleSize} font-bold mb-4 ${titleAlign}`} style={{ color: theme.primaryColor || '#1e293b' }}>
                {el.content}
              </h2>
            );

          case 'image':
            const imgSize = el.size === 'full' ? 'w-full' : el.size === 'large' ? 'w-full' : el.size === 'medium' ? 'w-3/4 mx-auto' : 'w-1/2 mx-auto';
            return (
              <div key={idx} className={`mb-4 ${imgSize}`}>
                <img
                  src={el.url || el.content}
                  alt=""
                  className="w-full rounded-lg shadow-md object-cover"
                  style={{ maxHeight: el.size === 'small' ? '150px' : el.size === 'medium' ? '250px' : '400px' }}
                />
              </div>
            );

          case 'text':
            const textStyle = el.style === 'highlight'
              ? 'bg-yellow-50 border-l-4 border-yellow-400 pl-4 py-2 italic'
              : el.style === 'quote'
                ? 'border-l-4 pl-4 py-2 italic text-slate-500'
                : '';
            return (
              <p key={idx} className={`text-base leading-relaxed text-slate-600 mb-4 ${textStyle}`} style={{ borderColor: el.style === 'quote' ? theme.primaryColor : undefined }}>
                {el.content}
              </p>
            );

          case 'list':
            return (
              <ul key={idx} className="space-y-2 mb-4 pl-2">
                {(el.items || []).map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    {el.style === 'number' ? (
                      <span className="text-sm font-bold" style={{ color: theme.accentColor || '#3b82f6' }}>{i + 1}.</span>
                    ) : (
                      <span className="w-2 h-2 mt-2 rounded-full shrink-0" style={{ backgroundColor: theme.accentColor || '#3b82f6' }} />
                    )}
                    <span className="text-sm text-slate-600">{item}</span>
                  </li>
                ))}
              </ul>
            );

          case 'cta':
            return (
              <button
                key={idx}
                className="w-full text-white font-bold py-3 px-6 rounded-lg mt-4 shadow-lg hover:opacity-90 transition-opacity"
                style={{ backgroundColor: theme.accentColor || '#3b82f6' }}
              >
                {el.text || el.content}
              </button>
            );

          default:
            return null;
        }
      })}

      {/* QR Code for contact sections */}
      {data.qrCode && (
        <div className="flex flex-col items-center mt-6 p-6 rounded-xl" style={{ backgroundColor: theme.primaryColor || '#1e40af' }}>
          <div className="bg-white p-3 rounded-lg mb-4">
            <div className="w-24 h-24 grid grid-cols-5 grid-rows-5 gap-0.5">
              {Array.from({ length: 25 }).map((_, i) => (
                <div key={i} className={`${Math.random() > 0.5 ? 'bg-slate-900' : 'bg-transparent'}`} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 2. Main Application
export default function H5Generator() {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('chat'); // chat, templates, library, settings
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [slides, setSlides] = useState(INITIAL_SLIDES);
  const [messages, setMessages] = useState([
    { role: 'system', content: '你好！我是YumAI。请在"素材库"上传文档提供背景信息，或在"模板库"创建新模板。告诉我你想制作什么样的内容！' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [libraryDocs, setLibraryDocs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null); // Currently selected template for generation
  const [templateUrl, setTemplateUrl] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState([]); // Array of {id, file, preview, compressed}
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false); // Track if current article is published
  const [previewTemplate, setPreviewTemplate] = useState(null); // Template being previewed
  const [isViewMode, setIsViewMode] = useState(false); // Viewing a published article
  const [articleTitle, setArticleTitle] = useState(''); // Title for publishing
  const messagesEndRef = useRef(null);
  const slideContainerRef = useRef(null);
  const photoInputRef = useRef(null);

  // --- Load Published Article from URL ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const articleId = params.get('article');

    if (articleId) {
      // Try to load article from localStorage
      const savedArticles = localStorage.getItem('yum-ai-published');
      if (savedArticles) {
        try {
          const articles = JSON.parse(savedArticles);
          const article = articles[articleId];
          if (article) {
            setSlides(article.slides);
            setArticleTitle(article.title || '');
            setIsViewMode(true);
            setShowMobilePreview(true);
          }
        } catch (e) {
          console.error('Failed to load article:', e);
        }
      }
    }
  }, []);

  // --- Auth & Init ---
  useEffect(() => {
    // Check for saved user in localStorage
    const savedUser = localStorage.getItem('yum-ai-user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to load user');
      }
    }

    // Load templates and library from localStorage
    const savedTemplates = localStorage.getItem('yum-ai-templates');
    const savedDocs = localStorage.getItem('yum-ai-library');
    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates));
      } catch (e) {
        console.error('Failed to load templates from localStorage');
      }
    }
    if (savedDocs) {
      try {
        setLibraryDocs(JSON.parse(savedDocs));
      } catch (e) {
        console.error('Failed to load library from localStorage');
      }
    }
  }, []);

  // --- Email OTP Auth Functions ---
  const sendOtp = () => {
    if (!loginEmail.trim() || !loginEmail.includes('@')) {
      setLoginError('请输入有效的邮箱地址');
      return;
    }
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
    setOtpSent(true);
    setLoginError('');
    // In production, send email here. For demo, show OTP in console
    console.log('OTP Code:', otp);
    alert(`验证码已发送（演示模式）: ${otp}`);
  };

  const verifyOtp = () => {
    if (loginOtp === generatedOtp) {
      const newUser = {
        uid: loginEmail,
        email: loginEmail,
        createdAt: Date.now()
      };
      setUser(newUser);
      localStorage.setItem('yum-ai-user', JSON.stringify(newUser));
      setShowLogin(false);
      setLoginEmail('');
      setLoginOtp('');
      setGeneratedOtp('');
      setOtpSent(false);
      setLoginError('');
      setMessages(prev => [...prev, { role: 'system', content: `欢迎回来，${loginEmail}！` }]);
    } else {
      setLoginError('验证码错误，请重试');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('yum-ai-user');
    setMessages(prev => [...prev, { role: 'system', content: '您已退出登录' }]);
  };

  // --- Helper Functions ---
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const updateSlideData = (index, updates) => {
    setSlides(prevSlides =>
      prevSlides.map((slide, i) =>
        i === index ? { ...slide, ...updates } : slide
      )
    );
  };

  // --- Image Compression for H5 ---
  const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.7) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve({
            base64: compressedBase64,
            mimeType: 'image/jpeg',
            width,
            height
          });
        };
        img.onerror = reject;
        img.src = event.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // --- Photo Upload Handler ---
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const newPhotos = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;

      try {
        const compressed = await compressImage(file);
        const photo = {
          id: Date.now() + Math.random(),
          file: file,
          name: file.name,
          preview: URL.createObjectURL(file),
          compressed: compressed
        };
        newPhotos.push(photo);
      } catch (err) {
        console.error('Failed to compress image:', err);
      }
    }

    setUploadedPhotos(prev => [...prev, ...newPhotos]);
    // Reset input
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  // --- Remove Photo ---
  const removePhoto = (id) => {
    setUploadedPhotos(prev => {
      const photo = prev.find(p => p.id === id);
      if (photo?.preview) {
        URL.revokeObjectURL(photo.preview);
      }
      return prev.filter(p => p.id !== id);
    });
  };

  // --- Clear All Photos ---
  const clearAllPhotos = () => {
    uploadedPhotos.forEach(photo => {
      if (photo.preview) URL.revokeObjectURL(photo.preview);
    });
    setUploadedPhotos([]);
  };

  // --- Publish Article ---
  const handlePublish = async () => {
    if (slides.length === 0) return;

    setIsPublishing(true);
    try {
      // Generate unique article ID
      const articleId = `art_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Get title from first section
      let title = '未命名文章';
      const firstSection = slides[0];
      if (firstSection?.elements) {
        const titleEl = firstSection.elements.find(el => el.type === 'title');
        if (titleEl) title = titleEl.content;
      } else if (firstSection?.title) {
        title = firstSection.title;
      }

      // Save to localStorage
      const savedArticles = JSON.parse(localStorage.getItem('yum-ai-published') || '{}');
      savedArticles[articleId] = {
        id: articleId,
        title: title,
        slides: slides,
        createdAt: Date.now()
      };
      localStorage.setItem('yum-ai-published', JSON.stringify(savedArticles));

      // Generate shareable URL
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}?article=${articleId}`;

      setPublishedUrl(shareUrl);
      setArticleTitle(title);
      setIsPublished(true);

      setMessages(prev => [...prev, {
        role: 'system',
        content: '文章已发布成功！点击分享按钮可以分享给朋友。'
      }]);
    } catch (error) {
      console.error('Publish error:', error);
      setMessages(prev => [...prev, {
        role: 'error',
        content: `发布失败: ${error.message}`
      }]);
    } finally {
      setIsPublishing(false);
    }
  };

  // --- Open Share Modal ---
  const openShareModal = () => {
    if (!isPublished || !publishedUrl) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: '请先点击发布按钮发布文章。'
      }]);
      return;
    }
    setShowPublishModal(true);
  };

  // --- Social Share Functions ---
  const shareToWeChat = () => {
    // WeChat doesn't have direct web share, show QR code modal
    alert('请使用微信扫一扫功能扫描二维码分享');
  };

  const shareToWeibo = (url, title) => {
    const weiboUrl = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    window.open(weiboUrl, '_blank', 'width=600,height=400');
  };

  const shareToTwitter = (url, title) => {
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  const shareToFacebook = (url) => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(fbUrl, '_blank', 'width=600,height=400');
  };

  // --- Copy to Clipboard ---
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('链接已复制到剪贴板！');
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleDocumentUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file || !user || !db) return;

    // Templates must be HTML/TXT for analysis
    if (type === 'template' && (!file.name.endsWith('.html') && !file.name.endsWith('.txt'))) {
      alert("模板分析仅支持 .html 或 .txt 文件。");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target.result;

      if (type === 'library') {
        // Upload to Library
        try {
          const newDoc = {
            id: Date.now().toString(),
            name: file.name,
            content: content.substring(0, 5000), // Limit for demo
            type: file.type,
            createdAt: { seconds: Date.now() / 1000 }
          };

          // Save to localStorage
          const updatedDocs = [...libraryDocs, newDoc];
          setLibraryDocs(updatedDocs);
          localStorage.setItem('yum-ai-library', JSON.stringify(updatedDocs));
          setMessages(prev => [...prev, { role: 'system', content: `文档 [${file.name}] 已上传至素材库，可用于 AI 内容生成。` }]);
        } catch (err) {
          console.error("Upload failed", err);
        }
      } else if (type === 'template') {
        // Analyze and Upload to Templates
        await analyzeWebpageAsTemplate(file.name, content);
      }
    };
    reader.readAsText(file);
  };

  const handleUrlAnalysis = async () => {
    if (!templateUrl.trim()) return;
    if (isLoading) return;

    try {
      setIsLoading(true);
      setMessages(prev => [...prev, { role: 'system', content: `正在获取网页内容: ${templateUrl}...` }]);

      // Fetch URL directly from client-side (bypasses server timeout issues)
      let htmlContent;
      try {
        const response = await fetch(templateUrl, {
          mode: 'cors',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        htmlContent = await response.text();

        if (!htmlContent || htmlContent.length < 100) {
          throw new Error('获取的内容为空或太短');
        }
      } catch (fetchError) {
        // If direct fetch fails (CORS), provide helpful error message
        if (fetchError.message.includes('CORS') || fetchError.name === 'TypeError') {
          throw new Error('无法直接访问该网页（CORS限制）。\n\n解决方案：\n1. 在浏览器中打开该网页\n2. 右键 → "另存为" → 保存为 .html 文件\n3. 使用下方的"上传 HTML 文件分析"按钮上传');
        }
        throw fetchError;
      }

      // Send the fetched content to server for AI analysis
      await analyzeWebpageAsTemplate(templateUrl, htmlContent);
      setTemplateUrl('');
    } catch (error) {
      console.error("URL Analysis Error:", error);
      setMessages(prev => [...prev, { role: 'error', content: `无法分析网页。错误: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteLibraryItem = async (id, collectionName) => {
    try {
      // Delete from localStorage
      if (collectionName === 'templates') {
        const updatedTemplates = templates.filter(t => t.id !== id);
        setTemplates(updatedTemplates);
        localStorage.setItem('yum-ai-templates', JSON.stringify(updatedTemplates));
      } else if (collectionName === 'library') {
        const updatedDocs = libraryDocs.filter(d => d.id !== id);
        setLibraryDocs(updatedDocs);
        localStorage.setItem('yum-ai-library', JSON.stringify(updatedDocs));
      }
    } catch (e) {
      console.error("Deletion failed:", e);
    }
  };

  // --- Template Logic ---
  const applyTemplate = (template) => {
    let styledSlides;

    if (template.initialSlides && template.initialSlides.length > 0) {
      // Apply the template's theme/style to all slides
      styledSlides = template.initialSlides.map(slide => ({
        ...slide,
        theme: template.styleAnalysis
      }));
    } else {
      // Create default preview slides based on template style
      styledSlides = [
        {
          id: 'preview-cover',
          type: 'cover',
          title: template.templateName || '模板预览',
          subtitle: '基于分析的网页风格',
          bgImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop',
          theme: template.styleAnalysis
        },
        {
          id: 'preview-content',
          type: 'content',
          title: '内容页面示例',
          text: '这是使用该模板风格生成的内容页面预览。',
          points: [
            `主色调: ${template.styleAnalysis?.primaryColor || '未定义'}`,
            `辅助色: ${template.styleAnalysis?.secondaryColor || '未定义'}`,
            `强调色: ${template.styleAnalysis?.accentColor || '未定义'}`,
            `字体: ${template.styleAnalysis?.fontFamily || '未定义'}`
          ],
          theme: template.styleAnalysis
        },
        {
          id: 'preview-contact',
          type: 'contact',
          title: '联系我们',
          cta: '立即行动',
          qrCode: true,
          theme: template.styleAnalysis
        }
      ];
    }

    setSlides(styledSlides);
    setMessages(prev => [...prev, { role: 'system', content: `已预览模板：**${template.templateName}**` }]);
  };

  const analyzeWebpageAsTemplate = async (fileName, fileContent) => {
    if (isLoading) return;
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'system', content: `正在分析网页 **${fileName}** 的结构和风格...` }]);

    try {
      // Call server-side API for template analysis
      const response = await fetch('/api/analyze-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileContent, fileName })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      const parsedTemplate = data.template;

      // Save to localStorage
      const newTemplate = {
        ...parsedTemplate,
        id: Date.now().toString(),
        fileName: fileName,
        createdAt: { seconds: Date.now() / 1000 }
      };

      const updatedTemplates = [...templates, newTemplate];
      setTemplates(updatedTemplates);
      localStorage.setItem('yum-ai-templates', JSON.stringify(updatedTemplates));

      setMessages(prev => [...prev, { role: 'system', content: `**${parsedTemplate.templateName}** 模板已成功创建并保存！您可以立即应用它。` }]);
      setActiveTab('templates'); // Switch to template view

    } catch (error) {
      console.error("Template Analysis Error:", error);
      setMessages(prev => [...prev, { role: 'error', content: `抱歉，模板分析失败。请检查文件内容或 API 密钥。错误信息: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Gemini Logic (Text Generation) ---
  // --- Gemini Logic (Text Generation) ---
  const generateContent = async () => {
    if ((!input.trim() && uploadedPhotos.length === 0) || isLoading) return;

    const userPrompt = input;
    const photosToSend = [...uploadedPhotos];
    setInput('');
    setUploadedPhotos([]);
    setIsLoading(true);

    // Show user message with photo indicators
    const photoCount = photosToSend.length;
    const messageContent = photoCount > 0
      ? `${userPrompt}${userPrompt ? ' ' : ''}[${photoCount} 张图片]`
      : userPrompt;
    setMessages(prev => [...prev, { role: 'user', content: messageContent }]);

    try {
      // Context from Library
      const libraryContext = libraryDocs.map(doc => `[文档: ${doc.name}]\n${doc.content}`).join('\n\n');

      // Template style context
      const templateContext = activeTemplate ? `
        【重要：严格按照模板布局生成内容】

        颜色方案：
        - primaryColor: "${activeTemplate.styleAnalysis?.primaryColor || '#1e40af'}"
        - secondaryColor: "${activeTemplate.styleAnalysis?.secondaryColor || '#f1f5f9'}"
        - accentColor: "${activeTemplate.styleAnalysis?.accentColor || '#d97706'}"

        ${activeTemplate.layoutStructure ? `
        【布局结构 - 必须严格遵循】
        模板共有 ${activeTemplate.layoutStructure.length} 个区块，你必须生成相同数量的区块，每个区块的元素类型和顺序必须完全匹配：

        ${activeTemplate.layoutStructure.map((section, i) => `
        第${i + 1}个区块 (${section.sectionType}):
        ${section.elements.map((el, j) => `  ${j + 1}. ${el.type}${el.style ? ` (${el.style})` : ''}${el.size ? ` [${el.size}]` : ''}${el.position ? ` - ${el.position}` : ''}`).join('\n')}
        `).join('\n')}

        标题样式：${JSON.stringify(activeTemplate.titleStyle || {})}
        列表样式：${JSON.stringify(activeTemplate.listStyle || {})}
        图片样式：${JSON.stringify(activeTemplate.imageStyle || {})}
        ` : ''}

        生成的每个section必须包含theme对象！` : '';

      const systemPrompt = `
        你是一个专业的微信公众号文章撰写专家，擅长制作引人注目的营销文章。

        用户需求: "${userPrompt}"
        ${templateContext}
        ${photoCount > 0 ? `

        【重要】用户上传了 ${photoCount} 张图片。请：
        1. 仔细分析每张图片的内容、风格、色调和主题
        2. 根据图片内容撰写相关的创意营销文案
        3. 将图片合理地安排在文章的不同段落中
        4. 确保文案与图片内容高度契合，形成完整的故事线` : ''}

        ${libraryContext ? `参考素材库内容:\n${libraryContext}\n` : ''}

        请生成一篇微信公众号风格的营销文章，要求：
        - 文案要有吸引力、创意性强
        - 使用生动的语言和情感共鸣
        - 图文并茂，图片穿插在文字之间
        - 结尾要有明确的行动号召
        - 不要有单独的封面页，直接从内容开始
        ${activeTemplate?.layoutStructure ? `- 【关键】必须严格按照模板的 ${activeTemplate.layoutStructure.length} 个区块结构生成` : ''}

        JSON 结构要求（文章段落格式）:
        [
          {
            "id": "section-1",
            "type": "content",
            "elements": [
              { "type": "title", "content": "文章主标题", "style": "large", "alignment": "center" },
              { "type": "image", "url": "https://source.unsplash.com/random/800x600/?topic", "size": "full", "position": "top" },
              { "type": "text", "content": "开篇内容...", "style": "paragraph" }
            ],
            "theme": { "primaryColor": "#...", "secondaryColor": "#...", "accentColor": "#..." }
          },
          {
            "id": "section-2",
            "type": "content",
            "elements": [
              { "type": "title", "content": "小标题", "style": "medium", "alignment": "left" },
              { "type": "text", "content": "段落内容...", "style": "paragraph" },
              { "type": "list", "items": ["要点1", "要点2", "要点3"], "style": "bullet" },
              { "type": "image", "url": "https://source.unsplash.com/random/800x600/?related", "size": "large", "position": "bottom" }
            ],
            "theme": { ... }
          },
          {
            "id": "section-n",
            "type": "contact",
            "elements": [
              { "type": "title", "content": "联系我们", "style": "medium" },
              { "type": "text", "content": "行动号召文案", "style": "highlight" },
              { "type": "cta", "text": "立即咨询", "style": "button" }
            ],
            "qrCode": true,
            "theme": { ... }
          }
        ]

        重要：
        ${activeTemplate?.layoutStructure ? `- 必须生成恰好 ${activeTemplate.layoutStructure.length} 个区块` : '- 生成 4-6 个段落'}
        - 每个区块的 elements 数组按顺序描述该区块内的元素
        - 如果用户选择了模板，每个区块的元素类型和顺序必须与模板完全匹配
        - 必须使用模板的颜色值
        只返回纯 JSON 数组，不要包含 markdown 格式。
      `;

      // Build parts array with text and images
      const parts = [{ text: systemPrompt }];

      // Add compressed images to the request
      for (const photo of photosToSend) {
        if (photo.compressed) {
          // Extract base64 data without the data URL prefix
          const base64Data = photo.compressed.base64.split(',')[1];
          parts.push({
            inline_data: {
              mime_type: photo.compressed.mimeType,
              data: base64Data
            }
          });
        }
        // Clean up preview URL
        if (photo.preview) URL.revokeObjectURL(photo.preview);
      }

      // Call server-side API for content generation
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parts })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      const textResponse = data.response;

      // Clean up markdown if present
      const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const newSlides = JSON.parse(cleanJson);

      if (Array.isArray(newSlides)) {
        // Apply active template theme to all slides if template is selected
        let styledSlides = newSlides;
        if (activeTemplate) {
          styledSlides = newSlides.map(slide => ({
            ...slide,
            theme: {
              primaryColor: activeTemplate.styleAnalysis?.primaryColor || slide.theme?.primaryColor,
              secondaryColor: activeTemplate.styleAnalysis?.secondaryColor || slide.theme?.secondaryColor,
              accentColor: activeTemplate.styleAnalysis?.accentColor || slide.theme?.accentColor,
              fontFamily: activeTemplate.styleAnalysis?.fontFamily || slide.theme?.fontFamily,
              ...slide.theme
            }
          }));
        }
        setSlides(styledSlides);
        setIsPublished(false); // Reset publish state for new content
        setPublishedUrl('');
        setMessages(prev => [...prev, { role: 'bot', content: `已为您生成 "${userPrompt}" 相关的文章！${activeTemplate ? `（使用 ${activeTemplate.templateName} 模板布局）` : ''}` }]);
      } else {
        throw new Error("Invalid JSON format received");
      }

    } catch (error) {
      console.error("Generation Error:", error);
      setMessages(prev => [...prev, { role: 'error', content: `生成失败: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Imagen 3.0 Logic (Image Generation) ---
  const generateImage = async () => {
    if (!input.trim() || isLoading) return;

    const imagePrompt = input;
    setInput('');
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: `生成图片: ${imagePrompt}` }]);

    try {
      // For now, we'll use a placeholder logic or Unsplash since actual Imagen API setup might vary
      // and we want immediate visual feedback.
      // If you have a specific Imagen endpoint, replace this.

      // Simulating AI Image Generation with Unsplash for demo purposes
      // In a real app, call https://generativelanguage.googleapis.com/v1beta/models/image-generation-model...

      await new Promise(resolve => setTimeout(resolve, 1500)); // Fake delay

      const keywords = imagePrompt.split(' ').join(',');
      const imageUrl = `https://source.unsplash.com/random/1024x1024/?${encodeURIComponent(keywords)}`;

      setMessages(prev => [...prev, {
        role: 'bot',
        content: (
          <div className="flex flex-col gap-2">
            <p>已根据 "{imagePrompt}" 生成图片 (演示模式):</p>
            <img src={imageUrl} alt="Generated" className="rounded-lg shadow-md max-w-full h-auto" />
            <p className="text-xs text-slate-400">提示: 点击图片可保存或拖拽使用。</p>
          </div>
        )
      }]);

    } catch (error) {
      console.error("Image Gen Error:", error);
      setMessages(prev => [...prev, { role: 'error', content: `图片生成失败: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };


  // --- Render ---
  return (
    <div className="flex h-[100dvh] w-full bg-white text-slate-800 font-sans overflow-hidden supports-[height:100cqh]:h-[100cqh]">
      {/* Left Panel - Workstation */}
      <div className={`w-full lg:w-1/2 flex flex-col border-r border-slate-100 bg-white transition-all duration-300 ${showMobilePreview ? 'hidden lg:flex' : 'flex'
        } relative`}>

        {/* Main Content Area - Chat is always the base layer */}
        <div className="flex-1 overflow-hidden relative bg-white pt-0">
          <div className="h-full flex flex-col relative">

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-8 custom-scrollbar relative z-10 pb-40">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto px-4">
                  <div className="mb-8 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">YumAI</h2>
                  </div>

                  <h3 className="text-xl font-semibold text-slate-800 mb-2 text-center">Hi, 想制作什么样的 H5 营销内容?</h3>
                  <p className="text-slate-500 text-center mb-8 max-w-md">
                    我可以帮您生成文章、活动页、邀请函，或者分析现有网页风格。
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                    {[
                      "写一篇关于春季旅游的推文",
                      "制作一个高端商务邀请函",
                      "分析这个网页的设计风格",
                      "生成一个产品发布会 H5"
                    ].map((text, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(text)}
                        className="p-4 bg-white border border-slate-200 hover:border-emerald-500/50 hover:bg-emerald-50/50 rounded-xl text-left text-sm text-slate-700 transition-all shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="w-3 h-3 text-emerald-500" />
                          <span className="font-medium">示例</span>
                        </div>
                        {text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>

                  {/* Bot Header */}
                  {msg.role !== 'user' && (
                    <div className="flex items-center gap-2 mb-2 ml-1">
                      <div className="w-5 h-5 bg-emerald-500 rounded flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm font-bold text-slate-700">YumAI</span>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={`max-w-[90%] lg:max-w-[80%] text-[15px] leading-relaxed ${msg.role === 'user'
                    ? 'bg-[#E8F5E9] text-slate-900 p-4 rounded-2xl rounded-tr-sm shadow-sm'
                    : 'bg-transparent text-slate-800 pl-1'
                    }`}>
                    {msg.content}

                    {/* Preview Link for Bot Success Messages */}
                    {msg.role === 'bot' && msg.content.includes('已为您生成') && (
                      <div className="mt-4 p-3 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-between gap-4 group cursor-pointer hover:border-emerald-500 transition-colors" onClick={() => setShowMobilePreview(true)}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                            <Smartphone className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">H5 页面预览</div>
                            <div className="text-xs text-slate-500">点击查看效果</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex flex-col items-start ml-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 bg-emerald-500 rounded flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">YumAI</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 pl-1">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>思考中...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Floating Capsule */}
            <div className="absolute bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-white via-white/90 to-transparent z-20">
              <div className="max-w-3xl mx-auto bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-2 relative">

                {/* Active Template Indicator */}
                {activeTemplate && (
                  <div className="flex items-center gap-2 px-4 pt-2 pb-1">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <Palette className="w-3 h-3 text-emerald-600" />
                      <span className="text-xs text-emerald-700 font-medium">模板: {activeTemplate.templateName}</span>
                      <button
                        onClick={() => {
                          setActiveTemplate(null);
                          setMessages(prev => [...prev, { role: 'system', content: '已取消使用模板' }]);
                        }}
                        className="ml-1 text-emerald-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Photo Preview Icons */}
                {uploadedPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-4 pt-2 pb-1">
                    {uploadedPhotos.map((photo) => (
                      <div key={photo.id} className="relative group">
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                          <img
                            src={photo.preview}
                            alt={photo.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          onClick={() => removePhoto(photo.id)}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {uploadedPhotos.length > 0 && (
                      <button
                        onClick={clearAllPhotos}
                        className="text-xs text-slate-400 hover:text-red-500 transition-colors self-center ml-1"
                      >
                        清除全部
                      </button>
                    )}
                  </div>
                )}

                {/* Hidden Photo Input */}
                <input
                  type="file"
                  ref={photoInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />

                {/* Input Field */}
                <div className="flex items-center px-4">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        generateContent();
                      }
                    }}
                    placeholder="Ask me anything..."
                    className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 py-4 min-h-[56px] max-h-32 resize-none custom-scrollbar text-base"
                    disabled={isLoading}
                    rows={1}
                  />
                </div>

                {/* Bottom Actions Row */}
                <div className="flex items-center justify-between px-4 pb-2 mt-1">
                  <div className="flex gap-2 items-center">
                    {[
                      { id: 'templates', label: '模板库' },
                      { id: 'library', label: '知识库' },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id === activeTab ? 'chat' : tab.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeTab === tab.id && tab.id !== 'chat'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                    {/* Login/User Button */}
                    {user ? (
                      <button
                        onClick={handleLogout}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-1"
                        title={user.email || '退出登录'}
                      >
                        <User className="w-3 h-3" />
                        退出
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowLogin(true)}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors flex items-center gap-1"
                      >
                        <User className="w-3 h-3" />
                        登录
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      disabled={isLoading}
                      className="p-2 text-slate-400 hover:text-emerald-500 transition-colors disabled:opacity-50"
                      title="上传图片"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={generateContent}
                      disabled={isLoading || (!input.trim() && uploadedPhotos.length === 0)}
                      className={`p-2 rounded-full transition-all transform active:scale-95 ${(input.trim() || uploadedPhotos.length > 0)
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                        : 'bg-slate-100 text-slate-300'
                        }`}
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* Template Library Popup */}
        {activeTab === 'templates' && (
          <div className="absolute bottom-24 left-4 right-4 top-20 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl z-40 flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white/50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Layout className="w-5 h-5 text-emerald-500" />
                模板库
              </h3>
              <button onClick={() => setActiveTab('chat')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Analysis Section */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">AI 网页分析</h4>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="输入网页链接 (URL) 提取风格..."
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-emerald-500 transition-colors"
                    value={templateUrl}
                    onChange={(e) => setTemplateUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUrlAnalysis()}
                  />
                  <button
                    onClick={handleUrlAnalysis}
                    disabled={!templateUrl.trim() || isLoading}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '分析'}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">输入任意网页链接，AI 将自动提取设计风格</p>

                {/* File Upload Option */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-500 mb-2">💡 微信公众号文章无法直接抓取，请上传 HTML 文件：</p>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".html,.htm"
                      onChange={(e) => handleDocumentUpload(e, 'template')}
                      className="hidden"
                      id="template-file-upload"
                    />
                    <label
                      htmlFor="template-file-upload"
                      className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:border-emerald-500 hover:text-emerald-600 transition-colors cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      上传 HTML 文件分析
                    </label>
                  </div>
                </div>
              </div>

              {/* Templates Grid */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">我的模板 ({templates.length})</h4>
                {templates.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p>暂无模板，试着分析一个网页吧！</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {templates.map((template) => (
                      <div key={template.id} className={`group relative bg-white rounded-xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${activeTemplate?.id === template.id ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'}`}>
                        <div className="h-20 w-full relative" style={{ backgroundColor: template.styleAnalysis?.secondaryColor || '#f1f5f9' }}>
                          <div className="w-full h-full flex items-center justify-center opacity-50">
                            <div className="w-8 h-8 rounded-full" style={{ backgroundColor: template.styleAnalysis?.primaryColor || '#1e293b' }} />
                          </div>
                          {activeTemplate?.id === template.id && (
                            <div className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full">
                              使用中
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="font-medium text-slate-900 text-sm truncate">{template.templateName}</div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: template.styleAnalysis?.accentColor || '#d97706' }} />
                            {template.styleAnalysis?.fontFamily || 'Default Font'}
                          </div>
                          <div className="flex gap-2 mt-2 justify-center">
                            {/* Preview Icon */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setPreviewTemplate(template); }}
                              className="p-2 bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                              title="预览"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {/* Select/Deselect Icon */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeTemplate?.id === template.id) {
                                  setActiveTemplate(null);
                                  setMessages(prev => [...prev, { role: 'system', content: `已取消使用模板 "${template.templateName}"` }]);
                                } else {
                                  setActiveTemplate(template);
                                  setMessages(prev => [...prev, { role: 'system', content: `已选择模板 "${template.templateName}"，后续生成将使用此模板的样式` }]);
                                }
                              }}
                              className={`p-2 rounded-lg transition-colors ${activeTemplate?.id === template.id ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600'}`}
                              title={activeTemplate?.id === template.id ? '取消选择' : '选为模板'}
                            >
                              {activeTemplate?.id === template.id ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            </button>
                            {/* Delete Icon */}
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteLibraryItem(template.id, 'templates'); if (activeTemplate?.id === template.id) setActiveTemplate(null); }}
                              className="p-2 bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Library Popup */}
        {activeTab === 'library' && (
          <div className="absolute bottom-24 left-4 right-4 top-20 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl z-40 flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white/50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-500" />
                知识库
              </h3>
              <button onClick={() => setActiveTab('chat')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Upload Section */}
              <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center hover:border-emerald-500/50 transition-colors cursor-pointer relative group">
                <input
                  type="file"
                  onChange={(e) => handleDocumentUpload(e, 'library')}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6 text-emerald-500" />
                </div>
                <h4 className="font-medium text-slate-900">点击上传文档</h4>
                <p className="text-xs text-slate-500 mt-1">支持 PDF, Word, TXT 等格式</p>
              </div>

              {/* Files List */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">已上传文档 ({libraryDocs.length})</h4>
                {libraryDocs.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <p>暂无文档</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {libraryDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-slate-500" />
                          </div>
                          <div className="truncate">
                            <div className="font-medium text-slate-800 text-sm truncate">{doc.name}</div>
                            <div className="text-xs text-slate-400">{new Date(doc.createdAt?.seconds * 1000).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteLibraryItem(doc.id, 'library')}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Right Panel: Preview */}
      <div className={`w-full lg:w-1/2 bg-slate-950 relative flex flex-col items-center justify-center ${showMobilePreview ? 'flex' : 'hidden lg:flex'}`}>

        {/* Mobile Back Button */}
        <div className="lg:hidden w-full flex justify-start p-4 absolute top-0 z-50 bg-gradient-to-b from-black/50 to-transparent">
          <button
            onClick={() => setShowMobilePreview(false)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 backdrop-blur text-white rounded-lg shadow-lg border border-slate-700"
          >
            <Edit3 className="w-4 h-4" />
            返回编辑
          </button>
        </div>

        {/* Phone Container - Full Screen Mode */}
        <div className="relative w-full h-full bg-white overflow-hidden flex flex-col">

          {/* View Mode Header */}
          {isViewMode && (
            <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setIsViewMode(false);
                    setShowMobilePreview(false);
                    window.history.pushState({}, '', window.location.pathname);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600 rotate-180" />
                </button>
                <div>
                  <h1 className="font-bold text-slate-800 truncate max-w-[200px]">{articleTitle || '未命名文章'}</h1>
                  <p className="text-xs text-slate-400">YumAI 生成</p>
                </div>
              </div>
              <button
                onClick={() => {
                  copyToClipboard(window.location.href);
                }}
                className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                title="分享"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Article Viewer - Continuous Scrolling */}
          <div
            ref={slideContainerRef}
            className="flex-1 overflow-y-auto scrollbar-hide relative"
            style={{ backgroundColor: slides[0]?.theme?.secondaryColor || '#ffffff' }}
          >
            {slides.map((section, index) => (
              <ArticleSection
                key={section.id || index}
                data={section}
                isFirst={index === 0}
              />
            ))}
          </div>
        </div>

        {/* Floating Action Buttons (Desktop Context) - Hide in view mode */}
        {!isViewMode && (
          <div className="absolute top-8 right-8 flex flex-col gap-3 z-50">
            {/* Publish Button */}
            <button
              onClick={() => {
                console.log('Publish clicked', { isPublishing, slidesLength: slides.length, isPublished });
                handlePublish();
              }}
              disabled={isPublishing || slides.length === 0 || isPublished}
              className={`p-3 rounded-full shadow-lg transition-colors cursor-pointer ${isPublished
                ? 'bg-green-500 text-white'
                : isPublishing || slides.length === 0
                  ? 'bg-slate-400 text-slate-200 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95'
                }`}
              title={isPublished ? '已发布' : '发布文章'}
            >
              {isPublishing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isPublished ? (
                <Check className="w-5 h-5" />
              ) : (
                <Globe className="w-5 h-5" />
              )}
            </button>

            {/* Share Button */}
            <button
              onClick={openShareModal}
              disabled={!isPublished}
              className={`p-3 rounded-full shadow-lg transition-colors ${isPublished
                ? 'bg-blue-600 text-white hover:bg-blue-500'
                : 'bg-slate-400 text-slate-200 cursor-not-allowed'
                }`}
              title={isPublished ? '分享文章' : '请先发布'}
            >
              <Share2 className="w-5 h-5" />
            </button>

            {/* Download Button */}
            <button
              onClick={() => {
                const dataStr = JSON.stringify(slides, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'h5-article.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="p-3 bg-slate-800 text-slate-300 rounded-full shadow-lg hover:bg-slate-700 transition-colors"
              title="下载 JSON"
            >
              <Save className="w-5 h-5" />
            </button>
          </div>
        )}

      </div>

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-500" />
                发布成功
              </h3>
              <button
                onClick={() => setShowPublishModal(false)}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Article Title */}
            <div className="mb-4">
              <h4 className="font-medium text-slate-800 truncate">{articleTitle || '未命名文章'}</h4>
            </div>

            {/* URL Display */}
            <div className="bg-slate-50 rounded-xl p-3 mb-4 break-all">
              <code className="text-sm text-slate-700">{publishedUrl}</code>
            </div>

            {/* Social Share Buttons */}
            <div className="mb-4">
              <p className="text-sm text-slate-500 mb-3">分享到社交平台：</p>
              <div className="flex gap-3 justify-center">
                {/* WeChat */}
                <button
                  onClick={shareToWeChat}
                  className="w-12 h-12 bg-green-500 text-white rounded-xl flex items-center justify-center hover:bg-green-600 transition-colors shadow-md"
                  title="微信"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z" />
                  </svg>
                </button>

                {/* Weibo */}
                <button
                  onClick={() => shareToWeibo(publishedUrl, articleTitle)}
                  className="w-12 h-12 bg-red-500 text-white rounded-xl flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                  title="微博"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.739 5.443zM9.05 17.219c-.384.616-1.208.884-1.829.602-.612-.279-.793-.991-.406-1.593.379-.595 1.176-.861 1.793-.601.622.263.82.972.442 1.592zm1.27-1.627c-.141.237-.449.353-.689.253-.236-.09-.313-.361-.177-.586.138-.227.436-.346.672-.24.239.09.315.36.18.573h.014zm.176-2.719c-1.893-.493-4.033.45-4.857 2.118-.836 1.704-.026 3.591 1.886 4.21 1.983.64 4.318-.341 5.132-2.179.8-1.793-.201-3.642-2.161-4.149zm7.563-1.224c-.346-.105-.579-.18-.405-.649.381-1.03.422-1.92.001-2.555-.789-1.187-2.945-1.121-5.391-.034 0 0-.772.332-.574-.271.381-1.2.324-2.203-.27-2.784-1.35-1.319-4.932.049-8.005 3.058C1.149 10.653 0 12.956 0 14.926c0 3.78 4.841 6.08 9.578 6.08 6.202 0 10.328-3.603 10.328-6.463 0-1.728-1.456-2.706-2.749-3.116-.019-.002-.038-.015-.072-.028zm3.109-2.82c-.674-.73-1.666-1.024-2.59-.943l.01.001c-.254.026-.444.253-.42.508.025.253.25.444.504.42h.001c.617-.055 1.282.141 1.735.598.455.458.659 1.107.615 1.737-.024.253.163.48.417.508.25.026.48-.161.506-.413.068-.924-.234-1.887-.778-2.416zm.965-2.166c-1.139-1.237-2.812-1.736-4.375-1.598-.256.022-.447.247-.427.504.023.253.248.448.503.427 1.262-.11 2.607.293 3.523 1.287.918.995 1.257 2.349 1.064 3.601-.038.254.135.491.387.533.252.038.49-.134.531-.387.24-1.561-.175-3.132-1.206-4.367z" />
                  </svg>
                </button>

                {/* Twitter/X */}
                <button
                  onClick={() => shareToTwitter(publishedUrl, articleTitle)}
                  className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center hover:bg-gray-800 transition-colors shadow-md"
                  title="Twitter/X"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </button>

                {/* Facebook */}
                <button
                  onClick={() => shareToFacebook(publishedUrl)}
                  className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors shadow-md"
                  title="Facebook"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => copyToClipboard(publishedUrl)}
                className="flex-1 bg-emerald-500 text-white font-medium py-2 px-4 rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                复制链接
              </button>
              <button
                onClick={() => window.open(publishedUrl, '_blank')}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
              >
                预览
              </button>
              <button
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-3 border-b border-slate-100 flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700">{previewTemplate.templateName}</span>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Layout Preview - Phone mockup */}
            <div className="p-4 bg-slate-100">
              <div
                className="w-full aspect-[9/16] rounded-xl overflow-hidden shadow-lg"
                style={{ backgroundColor: previewTemplate.styleAnalysis?.secondaryColor || '#f8fafc' }}
              >
                {/* Cover Section */}
                <div
                  className="h-1/3 p-3 flex flex-col justify-end"
                  style={{ backgroundColor: previewTemplate.styleAnalysis?.primaryColor || '#1e40af' }}
                >
                  <div className="w-2/3 h-2 bg-white/80 rounded mb-1" />
                  <div className="w-1/2 h-1.5 bg-white/50 rounded" />
                </div>

                {/* Content Section */}
                <div className="p-3 space-y-2">
                  {/* Image placeholder */}
                  <div
                    className="w-full h-12 rounded flex items-center justify-center"
                    style={{ backgroundColor: previewTemplate.styleAnalysis?.primaryColor + '20' || '#1e40af20' }}
                  >
                    <ImageIcon className="w-4 h-4" style={{ color: previewTemplate.styleAnalysis?.primaryColor || '#1e40af' }} />
                  </div>

                  {/* Text lines */}
                  <div className="space-y-1">
                    <div
                      className="w-full h-1.5 rounded"
                      style={{ backgroundColor: previewTemplate.styleAnalysis?.primaryColor + '40' || '#1e40af40' }}
                    />
                    <div
                      className="w-4/5 h-1.5 rounded"
                      style={{ backgroundColor: previewTemplate.styleAnalysis?.primaryColor + '30' || '#1e40af30' }}
                    />
                    <div
                      className="w-3/5 h-1.5 rounded"
                      style={{ backgroundColor: previewTemplate.styleAnalysis?.primaryColor + '20' || '#1e40af20' }}
                    />
                  </div>

                  {/* Another image */}
                  <div
                    className="w-full h-10 rounded flex items-center justify-center"
                    style={{ backgroundColor: previewTemplate.styleAnalysis?.accentColor + '20' || '#f59e0b20' }}
                  >
                    <ImageIcon className="w-3 h-3" style={{ color: previewTemplate.styleAnalysis?.accentColor || '#f59e0b' }} />
                  </div>

                  {/* More text */}
                  <div className="space-y-1">
                    <div
                      className="w-full h-1.5 rounded"
                      style={{ backgroundColor: previewTemplate.styleAnalysis?.primaryColor + '30' || '#1e40af30' }}
                    />
                    <div
                      className="w-2/3 h-1.5 rounded"
                      style={{ backgroundColor: previewTemplate.styleAnalysis?.primaryColor + '20' || '#1e40af20' }}
                    />
                  </div>

                  {/* CTA Button */}
                  <div
                    className="w-full h-6 rounded"
                    style={{ backgroundColor: previewTemplate.styleAnalysis?.accentColor || '#f59e0b' }}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-3 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => {
                  setActiveTemplate(previewTemplate);
                  setPreviewTemplate(null);
                  setActiveTab('chat');
                  setMessages(prev => [...prev, { role: 'system', content: `已选择模板 "${previewTemplate.templateName}"` }]);
                }}
                className="flex-1 py-2 px-3 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
              >
                使用模板
              </button>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="py-2 px-3 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-500" />
                登录
              </h3>
              <button
                onClick={() => {
                  setShowLogin(false);
                  setLoginEmail('');
                  setLoginOtp('');
                  setOtpSent(false);
                  setLoginError('');
                }}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {!otpSent ? (
              <>
                <p className="text-slate-600 mb-4">请输入您的邮箱地址，我们将发送验证码：</p>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors mb-4"
                  onKeyDown={(e) => e.key === 'Enter' && sendOtp()}
                />
                {loginError && <p className="text-red-500 text-sm mb-4">{loginError}</p>}
                <button
                  onClick={sendOtp}
                  className="w-full bg-emerald-500 text-white font-medium py-3 px-4 rounded-xl hover:bg-emerald-600 transition-colors"
                >
                  发送验证码
                </button>
              </>
            ) : (
              <>
                <p className="text-slate-600 mb-4">验证码已发送至 <strong>{loginEmail}</strong></p>
                <input
                  type="text"
                  value={loginOtp}
                  onChange={(e) => setLoginOtp(e.target.value)}
                  placeholder="输入6位验证码"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors mb-4 text-center text-lg tracking-widest"
                  maxLength={6}
                  onKeyDown={(e) => e.key === 'Enter' && verifyOtp()}
                />
                {loginError && <p className="text-red-500 text-sm mb-4">{loginError}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setOtpSent(false);
                      setLoginOtp('');
                      setLoginError('');
                    }}
                    className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    返回
                  </button>
                  <button
                    onClick={verifyOtp}
                    className="flex-1 bg-emerald-500 text-white font-medium py-3 px-4 rounded-xl hover:bg-emerald-600 transition-colors"
                  >
                    验证登录
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* CSS Globals for component-specific styling */}
      <style>{`
  .scrollbar-hide::-webkit-scrollbar {
      display: none;
  }
  .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
  }
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #334155;
    border-radius: 3px;
  }
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in-up {
    animation: fade-in-up 0.8s ease-out forwards;
  }
`}</style>
    </div >
  );
}
