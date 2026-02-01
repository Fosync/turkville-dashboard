// Imagen 4 AI Image Generation - news_images tablosu ile
import { createClient } from '@supabase/supabase-js'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Kategori bazlı sahne tanımları (marka ismi YOK) - 21 Kategori
const CATEGORY_SCENES = {
  'CEVRE': 'lush green forest, sustainable energy, nature landscape, clean environment',
  'DENEY': 'laboratory equipment, scientific research setting, modern technology',
  'DIGER': 'modern urban cityscape, clean architecture, professional atmosphere',
  'EGITIM': 'university campus, students studying, library interior, educational setting',
  'EKONOMI': 'modern business district skyline, glass buildings, financial district atmosphere, city lights',
  'EMLAK': 'modern house exterior, real estate property, residential neighborhood, for sale',
  'ETKINLIK': 'colorful community gathering, festive decorations, people celebrating, warm lighting',
  'GOCMENLIK': 'diverse group of people in an airport terminal, travel documents, luggage, Canadian maple leaf flag in background',
  'GUNDEM': 'government building with classical architecture, urban cityscape, official atmosphere',
  'GUVENLIK': 'city street at night with blue and red lights reflection, urban safety atmosphere',
  'HAP_BILGI': 'infographic style, knowledge sharing, quick facts, educational visual',
  'HAVA': 'dramatic sky with clouds, city skyline silhouette, weather atmosphere',
  'IS_ILANI': 'modern office interior, professional workspace, natural light through windows',
  'KULTUR': 'art gallery interior, cultural event, theater stage, artistic atmosphere',
  'OTOMOTIV': 'modern car showroom, automotive industry, vehicle display, dealership',
  'SAGLIK': 'hospital interior, medical equipment, healthcare setting, doctor consultation',
  'SEYAHAT': 'airplane taking off, travel destination, vacation scenery, tourism',
  'SPOR': 'sports stadium, athletic competition, fitness activity, sports equipment',
  'TEKNOLOJI': 'modern tech office, computer screens, innovation lab, digital technology',
  'YASAM': 'lifestyle scene, daily life, urban living, community gathering',
  'YEME_ICME': 'restaurant interior, food presentation, dining experience, culinary arts'
}

// Marka isimlerini genel tanımlarla değiştir
const BRAND_REPLACEMENTS = {
  'cineplex': 'movie theater',
  'tim hortons': 'coffee shop',
  'starbucks': 'coffee shop',
  'mcdonalds': 'fast food restaurant',
  'burger king': 'fast food restaurant',
  'wendys': 'fast food restaurant',
  'subway': 'sandwich shop',
  'pizza pizza': 'pizza restaurant',
  'walmart': 'supermarket',
  'costco': 'warehouse store',
  'loblaws': 'grocery store',
  'no frills': 'grocery store',
  'shoppers drug mart': 'pharmacy',
  'ikea': 'furniture store',
  'canadian tire': 'hardware store',
  'home depot': 'hardware store',
  'td bank': 'bank building',
  'td': 'bank building',
  'rbc': 'bank building',
  'scotiabank': 'bank building',
  'bmo': 'bank building',
  'cibc': 'bank building',
  'air canada': 'commercial airplane',
  'westjet': 'commercial airplane',
  'porter': 'commercial airplane',
  'uber': 'taxi cab',
  'lyft': 'taxi cab',
  'skip the dishes': 'food delivery',
  'doordash': 'food delivery',
  'amazon': 'delivery packages',
  'google': 'technology office',
  'apple': 'technology store',
  'microsoft': 'technology office',
  'facebook': 'social gathering',
  'meta': 'social gathering',
  'instagram': 'photography',
  'twitter': 'communication',
  'x.com': 'communication',
  'tiktok': 'entertainment',
  'youtube': 'video production',
  'netflix': 'home entertainment',
  'spotify': 'music listening',
  'presto': 'transit station',
  'ttc': 'public transit station',
  'go train': 'commuter train station',
  'go transit': 'commuter train station',
  'via rail': 'train station platform',
  'rogers': 'telecommunications',
  'bell': 'telecommunications',
  'telus': 'telecommunications',
  'freedom mobile': 'mobile phone'
}

// Metinden marka isimlerini ve sayıları temizle, sahne tanımına dönüştür
function cleanTextForPrompt(text) {
  if (!text) return ''

  let cleaned = text.toLowerCase()

  // Türkçe karakterleri değiştir
  cleaned = cleaned
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')

  // Marka isimlerini sahne tanımlarıyla değiştir
  for (const [brand, replacement] of Object.entries(BRAND_REPLACEMENTS)) {
    const regex = new RegExp(`\\b${brand}\\b`, 'gi')
    cleaned = cleaned.replace(regex, replacement)
  }

  // Sayıları, fiyatları, yüzdeleri, tarihleri kaldır
  cleaned = cleaned.replace(/\$?\d+([.,]\d+)?(\s*(%|percent|dolar|cad|tl|euro|million|billion|bin|milyon|milyar))?\b/gi, '')
  cleaned = cleaned.replace(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi, '')
  cleaned = cleaned.replace(/\b(ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos|eylul|ekim|kasim|aralik)\b/gi, '')
  cleaned = cleaned.replace(/\b\d{4}\b/g, '') // Yılları kaldır

  // Fazla boşlukları ve noktalama temizle
  cleaned = cleaned.replace(/[^\w\s]/g, ' ')
  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  return cleaned
}

