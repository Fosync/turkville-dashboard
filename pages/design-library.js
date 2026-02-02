import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'

const ASSET_TYPES = [
  { key: 'all', label: 'Tümü', icon: '📁' },
  { key: 'badge', label: 'Badge', icon: '🏷️' },
  { key: 'banner', label: 'Banner', icon: '📋' },
  { key: 'gradient', label: 'Gradient', icon: '🎨' },
  { key: 'logo', label: 'Logo', icon: '⭐' },
  { key: 'background', label: 'Arka Plan', icon: '🖼️' },
  { key: 'overlay', label: 'Overlay', icon: '🔲' },
  { key: 'icon', label: 'İkon', icon: '💠' },
  { key: 'frame', label: 'Çerçeve', icon: '🖼️' },
  { key: 'other', label: 'Diğer', icon: '📎' }
]

export default function DesignLibraryPage() {
  const [assets, setAssets] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState('all')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showAssetModal, setShowAssetModal] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [uploadForm, setUploadForm] = useState({ name: '', type: 'badge', tags: '' })
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)

  useEffect(() => {
    fetchAssets()
    fetchTemplates()
  }, [selectedType])

  const fetchAssets = async () => {
    try {
      const url = selectedType === 'all'
        ? '/api/design-assets'
        : `/api/design-assets?type=${selectedType}`
      const response = await fetch(url)
      const data = await response.json()
      setAssets(data.assets || [])
    } catch (err) {
      console.error('Fetch assets error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/design-templates')
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (err) {
      console.error('Fetch templates error:', err)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      if (!uploadForm.name) {
        setUploadForm(prev => ({
          ...prev,
          name: file.name.replace(/\.[^/.]+$/, '')
        }))
      }
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file)
      if (!uploadForm.name) {
        setUploadForm(prev => ({
          ...prev,
          name: file.name.replace(/\.[^/.]+$/, '')
        }))
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.name) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('name', uploadForm.name)
      formData.append('type', uploadForm.type)
      formData.append('tags', uploadForm.tags)

      const response = await fetch('/api/design-assets', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      setAssets(prev => [data.asset, ...prev])
      setShowUploadModal(false)
      setSelectedFile(null)
      setUploadForm({ name: '', type: 'badge', tags: '' })
    } catch (err) {
      alert('Yükleme hatası: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleAssetClick = (asset) => {
    setSelectedAsset(asset)
    setShowAssetModal(true)
  }

  const handleAssetUpdate = async (updates) => {
    try {
      const response = await fetch('/api/design-assets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedAsset.id, ...updates })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      setAssets(prev => prev.map(a => a.id === selectedAsset.id ? data.asset : a))
      setSelectedAsset(data.asset)
    } catch (err) {
      alert('Güncelleme hatası: ' + err.message)
    }
  }

  const handleAssetDelete = async () => {
    if (!confirm('Bu asset\'i silmek istediğinize emin misiniz?')) return

    try {
      const response = await fetch(`/api/design-assets?id=${selectedAsset.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      setAssets(prev => prev.filter(a => a.id !== selectedAsset.id))
      setShowAssetModal(false)
      setSelectedAsset(null)
    } catch (err) {
      alert('Silme hatası: ' + err.message)
    }
  }

  return (
    <>
      <Head>
        <title>Tasarım Kütüphanesi - Turkville</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link href="/" className="text-gray-500 hover:text-gray-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">🎨</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Tasarım Kütüphanesi</h1>
                  <p className="text-sm text-gray-500">Badge, banner, gradient ve diğer tasarım dosyaları</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 font-medium"
              >
                + Yeni Asset
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex gap-6">
            {/* Sol Panel - Filtreler */}
            <div className="w-48 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <h3 className="font-medium text-gray-900 mb-3">Tip</h3>
                <div className="space-y-1">
                  {ASSET_TYPES.map(type => (
                    <button
                      key={type.key}
                      onClick={() => setSelectedType(type.key)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                        selectedType === type.key
                          ? 'bg-purple-100 text-purple-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span>{type.icon}</span>
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sağ Panel - Asset Grid */}
            <div className="flex-1">
              {/* Assets */}
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-6">
                <div className="px-4 py-3 border-b bg-gray-50">
                  <h2 className="font-semibold text-gray-900">
                    Dosyalar ({assets.length})
                  </h2>
                </div>

                {loading ? (
                  <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
                ) : assets.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p>Henüz asset yok.</p>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="mt-4 text-purple-600 hover:text-purple-700 font-medium"
                    >
                      + İlk asset'i yükle
                    </button>
                  </div>
                ) : (
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {assets.map(asset => (
                      <div
                        key={asset.id}
                        onClick={() => handleAssetClick(asset)}
                        className="group bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition-colors border hover:border-purple-300"
                      >
                        <div className="aspect-square bg-white rounded-lg flex items-center justify-center mb-2 overflow-hidden border">
                          <img
                            src={asset.file_path}
                            alt={asset.name}
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => { e.target.style.display = 'none' }}
                          />
                        </div>
                        <div className="text-xs font-medium text-gray-900 truncate">
                          {asset.name}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <span className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">
                            {asset.type}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Templates */}
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">
                    Şablonlar ({templates.length})
                  </h2>
                </div>

                {templates.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p>Henüz şablon yok.</p>
                  </div>
                ) : (
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {templates.map(template => (
                      <div
                        key={template.id}
                        className="bg-gray-50 rounded-lg p-4 border hover:border-purple-300"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">📐</span>
                          <div>
                            <div className="font-medium text-gray-900">{template.name}</div>
                            <div className="text-xs text-gray-500">
                              {template.canvas_width}x{template.canvas_height}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-gray-200 rounded text-xs">
                            {template.type}
                          </span>
                          {template.is_default && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                              Varsayılan
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Yeni Asset Yükle</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setSelectedFile(null)
                  setUploadForm({ name: '', type: 'badge', tags: '' })
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Dosya Seçimi */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  dragOver ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                />
                {selectedFile ? (
                  <div>
                    <div className="text-4xl mb-2">✅</div>
                    <div className="font-medium text-gray-900">{selectedFile.name}</div>
                    <div className="text-sm text-gray-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-2">📁</div>
                    <div className="text-gray-600">Dosya sürükle veya tıkla</div>
                    <div className="text-sm text-gray-400">PNG, JPG, SVG, WEBP (max 5MB)</div>
                  </div>
                )}
              </div>

              {/* Ad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad</label>
                <input
                  type="text"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Asset adı"
                />
              </div>

              {/* Tip */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tip</label>
                <select
                  value={uploadForm.type}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {ASSET_TYPES.filter(t => t.key !== 'all').map(type => (
                    <option key={type.key} value={type.key}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Etiketler */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Etiketler <span className="text-gray-400">(virgülle ayır)</span>
                </label>
                <input
                  type="text"
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="etiket1, etiket2"
                />
              </div>

              {/* Butonlar */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowUploadModal(false)
                    setSelectedFile(null)
                    setUploadForm({ name: '', type: 'badge', tags: '' })
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || !uploadForm.name || uploading}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {uploading ? 'Yükleniyor...' : 'Yükle'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Asset Detail Modal */}
      {showAssetModal && selectedAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Asset Detayı</h2>
              <button
                onClick={() => { setShowAssetModal(false); setSelectedAsset(null) }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Önizleme */}
              <div className="bg-gray-100 rounded-lg p-4 mb-4 flex items-center justify-center" style={{ minHeight: 200 }}>
                <img
                  src={selectedAsset.file_path}
                  alt={selectedAsset.name}
                  className="max-w-full max-h-48 object-contain"
                />
              </div>

              {/* Bilgiler */}
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ad</label>
                  <input
                    type="text"
                    value={selectedAsset.name}
                    onChange={(e) => setSelectedAsset(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tip</label>
                  <select
                    value={selectedAsset.type}
                    onChange={(e) => setSelectedAsset(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {ASSET_TYPES.filter(t => t.key !== 'all').map(type => (
                      <option key={type.key} value={type.key}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dosya Yolu</label>
                  <input
                    type="text"
                    value={selectedAsset.file_path}
                    readOnly
                    className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={selectedAsset.is_active}
                    onChange={(e) => setSelectedAsset(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">Aktif</label>
                </div>
              </div>

              {/* Butonlar */}
              <div className="flex gap-3">
                <button
                  onClick={handleAssetDelete}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                >
                  Sil
                </button>
                <div className="flex-1"></div>
                <button
                  onClick={() => { setShowAssetModal(false); setSelectedAsset(null) }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleAssetUpdate({
                    name: selectedAsset.name,
                    type: selectedAsset.type,
                    is_active: selectedAsset.is_active
                  })}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
