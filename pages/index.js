import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

export default function Dashboard() {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedNews, setSelectedNews] = useState(null)
  const [filter, setFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [stats, setStats] = useState({ total: 0, high: 0, medium: 0, low: 0 })

  useEffect(() => {
    fetchNews()
  }, [filter, categoryFilter])

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
              <button 
                onClick={fetchNews}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                🔄 Yenile
              </button>
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
      </div>
    </>
  )
}
