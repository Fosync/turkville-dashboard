import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'

export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [formData, setFormData] = useState({ key: '', label_tr: '', badge_path: '' })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      setCategories(data.categories || [])
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const openNewModal = () => {
    setEditingCategory(null)
    setFormData({ key: '', label_tr: '', badge_path: '/images/turkvillelogo.png' })
    setError('')
    setShowModal(true)
  }

  const openEditModal = (category) => {
    setEditingCategory(category)
    setFormData({
      key: category.key,
      label_tr: category.label_tr,
      badge_path: category.badge_path
    })
    setError('')
    setShowModal(true)
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!formData.key && !editingCategory) {
      setError('Önce Key alanını doldurun')
      return
    }

    const key = editingCategory?.key || formData.key
    if (!key) {
      setError('Key gerekli')
      return
    }

    setUploading(true)
    setError('')

    try {
      const fd = new FormData()
      fd.append('badge', file)
      fd.append('key', key)

      const response = await fetch('/api/upload-badge', {
        method: 'POST',
        body: fd
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      setFormData(prev => ({ ...prev, badge_path: data.path }))
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      if (editingCategory) {
        // Update
        const response = await fetch(`/api/categories?id=${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label_tr: formData.label_tr,
            badge_path: formData.badge_path
          })
        })

        const data = await response.json()
        if (!response.ok) throw new Error(data.error)

        setCategories(prev => prev.map(c =>
          c.id === editingCategory.id ? data.category : c
        ))
      } else {
        // Create
        const response = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })

        const data = await response.json()
        if (!response.ok) throw new Error(data.error)

        setCategories(prev => [...prev, data.category])
      }

      setShowModal(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (category) => {
    try {
      const response = await fetch(`/api/categories?id=${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !category.is_active })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      setCategories(prev => prev.map(c =>
        c.id === category.id ? { ...c, is_active: !c.is_active } : c
      ))
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async (category) => {
    if (!confirm(`"${category.label_tr}" kategorisini silmek istediginize emin misiniz?`)) {
      return
    }

    try {
      const response = await fetch(`/api/categories?id=${category.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      setCategories(prev => prev.filter(c => c.id !== category.id))
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <>
      <Head>
        <title>Kategori Yonetimi - Turkville</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link href="/" className="text-gray-500 hover:text-gray-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
                <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">T</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Kategori Yonetimi</h1>
                  <p className="text-sm text-gray-500">Haber kategorilerini yonet</p>
                </div>
              </div>
              <button
                onClick={openNewModal}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 font-medium"
              >
                + Yeni Kategori
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-6xl mx-auto px-4 py-6">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Yukleniyor...</div>
            ) : categories.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>Henuz kategori yok.</p>
                <button
                  onClick={openNewModal}
                  className="mt-4 text-red-600 hover:text-red-700 font-medium"
                >
                  + Ilk kategoriyi ekle
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Badge</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Turkce</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sira</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Islem</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <img
                          src={category.badge_path || '/images/turkvillelogo.png'}
                          alt={category.label_tr}
                          className="w-10 h-10 object-contain rounded"
                          onError={(e) => { e.target.src = '/images/turkvillelogo.png' }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {category.key}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {category.label_tr}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(category)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            category.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {category.is_active ? 'Aktif' : 'Pasif'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-sm">
                        {category.sort_order}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEditModal(category)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Duzenle"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(category)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded ml-1"
                          title="Sil"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingCategory ? 'Kategori Duzenle' : 'Yeni Kategori'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Key <span className="text-gray-400">(BUYUK_HARF)</span>
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    key: e.target.value.toUpperCase().replace(/[^A-Z_]/g, '')
                  }))}
                  disabled={!!editingCategory}
                  className={`w-full px-3 py-2 border rounded-lg font-mono ${
                    editingCategory ? 'bg-gray-100 text-gray-500' : ''
                  }`}
                  placeholder="ORNEK_KATEGORI"
                  required
                />
              </div>

              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Turkce Etiket
                </label>
                <input
                  type="text"
                  value={formData.label_tr}
                  onChange={(e) => setFormData(prev => ({ ...prev, label_tr: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ornek Kategori"
                  required
                />
              </div>

              {/* Badge Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Badge Gorseli
                </label>
                <div className="flex items-center gap-4">
                  <img
                    src={formData.badge_path || '/images/turkvillelogo.png'}
                    alt="Badge"
                    className="w-16 h-16 object-contain border rounded-lg bg-gray-50"
                    onError={(e) => { e.target.src = '/images/turkvillelogo.png' }}
                  />
                  <div className="flex-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || (!formData.key && !editingCategory)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm"
                    >
                      {uploading ? 'Yukleniyor...' : 'Gorsel Sec'}
                    </button>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG veya WebP (max 5MB)
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Iptal
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {saving ? 'Kaydediliyor...' : (editingCategory ? 'Guncelle' : 'Ekle')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
