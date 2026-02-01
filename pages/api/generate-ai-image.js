// Imagen 4 AI Image Generation
import { createClient } from '@supabase/supabase-js'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Kategori bazlı stil ekleri
const CATEGORY_STYLES = {
  'GOCMENLIK': 'passport, airport terminal, immigration documents, Canadian flag, travel',
  'EKONOMI': 'financial charts, Canadian dollar, business district, stock market, Toronto skyline',
  'GUNDEM': 'Canadian parliament building, politics, Ottawa, cityscape, government',
  'HAVA': 'weather scene, dramatic sky, Toronto skyline, Canadian landscape',
  'GUVENLIK': 'police lights, security, urban safety, Canadian police, emergency',
  'ETKINLIK': 'community event, celebration, festival, concert, gathering, party',
  'IS_ILANI': 'modern office, workplace, job interview, professional setting, career',
  'DENEY': 'laboratory, science, research, innovation, technology',
  'DIGER': 'Toronto cityscape, Canada landscape, urban, modern'
}

// Türkçe-İngilizce çeviri tablosu
const TRANSLATIONS = {
  'kanada': 'Canada', 'toronto': 'Toronto', 'türk': 'Turkish', 'türkiye': 'Turkey',
  'göçmenlik': 'immigration', 'vize': 'visa', 'pasaport': 'passport', 'vatandaşlık': 'citizenship',
  'ekonomi': 'economy', 'dolar': 'dollar', 'borsa': 'stock market', 'enflasyon': 'inflation',
  'haber': 'news', 'seçim': 'election', 'hükümet': 'government', 'politika': 'politics',
  'hava': 'weather', 'kar': 'snow', 'yağmur': 'rain', 'fırtına': 'storm', 'güneş': 'sunny',
  'polis': 'police', 'güvenlik': 'security', 'acil': 'emergency', 'kaza': 'accident',
  'etkinlik': 'event', 'festival': 'festival', 'konser': 'concert', 'kutlama': 'celebration',
  'toplantı': 'meeting', 'parti': 'party', 'topluluk': 'community',
  'iş': 'job', 'çalışma': 'work', 'kariyer': 'career', 'maaş': 'salary'
}

function translateToEnglish(text) {
  if (!text) return ''
  let result = text.toLowerCase()

  // Türkçe karakterleri değiştir
  result = result
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ş/g, 'S')
    .replace(/İ/g, 'I').replace(/Ö/g, 'O').replace(/Ç/g, 'C')

  // Bilinen kelimeleri çevir
  for (const [tr, en] of Object.entries(TRANSLATIONS)) {
    const normalizedTr = tr.replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    const regex = new RegExp(`\\b${normalizedTr}\\b`, 'gi')
    result = result.replace(regex, en)
  }

  return result
}

function generatePrompt(news, customPrompt = null) {
  // Kullanıcı özel prompt verdiyse onu kullan
  if (customPrompt && customPrompt.trim()) {
    return `${customPrompt.trim()}. Style: professional photography, high quality, 4K, Instagram post. IMPORTANT: absolutely no text, no words, no letters, no writing, no watermarks, no logos anywhere in the image.`
  }

  const { title_tr, category, instagram_summary } = news

  // Başlığı İngilizce'ye çevir
  const englishTitle = translateToEnglish(title_tr)
  const englishSummary = translateToEnglish(instagram_summary || '')

  // Kategori stilini al
  const categoryStyle = CATEGORY_STYLES[category] || CATEGORY_STYLES['DIGER']

  // Prompt oluştur - yazı olmaması için çok güçlü vurgu
  const prompt = `Professional editorial photograph for Instagram news post. Subject: ${englishTitle}. ${englishSummary ? `Scene: ${englishSummary}.` : ''} Visual style: ${categoryStyle}. Technical: professional photography, cinematic lighting, high quality, 4K resolution, vibrant colors, sharp focus. CRITICAL REQUIREMENT: The image must contain absolutely NO TEXT, NO WORDS, NO LETTERS, NO NUMBERS, NO WRITING, NO WATERMARKS, NO LOGOS, NO SIGNS WITH TEXT, NO CAPTIONS. Pure visual imagery only.`

  return prompt
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // API key kontrolü
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' })
  }

  const { news, customPrompt } = req.body

  if (!news || !news.id) {
    return res.status(400).json({ error: 'News data with id is required' })
  }

  console.log('=== IMAGEN 4 GENERATION START ===')
  console.log('News ID:', news.id)
  console.log('Title:', news.title_tr)
  console.log('Category:', news.category)
  console.log('Custom prompt:', customPrompt || '(auto-generated)')

  try {
    // 1. Prompt oluştur
    const prompt = generatePrompt(news, customPrompt)
    console.log('Generated prompt:', prompt)

    // 2. Imagen 4 API çağrısı
    console.log('Calling Imagen 4 API...')
    const imagenResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '3:4'
          }
        })
      }
    )

    if (!imagenResponse.ok) {
      const errorText = await imagenResponse.text()
      console.error('Imagen 4 API error:', imagenResponse.status, errorText)
      throw new Error(`Imagen 4 API error: ${imagenResponse.status}`)
    }

    const imagenData = await imagenResponse.json()
    console.log('Imagen 4 response received')

    // Base64 image'ı al
    const base64Image = imagenData.predictions?.[0]?.bytesBase64Encoded
    if (!base64Image) {
      console.error('No image in response:', JSON.stringify(imagenData))
      throw new Error('No image data in response')
    }

    console.log('Image generated, size:', base64Image.length)

    // 3. Supabase Storage'a yükle
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

    // Base64'ü buffer'a çevir
    const buffer = Buffer.from(base64Image, 'base64')
    const fileName = `${news.id}.png`

    console.log('Uploading to Supabase Storage...')

    // Önce mevcut dosyayı sil (varsa)
    await supabase.storage.from('news-images').remove([fileName])

    // Yeni dosyayı yükle
    const { error: uploadError } = await supabase.storage
      .from('news-images')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Storage upload error: ${uploadError.message}`)
    }

    // Public URL al
    const { data: urlData } = supabase.storage
      .from('news-images')
      .getPublicUrl(fileName)

    const imageUrl = urlData.publicUrl
    console.log('Image uploaded:', imageUrl)

    // 4. news_items tablosunu güncelle
    const { error: updateError } = await supabase
      .from('news_items')
      .update({ image_url: imageUrl })
      .eq('id', news.id)

    if (updateError) {
      console.error('DB update error:', updateError)
      // Görsel yüklendi ama DB güncellenemedi - yine de URL'i döndür
    }

    console.log('=== IMAGEN 4 GENERATION SUCCESS ===')

    return res.status(200).json({
      success: true,
      imageUrl,
      prompt,
      newsId: news.id
    })

  } catch (error) {
    console.error('=== IMAGEN 4 GENERATION ERROR ===')
    console.error(error.message)

    return res.status(500).json({
      error: error.message,
      details: 'AI görsel üretimi başarısız oldu'
    })
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    },
    responseLimit: '10mb'
  }
}
