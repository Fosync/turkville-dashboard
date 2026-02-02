import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ============================================================
// KATEGORİ BADGE DOSYALARI (21 kategori)
// ============================================================
const CATEGORY_BADGE_FILES = {
  'GOCMENLIK': 'Turkville_gocmenlik.png',
  'EKONOMI': 'Turkville_ekonomi.png',
  'GUNDEM': 'Turkville_gundem.png',
  'ETKINLIK': 'Turkville_etkinlik.png',
  'GUVENLIK': 'Turkville_siyaset.png', // fallback
  'HAVA': 'Turkville_haber.png', // fallback
  'KARIYER': 'Turkville_kariyer.png',
  'DIGER': 'Turkville_haber.png',
  'ALISVERIS': 'Turkville_alisveris.png',
  'EMLAK': 'Turkville_emlak.png',
  'HABER': 'Turkville_haber.png',
  'HAP_BILGI': 'Turkville_hap_bilgi.png',
  'MAGAZIN': 'Turkville_magazin.png',
  'SEYAHAT': 'Turkville_seyahat.png',
  'SIYASET': 'Turkville_siyaset.png',
  'TEKNOLOJI': 'Turkville_teknoloji.png',
  'CEKILIS': 'Turkville_cekilis.png',
  'EGITIM': 'Turkville_egitim.png',
  'SAGLIK': 'Turkville_saglik.png',
  'YASAM': 'Turkville_yasam.png',
  'SPOR': 'Turkville_spor.png',
  // Eski kategori isimleri için fallback
  'IS_ILANI': 'Turkville_kariyer.png',
  'DENEY': 'Turkville_teknoloji.png'
}

