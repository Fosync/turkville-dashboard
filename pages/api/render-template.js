import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // n8n entegrasyonu için esnek veri yapısı
  const {
    backgroundUrl,
    title,
    mode = 'visual',
    bgColor = '#dc2626',
    // Export options
    format = 'png',
    quality = 'high',
    scale = 1,
    // n8n data binding
    data = {},
    // Opsiyonel element override
    elements = null,
    // Gradient options
    gradientStart = 'rgba(0,0,0,0.9)',
    gradientEnd = 'rgba(0,0,0,0)',
    gradientDirection = 'to top',
    gradientOpacity = 85,
    // Category for badge
    category = 'DIGER'
  } = req.body

  // Quality settings
  const qualitySettings = {
    low: { deviceScaleFactor: 1, jpegQuality: 60 },
    medium: { deviceScaleFactor: 1, jpegQuality: 80 },
    high: { deviceScaleFactor: 1, jpegQuality: 95 }
  }
  const { deviceScaleFactor, jpegQuality } = qualitySettings[quality] || qualitySettings.high
  const finalScale = Math.min(Math.max(scale, 1), 3)

  // Backward compatibility
  const finalTitle = data.title || title || ''
  const finalBackground = data.backgroundUrl || backgroundUrl
  const finalMode = data.mode || mode
  const finalBgColor = data.bgColor || bgColor

  if (!finalBackground && finalMode === 'visual') {
    return res.status(400).json({ error: 'backgroundUrl is required for visual mode' })
  }

  console.log('=== RENDER TEMPLATE START ===')
  console.log('Mode:', finalMode)
  console.log('Background:', finalBackground?.substring(0, 100))
  console.log('Title:', finalTitle)
  console.log('Data:', JSON.stringify(data))

  try {
    // Arka plan görselini base64'e çevir (visual mode)
    let backgroundBase64 = ''

    if (finalMode === 'visual' && finalBackground) {
      if (finalBackground.startsWith('data:')) {
        console.log('Background is already base64')
        backgroundBase64 = finalBackground
      } else if (finalBackground.startsWith('#')) {
        // Renk kodu - solid color
        backgroundBase64 = ''
      } else {
        console.log('Fetching background from URL...')
        try {
          const https = await import('https')
          const http = await import('http')

          const fetchImage = (url, maxRedirects = 5) => {
            return new Promise((resolve, reject) => {
              if (maxRedirects <= 0) return reject(new Error('Too many redirects'))
              const protocol = url.startsWith('https') ? https : http
              protocol.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
              }, (response) => {
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                  console.log('Redirecting to:', response.headers.location)
                  let redirectUrl = response.headers.location
                  if (!redirectUrl.startsWith('http')) {
                    const urlObj = new URL(url)
                    redirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`
                  }
                  fetchImage(redirectUrl, maxRedirects - 1).then(resolve).catch(reject)
                  return
                }

                const chunks = []
                response.on('data', chunk => chunks.push(chunk))
                response.on('end', () => {
                  const buffer = Buffer.concat(chunks)
                  const contentType = response.headers['content-type'] || 'image/jpeg'
                  resolve({ buffer, contentType })
                })
                response.on('error', reject)
              }).on('error', reject)
            })
          }

          const { buffer, contentType } = await fetchImage(finalBackground)
          const base64 = buffer.toString('base64')
          backgroundBase64 = `data:${contentType};base64,${base64}`
          console.log('Background fetched successfully! Size:', base64.length)
        } catch (fetchError) {
          console.error('Fetch error:', fetchError.message)
          backgroundBase64 = ''
        }
      }
    }

    // Local asset dosyalarını base64'e çevir
    const publicDir = path.join(process.cwd(), 'public')

    const gradientPath = path.join(publicDir, 'images', 'backgroundlinear.png')
    const gradientBase64 = fs.existsSync(gradientPath)
      ? `data:image/png;base64,${fs.readFileSync(gradientPath).toString('base64')}`
      : ''

    // Kategoriye göre badge dosyasını DB'den al
    const finalCategory = data.category || category
    let badgePath = path.join(publicDir, 'images', 'turkvillelogo.png') // fallback

    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
      const { data: categoryData } = await supabase
        .from('categories')
        .select('badge_path')
        .eq('key', finalCategory)
        .single()

      if (categoryData?.badge_path) {
        // badge_path: /images/xxx.png -> public/images/xxx.png
        const relativePath = categoryData.badge_path.replace(/^\//, '')
        badgePath = path.join(publicDir, '..', relativePath)
      }
    } catch (dbError) {
      console.log('Category DB lookup failed, using fallback:', dbError.message)
    }

    const badgeBase64 = fs.existsSync(badgePath)
      ? `data:image/png;base64,${fs.readFileSync(badgePath).toString('base64')}`
      : ''

    const bannerPath = path.join(publicDir, 'images', 'banner.png')
    const bannerBase64 = fs.existsSync(bannerPath)
      ? `data:image/png;base64,${fs.readFileSync(bannerPath).toString('base64')}`
      : ''

    console.log('Assets loaded - Gradient:', !!gradientBase64, 'Badge:', !!badgeBase64, 'Banner:', !!bannerBase64)

    // Font: Gilroy CDN
    const fontCSS = `
      @font-face {
        font-family: 'Gilroy';
        src: url('https://fonts.cdnfonts.com/s/16219/Gilroy-Regular.woff') format('woff');
        font-weight: 400;
      }
      @font-face {
        font-family: 'Gilroy';
        src: url('https://fonts.cdnfonts.com/s/16219/Gilroy-Bold.woff') format('woff');
        font-weight: 700;
      }
      @font-face {
        font-family: 'Gilroy';
        src: url('https://fonts.cdnfonts.com/s/16219/Gilroy-ExtraBold.woff') format('woff');
        font-weight: 800;
      }
    `

    // Auto-resize için JavaScript
    const autoResizeScript = `
      <script>
        function autoResizeText(element, minFontSize = 28, maxLines = 4) {
          const container = element.parentElement;
          const maxHeight = container.clientHeight;
          let fontSize = parseInt(getComputedStyle(element).fontSize);

          while (element.scrollHeight > maxHeight && fontSize > minFontSize) {
            fontSize -= 2;
            element.style.fontSize = fontSize + 'px';
          }

          // Clamp to max lines
          const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
          const maxTextHeight = lineHeight * maxLines;
          if (element.scrollHeight > maxTextHeight) {
            element.style.overflow = 'hidden';
            element.style.display = '-webkit-box';
            element.style.webkitLineClamp = maxLines.toString();
            element.style.webkitBoxOrient = 'vertical';
          }
        }

        document.addEventListener('DOMContentLoaded', () => {
          const title = document.querySelector('.title');
          if (title) autoResizeText(title, 32, 4);
        });
      </script>
    `

    // HTML Template
    const html = finalMode === 'visual' ? `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    ${fontCSS}
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 1080px; height: 1350px; font-family: 'Gilroy', 'Inter', sans-serif; overflow: hidden; }

    .container { width: 1080px; height: 1350px; position: relative; background: #000; }

    .background {
      position: absolute; top: 0; left: 0; width: 1080px; height: 1350px;
      object-fit: cover; z-index: 1;
    }

    .gradient-overlay {
      position: absolute; top: 0; left: 0; width: 1080px; height: 1350px;
      z-index: 2; opacity: ${gradientOpacity / 100};
      background: linear-gradient(${gradientDirection}, ${gradientStart}, ${gradientEnd});
    }

    .event-badge {
      position: absolute; top: 30px; left: 30px; width: 180px; height: auto;
      z-index: 10; background: transparent !important;
    }

    .title-container {
      position: absolute; bottom: 120px; left: 30px; right: 30px;
      max-height: 200px; z-index: 11;
    }

    .title {
      font-size: 52px; font-weight: 800; color: #FFFFFF;
      text-transform: uppercase; text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.9);
      line-height: 1.15; word-wrap: break-word;
    }

    .banner {
      position: absolute; bottom: 0; left: 0; right: 0;
      width: 100%; height: 100px; z-index: 12;
      background: transparent !important; object-fit: contain;
    }
  </style>
  ${autoResizeScript}
</head>
<body>
  <div class="container">
    <img src="${backgroundBase64}" class="background" onerror="this.style.display='none'">
    <div class="gradient-overlay"></div>
    <img src="${badgeBase64}" class="event-badge">
    <div class="title-container">
      <h1 class="title">${escapeHtml(finalTitle)}</h1>
    </div>
    <img src="${bannerBase64}" class="banner">
  </div>
</body>
</html>
` : `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    ${fontCSS}
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 1080px; height: 1350px; font-family: 'Gilroy', 'Inter', sans-serif; overflow: hidden; }

    .container { width: 1080px; height: 1350px; position: relative; background: ${finalBgColor}; }

    .event-badge {
      position: absolute; top: 30px; left: 30px; width: 180px; height: auto;
      z-index: 10; background: transparent !important;
    }

    .content-container {
      position: absolute; top: 150px; left: 30px; right: 30px;
      bottom: 120px; z-index: 11;
    }

    .content {
      font-size: 48px; font-weight: 700; color: #FFFFFF;
      text-transform: uppercase; line-height: 1.3; word-wrap: break-word;
    }

    .banner {
      position: absolute; bottom: 0; left: 0; right: 0;
      width: 100%; height: 100px; z-index: 12;
      background: transparent !important; object-fit: contain;
    }
  </style>
  ${autoResizeScript}
</head>
<body>
  <div class="container">
    <img src="${badgeBase64}" class="event-badge">
    <div class="content-container">
      <div class="content title">${escapeHtml(finalTitle)}</div>
    </div>
    <img src="${bannerBase64}" class="banner">
  </div>
</body>
</html>
`

    console.log('Launching Puppeteer...')
    console.log('Export settings - Format:', format, 'Quality:', quality, 'Scale:', finalScale)

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--allow-file-access-from-files']
    })

    const page = await browser.newPage()
    await page.setViewport({
      width: 1080,
      height: 1350,
      deviceScaleFactor: finalScale * deviceScaleFactor
    })

    console.log('Setting content...')
    await page.setContent(html, {
      waitUntil: ['load', 'networkidle0'],
      timeout: 30000
    })

    // Font ve auto-resize için bekle
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Auto-resize script'i çalıştır
    await page.evaluate(() => {
      const title = document.querySelector('.title')
      if (title) {
        const container = title.parentElement
        const maxHeight = container?.clientHeight || 300
        let fontSize = parseInt(getComputedStyle(title).fontSize)
        const minFontSize = 32

        while (title.scrollHeight > maxHeight && fontSize > minFontSize) {
          fontSize -= 2
          title.style.fontSize = fontSize + 'px'
        }
      }
    })

    console.log('Taking screenshot...')
    const screenshotOptions = {
      encoding: 'base64',
      clip: { x: 0, y: 0, width: 1080 * finalScale, height: 1350 * finalScale }
    }

    // Format ve kalite ayarları
    if (format === 'jpg' || format === 'jpeg') {
      screenshotOptions.type = 'jpeg'
      screenshotOptions.quality = jpegQuality
    } else if (format === 'webp') {
      screenshotOptions.type = 'webp'
      screenshotOptions.quality = jpegQuality
    } else {
      screenshotOptions.type = 'png'
    }

    const screenshot = await page.screenshot(screenshotOptions)

    await browser.close()

    const mimeTypes = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }
    const mimeType = mimeTypes[format] || 'image/png'

    console.log('=== RENDER SUCCESS ===')
    console.log('Format:', format, 'Size:', 1080 * finalScale, 'x', 1350 * finalScale)

    return res.status(200).json({
      success: true,
      base64: screenshot,
      mimeType,
      format,
      mode: finalMode,
      width: 1080 * finalScale,
      height: 1350 * finalScale
    })

  } catch (error) {
    console.error('=== RENDER ERROR ===')
    console.error(error)
    return res.status(500).json({ error: error.message })
  }
}

function escapeHtml(text) {
  if (!text) return ''
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
}
