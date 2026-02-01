// Gemini 2.0 Flash Image Generation + Unsplash Fallback
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { prompt } = req.body

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' })
  }

  const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyB5w3fvek5gkxhcZIe_5r8XKtgQHKz8Nws'

  try {
    // 1. Gemini 2.0 Flash Image Generation dene
    console.log('Trying Gemini 2.0 Flash Image Generation...')

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Generate image: ${prompt}` }]
          }],
          generationConfig: {
            responseModalities: ['image']
          }
        })
      }
    )

    const geminiData = await geminiResponse.json()
    console.log('Gemini Image Response:', JSON.stringify(geminiData, null, 2))

    // Base64 image kontrolü
    const parts = geminiData.candidates?.[0]?.content?.parts || []
    for (const part of parts) {
      if (part.inlineData?.data) {
        console.log('Gemini image generated successfully!')

        // Base64'ü data URL'e çevir
        const mimeType = part.inlineData.mimeType || 'image/png'
        const dataUrl = `data:${mimeType};base64,${part.inlineData.data}`

        return res.status(200).json({
          imageUrl: dataUrl,
          source: 'gemini',
          isBase64: true,
          base64: part.inlineData.data,
          mimeType: mimeType
        })
      }
    }

    // Gemini çalışmadı, hata logla
    console.log('Gemini failed, trying Unsplash fallback...')
    if (geminiData.error) {
      console.log('Gemini error:', geminiData.error.message)
    }

  } catch (error) {
    console.error('Gemini error:', error.message)
  }

  // 2. Unsplash Fallback - sabit test görseli
  console.log('Using Unsplash fallback...')
  const fallbackUrl = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1080&h=1350&fit=crop'

  return res.status(200).json({
    imageUrl: fallbackUrl,
    source: 'unsplash',
    isBase64: false
  })
}
