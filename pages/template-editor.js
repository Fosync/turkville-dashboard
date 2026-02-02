import { useState, useRef, useCallback, useEffect } from 'react'
import { Rnd } from 'react-rnd'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

const GEMINI_API_KEY = 'AIzaSyB5w3fvek5gkxhcZIe_5r8XKtgQHKz8Nws'

const PRESET_SIZES = [
  { id: 'instagram-post', name: 'Instagram Post', width: 1080, height: 1350 },
  { id: 'instagram-story', name: 'Instagram Story', width: 1080, height: 1920 },
  { id: 'instagram-square', name: 'Instagram Carousel', width: 1080, height: 1080 },
  { id: 'twitter', name: 'Twitter Post', width: 1200, height: 675 },
  { id: 'facebook', name: 'Facebook Post', width: 1200, height: 630 }
]

const FONTS = [
  { name: 'Gilroy', value: "'Gilroy', sans-serif" },
  { name: 'Inter', value: "'Inter', sans-serif" },
  { name: 'Montserrat', value: "'Montserrat', sans-serif" },
  { name: 'Oswald', value: "'Oswald', sans-serif" },
  { name: 'Roboto', value: "'Roboto', sans-serif" }
]

const FONT_WEIGHTS = [
  { label: 'Thin', value: 100 },
  { label: 'Light', value: 300 },
  { label: 'Normal', value: 400 },
  { label: 'Medium', value: 500 },
  { label: 'Semibold', value: 600 },
  { label: 'Bold', value: 700 },
  { label: 'ExtraBold', value: 800 },
  { label: 'Black', value: 900 }
]

const TEMPLATE_MODES = [
  { id: 'visual', name: 'Görsel Haber' },
  { id: 'text', name: 'Metin Haber' }
]

const BG_COLORS = [
  { name: 'Kırmızı', value: '#dc2626' },
  { name: 'Mavi', value: '#2563eb' },
  { name: 'Yeşil', value: '#16a34a' },
  { name: 'Mor', value: '#7c3aed' },
  { name: 'Turuncu', value: '#ea580c' },
  { name: 'Siyah', value: '#1a1a1a' },
  { name: 'Lacivert', value: '#1e3a5f' }
]

// Gradient presets
const GRADIENT_PRESETS = [
  { name: 'Koyu', startColor: 'rgba(0,0,0,0.9)', endColor: 'rgba(0,0,0,0)', direction: 'to top' },
  { name: 'Mavi', startColor: 'rgba(30,58,138,0.9)', endColor: 'rgba(30,58,138,0)', direction: 'to top' },
  { name: 'Kırmızı', startColor: 'rgba(185,28,28,0.9)', endColor: 'rgba(185,28,28,0)', direction: 'to top' },
  { name: 'Yeşil', startColor: 'rgba(22,101,52,0.9)', endColor: 'rgba(22,101,52,0)', direction: 'to top' },
  { name: 'Mor', startColor: 'rgba(88,28,135,0.9)', endColor: 'rgba(88,28,135,0)', direction: 'to top' }
]

const GRADIENT_DIRECTIONS = [
  { name: 'Yukarı', value: 'to top' },
  { name: 'Aşağı', value: 'to bottom' },
  { name: 'Sola', value: 'to left' },
  { name: 'Sağa', value: 'to right' },
  { name: 'Çapraz ↗', value: 'to top right' },
  { name: 'Çapraz ↖', value: 'to top left' }
]

