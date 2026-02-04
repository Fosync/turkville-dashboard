// Sosyal medya URL'lerinden video URL'si çıkarma API'si
// yt-dlp kullanarak Twitter, Instagram, TikTok vb. destekler

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const url = req.method === 'POST' ? req.body.url : req.query.url

  if (!url) {
    return res.status(400).json({ error: 'URL parametresi gerekli' })
  }

  try {
    // URL'i normalize et (x.com -> twitter.com)
    let normalizedUrl = url
    if (url.includes('x.com')) {
      normalizedUrl = url.replace('x.com', 'twitter.com')
    }

    console.log('Extracting video from:', normalizedUrl)

    // yt-dlp ile video bilgilerini al
    const { stdout, stderr } = await execAsync(
      `yt-dlp -f "best[ext=mp4]/best" -g --no-warnings "${normalizedUrl}"`,
      { timeout: 30000 }
    )

    const videoUrl = stdout.trim().split('\n')[0]

    if (!videoUrl) {
      throw new Error('Video URL bulunamadı')
    }

    console.log('Extracted video URL:', videoUrl)

    // Video bilgilerini de al (opsiyonel)
    let videoInfo = null
    try {
      const { stdout: infoStdout } = await execAsync(
        `yt-dlp -j --no-warnings "${normalizedUrl}"`,
        { timeout: 30000 }
      )
      videoInfo = JSON.parse(infoStdout)
    } catch (e) {
      console.log('Could not get video info:', e.message)
    }

    res.status(200).json({
      success: true,
      videoUrl,
      proxyUrl: `/api/video-proxy?url=${encodeURIComponent(videoUrl)}`,
      info: videoInfo ? {
        title: videoInfo.title,
        description: videoInfo.description,
        duration: videoInfo.duration,
        uploader: videoInfo.uploader,
        uploaderId: videoInfo.uploader_id,
        thumbnail: videoInfo.thumbnail,
        platform: videoInfo.extractor,
      } : null
    })

  } catch (error) {
    console.error('Extract video error:', error)

    // Hata mesajını daha açıklayıcı yap
    let errorMessage = 'Video çıkarılamadı'
    if (error.message.includes('Unsupported URL')) {
      errorMessage = 'Bu URL desteklenmiyor'
    } else if (error.message.includes('Video unavailable')) {
      errorMessage = 'Video mevcut değil veya gizli'
    } else if (error.message.includes('timeout')) {
      errorMessage = 'İşlem zaman aşımına uğradı'
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: error.message
    })
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
}
