import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Head from 'next/head'
import { useRouter } from 'next/router'

const GEMINI_API_KEY = 'AIzaSyB5w3fvek5gkxhcZIe_5r8XKtgQHKz8Nws'

export default function Dashboard() {
  const router = useRouter()
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedNews, setSelectedNews] = useState(null)
  const [filter, setFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [stats, setStats] = useState({ total: 0, high: 0, medium: 0, low: 0 })

  // Instagram Post Generator State
  const [showPostGenerator, setShowPostGenerator] = useState(false)
  const [showQuickPostModal, setShowQuickPostModal] = useState(false)
  const [showImageGenerator, setShowImageGenerator] = useState(false)
  const [imagePrompt, setImagePrompt] = useState('')
  const [postPrompt, setPostPrompt] = useState('')
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null)
  const [generatedBgImage, setGeneratedBgImage] = useState(null)
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [isGeneratingBgImage, setIsGeneratingBgImage] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [etkinlikNews, setEtkinlikNews] = useState([])

  useEffect(() => {
    fetchNews()
  }, [filter, categoryFilter])

  // ETKINLIK haberlerini yükle (Quick Post Modal için)
  useEffect(() => {
    const fetchEtkinlikNews = async () => {
      const { data } = await supabase
        .from('news_items')
        .select('*')
        .eq('category', 'ETKINLIK')
        .order('created_at', { ascending: false })
        .limit(20)
      setEtkinlikNews(data || [])
    }
    if (showQuickPostModal) {
      fetchEtkinlikNews()
    }
  }, [showQuickPostModal])

  const fetchNews = async () => {
    setLoading(true)
    
    let query = supabase.from('news_items').select('*').order('score', { ascending: false })
    
    if (filter === 'high') query = query.gte('score', 70)
    else if (filter === 'medium') query = query.gte('score', 40).lt('score', 70)
    else if (filter === 'low') query = query.lt('score', 40)
    
    if (categoryFilter !== 'all') query = query.eq('category', categoryFilter)
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error:', error)
    } else {
      setNews(data || [])
    }
    
    // Get stats
    const { data: allData } = await supabase.from('news_items').select('score')
    if (allData) {
      setStats({
        total: allData.length,
        high: allData.filter(n => n.score >= 70).length,
        medium: allData.filter(n => n.score >= 40 && n.score < 70).length,
        low: allData.filter(n => n.score < 40).length
      })
    }
    
    setLoading(false)
  }

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase
      .from('news_items')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      alert('Hata: ' + error.message)
    } else {
      fetchNews()
      if (selectedNews?.id === id) {
        setSelectedNews({ ...selectedNews, status: newStatus })
      }
    }
  }

  // Gemini API ile prompt önerisi al
  const generatePromptWithAI = async () => {
    if (!selectedNews) return
    setIsGeneratingPrompt(true)

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Sen bir Instagram post tasarımcısısın. Aşağıdaki etkinlik haberi için arka plan görseli oluşturmak üzere bir görsel prompt yaz. Prompt İngilizce olmalı, detaylı ve görsel olarak çekici bir sahne tanımlamalı. Sadece prompt'u yaz, başka bir şey yazma.

Etkinlik Başlığı: ${selectedNews.title_tr}
${selectedNews.content_snippet ? `Detay: ${selectedNews.content_snippet}` : ''}

Örnek format: "A vibrant festival scene with colorful decorations, warm lighting, happy crowd silhouettes, bokeh lights in background, festive atmosphere"`
              }]
            }]
          })
        }
      )

      const data = await response.json()
      const generatedPrompt = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      setPostPrompt(generatedPrompt.trim())
    } catch (error) {
      console.error('Gemini API Error:', error)
      alert('Prompt oluşturulurken hata oluştu')
    }

    setIsGeneratingPrompt(false)
  }

  // Sadece arka plan görseli üret (yazı yok)
  const generateBackgroundImage = async () => {
    if (!imagePrompt) return
    setIsGeneratingBgImage(true)
    setGeneratedBgImage(null)

    try {
      const response = await fetch('/api/unsplash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: imagePrompt })
      })

      const data = await response.json()
      if (data.imageUrl) {
        setGeneratedBgImage(data.imageUrl)
      } else {
        throw new Error('Görsel bulunamadı')
      }
    } catch (error) {
      console.error('Image generation error:', error)
      alert('Görsel oluşturulurken hata: ' + error.message)
    }

    setIsGeneratingBgImage(false)
  }

  // Görseli indir
  const downloadImage = async (url, filename = 'gorsel.jpg') => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      // Fallback: open in new tab
      window.open(url, '_blank')
    }
  }

  // Arka plan görseli al (Gemini veya Unsplash)
  const getBackgroundUrl = async (prompt) => {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    })

    const data = await response.json()
    console.log('Background API response:', data)

    if (data.error) {
      throw new Error(data.error)
    }

    // Gemini base64 döndürdüyse Supabase'e yükle
    if (data.isBase64 && data.base64) {
      console.log('Uploading Gemini image to Supabase...')
      const filename = `bg_${Date.now()}.png`
      const uploadedUrl = await uploadBase64ToSupabase(data.base64, filename)
      console.log('Uploaded URL:', uploadedUrl)
      return uploadedUrl
    }

    return data.imageUrl
  }

  // Base64 görseli Supabase Storage'a yükle
  const uploadBase64ToSupabase = async (base64Data, filename) => {
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'image/png' })

    const { data, error } = await supabase.storage
      .from('instagram-backgrounds')
      .upload(filename, blob, { contentType: 'image/png', upsert: true })

    if (error) throw new Error('Supabase upload hatası: ' + error.message)

    const { data: urlData } = supabase.storage
      .from('instagram-backgrounds')
      .getPublicUrl(filename)

    return urlData.publicUrl
  }

  // Kendi template render sistemimiz
  const renderTemplate = async (backgroundUrl, title) => {
    console.log('=== TEMPLATE RENDER ===')
    console.log('Background:', backgroundUrl)
    console.log('Title:', title)

    const response = await fetch('/api/render-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backgroundUrl, title })
    })

    const data = await response.json()
    console.log('Render response:', data.success ? 'Success!' : data.error)

    if (data.error) {
      throw new Error(data.error)
    }

    if (data.base64) {
      // Base64'ü data URL'e çevir
      return `data:${data.mimeType};base64,${data.base64}`
    }

    throw new Error('Template render hatası')
  }

  // Ana görsel üretme fonksiyonu
  const generateImage = async () => {
    if (!postPrompt || !selectedNews) return
    setIsGeneratingImage(true)
    setGeneratedImageUrl(null)

    try {
      // 1. Arka plan görseli al (Gemini veya Unsplash)
      console.log('1. Arka plan görseli alınıyor...')
      const backgroundUrl = await getBackgroundUrl(postPrompt)
      console.log('Background URL:', backgroundUrl)

      // 2. Kendi template sistemimizle render et
      console.log('2. Template render ediliyor...')
      const finalImageUrl = await renderTemplate(backgroundUrl, selectedNews.title_tr)

      setGeneratedImageUrl(finalImageUrl)
    } catch (error) {
      console.error('Görsel üretme hatası:', error)
      alert('Hata: ' + error.message)
    }

    setIsGeneratingImage(false)
  }

  // Görseli Supabase'e kaydet
  const saveGeneratedPost = async () => {
    if (!generatedImageUrl || !selectedNews) return
    setIsSaving(true)

    try {
      const { error } = await supabase
        .from('instagram_posts')
        .insert({
          news_id: selectedNews.id,
          title: selectedNews.title_tr,
          prompt: postPrompt,
          image_url: generatedImageUrl,
          created_at: new Date().toISOString()
        })

      if (error) throw error

      alert('Post başarıyla kaydedildi!')
      setShowPostGenerator(false)
      setPostPrompt('')
      setGeneratedImageUrl(null)
    } catch (error) {
      console.error('Save Error:', error)
      alert('Kaydetme hatası: ' + error.message)
    }

    setIsSaving(false)
  }

  // Post generator'ı aç
  const openPostGenerator = () => {
    setPostPrompt('')
    setGeneratedImageUrl(null)
    setShowPostGenerator(true)
  }

  const getScoreColor = (score) => {
    if (score >= 70) return 'bg-green-500'
    if (score >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getScoreBg = (score) => {
    if (score >= 70) return 'bg-green-100 text-green-800'
    if (score >= 40) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getCategoryEmoji = (category) => {
    const emojis = {
      'GOCMENLIK': '🇨🇦',
      'EKONOMI': '💰',
      'HAVA': '🌤️',
      'GUVENLIK': '🚨',
      'IS_ILANI': '💼',
      'ETKINLIK': '🎉',
      'GUNDEM': '📰',
      'DENEY': '🧪',
      'DIGER': '📌'
    }
    return emojis[category] || '📌'
  }

  const getStatusBadge = (status) => {
    const styles = {
      'NEW': 'bg-blue-100 text-blue-800',
      'REVIEWING': 'bg-purple-100 text-purple-800',
      'APPROVED': 'bg-green-100 text-green-800',
      'PUBLISHED': 'bg-gray-100 text-gray-800',
      'REJECTED': 'bg-red-100 text-red-800'
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  const categories = ['GOCMENLIK', 'EKONOMI', 'HAVA', 'GUVENLIK', 'IS_ILANI', 'ETKINLIK', 'GUNDEM', 'DENEY', 'DIGER']

  return (
    <>
      <Head>
        <title>Turkville Dashboard</title>
        <meta name="description" content="Turkville Haber Yönetim Paneli" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">T</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Turkville Dashboard</h1>
                  <p className="text-sm text-gray-500">Haber Yönetim Paneli</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowImageGenerator(true)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 flex items-center gap-2 font-medium shadow-sm"
                >
                  🎨 Gorsel Olustur
                </button>
                <button
                  onClick={() => router.push('/template-editor')}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 flex items-center gap-2 font-medium shadow-sm"
                >
                  📸 Post Olustur
                </button>
                <button
                  onClick={fetchNews}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  🔄 Yenile
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Toplam Haber</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-green-200">
              <div className="text-3xl font-bold text-green-600">{stats.high}</div>
              <div className="text-sm text-gray-500">🔥 Yüksek (70+)</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-yellow-200">
              <div className="text-3xl font-bold text-yellow-600">{stats.medium}</div>
              <div className="text-sm text-gray-500">⭐ Orta (40-69)</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-red-200">
              <div className="text-3xl font-bold text-red-600">{stats.low}</div>
              <div className="text-sm text-gray-500">📉 Düşük (&lt;40)</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Skor</label>
                <select 
                  value={filter} 
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg bg-white"
                >
                  <option value="all">Tümü</option>
                  <option value="high">🔥 Yüksek (70+)</option>
                  <option value="medium">⭐ Orta (40-69)</option>
                  <option value="low">📉 Düşük (&lt;40)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select 
                  value={categoryFilter} 
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg bg-white"
                >
                  <option value="all">Tüm Kategoriler</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{getCategoryEmoji(cat)} {cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* News List */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-900">Haberler ({news.length})</h2>
            </div>
            
            {loading ? (
              <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
            ) : news.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Haber bulunamadı</div>
            ) : (
              <div className="divide-y">
                {news.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => setSelectedNews(item)}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0 ${getScoreColor(item.score)}`}>
                        {item.score}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-lg">{getCategoryEmoji(item.category)}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getScoreBg(item.score)}`}>
                            {item.category}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(item.status)}`}>
                            {item.status}
                          </span>
                          <span className="text-xs text-gray-400">{item.source}</span>
                        </div>
                        <h3 className="font-medium text-gray-900 line-clamp-1">{item.title_tr || item.title_en}</h3>
                        <p className="text-sm text-gray-500 line-clamp-1">{item.title_en}</p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          item.recommendation === 'SHARE' ? 'bg-green-100 text-green-700' :
                          item.recommendation === 'TEST' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {item.recommendation}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Modal */}
        {selectedNews && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold ${getScoreColor(selectedNews.score)}`}>
                      {selectedNews.score}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getCategoryEmoji(selectedNews.category)}</span>
                        <span className={`px-2 py-1 rounded text-sm font-medium ${getScoreBg(selectedNews.score)}`}>
                          {selectedNews.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{selectedNews.source}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedNews(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedNews.title_tr}</h2>
                <p className="text-gray-600 mb-4">{selectedNews.title_en}</p>

                {selectedNews.score_reason && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-600"><strong>Skor Nedeni:</strong> {selectedNews.score_reason}</p>
                  </div>
                )}

                {selectedNews.content_snippet && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-600">{selectedNews.content_snippet}</p>
                  </div>
                )}

                <div className="border-t pt-4 mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Durum Güncelle</label>
                  <div className="flex flex-wrap gap-2">
                    {['NEW', 'REVIEWING', 'APPROVED', 'PUBLISHED', 'REJECTED'].map(status => (
                      <button
                        key={status}
                        onClick={() => updateStatus(selectedNews.id, status)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedNews.status === status 
                            ? 'bg-red-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ETKINLIK kategorisi için Post Üret butonu */}
                {selectedNews.category === 'ETKINLIK' && (
                  <div className="border-t pt-4 mt-4">
                    <button
                      onClick={openPostGenerator}
                      className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 font-medium flex items-center justify-center gap-2"
                    >
                      📸 Instagram Post Üret
                    </button>
                  </div>
                )}

                <div className="border-t pt-4 mt-4">
                  <a
                    href={selectedNews.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    🔗 Haberi Oku →
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instagram Post Generator Modal */}
        {showPostGenerator && selectedNews && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                      <span className="text-white text-2xl">📸</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Instagram Post Uret</h2>
                      <p className="text-sm text-gray-500">Etkinlik icin gorsel olustur</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPostGenerator(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                {/* Başlık Önizleme */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Baslik (text_4)</label>
                  <p className="text-gray-900 font-medium">{selectedNews.title_tr}</p>
                </div>

                {/* Prompt Girişi */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Arka Plan Prompt'u (image_3)
                    </label>
                    <button
                      onClick={generatePromptWithAI}
                      disabled={isGeneratingPrompt}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 disabled:opacity-50 flex items-center gap-1"
                    >
                      {isGeneratingPrompt ? (
                        <>Oneriliyor...</>
                      ) : (
                        <>AI ile Oner</>
                      )}
                    </button>
                  </div>
                  <textarea
                    value={postPrompt}
                    onChange={(e) => setPostPrompt(e.target.value)}
                    placeholder="Arka plan gorseli icin prompt yazin veya AI'dan oneri alin..."
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={4}
                  />
                </div>

                {/* Üret Butonu */}
                <button
                  onClick={generateImage}
                  disabled={!postPrompt || isGeneratingImage}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-6"
                >
                  {isGeneratingImage ? (
                    <>Gorsel Olusturuluyor...</>
                  ) : (
                    <>Gorsel Uret</>
                  )}
                </button>

                {/* Önizleme */}
                {generatedImageUrl && (
                  <div className="border rounded-xl p-4 mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Onizleme</label>
                    <div className="relative">
                      <img
                        src={generatedImageUrl}
                        alt="Generated Instagram Post"
                        className="w-full rounded-lg shadow-lg"
                      />
                    </div>

                    {/* Aksiyon Butonları */}
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={generateImage}
                        disabled={isGeneratingImage}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        Yeniden Uret
                      </button>
                      <button
                        onClick={saveGeneratedPost}
                        disabled={isSaving}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isSaving ? (
                          <>Kaydediliyor...</>
                        ) : (
                          <>Kaydet</>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Görsel Oluştur Modal - Sadece arka plan görseli */}
        {showImageGenerator && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                      <span className="text-white text-2xl">🎨</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Gorsel Olustur</h2>
                      <p className="text-sm text-gray-500">Konuya uygun arka plan gorseli uret</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowImageGenerator(false)
                      setImagePrompt('')
                      setGeneratedBgImage(null)
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                {/* Prompt Girişi */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gorsel Konusu
                  </label>
                  <input
                    type="text"
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="Ornek: festival, party, soccer, concert, city..."
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyDown={(e) => e.key === 'Enter' && generateBackgroundImage()}
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Anahtar kelimeler: soccer, party, concert, festival, city, food, music, event...
                  </p>
                </div>

                {/* Üret Butonu */}
                <button
                  onClick={generateBackgroundImage}
                  disabled={!imagePrompt || isGeneratingBgImage}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-6"
                >
                  {isGeneratingBgImage ? (
                    <>Gorsel Araniyor...</>
                  ) : (
                    <>Gorsel Bul</>
                  )}
                </button>

                {/* Önizleme */}
                {generatedBgImage && (
                  <div className="border rounded-xl p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Onizleme</label>
                    <div className="relative">
                      <img
                        src={generatedBgImage}
                        alt="Generated Background"
                        className="w-full rounded-lg shadow-lg"
                      />
                    </div>

                    {/* Aksiyon Butonları */}
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={generateBackgroundImage}
                        disabled={isGeneratingBgImage}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        Baska Gorsel
                      </button>
                      <button
                        onClick={() => downloadImage(generatedBgImage, `gorsel_${Date.now()}.jpg`)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
                      >
                        Indir
                      </button>
                      <button
                        onClick={() => {
                          // Template editor'a gorseli gonderebiliriz
                          localStorage.setItem('backgroundImage', generatedBgImage)
                          router.push('/template-editor')
                        }}
                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center justify-center gap-2"
                      >
                        Post Yap
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
