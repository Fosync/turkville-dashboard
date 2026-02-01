// Unsplash Image API - Gerçek API ile arama
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || 'oYWSHazLwurAInmEQ2APklWJYqC4tPPV4_RZKFL-Mpk'

// Türkçe-İngilizce çeviri tablosu
const TRANSLATIONS = {
  'dondurma': 'ice cream',
  'yemek': 'food',
  'kahve': 'coffee',
  'çay': 'tea',
  'futbol': 'soccer',
  'basketbol': 'basketball',
  'müzik': 'music',
  'konser': 'concert',
  'parti': 'party',
  'kutlama': 'celebration',
  'düğün': 'wedding',
  'doğum günü': 'birthday',
  'spor': 'sports',
  'dans': 'dance',
  'sinema': 'cinema',
  'film': 'movie',
  'tiyatro': 'theater',
  'sahne': 'stage',
  'gece': 'night',
  'gündüz': 'day',
  'deniz': 'sea',
  'plaj': 'beach',
  'dağ': 'mountain',
  'orman': 'forest',
  'şehir': 'city',
  'sokak': 'street',
  'araba': 'car',
  'uçak': 'airplane',
  'seyahat': 'travel',
  'tatil': 'vacation',
  'restoran': 'restaurant',
  'kafe': 'cafe',
  'bar': 'bar',
  'kulüp': 'club',
  'gece kulübü': 'nightclub',
  'festival': 'festival',
  'etkinlik': 'event',
  'toplantı': 'meeting',
  'iş': 'business',
  'ofis': 'office',
  'teknoloji': 'technology',
  'bilgisayar': 'computer',
  'telefon': 'phone',
  'aile': 'family',
  'çocuk': 'children',
  'bebek': 'baby',
  'hayvan': 'animal',
  'köpek': 'dog',
  'kedi': 'cat',
  'çiçek': 'flower',
  'bahçe': 'garden',
  'ev': 'home',
  'mutfak': 'kitchen',
  'yatak odası': 'bedroom',
  'güneş': 'sun',
  'ay': 'moon',
  'yıldız': 'stars',
  'gökyüzü': 'sky',
  'bulut': 'clouds',
  'yağmur': 'rain',
  'kar': 'snow',
  'kış': 'winter',
  'yaz': 'summer',
  'ilkbahar': 'spring',
  'sonbahar': 'autumn'
}

// Türkçe karakterleri İngilizce'ye çevir
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
}

// Türkçe kelimeyi İngilizce'ye çevir
function translateToEnglish(query) {
  const normalized = normalizeText(query)

  // Tam eşleşme kontrolü
  for (const [tr, en] of Object.entries(TRANSLATIONS)) {
    if (normalizeText(tr) === normalized || query.toLowerCase() === tr) {
      return en
    }
  }

  // Kısmi eşleşme
  for (const [tr, en] of Object.entries(TRANSLATIONS)) {
    if (normalized.includes(normalizeText(tr)) || normalizeText(tr).includes(normalized)) {
      return en
    }
  }

  return query // Çeviri bulunamazsa orijinal kelimeyi döndür
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { query } = req.body

  if (!query) {
    return res.status(400).json({ error: 'Query is required' })
  }

  console.log('Image search - Original query:', query)

  // Türkçe'den İngilizce'ye çevir
  const englishQuery = translateToEnglish(query)
  console.log('Translated query:', englishQuery)

  try {
    // Unsplash API ile arama
    const searchUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(englishQuery)}&per_page=10&orientation=portrait`

    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
      }
    })

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.results && data.results.length > 0) {
      // Rastgele bir görsel seç
      const randomIndex = Math.floor(Math.random() * Math.min(data.results.length, 5))
      const photo = data.results[randomIndex]

      // Yüksek kaliteli URL oluştur
      const imageUrl = `${photo.urls.raw}&w=1080&h=1350&fit=crop&crop=faces,center`

      console.log('Found image:', imageUrl)

      return res.status(200).json({
        success: true,
        imageUrl: imageUrl,
        source: 'unsplash-api',
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html,
        originalQuery: query,
        translatedQuery: englishQuery
      })
    } else {
      throw new Error('No images found')
    }

  } catch (error) {
    console.error('Unsplash API error:', error.message)

    // Fallback: Pexels veya başka kaynak denenebilir
    // Şimdilik genel bir görsel döndür
    const fallbackImages = [
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1080&h=1350&fit=crop',
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1080&h=1350&fit=crop',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1080&h=1350&fit=crop',
      'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1080&h=1350&fit=crop'
    ]
    const randomFallback = fallbackImages[Math.floor(Math.random() * fallbackImages.length)]

    return res.status(200).json({
      success: true,
      imageUrl: randomFallback,
      source: 'fallback',
      error: error.message,
      originalQuery: query
    })
  }
}