function generatePrompt(news, customPrompt = null) {
  // Temel kural: ASLA metin/yazı olmamalı
  const noTextRule = `Photograph with absolutely no text, no words, no letters, no numbers, no signs, no banners, no watermarks anywhere in the image.`
  const endRule = `Pure visual content only, zero text elements of any kind.`
  const style = `Professional editorial photo, high quality, 4K resolution, cinematic lighting, shallow depth of field`

  // Kullanıcı özel prompt verdiyse
  if (customPrompt && customPrompt.trim()) {
    const cleanedPrompt = cleanTextForPrompt(customPrompt)
    return `${noTextRule} ${cleanedPrompt}. ${style}. ${endRule}`
  }

  const { title_tr, category } = news

  // Başlıktan sahne tanımı çıkar (markalar ve sayılar temizlenmiş)
  const cleanedTitle = cleanTextForPrompt(title_tr)

  // Kategori bazlı sahne al
  const categoryScene = CATEGORY_SCENES[category] || CATEGORY_SCENES['DIGER']

  // Prompt oluştur - sadece görsel sahne tanımı
  const prompt = `${noTextRule} Scene: ${categoryScene}. Context: ${cleanedTitle}. ${style}. ${endRule}`

  return prompt
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

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
    console.log('Imagen 4 response received:', JSON.stringify(imagenData, null, 2))

    // Farklı yanıt yapılarını kontrol et
    let base64Image = null

    // Yapı 1: predictions[0].bytesBase64Encoded
    if (imagenData.predictions?.[0]?.bytesBase64Encoded) {
      base64Image = imagenData.predictions[0].bytesBase64Encoded
    }
    // Yapı 2: predictions[0].image.bytesBase64Encoded
    else if (imagenData.predictions?.[0]?.image?.bytesBase64Encoded) {
      base64Image = imagenData.predictions[0].image.bytesBase64Encoded
    }
    // Yapı 3: candidates[0].content
    else if (imagenData.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
      base64Image = imagenData.candidates[0].content.parts[0].inlineData.data
    }

    if (!base64Image) {
      console.error('No image in response. Full response:', JSON.stringify(imagenData))
      // Hata mesajı varsa göster
      const errorMsg = imagenData.error?.message || imagenData.promptFeedback?.blockReason || 'Unknown error'
      throw new Error(`Imagen API error: ${errorMsg}`)
    }

    console.log('Image generated, size:', base64Image.length)

    // 3. Supabase Storage'a yükle - path: {news_id}/{timestamp}.png
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const buffer = Buffer.from(base64Image, 'base64')
    const timestamp = Date.now()
    const storagePath = `${news.id}/${timestamp}.png`

    console.log('Uploading to Supabase Storage:', storagePath)

    const { error: uploadError } = await supabase.storage
      .from('news-images')
      .upload(storagePath, buffer, {
        contentType: 'image/png',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Storage upload error: ${uploadError.message}`)
    }

    // Public URL al
    const { data: urlData } = supabase.storage
      .from('news-images')
      .getPublicUrl(storagePath)

    const imageUrl = urlData.publicUrl
    console.log('Image uploaded:', imageUrl)

    // 4. news_images tablosuna kaydet (news_items DEĞİL)
    const { data: insertData, error: insertError } = await supabase
      .from('news_images')
      .insert({
        news_id: news.id,
        image_url: imageUrl,
        storage_path: storagePath,
        prompt: prompt,
        is_selected: false
      })
      .select()
      .single()

    if (insertError) {
      console.error('DB insert error:', insertError)
      // Görsel yüklendi ama DB'ye kaydedilemedi
    }

    console.log('=== IMAGEN 4 GENERATION SUCCESS ===')

    return res.status(200).json({
      success: true,
      image: insertData || {
        id: timestamp,
        news_id: news.id,
        image_url: imageUrl,
        storage_path: storagePath,
        prompt: prompt,
        is_selected: false,
        created_at: new Date().toISOString()
      },
      imageUrl,
      prompt,
      newsId: news.id
    })

  } catch (error) {
    console.error('=== IMAGEN 4 GENERATION ERROR ===')
    console.error(error.message)

    return res.status(500).json({
      error: error.message,
      details: 'AI gorsel uretimi basarisiz oldu'
    })
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '10mb' },
    responseLimit: '10mb'
  }
}
