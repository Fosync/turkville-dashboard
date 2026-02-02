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

  const {
    backgroundUrl,
    title,
    mode = 'visual',
    bgColor = '#dc2626',
    format = 'png',
    quality = 'high',
    scale = 1,
    data = {},
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
  const finalCategory = data.category || category

  if (!finalBackground && finalMode === 'visual') {
    return res.status(400).json({ error: 'backgroundUrl is required for visual mode' })
  }

  console.log('=== RENDER TEMPLATE START ===')
  console.log('Mode:', finalMode)
  console.log('Category:', finalCategory)
  console.log('Title:', finalTitle)

  try {
    // Arka plan görselini base64'e çevir
    let backgroundBase64 = ''

    if (finalMode === 'visual' && finalBackground) {
      if (finalBackground.startsWith('data:')) {
        backgroundBase64 = finalBackground
      } else if (!finalBackground.startsWith('#')) {
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
          backgroundBase64 = `data:${contentType};base64,${buffer.toString('base64')}`
        } catch (fetchError) {
          console.error('Fetch error:', fetchError.message)
        }
      }
    }

    // Asset dosyalarını yükle
    const publicDir = path.join(process.cwd(), 'public')

    // Badge - Supabase'den kategori badge_path al
    let badgePath = path.join(publicDir, 'images', 'turkvillelogo.png')
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
      const { data: categoryData } = await supabase
        .from('categories')
        .select('badge_path')
        .eq('key', finalCategory)
        .single()

      if (categoryData?.badge_path) {
        const relativePath = categoryData.badge_path.replace(/^\//, '')
        const dbBadgePath = path.join(publicDir, '..', relativePath)
        if (fs.existsSync(dbBadgePath)) {
          badgePath = dbBadgePath
        }
      }
    } catch (dbError) {
      console.log('Category DB lookup failed:', dbError.message)
    }

    const badgeBase64 = fs.existsSync(badgePath)
      ? `data:image/png;base64,${fs.readFileSync(badgePath).toString('base64')}`
      : ''

    // Banner
    const bannerPath = path.join(publicDir, 'images', 'banner.png')
    const bannerBase64 = fs.existsSync(bannerPath)
      ? `data:image/png;base64,${fs.readFileSync(bannerPath).toString('base64')}`
      : ''

    // Font - lokal Montserrat veya CDN Gilroy
    const fontPath = path.join(publicDir, 'fonts', 'Montserrat-ExtraBold.ttf')
    const hasLocalFont = fs.existsSync(fontPath)
    const localFontBase64 = hasLocalFont
      ? `data:font/ttf;base64,${fs.readFileSync(fontPath).toString('base64')}`
      : ''

    console.log('Assets - Badge:', !!badgeBase64, 'Banner:', !!bannerBase64, 'LocalFont:', hasLocalFont)

    // ============================================================
    // FIGMA ÖLÇÜLERI İLE HTML TEMPLATE
    // Frame: 1080 x 1350 px
    // ============================================================
    const html = finalMode === 'visual' ? `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    ${hasLocalFont ? `
    @font-face {
      font-family: 'Gilroy';
      src: url('${localFontBase64}') format('truetype');
      font-weight: 800;
      font-style: normal;
    }
    ` : `
    @font-face {
      font-family: 'Gilroy';
      src: url('https://fonts.cdnfonts.com/s/16219/Gilroy-ExtraBold.woff') format('woff');
      font-weight: 800;
    }
    `}
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@800&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 1080px;
      height: 1350px;
      font-family: 'Gilroy', 'Montserrat', sans-serif;
      overflow: hidden;
    }

    .container {
      width: 1080px;
      height: 1350px;
      position: relative;
      background: #000;
    }

    /* 1. ARKA PLAN - Tam ekran */
    .background {
      position: absolute;
      top: 0;
      left: 0;
      width: 1080px;
      height: 1350px;
      object-fit: cover;
      z-index: 1;
    }

    /* 2. GRADIENT OVERLAY - Alttan yukarı (Figma: y:600 - y:1350) */
    .gradient-overlay {
      position: absolute;
      top: 600px;
      left: 0;
      width: 1080px;
      height: 750px;
      z-index: 2;
      background: linear-gradient(to top,
        rgba(0, 0, 0, 0.95) 0%,
        rgba(0, 0, 0, 0.6) 70%,
        rgba(0, 0, 0, 0) 100%
      );
    }

    /* 3. BADGE - Figma: X:61, Y:120, W:181, H:92 */
    .badge {
      position: absolute;
      top: 120px;
      left: 61px;
      width: 181px;
      height: 92px;
      z-index: 10;
      object-fit: contain;
    }

    /* 4. MANŞET ALANI - Figma: X:50, Y:771, W:992, max-H:335 */
    .title-container {
      position: absolute;
      top: 771px;
      left: 50px;
      width: 992px;
      max-height: 335px;
      z-index: 11;
      overflow: hidden;
    }

    /* 5. MANŞET YAZISI - Figma: 64px, #FFFFEB, uppercase, shadow */
    .title {
      font-family: 'Gilroy', 'Montserrat', sans-serif;
      font-size: 64px;
      font-weight: 800;
      color: #FFFFEB;
      text-transform: uppercase;
      line-height: 1.2; /* 120% = 76.8px */
      letter-spacing: 3.2px; /* 5% of 64px */
      word-wrap: break-word;
      overflow-wrap: break-word;
      /* Drop shadow */
      text-shadow: 2px 2px 10px rgba(0, 0, 0, 0.5);
    }

    /* 6. BANNER - Figma: X:50, Y:1243, W:980, H:107 */
    .banner {
      position: absolute;
      top: 1243px;
      left: 50px;
      width: 980px;
      height: 107px;
      z-index: 12;
      object-fit: contain;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Z-ORDER: 1. Background -->
    <img src="${backgroundBase64}" class="background" onerror="this.style.display='none'">

    <!-- Z-ORDER: 2. Gradient -->
    <div class="gradient-overlay"></div>

    <!-- Z-ORDER: 3. Badge (Etiket) -->
    ${badgeBase64 ? `<img src="${badgeBase64}" class="badge">` : ''}

    <!-- Z-ORDER: 4. Title (Manşet) -->
    <div class="title-container">
      <h1 class="title">${escapeHtml(finalTitle)}</h1>
    </div>

    <!-- Z-ORDER: 5. Banner -->
    ${bannerBase64 ? `<img src="${bannerBase64}" class="banner">` : ''}
  </div>
</body>
</html>
` : `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    ${hasLocalFont ? `
    @font-face {
      font-family: 'Gilroy';
      src: url('${localFontBase64}') format('truetype');
      font-weight: 800;
      font-style: normal;
    }
    ` : `
    @font-face {
      font-family: 'Gilroy';
      src: url('https://fonts.cdnfonts.com/s/16219/Gilroy-ExtraBold.woff') format('woff');
      font-weight: 800;
    }
    `}
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@800&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 1080px;
      height: 1350px;
      font-family: 'Gilroy', 'Montserrat', sans-serif;
      overflow: hidden;
    }

    .container {
      width: 1080px;
      height: 1350px;
      position: relative;
      background: ${finalBgColor};
    }

    /* BADGE - Figma: X:61, Y:120, W:181, H:92 */
    .badge {
      position: absolute;
      top: 120px;
      left: 61px;
      width: 181px;
      height: 92px;
      z-index: 10;
      object-fit: contain;
    }

    /* İÇERİK ALANI - Text mode için genişletilmiş */
    .content-container {
      position: absolute;
      top: 250px;
      left: 50px;
      width: 992px;
      max-height: 880px;
      z-index: 11;
      overflow: hidden;
    }

    .content {
      font-family: 'Gilroy', 'Montserrat', sans-serif;
      font-size: 56px;
      font-weight: 800;
      color: #FFFFEB;
      text-transform: uppercase;
      line-height: 1.25;
      letter-spacing: 2px;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    /* BANNER - Figma: X:50, Y:1243, W:980, H:107 */
    .banner {
      position: absolute;
      top: 1243px;
      left: 50px;
      width: 980px;
      height: 107px;
      z-index: 12;
      object-fit: contain;
    }
  </style>
</head>
<body>
  <div class="container">
    ${badgeBase64 ? `<img src="${badgeBase64}" class="badge">` : ''}
    <div class="content-container">
      <div class="content">${escapeHtml(finalTitle)}</div>
    </div>
    ${bannerBase64 ? `<img src="${bannerBase64}" class="banner">` : ''}
  </div>
</body>
</html>
`

    console.log('Launching Puppeteer...')
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

    await page.setContent(html, {
      waitUntil: ['load', 'networkidle0'],
      timeout: 30000
    })

    // Font yüklenmesi için bekle
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Auto-resize: Uzun başlıklar için font küçült
    await page.evaluate(() => {
      const title = document.querySelector('.title, .content')
      if (title) {
        const container = title.parentElement
        const maxHeight = container?.clientHeight || 335
        let fontSize = parseInt(getComputedStyle(title).fontSize)
        const minFontSize = 40

        while (title.scrollHeight > maxHeight && fontSize > minFontSize) {
          fontSize -= 2
          title.style.fontSize = fontSize + 'px'
        }
      }
    })

    const screenshotOptions = {
      encoding: 'base64',
      clip: { x: 0, y: 0, width: 1080 * finalScale, height: 1350 * finalScale }
    }

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
    console.log('Output:', 1080 * finalScale, 'x', 1350 * finalScale, format)

    return res.status(200).json({
      success: true,
      base64: screenshot,
      mimeType,
      format,
      mode: finalMode,
      category: finalCategory,
      width: 1080 * finalScale,
      height: 1350 * finalScale
    })

  } catch (error) {
    console.error('=== RENDER ERROR ===', error)
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
