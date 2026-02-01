// Unsplash Image API - Doğrudan URL yaklaşımı (API key gerektirmez)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { query } = req.body

  if (!query) {
    return res.status(400).json({ error: 'Query is required' })
  }

  console.log('Image search - Query:', query)

  // Popüler Unsplash görselleri - keyword'e göre seç
  const imageDatabase = {
    // Spor
    'soccer': ['1574629810360-7efbbe195018', '1551958219-acbc608c6377', '1431324155629-1a6deb1dec8d'],
    'football': ['1574629810360-7efbbe195018', '1551958219-acbc608c6377', '1431324155629-1a6deb1dec8d'],
    'futbol': ['1574629810360-7efbbe195018', '1551958219-acbc608c6377', '1431324155629-1a6deb1dec8d'],
    'sport': ['1461896836934- voices-from-a-field', '1517649763962-0c623066013b', '1571019613454-1cb57f89c3a8'],
    'basketball': ['1546519638-68e109498ffc', '1574623452334-1e0ac2b3ccb4'],

    // Kutlama / Parti
    'party': ['1492684223066-81342ee5ff30', '1514525253161-7a46d19cd819', '1533174072545-7a4b6ad7a6c3'],
    'celebration': ['1492684223066-81342ee5ff30', '1514525253161-7a46d19cd819', '1533174072545-7a4b6ad7a6c3'],
    'kutlama': ['1492684223066-81342ee5ff30', '1514525253161-7a46d19cd819', '1533174072545-7a4b6ad7a6c3'],
    'concert': ['1514525253161-7a46d19cd819', '1470229722913-7c0e2dbbafd3', '1501281668745-f7f57925c138'],
    'festival': ['1533174072545-7a4b6ad7a6c3', '1506157786151-b8491531f063', '1429962714451-bb934ecdc4ec'],

    // Şehir / Manzara
    'city': ['1477959858617-67f85cf4f1df', '1514924013411-cbf25faa35bb', '1480714378408-67cf0d13bc1b'],
    'toronto': ['1517935706615-2717063c2225', '1558618666-fcd25c85cd64', '1569288063477-8c1df31c7a11'],
    'canada': ['1503614472-8c93d56e92ce', '1517935706615-2717063c2225'],
    'skyline': ['1477959858617-67f85cf4f1df', '1514924013411-cbf25faa35bb'],
    'night': ['1477959858617-67f85cf4f1df', '1519501025264-65ba15a82390', '1514525253161-7a46d19cd819'],

    // Etkinlik
    'event': ['1492684223066-81342ee5ff30', '1540575467063-178a50e2df87', '1475721027785-f74eccf877e2'],
    'etkinlik': ['1492684223066-81342ee5ff30', '1540575467063-178a50e2df87', '1475721027785-f74eccf877e2'],
    'meeting': ['1540575467063-178a50e2df87', '1505373877841-8d25f7d46678', '1515187029135-18ee286d815b'],
    'conference': ['1540575467063-178a50e2df87', '1505373877841-8d25f7d46678'],

    // Film / Sinema
    'movie': ['1489599849927-2ee91cede3ba', '1485846234645-a62644f84728', '1536440136628-849c177e76a1'],
    'cinema': ['1489599849927-2ee91cede3ba', '1485846234645-a62644f84728', '1517604931442-7e0c8ed2963c'],
    'film': ['1489599849927-2ee91cede3ba', '1485846234645-a62644f84728'],

    // Yemek
    'food': ['1504674900247-0877df9cc836', '1493770348161-369560ae357d', '1476224203421-9ac39bcb3327'],
    'restaurant': ['1517248135467-4c7edcad34c4', '1414235077428-338989a2e8c0'],
    'yemek': ['1504674900247-0877df9cc836', '1493770348161-369560ae357d'],

    // Müzik
    'music': ['1470229722913-7c0e2dbbafd3', '1511192336575-5a79af67a629', '1493225457124-a3eb161ffa5f'],
    'muzik': ['1470229722913-7c0e2dbbafd3', '1511192336575-5a79af67a629'],

    // Genel
    'crowd': ['1429962714451-bb934ecdc4ec', '1492684223066-81342ee5ff30'],
    'people': ['1529156069898-49953e39b3ac', '1517457373958-b7bdd4587205'],
    'sunset': ['1472120435266-3c5b4f2a1b52', '1507400492013-162706c8c05e'],
    'nature': ['1441974231531-c6227db76b6e', '1470071459604-3b5ec3a7fe05'],

    // Default
    'default': ['1492684223066-81342ee5ff30', '1574629810360-7efbbe195018', '1514525253161-7a46d19cd819', '1477959858617-67f85cf4f1df']
  }

  try {
    // Query'den keyword'leri çıkar
    const keywords = query.toLowerCase().split(/[\s,]+/).filter(k => k.length > 2)
    console.log('Keywords:', keywords)

    // Eşleşen görselleri bul
    let matchedImages = []
    for (const keyword of keywords) {
      if (imageDatabase[keyword]) {
        matchedImages = [...matchedImages, ...imageDatabase[keyword]]
      }
    }

    // Eşleşme yoksa default kullan
    if (matchedImages.length === 0) {
      matchedImages = imageDatabase['default']
    }

    // Duplicate'ları kaldır
    matchedImages = [...new Set(matchedImages)]

    // Random seç
    const randomIndex = Math.floor(Math.random() * matchedImages.length)
    const photoId = matchedImages[randomIndex]

    // Direkt Unsplash URL oluştur (API gerektirmez)
    const imageUrl = `https://images.unsplash.com/photo-${photoId}?w=1080&h=1350&fit=crop&crop=faces,center`

    console.log('Selected image:', imageUrl)

    return res.status(200).json({
      success: true,
      imageUrl: imageUrl,
      source: 'unsplash-direct',
      photoId: photoId
    })

  } catch (error) {
    console.error('Image search error:', error.message)

    // Fallback
    const fallbackImages = [
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1080&h=1350&fit=crop',
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1080&h=1350&fit=crop',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1080&h=1350&fit=crop'
    ]
    const randomFallback = fallbackImages[Math.floor(Math.random() * fallbackImages.length)]

    return res.status(200).json({
      success: true,
      imageUrl: randomFallback,
      source: 'fallback',
      error: error.message
    })
  }
}