export default function TemplateEditor() {
  // Canvas state
  const [canvasWidth, setCanvasWidth] = useState(1080)
  const [canvasHeight, setCanvasHeight] = useState(1350)
  const [scale, setScale] = useState(0.5)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [spacePressed, setSpacePressed] = useState(false)
  const [shiftPressed, setShiftPressed] = useState(false)
  const [dragStartPos, setDragStartPos] = useState(null) // Shift ile eksen kilitleme için

  // Selection & editing
  const [selectedIds, setSelectedIds] = useState([])
  const [editingTextId, setEditingTextId] = useState(null)
  const [renamingId, setRenamingId] = useState(null)

  // UI toggles
  const [showGrid, setShowGrid] = useState(false)
  const [showRuler, setShowRuler] = useState(true)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [smartGuides, setSmartGuides] = useState({ x: null, y: null })

  // History (Undo/Redo)
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Modals
  const [showAIModal, setShowAIModal] = useState(false)
  const [showTemplateList, setShowTemplateList] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [contextMenu, setContextMenu] = useState(null)

  // Export options
  const [exportFormat, setExportFormat] = useState('png')
  const [exportQuality, setExportQuality] = useState('high')
  const [exportScale, setExportScale] = useState(1)
  const [isExporting, setIsExporting] = useState(false)

  // AI
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiError, setAiError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // Data
  const [savedTemplates, setSavedTemplates] = useState([])
  const [uploadedImages, setUploadedImages] = useState([])
  const [clipboard, setClipboard] = useState(null)
  const [dragOverCanvas, setDragOverCanvas] = useState(false)

  // Design Library
  const [libraryAssets, setLibraryAssets] = useState([])
  const [libraryFilter, setLibraryFilter] = useState('all')
  const [libraryTab, setLibraryTab] = useState('library') // 'library' | 'uploads'
  const [selectedCategory, setSelectedCategory] = useState('HABER')

  // Template
  const [templateMode, setTemplateMode] = useState('visual')
  const [bgColor, setBgColor] = useState('#dc2626')
  const [presetSize, setPresetSize] = useState('instagram-post')
  const [backgroundUrl, setBackgroundUrl] = useState('')

  // Counters
  const [imageCounter, setImageCounter] = useState(1)
  const [shapeCounter, setShapeCounter] = useState(1)

  // Kategoriler (DB'den)
  const [categoriesDB, setCategoriesDB] = useState([])

  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)
  const canvasContainerRef = useRef(null)

  // Elements - Beyaz arka plan + tüm elementler kilitsiz
  const getVisualElements = () => [
    { id: 'whiteBg', type: 'color', name: '[BG] Çalışma Alanı', color: '#FFFFFF',
      x: 0, y: 0, width: canvasWidth, height: canvasHeight, zIndex: 0, opacity: 100, locked: false, visible: true },
    { id: 'gradient', type: 'gradient', name: '[FX] Gradient',
      x: 0, y: 0, width: canvasWidth, height: canvasHeight, zIndex: 2, opacity: 100,
      locked: false, visible: true, rotation: 0,
      gradientStartColor: '#000000', gradientEndColor: '#000000',
      gradientStartOpacity: 90, gradientEndOpacity: 0,
      gradientStartPos: 0, gradientEndPos: 60,
      gradientDirection: 'to top' },
    { id: 'badge', type: 'image', name: '[UI] Etiket', src: '/images/Turkville_haber.png',
      x: 30, y: 30, width: 180, height: 60, zIndex: 10, opacity: 100, locked: false, visible: true, rotation: 0, objectFit: 'contain' },
    { id: 'title', type: 'text', name: '[TXT] Başlık', text: 'ÖRNEK ETKİNLİK BAŞLIĞI',
      x: 30, y: canvasHeight - 250, width: canvasWidth - 60, height: 150, zIndex: 11, opacity: 100,
      fontSize: 52, fontWeight: 800, fontFamily: "'Gilroy', sans-serif", color: '#FFFFFF',
      textAlign: 'left', lineHeight: 1.15, letterSpacing: 0, textTransform: 'uppercase',
      locked: false, visible: true, rotation: 0, shadow: true },
    { id: 'banner', type: 'image', name: '[UI] Banner', src: '/images/banner.png',
      x: 0, y: canvasHeight - 100, width: canvasWidth, height: 100, zIndex: 12,
      opacity: 100, locked: false, visible: true, rotation: 0, objectFit: 'contain' }
  ]

  const getTextElements = () => [
    { id: 'whiteBg', type: 'color', name: '[BG] Çalışma Alanı', color: '#FFFFFF',
      x: 0, y: 0, width: canvasWidth, height: canvasHeight, zIndex: 0, opacity: 100, locked: false, visible: true },
    { id: 'colorBg', type: 'color', name: '[BG] Renk', color: bgColor,
      x: 0, y: 0, width: canvasWidth, height: canvasHeight, zIndex: 1, opacity: 100, locked: false, visible: true },
    { id: 'badge', type: 'image', name: '[UI] Etiket', src: '/images/Turkville_haber.png',
      x: 30, y: 30, width: 180, height: 60, zIndex: 10, opacity: 100, locked: false, visible: true, rotation: 0, objectFit: 'contain' },
    { id: 'title', type: 'text', name: '[TXT] İçerik', text: 'UZUN METİN HABERİ',
      x: 30, y: 150, width: canvasWidth - 60, height: canvasHeight - 300, zIndex: 11, opacity: 100,
      fontSize: 48, fontWeight: 700, fontFamily: "'Gilroy', sans-serif", color: '#FFFFFF',
      textAlign: 'left', lineHeight: 1.3, letterSpacing: 0, textTransform: 'uppercase',
      locked: false, visible: true, rotation: 0, shadow: false },
    { id: 'banner', type: 'image', name: '[UI] Banner', src: '/images/banner.png',
      x: 0, y: canvasHeight - 100, width: canvasWidth, height: 100, zIndex: 12,
      opacity: 100, locked: false, visible: true, rotation: 0, objectFit: 'contain' }
  ]

  const [elements, setElements] = useState(() => getVisualElements())

  const selectedId = selectedIds[0]
  const selectedElement = elements.find(e => e.id === selectedId)

  // Template mode change
  useEffect(() => {
    setElements(templateMode === 'visual' ? getVisualElements() : getTextElements())
    setHistory([])
    setHistoryIndex(-1)
  }, [templateMode])

  // Kategorileri DB'den çek
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories')
        const data = await response.json()
        setCategoriesDB(data.categories || [])
      } catch (error) {
        console.error('fetchCategories error:', error)
      }
    }
    fetchCategories()
  }, [])

  // Design Library assets'lerini çek
  useEffect(() => {
    const fetchLibraryAssets = async () => {
      try {
        const response = await fetch('/api/design-assets')
        const data = await response.json()
        setLibraryAssets(data.assets || [])
      } catch (error) {
        console.error('fetchLibraryAssets error:', error)
      }
    }
    fetchLibraryAssets()
  }, [])

  // Kategori badge'ini bul
  const getCategoryBadge = (key) => {
    const cat = categoriesDB.find(c => c.key === key)
    return cat?.badge_path || '/images/turkvillelogo.png'
  }

  // Kategori değişince badge'i güncelle
  const handleCategoryChange = (categoryKey) => {
    setSelectedCategory(categoryKey)
    const badgePath = getCategoryBadge(categoryKey)
    // Badge elementini güncelle
    setElements(prev => prev.map(el => {
      if (el.id === 'badge') {
        return { ...el, src: badgePath }
      }
      return el
    }))
  }

  // Kütüphaneden asset ekle
  const addLibraryAsset = (asset) => {
    if (asset.type === 'badge') {
      // Badge'i değiştir
      setElements(prev => prev.map(el => {
        if (el.id === 'badge') {
          return { ...el, src: asset.file_path, name: `[UI] ${asset.name}` }
        }
        return el
      }))
    } else if (asset.type === 'banner') {
      // Banner'ı değiştir
      setElements(prev => prev.map(el => {
        if (el.id === 'banner') {
          return { ...el, src: asset.file_path, name: `[UI] ${asset.name}` }
        }
        return el
      }))
    } else if (asset.type === 'gradient') {
      // Gradient overlay olarak ekle
      setElements(prev => prev.map(el => {
        if (el.id === 'gradient') {
          return { ...el, type: 'overlay', src: asset.file_path, name: `[FX] ${asset.name}` }
        }
        return el
      }))
    } else if (asset.type === 'background') {
      // Arka plan olarak ayarla
      setBackgroundUrl(asset.file_path)
    } else {
      // Diğerleri yeni element olarak ekle
      addElement('image', {
        src: asset.file_path,
        name: asset.name,
        width: asset.width || 200,
        height: asset.height || 200
      })
    }
  }

  // Filtrelenmiş kütüphane assets
  const filteredLibraryAssets = libraryFilter === 'all'
    ? libraryAssets
    : libraryAssets.filter(a => a.type === libraryFilter)

  // Load background image from localStorage (from "Gorsel Olustur")
  useEffect(() => {
    const savedBg = localStorage.getItem('backgroundImage')
    if (savedBg) {
      setBackgroundUrl(savedBg)
      setTemplateMode('visual')
      localStorage.removeItem('backgroundImage')
    }
  }, [])

  // Load editor data from carousel modal
  useEffect(() => {
    const editorDataStr = localStorage.getItem('editorData')
    if (editorDataStr) {
      try {
        const editorData = JSON.parse(editorDataStr)
        console.log('Loading editor data:', editorData)

        // Arka plan görselini ayarla
        if (editorData.backgroundUrl) {
          setBackgroundUrl(editorData.backgroundUrl)
        }

        // Mode ayarla
        if (editorData.mode) {
          setTemplateMode(editorData.mode)
        }

        // Başlık metnini ve kategori badge'ini güncelle
        setElements(prev => prev.map(el => {
          if (el.id === 'title' && editorData.title) {
            return { ...el, text: editorData.title }
          }
          if (el.id === 'badge' && editorData.category) {
            // DB'den badge'i bul, yoksa fallback kullan
            const cat = categoriesDB.find(c => c.key === editorData.category)
            const badgeSrc = cat?.badge_path || '/images/turkvillelogo.png'
            return { ...el, src: badgeSrc }
          }
          return el
        }))

        // Temizle - bir kere kullanıldıktan sonra
        localStorage.removeItem('editorData')
      } catch (e) {
        console.error('Error parsing editorData:', e)
        localStorage.removeItem('editorData')
      }
    }
  }, [categoriesDB])

  // Save to history
  const saveHistory = useCallback((newElements) => {
    const json = JSON.stringify(newElements)
    setHistory(prev => {
      const newHistory = [...prev.slice(0, historyIndex + 1), json].slice(-50)
      setHistoryIndex(newHistory.length - 1)
      return newHistory
    })
  }, [historyIndex])

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setElements(JSON.parse(history[newIndex]))
    }
  }, [historyIndex, history])

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setElements(JSON.parse(history[newIndex]))
    }
  }, [historyIndex, history])

  // Update element
  const updateElement = useCallback((id, updates, skipHistory = false) => {
    setElements(prev => {
      const newElements = prev.map(el => el.id === id ? { ...el, ...updates } : el)
      if (!skipHistory) saveHistory(newElements)
      return newElements
    })
  }, [saveHistory])

  // Delete element
  const deleteElement = useCallback((id) => {
    if (!id) return
    setElements(prev => {
      const newElements = prev.filter(el => el.id !== id)
      saveHistory(newElements)
      return newElements
    })
    setSelectedIds(prev => prev.filter(i => i !== id))
  }, [saveHistory])

  // Copy element
  const copyElement = useCallback(() => {
    const el = elements.find(e => e.id === selectedId)
    if (el) {
      setClipboard({ ...el })
      console.log('Copied:', el.name)
    }
  }, [elements, selectedId])

  // Paste element
  const pasteElement = useCallback(() => {
    if (!clipboard) return
    const newId = `${clipboard.type}-${Date.now()}`
    const newEl = { ...clipboard, id: newId, name: clipboard.name + ' (kopya)', x: clipboard.x + 20, y: clipboard.y + 20, zIndex: elements.length + 1 }
    setElements(prev => {
      const newElements = [...prev, newEl]
      saveHistory(newElements)
      return newElements
    })
    setSelectedIds([newId])
  }, [clipboard, elements, saveHistory])

  // Add element
  const addElement = useCallback((type, options = {}) => {
    const id = `${type}-${Date.now()}`
    let name = options.name || (
      type === 'text' ? 'Yeni Metin' :
      type === 'rect' ? `Dikdörtgen ${shapeCounter}` :
      type === 'circle' ? `Daire ${shapeCounter}` :
      type === 'line' ? `Çizgi ${shapeCounter}` :
      type === 'color' ? 'Renk Katmanı' :
      `Görsel ${imageCounter}`
    )

    if (type === 'image') setImageCounter(prev => prev + 1)
    if (['rect', 'circle', 'line'].includes(type)) setShapeCounter(prev => prev + 1)

    const baseProps = { id, name, x: 100, y: 100, zIndex: elements.length + 1, opacity: 100, locked: false, visible: true, rotation: 0 }

    let newElement
    if (type === 'text') {
      newElement = { ...baseProps, type: 'text', width: 400, height: 100, text: 'Yeni Metin',
        fontSize: 36, fontWeight: 600, fontFamily: "'Gilroy', sans-serif", color: '#FFFFFF',
        textAlign: 'left', lineHeight: 1.2, letterSpacing: 0, textTransform: 'none', shadow: true }
    } else if (type === 'rect') {
      newElement = { ...baseProps, type: 'rect', width: 200, height: 150,
        fill: '#3b82f6', stroke: '#1d4ed8', strokeWidth: 0, borderRadius: 0 }
    } else if (type === 'circle') {
      newElement = { ...baseProps, type: 'circle', width: 150, height: 150,
        fill: '#8b5cf6', stroke: '#6d28d9', strokeWidth: 0 }
    } else if (type === 'line') {
      newElement = { ...baseProps, type: 'line', width: 200, height: 4,
        fill: '#ffffff', strokeWidth: 4 }
    } else if (type === 'color') {
      newElement = { ...baseProps, type: 'color', width: canvasWidth, height: canvasHeight, color: '#dc2626' }
    } else {
      newElement = { ...baseProps, type: 'image', width: 200, height: 200, src: options.src || '', objectFit: 'contain' }
    }

    setElements(prev => {
      const newElements = [...prev, { ...newElement, ...options }]
      saveHistory(newElements)
      return newElements
    })
    setSelectedIds([id])
    return id
  }, [elements, imageCounter, shapeCounter, canvasWidth, canvasHeight, saveHistory])

  // Move layer
  const moveLayer = useCallback((id, direction) => {
    setElements(prev => {
      const index = prev.findIndex(e => e.id === id)
      if (index === -1) return prev
      const newIndex = direction === 'up' ? index + 1 : index - 1
      if (newIndex < 0 || newIndex >= prev.length) return prev
      const newElements = [...prev]
      const [removed] = newElements.splice(index, 1)
      newElements.splice(newIndex, 0, removed)
      return newElements.map((el, i) => ({ ...el, zIndex: i + 1 }))
    })
  }, [])

  // Align element
  const alignElement = useCallback((direction) => {
    if (!selectedId) return
    const el = elements.find(e => e.id === selectedId)
    if (!el) return

    let updates = {}
    switch(direction) {
      case 'left': updates.x = 0; break
      case 'center': updates.x = (canvasWidth - el.width) / 2; break
      case 'right': updates.x = canvasWidth - el.width; break
      case 'top': updates.y = 0; break
      case 'middle': updates.y = (canvasHeight - el.height) / 2; break
      case 'bottom': updates.y = canvasHeight - el.height; break
    }
    updateElement(selectedId, updates)
  }, [selectedId, elements, canvasWidth, canvasHeight, updateElement])

  // Fit to screen
  const fitToScreen = useCallback(() => {
    if (!canvasContainerRef.current) return
    const container = canvasContainerRef.current
    const maxScale = Math.min(
      (container.clientWidth - 100) / canvasWidth,
      (container.clientHeight - 100) / canvasHeight
    )
    setScale(Math.min(Math.max(maxScale, 0.1), 1))
    setPanOffset({ x: 0, y: 0 })
  }, [canvasWidth, canvasHeight])

  // Keyboard events
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Shift for axis lock
      if (e.shiftKey) {
        setShiftPressed(true)
      }

      // Space for pan mode
      if (e.code === 'Space' && !editingTextId) {
        e.preventDefault()
        setSpacePressed(true)
        return
      }

      // Skip if editing text
      if (editingTextId || renamingId) {
        if (e.key === 'Escape') {
          setEditingTextId(null)
          setRenamingId(null)
        }
        return
      }

      const el = elements.find(e => e.id === selectedId)

      // Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault()
        deleteElement(selectedId)
        return
      }

      // Undo/Redo
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); return }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); return }

      // Copy/Paste
      if (e.ctrlKey && e.key === 'c' && selectedId) { e.preventDefault(); copyElement(); return }
      if (e.ctrlKey && e.key === 'v') { e.preventDefault(); pasteElement(); return }

      // Duplicate
      if (e.ctrlKey && e.key === 'd' && selectedId) {
        e.preventDefault()
        copyElement()
        setTimeout(pasteElement, 10)
        return
      }

      // Arrow keys
      if (el && !el.locked && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const updates = {}
        if (e.key === 'ArrowUp') updates.y = el.y - step
        if (e.key === 'ArrowDown') updates.y = el.y + step
        if (e.key === 'ArrowLeft') updates.x = el.x - step
        if (e.key === 'ArrowRight') updates.x = el.x + step
        updateElement(selectedId, updates)
      }

      // Escape
      if (e.key === 'Escape') {
        setSelectedIds([])
        setContextMenu(null)
      }
    }

    const handleKeyUp = (e) => {
      if (e.code === 'Space') setSpacePressed(false)
      if (!e.shiftKey) {
        setShiftPressed(false)
        setDragStartPos(null) // Reset drag start when shift released
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [selectedId, elements, editingTextId, renamingId, deleteElement, undo, redo, copyElement, pasteElement, updateElement])

  // Mouse wheel zoom
  useEffect(() => {
    const handleWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.05 : 0.05
        setScale(prev => Math.min(Math.max(prev + delta, 0.1), 2))
      }
    }

    const container = canvasContainerRef.current
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false })
      return () => container.removeEventListener('wheel', handleWheel)
    }
  }, [])

  // Pan handling
  const handlePanStart = (e) => {
    if (spacePressed) {
      setIsPanning(true)
      e.preventDefault()
    }
  }

  const handlePanMove = (e) => {
    if (isPanning) {
      setPanOffset(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }))
    }
  }

  const handlePanEnd = () => setIsPanning(false)

  // Context menu
  const handleContextMenu = (e, id) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedIds([id])
    setContextMenu({ x: e.clientX, y: e.clientY, elementId: id })
  }

  const closeContextMenu = () => setContextMenu(null)

  // Context menu actions
  const contextMenuActions = [
    { label: '📋 Kopyala', shortcut: 'Ctrl+C', action: () => { copyElement(); closeContextMenu() } },
    { label: '📄 Yapıştır', shortcut: 'Ctrl+V', action: () => { pasteElement(); closeContextMenu() } },
    { label: '🗑️ Sil', shortcut: 'Del', action: () => { deleteElement(contextMenu?.elementId); closeContextMenu() } },
    { divider: true },
    { label: '⬆️ Öne Getir', action: () => { moveLayer(contextMenu?.elementId, 'up'); closeContextMenu() } },
    { label: '⬇️ Arkaya Gönder', action: () => { moveLayer(contextMenu?.elementId, 'down'); closeContextMenu() } },
    { divider: true },
    { label: selectedElement?.locked ? '🔓 Kilidi Aç' : '🔒 Kilitle', action: () => { updateElement(contextMenu?.elementId, { locked: !selectedElement?.locked }); closeContextMenu() } }
  ]

  // Element click
  const handleElementClick = (e, id) => {
    e.stopPropagation()
    if (e.shiftKey) {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
    } else {
      setSelectedIds([id])
    }
  }

  // Canvas click
  const handleCanvasClick = (e) => {
    if (e.target === canvasRef.current || e.target.classList.contains('canvas-bg')) {
      setSelectedIds([])
      setEditingTextId(null)
      closeContextMenu()
    }
  }

  // SVG Parser - SVG'yi katmanlara ayır
  const parseSvgToLayers = (svgContent, fileName) => {
    try {
      console.log('Parsing SVG...')
      const parser = new DOMParser()
      const doc = parser.parseFromString(svgContent, 'image/svg+xml')
      const svg = doc.querySelector('svg')

      // Parse hatası kontrolü
      const parseError = doc.querySelector('parsererror')
      if (parseError) {
        console.error('SVG Parse Error:', parseError.textContent)
        return null
      }

      if (!svg) {
        console.error('No SVG element found')
        return null
      }

      // SVG viewBox veya width/height al
      const viewBoxAttr = svg.getAttribute('viewBox')
      const viewBox = viewBoxAttr ? viewBoxAttr.split(/[\s,]+/).map(Number) : [0, 0, 1080, 1350]
      const svgWidth = parseFloat(svg.getAttribute('width')) || viewBox[2] || 1080
      const svgHeight = parseFloat(svg.getAttribute('height')) || viewBox[3] || 1350

      console.log('SVG dimensions:', { svgWidth, svgHeight, viewBox })
      console.log('Canvas dimensions:', { canvasWidth, canvasHeight })

      // Scale factor - canvas boyutuna göre
      const scaleX = canvasWidth / svgWidth
      const scaleY = canvasHeight / svgHeight
      const scaleFactor = Math.min(scaleX, scaleY, 1)
      console.log('Scale factor:', scaleFactor)

      const newElements = []
      let layerIndex = 0

      // Tüm görünür elementleri bul
      const processElement = (el, parentTransform = '') => {
        const tagName = el.tagName?.toLowerCase()
        if (!tagName) return

        // Gizli elementleri atla
        const display = el.getAttribute('display')
        const visibility = el.getAttribute('visibility')
        if (display === 'none' || visibility === 'hidden') return

        // Transform al
        const transform = el.getAttribute('transform') || ''
        const fullTransform = parentTransform + ' ' + transform

        // Group ise çocukları işle
        if (tagName === 'g') {
          Array.from(el.children).forEach(child => processElement(child, fullTransform))
          return
        }

        // Defs, style, script atla
        if (['defs', 'style', 'script', 'clippath', 'mask', 'lineargradient', 'radialgradient', 'pattern'].includes(tagName)) return

        const id = `svg-${Date.now()}-${layerIndex++}`
        const elName = el.getAttribute('id') || el.getAttribute('class') || `${tagName}-${layerIndex}`

        // Element tipine göre işle
        if (tagName === 'rect') {
          const x = (parseFloat(el.getAttribute('x')) || 0) * scaleFactor
          const y = (parseFloat(el.getAttribute('y')) || 0) * scaleFactor
          const width = (parseFloat(el.getAttribute('width')) || 100) * scaleFactor
          const height = (parseFloat(el.getAttribute('height')) || 100) * scaleFactor
          const fill = el.getAttribute('fill') || '#000000'
          const stroke = el.getAttribute('stroke') || 'none'
          const strokeWidth = parseFloat(el.getAttribute('stroke-width')) || 0
          const rx = parseFloat(el.getAttribute('rx')) || 0

          newElements.push({
            id, name: `[SVG] ${elName}`, type: 'rect',
            x, y, width, height,
            fill: fill === 'none' ? 'transparent' : fill,
            stroke: stroke === 'none' ? 'transparent' : stroke,
            strokeWidth: strokeWidth * scaleFactor,
            borderRadius: rx * scaleFactor,
            zIndex: elements.length + layerIndex,
            opacity: parseFloat(el.getAttribute('opacity') || el.style?.opacity || 1) * 100,
            locked: false, visible: true, rotation: 0
          })
        }
        else if (tagName === 'circle') {
          const cx = (parseFloat(el.getAttribute('cx')) || 0) * scaleFactor
          const cy = (parseFloat(el.getAttribute('cy')) || 0) * scaleFactor
          const r = (parseFloat(el.getAttribute('r')) || 50) * scaleFactor
          const fill = el.getAttribute('fill') || '#000000'

          newElements.push({
            id, name: `[SVG] ${elName}`, type: 'circle',
            x: cx - r, y: cy - r, width: r * 2, height: r * 2,
            fill: fill === 'none' ? 'transparent' : fill,
            stroke: el.getAttribute('stroke') || 'transparent',
            strokeWidth: (parseFloat(el.getAttribute('stroke-width')) || 0) * scaleFactor,
            zIndex: elements.length + layerIndex,
            opacity: parseFloat(el.getAttribute('opacity') || 1) * 100,
            locked: false, visible: true, rotation: 0
          })
        }
        else if (tagName === 'ellipse') {
          const cx = (parseFloat(el.getAttribute('cx')) || 0) * scaleFactor
          const cy = (parseFloat(el.getAttribute('cy')) || 0) * scaleFactor
          const rx = (parseFloat(el.getAttribute('rx')) || 50) * scaleFactor
          const ry = (parseFloat(el.getAttribute('ry')) || 50) * scaleFactor
          const fill = el.getAttribute('fill') || '#000000'

          newElements.push({
            id, name: `[SVG] ${elName}`, type: 'circle',
            x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2,
            fill: fill === 'none' ? 'transparent' : fill,
            stroke: el.getAttribute('stroke') || 'transparent',
            strokeWidth: (parseFloat(el.getAttribute('stroke-width')) || 0) * scaleFactor,
            zIndex: elements.length + layerIndex,
            opacity: parseFloat(el.getAttribute('opacity') || 1) * 100,
            locked: false, visible: true, rotation: 0
          })
        }
        else if (tagName === 'text') {
          const x = (parseFloat(el.getAttribute('x')) || 0) * scaleFactor
          const y = (parseFloat(el.getAttribute('y')) || 0) * scaleFactor
          const fontSize = parseFloat(el.getAttribute('font-size') || el.style?.fontSize || 16) * scaleFactor
          const fill = el.getAttribute('fill') || '#000000'
          const text = el.textContent || ''

          newElements.push({
            id, name: `[SVG] ${elName}`, type: 'text',
            x, y: y - fontSize, width: text.length * fontSize * 0.6, height: fontSize * 1.5,
            text,
            fontSize: Math.round(fontSize),
            fontWeight: parseInt(el.getAttribute('font-weight')) || 400,
            fontFamily: el.getAttribute('font-family') || "'Inter', sans-serif",
            color: fill === 'none' ? '#000000' : fill,
            textAlign: 'left', lineHeight: 1.2, letterSpacing: 0,
            zIndex: elements.length + layerIndex,
            opacity: parseFloat(el.getAttribute('opacity') || 1) * 100,
            locked: false, visible: true, rotation: 0, shadow: false
          })
        }
        else if (tagName === 'line') {
          const x1 = (parseFloat(el.getAttribute('x1')) || 0) * scaleFactor
          const y1 = (parseFloat(el.getAttribute('y1')) || 0) * scaleFactor
          const x2 = (parseFloat(el.getAttribute('x2')) || 100) * scaleFactor
          const y2 = (parseFloat(el.getAttribute('y2')) || 0) * scaleFactor
          const stroke = el.getAttribute('stroke') || '#000000'

          newElements.push({
            id, name: `[SVG] ${elName}`, type: 'line',
            x: Math.min(x1, x2), y: Math.min(y1, y2),
            width: Math.abs(x2 - x1) || 100, height: Math.abs(y2 - y1) || 4,
            fill: stroke,
            strokeWidth: (parseFloat(el.getAttribute('stroke-width')) || 2) * scaleFactor,
            zIndex: elements.length + layerIndex,
            opacity: parseFloat(el.getAttribute('opacity') || 1) * 100,
            locked: false, visible: true, rotation: 0
          })
        }
        else if (tagName === 'image') {
          const x = (parseFloat(el.getAttribute('x')) || 0) * scaleFactor
          const y = (parseFloat(el.getAttribute('y')) || 0) * scaleFactor
          const width = (parseFloat(el.getAttribute('width')) || 100) * scaleFactor
          const height = (parseFloat(el.getAttribute('height')) || 100) * scaleFactor
          const href = el.getAttribute('href') || el.getAttribute('xlink:href') || ''

          newElements.push({
            id, name: `[SVG] ${elName}`, type: 'image',
            x, y, width, height,
            src: href,
            objectFit: 'contain',
            zIndex: elements.length + layerIndex,
            opacity: parseFloat(el.getAttribute('opacity') || 1) * 100,
            locked: false, visible: true, rotation: 0
          })
        }
        else if (['path', 'polygon', 'polyline'].includes(tagName)) {
          // Path/Polygon/Polyline - SVG olarak embed et
          // getBBox DOM dışında çalışmaz, manuel hesapla veya tam SVG kullan
          const serializer = new XMLSerializer()

          // Tüm SVG'yi viewBox ile wrap et
          const wrapperSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          wrapperSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
          wrapperSvg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`)
          wrapperSvg.setAttribute('width', svgWidth)
          wrapperSvg.setAttribute('height', svgHeight)
          wrapperSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet')

          const clonedEl = el.cloneNode(true)
          wrapperSvg.appendChild(clonedEl)

          const svgString = serializer.serializeToString(wrapperSvg)
          const svgBase64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)))

          newElements.push({
            id, name: `[SVG] ${elName}`, type: 'image',
            x: 0, y: 0,
            width: canvasWidth, height: canvasHeight,
            src: svgBase64,
            objectFit: 'contain',
            zIndex: 50 + layerIndex,
            opacity: parseFloat(el.getAttribute('opacity') || 1) * 100,
            locked: false, visible: true, rotation: 0
          })
        }
      }

      // SVG'nin tüm çocuklarını işle
      console.log('SVG children count:', svg.children.length)
      Array.from(svg.children).forEach(child => {
        console.log('Processing child:', child.tagName)
        processElement(child)
      })

      console.log('Total parsed elements:', newElements.length)
      newElements.forEach((el, i) => console.log(`  ${i}: ${el.name} (${el.type}) at ${el.x},${el.y} size ${el.width}x${el.height}`))

      return newElements.length > 0 ? newElements : null
    } catch (error) {
      console.error('SVG parse error:', error)
      return null
    }
  }

  // SVG Import Modal state
  const [svgImportModal, setSvgImportModal] = useState({ show: false, content: '', fileName: '', dataUrl: '' })

  // File upload - PNG, JPEG, SVG, PDF destekli
  const handleFileUpload = (e) => {
    Array.from(e.target.files || []).forEach(file => {
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/gif', 'application/pdf']
      if (!validTypes.includes(file.type) && !file.type.startsWith('image/')) return

      const fileExt = file.name.split('.').pop().toLowerCase()

      // SVG ise özel işlem - katmanlara ayırma seçeneği sun
      if (file.type === 'image/svg+xml' || fileExt === 'svg') {
        const textReader = new FileReader()
        textReader.onload = (ev) => {
          const dataReader = new FileReader()
          dataReader.onload = (ev2) => {
            setSvgImportModal({
              show: true,
              content: ev.target.result,
              fileName: file.name.replace(/\.[^/.]+$/, ''),
              dataUrl: ev2.target.result
            })
          }
          dataReader.readAsDataURL(file)
        }
        textReader.readAsText(file)
        return
      }

      // Diğer formatlar normal işlem
      const reader = new FileReader()
      reader.onload = (ev) => {
        setUploadedImages(prev => [...prev, {
          id: Date.now(),
          name: file.name.replace(/\.[^/.]+$/, ''),
          src: ev.target.result,
          type: fileExt
        }])
      }
      reader.readAsDataURL(file)
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // SVG'yi katmanlara ayırarak import et
  const importSvgAsLayers = () => {
    console.log('=== SVG IMPORT START ===')
    console.log('SVG Content length:', svgImportModal.content.length)

    const layers = parseSvgToLayers(svgImportModal.content, svgImportModal.fileName)
    console.log('Parsed layers:', layers)

    if (layers && layers.length > 0) {
      // zIndex'leri mevcut element sayısına göre ayarla
      const currentElementCount = elements.length
      const adjustedLayers = layers.map((layer, idx) => ({
        ...layer,
        zIndex: currentElementCount + idx + 1
      }))

      console.log('Adjusted layers:', adjustedLayers)

      setElements(prev => {
        const newElements = [...prev, ...adjustedLayers]
        console.log('New elements total:', newElements.length)
        saveHistory(newElements)
        return newElements
      })

      // Seçimi temizle ve ilk yeni katmanı seç
      setSelectedIds([adjustedLayers[0].id])

      console.log('=== SVG IMPORT SUCCESS ===')
    } else {
      console.log('=== SVG IMPORT FAILED - No layers ===')
      alert('SVG katmanlara ayrılamadı. Tek görsel olarak ekleniyor.')
      importSvgAsSingleImage()
    }
    setSvgImportModal({ show: false, content: '', fileName: '', dataUrl: '' })
  }

  // SVG'yi tek görsel olarak import et
  const importSvgAsSingleImage = () => {
    setUploadedImages(prev => [...prev, {
      id: Date.now(),
      name: svgImportModal.fileName,
      src: svgImportModal.dataUrl,
      type: 'svg'
    }])
    setSvgImportModal({ show: false, content: '', fileName: '', dataUrl: '' })
  }

  // Canvas drop
  const handleCanvasDrop = useCallback((e) => {
    e.preventDefault()
    setDragOverCanvas(false)
    const imgSrc = e.dataTransfer.getData('image-src')
    const imgName = e.dataTransfer.getData('image-name')
    if (imgSrc && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      addElement('image', { src: imgSrc, name: imgName || 'Görsel', x: (e.clientX - rect.left) / scale - 100, y: (e.clientY - rect.top) / scale - 100 })
      return
    }
    const files = Array.from(e.dataTransfer.files)
    const imgFile = files.find(f => f.type.startsWith('image/'))
    if (imgFile && canvasRef.current) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const rect = canvasRef.current.getBoundingClientRect()
        addElement('image', { src: ev.target.result, name: imgFile.name.replace(/\.[^/.]+$/, ''), x: (e.clientX - rect.left) / scale - 100, y: (e.clientY - rect.top) / scale - 100 })
      }
      reader.readAsDataURL(imgFile)
    }
  }, [scale, addElement])

  // Preset change
  const handlePresetChange = (presetId) => {
    const preset = PRESET_SIZES.find(p => p.id === presetId)
    if (preset) {
      setPresetSize(presetId)
      setCanvasWidth(preset.width)
      setCanvasHeight(preset.height)
    }
  }

  // AI Image
  const generateAIImage = async () => {
    if (!aiPrompt.trim()) return
    setIsGenerating(true)
    setAiError('')

    try {
      const keywordRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Extract 2-3 English keywords for Unsplash image search from: "${aiPrompt}". Return ONLY comma-separated keywords.` }] }]
          })
        }
      )
      const keywordData = await keywordRes.json()
      let keywords = keywordData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        .toLowerCase().replace(/[^a-z,\s]/g, '').split(/[\s,]+/).filter(k => k && k.length > 2).slice(0, 3).join(' ') || 'event celebration'

      const unsplashRes = await fetch('/api/unsplash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: keywords })
      })
      const unsplashData = await unsplashRes.json()

      if (unsplashData.imageUrl) {
        setBackgroundUrl(unsplashData.imageUrl)
        setShowAIModal(false)
        setAiPrompt('')
      } else {
        throw new Error('Görsel bulunamadı')
      }
    } catch (err) {
      setAiError(`Hata: ${err.message}`)
      setBackgroundUrl('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1080&q=80')
    }
    setIsGenerating(false)
  }

  // Save/Load templates
  const saveTemplate = async () => {
    const name = prompt('Template adı:', 'Yeni Template')
    if (!name) return
    try {
      await supabase.from('templates').upsert({
        id: name.toLowerCase().replace(/\s+/g, '-'), name,
        canvas: { width: canvasWidth, height: canvasHeight },
        elements, background_url: backgroundUrl, mode: templateMode, bg_color: bgColor,
        updated_at: new Date().toISOString()
      })
      alert('Kaydedildi!')
    } catch (err) { alert('Hata: ' + err.message) }
  }

  const loadTemplates = async () => {
    const { data } = await supabase.from('templates').select('*').order('updated_at', { ascending: false })
    setSavedTemplates(data || [])
  }

  const exportImage = async () => {
    setIsExporting(true)
    try {
      const titleEl = elements.find(e => e.type === 'text')
      const res = await fetch('/api/render-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backgroundUrl: templateMode === 'text' ? bgColor : backgroundUrl,
          title: titleEl?.text || '',
          mode: templateMode,
          format: exportFormat,
          quality: exportQuality,
          scale: exportScale
        })
      })
      const data = await res.json()
      if (data.base64) {
        const link = document.createElement('a')
        const mimeType = exportFormat === 'jpg' ? 'image/jpeg' : exportFormat === 'webp' ? 'image/webp' : 'image/png'
        link.href = `data:${mimeType};base64,${data.base64}`
        link.download = `instagram-post-${Date.now()}.${exportFormat}`
        link.click()
        setShowExportModal(false)
      }
    } catch (err) {
      alert('Export hatası: ' + err.message)
    }
    setIsExporting(false)
  }

  useEffect(() => { loadTemplates() }, [])

  // Layer drag & drop
  const [draggedLayerId, setDraggedLayerId] = useState(null)

  const handleLayerDragStart = (e, id) => {
    setDraggedLayerId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleLayerDragOver = (e, id) => {
    e.preventDefault()
    if (draggedLayerId && draggedLayerId !== id) {
      setElements(prev => {
        const dragIndex = prev.findIndex(el => el.id === draggedLayerId)
        const dropIndex = prev.findIndex(el => el.id === id)
        if (dragIndex === -1 || dropIndex === -1) return prev
        const newElements = [...prev]
        const [removed] = newElements.splice(dragIndex, 1)
        newElements.splice(dropIndex, 0, removed)
        return newElements.map((el, i) => ({ ...el, zIndex: i + 1 }))
      })
    }
  }

  const handleLayerDragEnd = () => setDraggedLayerId(null)

  // Render element
  const renderElement = (el) => {
    if (el.type === 'color') {
      return <div className="w-full h-full" style={{ backgroundColor: el.color, opacity: el.opacity / 100 }} />
    }
    if (el.type === 'gradient') {
      // Yeni format: ayrı renk, opaklık ve pozisyon
      const startColor = el.gradientStartColor || '#000000'
      const endColor = el.gradientEndColor || '#000000'
      const startOpacity = (el.gradientStartOpacity ?? 90) / 100
      const endOpacity = (el.gradientEndOpacity ?? 0) / 100
      const startPos = el.gradientStartPos ?? 0
      const endPos = el.gradientEndPos ?? 100

      // Hex to RGB
      const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1,3), 16)
        const g = parseInt(hex.slice(3,5), 16)
        const b = parseInt(hex.slice(5,7), 16)
        return `${r},${g},${b}`
      }

      const gradientCss = `linear-gradient(${el.gradientDirection || 'to top'}, rgba(${hexToRgb(startColor)},${startOpacity}) ${startPos}%, rgba(${hexToRgb(endColor)},${endOpacity}) ${endPos}%)`

      return (
        <div className="w-full h-full pointer-events-none" style={{
          background: gradientCss,
          opacity: el.opacity / 100
        }} />
      )
    }
    if (el.type === 'overlay') {
      return <img src={el.src} alt="" className="w-full h-full object-cover pointer-events-none" style={{ opacity: el.opacity / 100 }} />
    }
    if (el.type === 'image') {
      return (
        <div className="w-full h-full flex items-center justify-center" style={{ opacity: el.opacity / 100, borderRadius: el.borderRadius || 0, overflow: 'hidden', background: 'transparent' }}>
          {el.src ? (
            <img src={el.src} alt="" draggable={false} className="w-full h-full pointer-events-none" style={{ objectFit: el.objectFit || 'contain', objectPosition: el.focalPoint || 'center', background: 'transparent' }} />
          ) : (
            <span className="text-gray-500 text-xs">Görsel yok</span>
          )}
        </div>
      )
    }
    if (el.type === 'rect') {
      return (
        <div className="w-full h-full" style={{
          backgroundColor: el.fill,
          border: el.strokeWidth > 0 ? `${el.strokeWidth}px solid ${el.stroke}` : 'none',
          borderRadius: el.borderRadius || 0,
          opacity: el.opacity / 100
        }} />
      )
    }
    if (el.type === 'circle') {
      return (
        <div className="w-full h-full rounded-full" style={{
          backgroundColor: el.fill,
          border: el.strokeWidth > 0 ? `${el.strokeWidth}px solid ${el.stroke}` : 'none',
          opacity: el.opacity / 100
        }} />
      )
    }
    if (el.type === 'line') {
      return <div className="w-full" style={{ height: el.strokeWidth || 4, backgroundColor: el.fill, opacity: el.opacity / 100 }} />
    }
    if (el.type === 'text') {
      if (editingTextId === el.id) {
        return (
          <textarea
            defaultValue={el.text}
            autoFocus
            className="w-full h-full bg-transparent resize-none outline-none p-0"
            style={{
              fontSize: el.fontSize * scale,
              fontWeight: el.fontWeight,
              fontFamily: el.fontFamily,
              color: el.color,
              lineHeight: el.lineHeight,
              letterSpacing: el.letterSpacing || 0,
              textAlign: el.textAlign,
              textTransform: el.textTransform || 'none',
              textShadow: el.shadow ? '2px 2px 8px rgba(0,0,0,0.9)' : 'none',
              WebkitTextStroke: el.textStroke ? `${el.textStrokeWidth || 1}px ${el.textStrokeColor || '#000000'}` : 'none',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-wrap'
            }}
            onBlur={(e) => { updateElement(el.id, { text: e.target.value }); setEditingTextId(null) }}
            onClick={(e) => e.stopPropagation()}
            onPaste={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === 'Escape') setEditingTextId(null); e.stopPropagation() }}
          />
        )
      }
      return (
        <div className="w-full h-full flex items-end pointer-events-none p-0" style={{
          fontSize: el.fontSize * scale,
          fontWeight: el.fontWeight,
          fontFamily: el.fontFamily,
          color: el.color,
          opacity: el.opacity / 100,
          lineHeight: el.lineHeight,
          letterSpacing: el.letterSpacing || 0,
          textAlign: el.textAlign,
          textTransform: el.textTransform || 'none',
          textShadow: el.shadow ? '2px 2px 8px rgba(0,0,0,0.9)' : 'none',
          WebkitTextStroke: el.textStroke ? `${el.textStrokeWidth || 1}px ${el.textStrokeColor || '#000000'}` : 'none',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: 'pre-wrap',
          overflow: 'hidden'
        }}>
          {el.text}
        </div>
      )
    }
    return null
  }

  return (
    <>
      <Head>
        <title>Template Editor - Turkville</title>
        <style>{`
          @font-face { font-family: 'Gilroy'; src: url('https://fonts.cdnfonts.com/s/16219/Gilroy-Regular.woff') format('woff'); font-weight: 400; }
          @font-face { font-family: 'Gilroy'; src: url('https://fonts.cdnfonts.com/s/16219/Gilroy-Bold.woff') format('woff'); font-weight: 700; }
          @font-face { font-family: 'Gilroy'; src: url('https://fonts.cdnfonts.com/s/16219/Gilroy-ExtraBold.woff') format('woff'); font-weight: 800; }
        `}</style>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Montserrat:wght@400;700&family=Oswald:wght@400;700&family=Roboto:wght@400;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="h-screen flex flex-col bg-[#1a1a2e] text-white overflow-hidden select-none" onClick={closeContextMenu}>
        {/* TOOLBAR */}
        <header className="bg-[#16213e] border-b border-gray-700 px-3 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-blue-400 mr-2">Editor</h1>

            <select value={templateMode} onChange={(e) => setTemplateMode(e.target.value)} className="px-2 py-1 bg-gray-700 rounded text-xs border border-gray-600">
              {TEMPLATE_MODES.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>

            <select value={presetSize} onChange={(e) => handlePresetChange(e.target.value)} className="px-2 py-1 bg-gray-700 rounded text-xs border border-gray-600">
              {PRESET_SIZES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            {/* Quick Category Badge Selector */}
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="px-2 py-1 bg-purple-700 rounded text-xs border border-purple-500 font-medium text-white"
              title="Kategori Badge"
              style={{ color: 'white' }}
            >
              {categoriesDB.length > 0 ? (
                categoriesDB.map(cat => (
                  <option key={cat.key} value={cat.key} className="bg-gray-800 text-white">{cat.label_tr || cat.key}</option>
                ))
              ) : (
                <option value="HABER" className="bg-gray-800 text-white">Haber</option>
              )}
            </select>

            {templateMode === 'text' && (
              <div className="flex items-center gap-1 ml-2">
                {BG_COLORS.map(c => (
                  <button key={c.value} onClick={() => { setBgColor(c.value); updateElement('colorBg', { color: c.value }) }}
                    className={`w-5 h-5 rounded border-2 ${bgColor === c.value ? 'border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: c.value }} title={c.name} />
                ))}
              </div>
            )}

            <div className="flex items-center gap-1 border-l border-gray-600 pl-2 ml-2">
              <button onClick={undo} disabled={historyIndex <= 0} className="p-1 hover:bg-gray-700 rounded disabled:opacity-30 text-sm" title="Geri Al (Ctrl+Z)">↩</button>
              <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-1 hover:bg-gray-700 rounded disabled:opacity-30 text-sm" title="Yinele (Ctrl+Y)">↪</button>
            </div>

            <div className="flex items-center gap-1 border-l border-gray-600 pl-2">
              <button onClick={() => setShowGrid(!showGrid)} className={`p-1 rounded text-xs ${showGrid ? 'bg-blue-600' : 'hover:bg-gray-700'}`} title="Grid Göster/Gizle">▦</button>
              <button onClick={() => setShowRuler(!showRuler)} className={`p-1 rounded text-xs ${showRuler ? 'bg-blue-600' : 'hover:bg-gray-700'}`} title="Cetvel Göster/Gizle">📏</button>
              <button onClick={() => setSnapToGrid(!snapToGrid)} className={`px-1.5 py-1 rounded text-xs ${snapToGrid ? 'bg-blue-600' : 'hover:bg-gray-700'}`} title="Grid'e Yapış">⊞</button>
            </div>

            {selectedId && (
              <div className="flex items-center gap-0.5 border-l border-gray-600 pl-2">
                <button onClick={() => alignElement('left')} className="p-1 hover:bg-gray-700 rounded text-xs" title="Sola">⬅</button>
                <button onClick={() => alignElement('center')} className="p-1 hover:bg-gray-700 rounded text-xs" title="Ortala">↔</button>
                <button onClick={() => alignElement('right')} className="p-1 hover:bg-gray-700 rounded text-xs" title="Sağa">➡</button>
                <span className="text-gray-600 mx-0.5">|</span>
                <button onClick={() => alignElement('top')} className="p-1 hover:bg-gray-700 rounded text-xs" title="Üst">⬆</button>
                <button onClick={() => alignElement('middle')} className="p-1 hover:bg-gray-700 rounded text-xs" title="Orta">↕</button>
                <button onClick={() => alignElement('bottom')} className="p-1 hover:bg-gray-700 rounded text-xs" title="Alt">⬇</button>
              </div>
            )}

            <div className="flex items-center gap-1 border-l border-gray-600 pl-2">
              <button onClick={() => setScale(prev => Math.max(prev - 0.1, 0.1))} className="p-1 hover:bg-gray-700 rounded text-xs" title="Uzaklaştır (Ctrl+Scroll)">−</button>
              <span className="text-xs w-10 text-center" title="Yakınlaştırma Oranı">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(prev => Math.min(prev + 0.1, 2))} className="p-1 hover:bg-gray-700 rounded text-xs" title="Yakınlaştır (Ctrl+Scroll)">+</button>
              <button onClick={fitToScreen} className="p-1 hover:bg-gray-700 rounded text-xs ml-1" title="Ekrana Sığdır">⊡</button>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => setShowAIModal(true)} className="px-2 py-1 bg-purple-600 rounded text-xs hover:bg-purple-500" title="AI ile Görsel Oluştur">🤖 AI</button>
            <button onClick={() => { setShowTemplateList(!showTemplateList); loadTemplates() }} className="px-2 py-1 bg-gray-700 rounded text-xs hover:bg-gray-600" title="Kayıtlı Şablonlar">📁</button>
            <button onClick={saveTemplate} className="px-2 py-1 bg-green-600 rounded text-xs hover:bg-green-500" title="Şablonu Kaydet">💾</button>
            <button onClick={() => setShowExportModal(true)} className="px-2 py-1 bg-blue-600 rounded text-xs hover:bg-blue-500" title="Görsel Olarak İndir">📥 Export</button>
            <a href="/" className="px-2 py-1 bg-gray-700 rounded text-xs hover:bg-gray-600" title="Ana Sayfaya Dön">🏠</a>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* LEFT PANEL - Layers & Assets */}
          <div className="w-56 bg-[#16213e] border-r border-gray-700 flex flex-col text-xs">
            {/* Add buttons */}
            <div className="p-2 border-b border-gray-700 grid grid-cols-4 gap-1">
              <button onClick={() => addElement('image')} className="py-1.5 bg-blue-600 rounded hover:bg-blue-500" title="Görsel Ekle (PNG, JPG, SVG)">🖼</button>
              <button onClick={() => addElement('text')} className="py-1.5 bg-green-600 rounded hover:bg-green-500" title="Metin Ekle">T</button>
              <button onClick={() => addElement('rect')} className="py-1.5 bg-orange-600 rounded hover:bg-orange-500" title="Dikdörtgen Ekle">▭</button>
              <button onClick={() => addElement('circle')} className="py-1.5 bg-pink-600 rounded hover:bg-pink-500" title="Daire Ekle">○</button>
            </div>

            {/* Layers */}
            <div className="flex-1 overflow-auto p-2">
              <div className="text-gray-500 mb-1.5 font-semibold flex items-center justify-between">
                <span>KATMANLAR</span>
                <span className="text-gray-600">{elements.length}</span>
              </div>
              {[...elements].reverse().map(el => (
                <div key={el.id}
                  draggable
                  onDragStart={(e) => handleLayerDragStart(e, el.id)}
                  onDragOver={(e) => handleLayerDragOver(e, el.id)}
                  onDragEnd={handleLayerDragEnd}
                  onClick={(e) => handleElementClick(e, el.id)}
                  onDoubleClick={() => setRenamingId(el.id)}
                  className={`group mb-0.5 px-1.5 py-1 rounded flex items-center gap-1 cursor-pointer transition-all ${
                    selectedIds.includes(el.id) ? 'bg-blue-600' : 'bg-[#1a1a2e] hover:bg-gray-700/50'
                  } ${el.locked ? 'opacity-60' : ''} ${draggedLayerId === el.id ? 'opacity-50' : ''}`}>
                  <button onClick={(e) => { e.stopPropagation(); updateElement(el.id, { visible: !el.visible }) }} className={el.visible ? 'text-blue-400' : 'text-gray-600'} title={el.visible ? 'Gizle' : 'Göster'}>
                    {el.visible ? '👁' : '○'}
                  </button>
                  {renamingId === el.id ? (
                    <input type="text" defaultValue={el.name} autoFocus className="flex-1 bg-gray-800 px-1 rounded outline-none text-xs"
                      onBlur={(e) => { updateElement(el.id, { name: e.target.value }); setRenamingId(null) }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { updateElement(el.id, { name: e.target.value }); setRenamingId(null) }; e.stopPropagation() }}
                      onClick={(e) => e.stopPropagation()} />
                  ) : (
                    <span className="flex-1 truncate">{el.name}</span>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); updateElement(el.id, { locked: !el.locked }) }} className={el.locked ? 'text-yellow-400' : 'text-gray-500 opacity-0 group-hover:opacity-100'} title={el.locked ? 'Kilidi Aç' : 'Kilitle'}>
                    {el.locked ? '🔒' : '🔓'}
                  </button>
                </div>
              ))}
            </div>

            {/* Category Selector */}
            <div className="border-t border-gray-700 p-2">
              <div className="text-gray-500 mb-1.5 font-semibold">KATEGORİ</div>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-2 py-1.5 bg-[#1a1a2e] rounded border border-gray-700 text-xs text-white"
              >
                {categoriesDB.map(cat => (
                  <option key={cat.key} value={cat.key} className="bg-gray-800 text-white">{cat.label_tr || cat.key}</option>
                ))}
              </select>
            </div>

            {/* Library / Uploads Tabs */}
            <div className="border-t border-gray-700">
              <div className="flex">
                <button
                  onClick={() => setLibraryTab('library')}
                  className={`flex-1 py-1.5 text-xs font-semibold ${libraryTab === 'library' ? 'bg-blue-600 text-white' : 'bg-[#1a1a2e] text-gray-400 hover:bg-gray-700'}`}
                  title="Tasarım Kütüphanesi - Badge, Banner, Gradient vb."
                >
                  📚 Kütüphane
                </button>
                <button
                  onClick={() => setLibraryTab('uploads')}
                  className={`flex-1 py-1.5 text-xs font-semibold ${libraryTab === 'uploads' ? 'bg-blue-600 text-white' : 'bg-[#1a1a2e] text-gray-400 hover:bg-gray-700'}`}
                  title="Yüklediğiniz Görseller (PNG, JPG, SVG, PDF)"
                >
                  📤 Yüklemeler
                </button>
              </div>

              {libraryTab === 'library' ? (
                <div className="p-2">
                  {/* Type Filters */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {[
                      { key: 'all', label: 'Tümü', icon: '📁', desc: 'Tüm Tasarım Öğeleri' },
                      { key: 'badge', label: 'Badge', icon: '🏷️', desc: 'Kategori Etiketleri - Tıkla: Badge değişir' },
                      { key: 'banner', label: 'Banner', icon: '🎫', desc: 'Alt Banner - Tıkla: Banner değişir' },
                      { key: 'gradient', label: 'Gradient', icon: '🌈', desc: 'Renk Geçişleri - Tıkla: Overlay değişir' },
                      { key: 'logo', label: 'Logo', icon: '⭐', desc: 'Logo Görselleri' },
                      { key: 'background', label: 'Arka Plan', icon: '🖼️', desc: 'Arka Plan Görselleri - Tıkla: Arka plan değişir' },
                      { key: 'icon', label: 'İkon', icon: '💠', desc: 'İkon ve Semboller' }
                    ].map(filter => (
                      <button
                        key={filter.key}
                        onClick={() => setLibraryFilter(filter.key)}
                        className={`px-1.5 py-0.5 rounded text-[10px] ${libraryFilter === filter.key ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                        title={filter.desc}
                      >
                        {filter.icon} {filter.label}
                      </button>
                    ))}
                  </div>

                  {/* Assets Grid */}
                  <div className="grid grid-cols-3 gap-1 max-h-40 overflow-auto">
                    {filteredLibraryAssets.map(asset => (
                      <div
                        key={asset.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('image-src', asset.file_path)
                          e.dataTransfer.setData('image-name', asset.name)
                        }}
                        onClick={() => addLibraryAsset(asset)}
                        className="aspect-square bg-gray-700 rounded overflow-hidden cursor-pointer hover:ring-2 ring-blue-500 relative group"
                        title={`${asset.name}\nTip: ${asset.type}\nTıkla: ${asset.type === 'badge' ? 'Badge değişir' : asset.type === 'banner' ? 'Banner değişir' : asset.type === 'gradient' ? 'Overlay değişir' : asset.type === 'background' ? 'Arka plan değişir' : 'Canvas\'a eklenir'}`}
                      >
                        <img src={asset.file_path} alt={asset.name} className="w-full h-full object-contain p-1" />
                        <div className="absolute inset-x-0 bottom-0 bg-black/70 text-[8px] text-center py-0.5 opacity-0 group-hover:opacity-100 truncate px-0.5">
                          {asset.name}
                        </div>
                        <div className="absolute top-0.5 right-0.5 text-[8px] bg-black/50 px-1 rounded">
                          {asset.type === 'badge' ? '🏷️' : asset.type === 'banner' ? '🎫' : asset.type === 'gradient' ? '🌈' : asset.type === 'logo' ? '⭐' : '📁'}
                        </div>
                      </div>
                    ))}
                  </div>

                  {filteredLibraryAssets.length === 0 && (
                    <p className="text-gray-500 text-center py-3 text-[10px]">Bu kategoride asset yok</p>
                  )}

                  <div className="mt-2 text-[10px] text-gray-500 text-center">
                    {filteredLibraryAssets.length} asset • Tıkla veya sürükle
                  </div>
                </div>
              ) : (
                <div className="p-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-gray-500 text-[10px]">Yüklenen Görseller</span>
                    <button onClick={() => fileInputRef.current?.click()} className="text-blue-400 hover:text-blue-300 text-[10px]">+ Ekle</button>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*,.svg,.pdf,application/pdf" multiple onChange={handleFileUpload} className="hidden" />
                  {uploadedImages.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1 max-h-32 overflow-auto">
                      {uploadedImages.map(img => (
                        <div key={img.id}
                          draggable
                          onDragStart={(e) => { e.dataTransfer.setData('image-src', img.src); e.dataTransfer.setData('image-name', img.name) }}
                          onClick={() => addElement('image', { src: img.src, name: img.name })}
                          className="aspect-square bg-gray-700 rounded overflow-hidden cursor-pointer hover:ring-2 ring-blue-500" title={img.name}>
                          <img src={img.src} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 text-center py-4 text-[10px]">Görsel yükleyin veya sürükleyin</p>
                  )}
                </div>
              )}
            </div>

            {/* Background URL */}
            {templateMode === 'visual' && (
              <div className="border-t border-gray-700 p-2">
                <div className="text-gray-500 mb-1 font-semibold text-[10px]">ARKA PLAN URL</div>
                <input type="text" value={backgroundUrl} onChange={(e) => setBackgroundUrl(e.target.value)}
                  className="w-full px-2 py-1 bg-[#1a1a2e] rounded border border-gray-700 text-[10px]" placeholder="https://..." />
              </div>
            )}
          </div>

          {/* CANVAS AREA */}
          <div ref={canvasContainerRef}
            className={`flex-1 overflow-hidden bg-[#0f0f23] flex items-center justify-center relative ${spacePressed ? 'cursor-grab' : ''} ${isPanning ? 'cursor-grabbing' : ''}`}
            onMouseDown={handlePanStart}
            onMouseMove={handlePanMove}
            onMouseUp={handlePanEnd}
            onMouseLeave={handlePanEnd}
            onDragOver={(e) => { e.preventDefault(); setDragOverCanvas(true) }}
            onDragLeave={() => setDragOverCanvas(false)}
            onDrop={handleCanvasDrop}>

            {/* Rulers */}
            {showRuler && (
              <>
                <div className="absolute top-0 left-14 right-0 h-5 bg-gray-900 border-b border-gray-700 flex items-end overflow-hidden z-20">
                  {Array.from({ length: Math.ceil(canvasWidth / 50) + 1 }, (_, i) => (
                    <div key={i} className="absolute flex flex-col items-center" style={{ left: 14 + (i * 50 * scale) + panOffset.x }}>
                      <span className="text-[8px] text-gray-500">{i * 50}</span>
                      <div className="w-px h-2 bg-gray-600" />
                    </div>
                  ))}
                </div>
                <div className="absolute top-14 left-0 bottom-0 w-5 bg-gray-900 border-r border-gray-700 flex flex-col overflow-hidden z-20">
                  {Array.from({ length: Math.ceil(canvasHeight / 50) + 1 }, (_, i) => (
                    <div key={i} className="absolute flex items-center" style={{ top: (i * 50 * scale) + panOffset.y }}>
                      <span className="text-[8px] text-gray-500 -rotate-90 w-8">{i * 50}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Canvas wrapper with pan offset */}
            <div style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}>
              <div ref={canvasRef}
                className={`relative canvas-bg ${dragOverCanvas ? 'ring-4 ring-blue-500' : ''}`}
                style={{ width: canvasWidth * scale, height: canvasHeight * scale, boxShadow: '0 0 60px rgba(0,0,0,0.8)' }}
                onClick={handleCanvasClick}>

                {/* Background */}
                {templateMode === 'visual' ? (
                  <img src={backgroundUrl} alt="" className="absolute inset-0 w-full h-full object-cover canvas-bg" style={{ zIndex: 0 }} onError={(e) => e.target.style.display = 'none'} />
                ) : (
                  <div className="absolute inset-0 canvas-bg" style={{ backgroundColor: bgColor, zIndex: 0 }} />
                )}

                {/* Grid */}
                {showGrid && (
                  <div className="absolute inset-0 pointer-events-none" style={{
                    zIndex: 998,
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                    backgroundSize: `${50 * scale}px ${50 * scale}px`
                  }} />
                )}

                {/* Smart Guides */}
                {smartGuides.x !== null && <div className="absolute top-0 bottom-0 w-px bg-pink-500 pointer-events-none" style={{ left: smartGuides.x * scale, zIndex: 999 }} />}
                {smartGuides.y !== null && <div className="absolute left-0 right-0 h-px bg-pink-500 pointer-events-none" style={{ top: smartGuides.y * scale, zIndex: 999 }} />}

                {/* Elements */}
                {elements.filter(e => e.visible).map(el => (
                  <Rnd key={el.id}
                    size={{ width: el.width * scale, height: el.height * scale }}
                    position={{ x: el.x * scale, y: el.y * scale }}
                    onDragStart={(e, d) => {
                      // Save start position for shift axis lock
                      setDragStartPos({ x: d.x, y: d.y })
                    }}
                    onDrag={(e, d) => {
                      const centerX = d.x / scale + el.width / 2
                      const centerY = d.y / scale + el.height / 2
                      setSmartGuides({
                        x: Math.abs(centerX - canvasWidth / 2) < 10 ? canvasWidth / 2 : null,
                        y: Math.abs(centerY - canvasHeight / 2) < 10 ? canvasHeight / 2 : null
                      })
                    }}
                    onDragStop={(e, d) => {
                      if (el.locked) return
                      let x = d.x / scale, y = d.y / scale

                      // Shift ile eksen kilitleme
                      if (shiftPressed && dragStartPos) {
                        const deltaX = Math.abs(d.x - dragStartPos.x)
                        const deltaY = Math.abs(d.y - dragStartPos.y)
                        if (deltaX > deltaY) {
                          // X ekseni kilitli - sadece yatay hareket
                          y = el.y
                        } else {
                          // Y ekseni kilitli - sadece dikey hareket
                          x = el.x
                        }
                      }

                      if (snapToGrid) { x = Math.round(x / 10) * 10; y = Math.round(y / 10) * 10 }
                      const centerX = x + el.width / 2
                      const centerY = y + el.height / 2
                      if (Math.abs(centerX - canvasWidth / 2) < 10) x = (canvasWidth - el.width) / 2
                      if (Math.abs(centerY - canvasHeight / 2) < 10) y = (canvasHeight - el.height) / 2
                      updateElement(el.id, { x, y })
                      setSmartGuides({ x: null, y: null })
                      setDragStartPos(null)
                    }}
                    onResizeStop={(e, dir, ref, delta, pos) => {
                      if (el.locked) return
                      updateElement(el.id, { width: parseInt(ref.style.width) / scale, height: parseInt(ref.style.height) / scale, x: pos.x / scale, y: pos.y / scale })
                    }}
                    disableDragging={el.locked || editingTextId === el.id || spacePressed}
                    enableResizing={!el.locked && editingTextId !== el.id && !spacePressed}
                    style={{ zIndex: el.zIndex }}
                    bounds="parent"
                    onClick={(e) => handleElementClick(e, el.id)}
                    onDoubleClick={(e) => { if (el.type === 'text') { e.stopPropagation(); setEditingTextId(el.id) }}}
                    onContextMenu={(e) => handleContextMenu(e, el.id)}
                    className={`${selectedIds.includes(el.id) ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-transparent' : ''}`}>
                    {renderElement(el)}
                  </Rnd>
                ))}

                {/* Drop overlay */}
                {dragOverCanvas && (
                  <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center pointer-events-none z-50">
                    <span className="bg-blue-600 px-4 py-2 rounded font-bold text-sm">Görsel bırak</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL - Properties */}
          <div className="w-64 bg-[#16213e] border-l border-gray-700 flex flex-col overflow-auto text-xs">
            <div className="p-2 border-b border-gray-700">
              <div className="text-gray-500 font-semibold">ÖZELLİKLER</div>
            </div>

            {selectedElement ? (
              <div className="p-2 space-y-2">
                <input type="text" value={selectedElement.name} onChange={(e) => updateElement(selectedId, { name: e.target.value })}
                  className="w-full bg-transparent text-sm font-bold border-b border-gray-700 pb-1 outline-none" />

                {/* Position & Size */}
                <div>
                  <div className="text-gray-500 mb-1 font-semibold">POZİSYON & BOYUT</div>
                  <div className="grid grid-cols-4 gap-1">
                    {['x', 'y', 'width', 'height'].map(prop => (
                      <div key={prop}>
                        <label className="text-gray-400 uppercase text-[10px]">{prop[0]}</label>
                        <input type="number" value={Math.round(selectedElement[prop])} onChange={(e) => updateElement(selectedId, { [prop]: parseInt(e.target.value) || 0 })}
                          className="w-full px-1 py-0.5 bg-[#1a1a2e] rounded border border-gray-700" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Opacity */}
                <div className="flex items-center gap-2">
                  <label className="text-gray-400 w-16">Opaklık</label>
                  <input type="range" min="0" max="100" value={selectedElement.opacity} onChange={(e) => updateElement(selectedId, { opacity: parseInt(e.target.value) })} className="flex-1" />
                  <span className="w-8 text-right">{selectedElement.opacity}%</span>
                </div>

                {/* Color element */}
                {selectedElement.type === 'color' && (
                  <div>
                    <label className="text-gray-400">Renk</label>
                    <input type="color" value={selectedElement.color} onChange={(e) => updateElement(selectedId, { color: e.target.value })}
                      className="w-full h-8 bg-[#1a1a2e] rounded cursor-pointer border border-gray-700" />
                  </div>
                )}

                {/* Gradient element */}
                {selectedElement.type === 'gradient' && (
                  <div className="space-y-2">
                    <div className="text-gray-500 font-semibold">GRADİENT AYARLARI</div>

                    {/* Preset buttons */}
                    <div>
                      <label className="text-gray-400 text-[10px]">Hazır Şablonlar</label>
                      <div className="flex gap-1 flex-wrap mt-1">
                        {GRADIENT_PRESETS.map(preset => (
                          <button key={preset.name}
                            onClick={() => updateElement(selectedId, {
                              gradientStartColor: preset.startColor.includes('rgba') ? '#000000' : preset.startColor,
                              gradientEndColor: preset.endColor.includes('rgba') ? '#000000' : preset.endColor,
                              gradientStartOpacity: 90,
                              gradientEndOpacity: 0,
                              gradientStartPos: 0,
                              gradientEndPos: 100,
                              gradientDirection: preset.direction
                            })}
                            className="px-2 py-1 rounded text-[10px] hover:ring-1 ring-white"
                            style={{ background: `linear-gradient(${preset.direction}, ${preset.startColor}, ${preset.endColor})` }}>
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Direction */}
                    <div>
                      <label className="text-gray-400 text-[10px]">Yön</label>
                      <select value={selectedElement.gradientDirection || 'to top'}
                        onChange={(e) => updateElement(selectedId, { gradientDirection: e.target.value })}
                        className="w-full px-1 py-0.5 bg-[#1a1a2e] rounded border border-gray-700 mt-1">
                        {GRADIENT_DIRECTIONS.map(dir => (
                          <option key={dir.value} value={dir.value}>{dir.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Start Color with Stop & Opacity */}
                    <div className="bg-[#1a1a2e] rounded p-2">
                      <label className="text-gray-400 text-[10px] font-semibold">Başlangıç Rengi</label>
                      <div className="flex gap-1 mt-1 items-center">
                        <input type="color"
                          value={selectedElement.gradientStartColor || '#000000'}
                          onChange={(e) => updateElement(selectedId, { gradientStartColor: e.target.value })}
                          className="w-8 h-6 rounded cursor-pointer border border-gray-700" />
                        <span className="text-[9px] text-gray-500 w-12">Renk</span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <div className="flex-1">
                          <label className="text-[9px] text-gray-500">Saydamlık %</label>
                          <div className="flex items-center gap-1">
                            <input type="range" min="0" max="100"
                              value={selectedElement.gradientStartOpacity ?? 90}
                              onChange={(e) => updateElement(selectedId, { gradientStartOpacity: parseInt(e.target.value) })}
                              className="flex-1 h-1" />
                            <span className="text-[10px] w-8 text-right">{selectedElement.gradientStartOpacity ?? 90}%</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="text-[9px] text-gray-500">Pozisyon %</label>
                          <div className="flex items-center gap-1">
                            <input type="range" min="0" max="100"
                              value={selectedElement.gradientStartPos ?? 0}
                              onChange={(e) => updateElement(selectedId, { gradientStartPos: parseInt(e.target.value) })}
                              className="flex-1 h-1" />
                            <span className="text-[10px] w-8 text-right">{selectedElement.gradientStartPos ?? 0}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* End Color with Stop & Opacity */}
                    <div className="bg-[#1a1a2e] rounded p-2">
                      <label className="text-gray-400 text-[10px] font-semibold">Bitiş Rengi</label>
                      <div className="flex gap-1 mt-1 items-center">
                        <input type="color"
                          value={selectedElement.gradientEndColor || '#000000'}
                          onChange={(e) => updateElement(selectedId, { gradientEndColor: e.target.value })}
                          className="w-8 h-6 rounded cursor-pointer border border-gray-700" />
                        <span className="text-[9px] text-gray-500 w-12">Renk</span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <div className="flex-1">
                          <label className="text-[9px] text-gray-500">Saydamlık %</label>
                          <div className="flex items-center gap-1">
                            <input type="range" min="0" max="100"
                              value={selectedElement.gradientEndOpacity ?? 0}
                              onChange={(e) => updateElement(selectedId, { gradientEndOpacity: parseInt(e.target.value) })}
                              className="flex-1 h-1" />
                            <span className="text-[10px] w-8 text-right">{selectedElement.gradientEndOpacity ?? 0}%</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="text-[9px] text-gray-500">Pozisyon %</label>
                          <div className="flex items-center gap-1">
                            <input type="range" min="0" max="100"
                              value={selectedElement.gradientEndPos ?? 100}
                              onChange={(e) => updateElement(selectedId, { gradientEndPos: parseInt(e.target.value) })}
                              className="flex-1 h-1" />
                            <span className="text-[10px] w-8 text-right">{selectedElement.gradientEndPos ?? 100}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Preview */}
                    <div>
                      <label className="text-gray-400 text-[10px]">Önizleme</label>
                      <div className="w-full h-16 rounded mt-1 border border-gray-700"
                        style={{
                          background: `linear-gradient(${selectedElement.gradientDirection || 'to top'},
                            rgba(${parseInt((selectedElement.gradientStartColor || '#000000').slice(1,3), 16)}, ${parseInt((selectedElement.gradientStartColor || '#000000').slice(3,5), 16)}, ${parseInt((selectedElement.gradientStartColor || '#000000').slice(5,7), 16)}, ${(selectedElement.gradientStartOpacity ?? 90) / 100}) ${selectedElement.gradientStartPos ?? 0}%,
                            rgba(${parseInt((selectedElement.gradientEndColor || '#000000').slice(1,3), 16)}, ${parseInt((selectedElement.gradientEndColor || '#000000').slice(3,5), 16)}, ${parseInt((selectedElement.gradientEndColor || '#000000').slice(5,7), 16)}, ${(selectedElement.gradientEndOpacity ?? 0) / 100}) ${selectedElement.gradientEndPos ?? 100}%)`
                        }} />
                    </div>
                  </div>
                )}

                {/* Shape properties */}
                {['rect', 'circle', 'line'].includes(selectedElement.type) && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-gray-400">Dolgu</label>
                        <input type="color" value={selectedElement.fill} onChange={(e) => updateElement(selectedId, { fill: e.target.value })}
                          className="w-full h-7 bg-[#1a1a2e] rounded cursor-pointer border border-gray-700" />
                      </div>
                      {selectedElement.type !== 'line' && (
                        <div>
                          <label className="text-gray-400">Çizgi</label>
                          <input type="color" value={selectedElement.stroke || '#000000'} onChange={(e) => updateElement(selectedId, { stroke: e.target.value })}
                            className="w-full h-7 bg-[#1a1a2e] rounded cursor-pointer border border-gray-700" />
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-gray-400">Çizgi Kalınlık</label>
                        <input type="number" min="0" value={selectedElement.strokeWidth || 0} onChange={(e) => updateElement(selectedId, { strokeWidth: parseInt(e.target.value) || 0 })}
                          className="w-full px-1 py-0.5 bg-[#1a1a2e] rounded border border-gray-700" />
                      </div>
                      {selectedElement.type === 'rect' && (
                        <div>
                          <label className="text-gray-400">Köşe Radius</label>
                          <input type="number" min="0" value={selectedElement.borderRadius || 0} onChange={(e) => updateElement(selectedId, { borderRadius: parseInt(e.target.value) || 0 })}
                            className="w-full px-1 py-0.5 bg-[#1a1a2e] rounded border border-gray-700" />
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Image properties */}
                {selectedElement.type === 'image' && (
                  <>
                    <div>
                      <label className="text-gray-400">Sığdırma</label>
                      <select value={selectedElement.objectFit || 'contain'} onChange={(e) => updateElement(selectedId, { objectFit: e.target.value })}
                        className="w-full px-1 py-0.5 bg-[#1a1a2e] rounded border border-gray-700">
                        <option value="contain">Sığdır</option>
                        <option value="cover">Kapla</option>
                        <option value="fill">Doldur</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Text properties */}
                {selectedElement.type === 'text' && (
                  <>
                    <div>
                      <label className="text-gray-400 text-[10px]">Metin İçeriği</label>
                      <textarea
                        value={selectedElement.text}
                        onChange={(e) => updateElement(selectedId, { text: e.target.value })}
                        onPaste={(e) => {
                          e.stopPropagation()
                          const text = e.clipboardData.getData('text')
                          updateElement(selectedId, { text: selectedElement.text + text })
                          e.preventDefault()
                        }}
                        className="w-full px-2 py-1.5 bg-[#1a1a2e] rounded border border-gray-700 resize-none text-white"
                        rows={3}
                        placeholder="Metni buraya yazın veya yapıştırın..."
                      />
                    </div>

                    {/* Text Color - Prominent */}
                    <div className="bg-[#1a1a2e] rounded p-2">
                      <label className="text-gray-400 text-[10px] font-semibold">Yazı Rengi</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={selectedElement.color || '#FFFFFF'}
                          onChange={(e) => updateElement(selectedId, { color: e.target.value })}
                          className="w-10 h-8 rounded cursor-pointer border border-gray-600"
                          title="Yazı Rengi Seç"
                        />
                        <input
                          type="text"
                          value={selectedElement.color || '#FFFFFF'}
                          onChange={(e) => updateElement(selectedId, { color: e.target.value })}
                          className="flex-1 px-2 py-1 bg-gray-800 rounded border border-gray-700 text-xs text-white uppercase"
                          placeholder="#FFFFFF"
                        />
                        <div
                          className="w-8 h-8 rounded border border-gray-600"
                          style={{ backgroundColor: selectedElement.color || '#FFFFFF' }}
                          title="Önizleme"
                        />
                      </div>
                      {/* Quick Colors */}
                      <div className="flex gap-1 mt-2">
                        {['#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'].map(c => (
                          <button
                            key={c}
                            onClick={() => updateElement(selectedId, { color: c })}
                            className={`w-5 h-5 rounded border ${selectedElement.color === c ? 'border-white border-2' : 'border-gray-600'}`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-gray-400 text-[10px]">Font</label>
                        <select value={selectedElement.fontFamily} onChange={(e) => updateElement(selectedId, { fontFamily: e.target.value })}
                          className="w-full px-1 py-0.5 bg-[#1a1a2e] rounded border border-gray-700 text-white">
                          {FONTS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-gray-400 text-[10px]">Ağırlık</label>
                        <select value={selectedElement.fontWeight} onChange={(e) => updateElement(selectedId, { fontWeight: parseInt(e.target.value) })}
                          className="w-full px-1 py-0.5 bg-[#1a1a2e] rounded border border-gray-700 text-white">
                          {FONT_WEIGHTS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <div>
                        <label className="text-gray-400 text-[10px]">Boyut</label>
                        <input type="number" value={selectedElement.fontSize} onChange={(e) => updateElement(selectedId, { fontSize: parseInt(e.target.value) || 36 })}
                          className="w-full px-1 py-0.5 bg-[#1a1a2e] rounded border border-gray-700 text-white" />
                      </div>
                      <div>
                        <label className="text-gray-400 text-[10px]">Satır H</label>
                        <input type="number" step="0.1" value={selectedElement.lineHeight} onChange={(e) => updateElement(selectedId, { lineHeight: parseFloat(e.target.value) || 1.2 })}
                          className="w-full px-1 py-0.5 bg-[#1a1a2e] rounded border border-gray-700 text-white" />
                      </div>
                      <div>
                        <label className="text-gray-400 text-[10px]">Harf Aralık</label>
                        <input type="number" value={selectedElement.letterSpacing || 0} onChange={(e) => updateElement(selectedId, { letterSpacing: parseInt(e.target.value) || 0 })}
                          className="w-full px-1 py-0.5 bg-[#1a1a2e] rounded border border-gray-700 text-white" />
                      </div>
                    </div>

                    <div>
                      <label className="text-gray-400 text-[10px]">Yazı Stili</label>
                      <select value={selectedElement.textTransform || 'none'} onChange={(e) => updateElement(selectedId, { textTransform: e.target.value })}
                        className="w-full px-1 py-0.5 bg-[#1a1a2e] rounded border border-gray-700 text-white">
                        <option value="none">Normal</option>
                        <option value="uppercase">BÜYÜK HARF</option>
                        <option value="lowercase">küçük harf</option>
                        <option value="capitalize">İlk Harfler Büyük</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-gray-400 text-[10px]">Hizalama</label>
                      <div className="flex gap-1 mt-1">
                        {[
                          { align: 'left', icon: '◀', label: 'Sol' },
                          { align: 'center', icon: '◆', label: 'Orta' },
                          { align: 'right', icon: '▶', label: 'Sağ' }
                        ].map(a => (
                          <button key={a.align} onClick={() => updateElement(selectedId, { textAlign: a.align })}
                            className={`flex-1 py-1.5 rounded text-xs ${selectedElement.textAlign === a.align ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                            title={a.label}>
                            {a.icon} {a.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-[#1a1a2e] rounded p-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={selectedElement.shadow || false} onChange={(e) => updateElement(selectedId, { shadow: e.target.checked })} className="w-4 h-4" />
                        <span className="text-xs">Gölge</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={selectedElement.textStroke || false} onChange={(e) => updateElement(selectedId, { textStroke: e.target.checked })} className="w-4 h-4" />
                        <span className="text-xs">Kenarlık</span>
                      </label>
                    </div>

                    {/* Text Stroke Color */}
                    {selectedElement.textStroke && (
                      <div className="flex items-center gap-2">
                        <label className="text-gray-400 text-[10px]">Kenarlık Rengi:</label>
                        <input
                          type="color"
                          value={selectedElement.textStrokeColor || '#000000'}
                          onChange={(e) => updateElement(selectedId, { textStrokeColor: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer border border-gray-600"
                        />
                        <input
                          type="number"
                          value={selectedElement.textStrokeWidth || 1}
                          onChange={(e) => updateElement(selectedId, { textStrokeWidth: parseInt(e.target.value) || 1 })}
                          className="w-16 px-1 py-0.5 bg-gray-800 rounded border border-gray-700 text-xs text-white"
                          min="1"
                          max="10"
                          title="Kenarlık Kalınlığı"
                        />
                        <span className="text-[10px] text-gray-500">px</span>
                      </div>
                    )}
                  </>
                )}

                {/* Lock/Unlock button */}
                <button
                  onClick={() => updateElement(selectedId, { locked: !selectedElement.locked })}
                  className={`w-full py-1.5 rounded mt-2 ${selectedElement.locked ? 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600 hover:text-white' : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600 hover:text-white'}`}>
                  {selectedElement.locked ? '🔒 Kilitli - Kilidi Aç' : '🔓 Kilitle'}
                </button>

                <button onClick={() => deleteElement(selectedId)} className="w-full py-1.5 bg-red-600/20 text-red-400 rounded hover:bg-red-600 hover:text-white mt-1">🗑️ Sil</button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-4">
                <p className="mb-2">Element seçin</p>
                <div className="text-gray-600 space-y-0.5 text-[10px]">
                  <p>Ctrl+C/V: Kopyala/Yapıştır</p>
                  <p>Ctrl+Z/Y: Geri/İleri</p>
                  <p>Space+Drag: Pan</p>
                  <p>Ctrl+Scroll: Zoom</p>
                  <p>Shift+Drag: Eksen Kilitle</p>
                  <p>Sağ Tık: Menü</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div className="fixed bg-[#16213e] border border-gray-700 rounded-lg shadow-xl py-1 z-50 min-w-40" style={{ left: contextMenu.x, top: contextMenu.y }}>
            {contextMenuActions.map((action, i) => action.divider ? (
              <div key={i} className="border-t border-gray-700 my-1" />
            ) : (
              <button key={i} onClick={action.action} className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-700 flex justify-between">
                <span>{action.label}</span>
                {action.shortcut && <span className="text-gray-500">{action.shortcut}</span>}
              </button>
            ))}
          </div>
        )}

        {/* AI Modal */}
        {showAIModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => !isGenerating && setShowAIModal(false)}>
            <div className="bg-[#16213e] rounded-xl p-4 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-base font-bold mb-2">🤖 AI Görsel</h2>
              <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} disabled={isGenerating}
                placeholder="Örn: Futbol maçı, gece, kutlama..."
                className="w-full px-2 py-1.5 bg-[#1a1a2e] rounded border border-gray-700 resize-none mb-2 text-xs disabled:opacity-50" rows={2} />
              {aiError && <div className="mb-2 p-1.5 bg-red-900/30 border border-red-700 rounded text-xs text-red-300">{aiError}</div>}
              <div className="flex gap-2">
                <button onClick={() => { setShowAIModal(false); setAiError('') }} disabled={isGenerating} className="flex-1 py-1.5 bg-gray-700 rounded text-xs disabled:opacity-50">İptal</button>
                <button onClick={generateAIImage} disabled={isGenerating || !aiPrompt.trim()} className="flex-1 py-1.5 bg-purple-600 rounded text-xs disabled:opacity-50 flex items-center justify-center gap-1">
                  {isGenerating ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Aranıyor...</> : '🎨 Üret'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Template List Modal */}
        {showTemplateList && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowTemplateList(false)}>
            <div className="bg-[#16213e] rounded-xl p-4 w-72 max-h-80 overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-base font-bold mb-2">📁 Templates</h2>
              {savedTemplates.length === 0 ? (
                <p className="text-gray-500 text-xs">Kayıtlı template yok</p>
              ) : (
                savedTemplates.map(t => (
                  <button key={t.id} onClick={() => {
                    setElements(t.elements)
                    setBackgroundUrl(t.background_url)
                    setTemplateMode(t.mode || 'visual')
                    setBgColor(t.bg_color || '#dc2626')
                    if (t.canvas) { setCanvasWidth(t.canvas.width || 1080); setCanvasHeight(t.canvas.height || 1350) }
                    setShowTemplateList(false)
                  }} className="w-full px-2 py-1.5 text-left text-xs hover:bg-gray-700 rounded mb-0.5">
                    {t.name} {t.canvas && <span className="text-gray-500">({t.canvas.width}x{t.canvas.height})</span>}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => !isExporting && setShowExportModal(false)}>
            <div className="bg-[#16213e] rounded-xl p-4 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-base font-bold mb-3">📥 Export Ayarları</h2>

              <div className="space-y-3">
                {/* Format */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Format</label>
                  <div className="flex gap-2">
                    {['png', 'jpg', 'webp'].map(fmt => (
                      <button key={fmt} onClick={() => setExportFormat(fmt)}
                        className={`flex-1 py-1.5 rounded text-xs uppercase ${exportFormat === fmt ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quality */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Kalite</label>
                  <div className="flex gap-2">
                    {[
                      { id: 'low', label: 'Düşük', desc: 'Hızlı, küçük dosya' },
                      { id: 'medium', label: 'Orta', desc: 'Dengeli' },
                      { id: 'high', label: 'Yüksek', desc: 'En iyi kalite' }
                    ].map(q => (
                      <button key={q.id} onClick={() => setExportQuality(q.id)}
                        className={`flex-1 py-1.5 rounded text-xs ${exportQuality === q.id ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scale */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Ölçek</label>
                  <div className="flex gap-2">
                    {[
                      { scale: 1, label: '1x', size: `${canvasWidth}x${canvasHeight}` },
                      { scale: 2, label: '2x', size: `${canvasWidth * 2}x${canvasHeight * 2}` },
                      { scale: 3, label: '3x', size: `${canvasWidth * 3}x${canvasHeight * 3}` }
                    ].map(s => (
                      <button key={s.scale} onClick={() => setExportScale(s.scale)}
                        className={`flex-1 py-2 rounded text-xs ${exportScale === s.scale ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                        <div className="font-bold">{s.label}</div>
                        <div className="text-[10px] text-gray-300">{s.size}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview info */}
                <div className="bg-[#1a1a2e] rounded p-2 text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>Boyut:</span>
                    <span className="text-white">{canvasWidth * exportScale} x {canvasHeight * exportScale} px</span>
                  </div>
                  <div className="flex justify-between text-gray-400 mt-1">
                    <span>Format:</span>
                    <span className="text-white uppercase">{exportFormat}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowExportModal(false)} disabled={isExporting}
                  className="flex-1 py-2 bg-gray-700 rounded text-xs hover:bg-gray-600 disabled:opacity-50">
                  İptal
                </button>
                <button onClick={exportImage} disabled={isExporting}
                  className="flex-1 py-2 bg-green-600 rounded text-xs hover:bg-green-500 disabled:opacity-50 flex items-center justify-center gap-1">
                  {isExporting ? (
                    <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />İndiriliyor...</>
                  ) : '📥 İndir'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SVG Import Modal */}
        {svgImportModal.show && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setSvgImportModal({ show: false, content: '', fileName: '', dataUrl: '' })}>
            <div className="bg-[#16213e] rounded-xl p-4 w-96 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-base font-bold mb-3">📐 SVG Import Seçenekleri</h2>

              <div className="mb-4">
                <div className="bg-[#1a1a2e] rounded-lg p-3 mb-3">
                  <p className="text-sm text-gray-300 mb-1">Dosya: <span className="text-white font-medium">{svgImportModal.fileName}.svg</span></p>
                  <div className="w-full h-32 bg-gray-800 rounded flex items-center justify-center overflow-hidden">
                    <img src={svgImportModal.dataUrl} alt="SVG Preview" className="max-w-full max-h-full object-contain" />
                  </div>
                </div>

                <p className="text-xs text-gray-400 mb-3">
                  SVG dosyasını nasıl import etmek istersiniz?
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={importSvgAsLayers}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-sm font-medium hover:from-purple-500 hover:to-pink-500 flex items-center justify-center gap-2"
                >
                  <span>📑</span>
                  <span>Katmanlara Ayır</span>
                </button>
                <p className="text-[10px] text-gray-500 text-center mb-2">
                  Her SVG elementi (rect, circle, path, text) ayrı bir katman olur
                </p>

                <button
                  onClick={importSvgAsSingleImage}
                  className="w-full py-3 bg-gray-700 rounded-lg text-sm font-medium hover:bg-gray-600 flex items-center justify-center gap-2"
                >
                  <span>🖼️</span>
                  <span>Tek Görsel Olarak Ekle</span>
                </button>
                <p className="text-[10px] text-gray-500 text-center">
                  SVG'yi düzenlenemez tek bir görsel olarak ekler
                </p>
              </div>

              <button
                onClick={() => setSvgImportModal({ show: false, content: '', fileName: '', dataUrl: '' })}
                className="w-full mt-4 py-2 bg-gray-800 rounded text-xs text-gray-400 hover:bg-gray-700"
              >
                İptal
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
