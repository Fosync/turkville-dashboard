// Video Proxy API - Sosyal medya videolarını proxy üzerinden çek
// NOT: Bu basit bir proxy. Gerçek uygulamada yt-dlp veya benzeri araçlar gerekebilir.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url } = req.query

  if (!url) {
    return res.status(400).json({ error: 'URL parametresi gerekli' })
  }

  try {
    // URL'i decode et
    const videoUrl = decodeURIComponent(url)

    // Basit URL validation
    const urlObj = new URL(videoUrl)
    const allowedHosts = [
      'video.twimg.com',
      'pbs.twimg.com',
      'scontent.cdninstagram.com',
      'scontent-',
      'instagram',
      'v16-webapp-prime.tiktok.com',
      'v16-webapp.tiktok.com',
      'v19.tiktokcdn.com',
      'v77.tiktokcdn.com',
      'pull-',
      'ggpht.com', // YouTube thumbnail
      'ytimg.com',
    ]

    const isAllowed = allowedHosts.some(host => urlObj.hostname.includes(host))

    if (!isAllowed) {
      // Eğer izin verilen host değilse, yine de dene (bazı CDN'ler farklı domain kullanır)
      console.log('Host not in allowlist, trying anyway:', urlObj.hostname)
    }

    // Video'yu fetch et
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'identity',
        'Referer': urlObj.origin,
      },
    })

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`)
    }

    // Content-Type'ı al
    const contentType = response.headers.get('content-type') || 'video/mp4'

    // Response header'larını ayarla
    res.setHeader('Content-Type', contentType)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 'public, max-age=3600')

    // Content-Length varsa ekle
    const contentLength = response.headers.get('content-length')
    if (contentLength) {
      res.setHeader('Content-Length', contentLength)
    }

    // Video'yu stream et
    const reader = response.body.getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(value)
    }

    res.end()

  } catch (error) {
    console.error('Video proxy error:', error)
    res.status(500).json({ error: 'Video yüklenemedi', details: error.message })
  }
}

export const config = {
  api: {
    responseLimit: false,
  },
}