function getBadgeFile(category) {
  return CATEGORY_BADGE_FILES[category] || 'turkvillelogo.png'
}

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

  // Final values (backward compatibility)
  const finalTitle = data.title || title || ''
  const finalBackground = data.backgroundUrl || backgroundUrl
  const finalMode = data.mode || mode
  const finalBgColor = data.bgColor || bgColor
  const finalCategory = data.category || category

  if (!finalBackground && finalMode === 'visual') {
    return res.status(400).json({ error: 'backgroundUrl is required for visual mode' })
  }

  console.log('=== RENDER TEMPLATE START ===')
  console.log('Mode:', finalMode, 'Category:', finalCategory)
  console.log('Title:', finalTitle?.substring(0, 50))

  try {
    const publicDir = path.join(process.cwd(), 'public')

    // ============================================================
    // 1. ARKA PLAN GÖRSELİ
    // ============================================================
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
                headers: { 'User-Agent': 'Mozilla/5.0' }
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
        } catch (e) {
          console.error('Background fetch error:', e.message)
        }
      }
    }

    // ============================================================
    // 2. BADGE - Kategoriye göre seç
    // ============================================================
    // Önce Supabase'den dene, yoksa hardcoded mapping kullan
    let badgeFile = getBadgeFile(finalCategory)
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
      const { data: catData } = await supabase
        .from('categories')
        .select('badge_path')
        .eq('key', finalCategory)
        .single()
      if (catData?.badge_path) {
        // /images/xxx.png -> xxx.png
        badgeFile = catData.badge_path.replace('/images/', '')
      }
    } catch (e) {
      // DB'den alamadık, hardcoded kullan
    }

    const badgePath = path.join(publicDir, 'images', badgeFile)
    const badgeBase64 = fs.existsSync(badgePath)
      ? `data:image/png;base64,${fs.readFileSync(badgePath).toString('base64')}`
      : ''
    console.log('Badge:', badgeFile, 'exists:', !!badgeBase64)

    // ============================================================
    // 3. GRADIENT OVERLAY - backgroundlinear.png
    // ============================================================
    const gradientPath = path.join(publicDir, 'images', 'backgroundlinear.png')
    const gradientBase64 = fs.existsSync(gradientPath)
      ? `data:image/png;base64,${fs.readFileSync(gradientPath).toString('base64')}`
      : ''

    // ============================================================
    // 4. BANNER
    // ============================================================
    const bannerPath = path.join(publicDir, 'images', 'banner.png')
    const bannerBase64 = fs.existsSync(bannerPath)
      ? `data:image/png;base64,${fs.readFileSync(bannerPath).toString('base64')}`
      : ''

    // ============================================================
    // 5. FONT - Lokal Montserrat veya CDN
    // ============================================================
    const fontPath = path.join(publicDir, 'fonts', 'Montserrat-ExtraBold.ttf')
    const hasLocalFont = fs.existsSync(fontPath)
    const localFontBase64 = hasLocalFont
      ? `data:font/ttf;base64,${fs.readFileSync(fontPath).toString('base64')}`
      : ''

    console.log('Assets - Badge:', !!badgeBase64, 'Gradient:', !!gradientBase64, 'Banner:', !!bannerBase64, 'Font:', hasLocalFont)

    // ============================================================
    // HTML TEMPLATE - FİGMA ÖLÇÜLERI
    // Frame: 1080 x 1350 px
    // ============================================================
    const html = finalMode === 'visual' ? `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    /* FONT TANIMLARI */
    ${hasLocalFont ? `
    @font-face {
      font-family: 'Headline';
      src: url('${localFontBase64}') format('truetype');
      font-weight: 800;
      font-style: normal;
    }
    ` : `
    @font-face {
      font-family: 'Headline';
      src: url('https://fonts.cdnfonts.com/s/16219/Gilroy-ExtraBold.woff') format('woff');
      font-weight: 800;
    }
    `}
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@800&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    html, body {
      width: 1080px;
      height: 1350px;
      overflow: hidden;
    }

    .container {
      width: 1080px;
      height: 1350px;
      position: relative;
      background: #000;
    }

    /* ============================================================
       Z-ORDER 1: ARKA PLAN - Tam ekran 1080x1350
       ============================================================ */
    .background {
      position: absolute;
      top: 0;
      left: 0;
      width: 1080px;
      height: 1350px;
      object-fit: cover;
      z-index: 1;
    }

    /* ============================================================
       Z-ORDER 2: GRADIENT OVERLAY - backgroundlinear.png
       Alttan yukarı, kırmızımsı-siyah gradient
       Y: 500'den başlayıp 1350'ye kadar (850px yükseklik)
       ============================================================ */
    .gradient-png {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 1080px;
      height: 850px;
      object-fit: cover;
      z-index: 2;
    }

    /* Fallback: Programatik gradient (PNG yoksa) */
    .gradient-fallback {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 1080px;
      height: 850px;
      z-index: 2;
      background: linear-gradient(to top,
        rgba(0, 0, 0, 0.95) 0%,
        rgba(40, 0, 0, 0.7) 40%,
        rgba(0, 0, 0, 0.3) 70%,
        rgba(0, 0, 0, 0) 100%
      );
    }

    /* ============================================================
       Z-ORDER 3: BADGE (ETİKET)
       Figma: X=61, Y=120, W=181, H=92
       ============================================================ */
    .badge {
      position: absolute;
      top: 120px;
      left: 61px;
      width: 181px;
      height: 92px;
      z-index: 10;
      object-fit: contain;
    }

    /* ============================================================
       Z-ORDER 4: MANŞET YAZISI
       Figma: X=50, W=980 (1080-50-50), font 64px
       Y pozisyonu: Banner'ın 45px üstünde bitecek şekilde
       Banner Y=1243, yazı bitiş Y = 1243-45 = 1198
       ============================================================ */
    .title-container {
      position: absolute;
      left: 50px;
      right: 50px;
      bottom: 152px; /* 107 (banner) + 45 (margin) = 152 */
      max-height: 400px;
      z-index: 11;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }

    .title {
      font-family: 'Headline', 'Montserrat', 'Arial Black', sans-serif;
      font-size: 64px;
      font-weight: 800;
      color: #FFFFEB;
      text-transform: uppercase;
      line-height: 1.2; /* 120% = 76.8px */
      letter-spacing: 3.2px; /* 5% of 64px */
      word-wrap: break-word;
      overflow-wrap: break-word;
      /* Drop shadow */
      text-shadow: 3px 3px 12px rgba(0, 0, 0, 0.6);
    }

    /* ============================================================
       Z-ORDER 5: BANNER
       Figma: X=50, Y=1243, W=980, H=107
       (1350 - 107 = 1243)
       ============================================================ */
    .banner {
      position: absolute;
      bottom: 0;
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
    <!-- 1. Arka Plan -->
    <img src="${backgroundBase64}" class="background" onerror="this.style.display='none'">

    <!-- 2. Gradient Overlay -->
    ${gradientBase64
      ? `<img src="${gradientBase64}" class="gradient-png">`
      : `<div class="gradient-fallback"></div>`
    }

    <!-- 3. Badge (Kategori Etiketi) -->
    ${badgeBase64 ? `<img src="${badgeBase64}" class="badge">` : ''}

    <!-- 4. Manşet Yazısı -->
    <div class="title-container">
      <h1 class="title">${escapeHtml(finalTitle)}</h1>
    </div>

    <!-- 5. Banner -->
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
      font-family: 'Headline';
      src: url('${localFontBase64}') format('truetype');
      font-weight: 800;
    }
    ` : `
    @font-face {
      font-family: 'Headline';
      src: url('https://fonts.cdnfonts.com/s/16219/Gilroy-ExtraBold.woff') format('woff');
      font-weight: 800;
    }
    `}
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@800&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 1080px; height: 1350px; overflow: hidden; }

    .container {
      width: 1080px;
      height: 1350px;
      position: relative;
      background: ${finalBgColor};
    }

    .badge {
      position: absolute;
      top: 120px;
      left: 61px;
      width: 181px;
      height: 92px;
      z-index: 10;
      object-fit: contain;
    }

    .content-container {
      position: absolute;
      top: 250px;
      left: 50px;
      right: 50px;
      bottom: 152px;
      z-index: 11;
      overflow: hidden;
    }

    .content {
      font-family: 'Headline', 'Montserrat', 'Arial Black', sans-serif;
      font-size: 56px;
      font-weight: 800;
      color: #FFFFEB;
      text-transform: uppercase;
      line-height: 1.25;
      letter-spacing: 2px;
      word-wrap: break-word;
    }

    .banner {
      position: absolute;
      bottom: 0;
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

    // ============================================================
    // PUPPETEER İLE RENDER
    // ============================================================
    console.log('Launching Puppeteer...')
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
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

    // Uzun başlıklar için font küçültme
    await page.evaluate(() => {
      const title = document.querySelector('.title, .content')
      if (title) {
        const container = title.parentElement
        if (!container) return

        let fontSize = parseInt(getComputedStyle(title).fontSize)
        const minFontSize = 36

        // Container'a sığana kadar küçült
        while (title.scrollHeight > container.clientHeight && fontSize > minFontSize) {
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

    console.log('=== RENDER SUCCESS ===')
    console.log('Output:', 1080 * finalScale, 'x', 1350 * finalScale, format, 'Category:', finalCategory)

    return res.status(200).json({
      success: true,
      base64: screenshot,
      mimeType: mimeTypes[format] || 'image/png',
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
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return text.replace(/[&<>"']/g, m => map[m])
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '10mb' }
  }
}
