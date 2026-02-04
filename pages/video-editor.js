import { useState, useRef, useCallback, useEffect } from 'react'
import { Rnd } from 'react-rnd'
import Head from 'next/head'
import { supabase } from '../lib/supabase'
import html2canvas from 'html2canvas'

// ============================================================
// CONSTANTS & PRESETS
// ============================================================

const VIDEO_PRESETS = [
  { id: 'instagram-reel', name: 'Instagram Reel', width: 1080, height: 1920, aspectRatio: '9:16' },
  { id: 'instagram-post', name: 'Instagram Post', width: 1080, height: 1080, aspectRatio: '1:1' },
  { id: 'youtube', name: 'YouTube', width: 1920, height: 1080, aspectRatio: '16:9' },
  { id: 'tiktok', name: 'TikTok', width: 1080, height: 1920, aspectRatio: '9:16' },
  { id: 'twitter', name: 'Twitter/X', width: 1280, height: 720, aspectRatio: '16:9' },
]

const FONTS = [
  { name: 'Gilroy', value: "'Gilroy', sans-serif" },
  { name: 'Inter', value: "'Inter', sans-serif" },
  { name: 'Montserrat', value: "'Montserrat', sans-serif" },
  { name: 'Oswald', value: "'Oswald', sans-serif" },
  { name: 'Roboto', value: "'Roboto', sans-serif" },
  { name: 'Bebas Neue', value: "'Bebas Neue', cursive" },
]

const FONT_WEIGHTS = [
  { label: 'Light', value: 300 },
  { label: 'Normal', value: 400 },
  { label: 'Medium', value: 500 },
  { label: 'Semibold', value: 600 },
  { label: 'Bold', value: 700 },
  { label: 'ExtraBold', value: 800 },
  { label: 'Black', value: 900 },
]

const ANIMATION_TYPES = [
  { id: 'none', name: 'Yok' },
  { id: 'fadeIn', name: 'Fade In' },
  { id: 'fadeOut', name: 'Fade Out' },
  { id: 'slideInLeft', name: 'Soldan Gir' },
  { id: 'slideInRight', name: 'Sağdan Gir' },
  { id: 'slideInUp', name: 'Alttan Gir' },
  { id: 'slideInDown', name: 'Üstten Gir' },
  { id: 'scaleIn', name: 'Büyüyerek Gir' },
  { id: 'typewriter', name: 'Daktilo' },
]

const VIDEO_TEMPLATES = [
  {
    id: 'news-standard',
    name: 'Haber Videosu',
    description: 'Logo + Kategori + Alt başlık',
    layers: [
      { type: 'logo', position: 'bottom-right', size: 80 },
      { type: 'badge', position: 'top-left' },
      { type: 'lower-third', text: 'Haber Başlığı' },
    ]
  },
  {
    id: 'breaking-news',
    name: 'Son Dakika',
    description: 'Kırmızı banner + Animasyonlu başlık',
    layers: [
      { type: 'logo', position: 'top-right', size: 60 },
      { type: 'breaking-banner', text: 'SON DAKİKA' },
      { type: 'lower-third', text: 'Haber detayı...', style: 'urgent' },
    ]
  },
  {
    id: 'repost',
    name: 'Paylaşım',
    description: 'Kaynak attribution + Minimal logo',
    layers: [
      { type: 'logo', position: 'bottom-right', size: 50, opacity: 0.7 },
      { type: 'source-tag', text: 'Kaynak: @username' },
    ]
  },
  {
    id: 'story',
    name: 'Story Format',
    description: 'Dikey, büyük başlık',
    layers: [
      { type: 'logo', position: 'top-center', size: 100 },
      { type: 'headline', text: 'BÜYÜK BAŞLIK', position: 'center' },
      { type: 'swipe-up', text: 'Yukarı kaydır' },
    ]
  },
]

// ============================================================
// ICON COMPONENTS
// ============================================================

const Icons = {
  Play: () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z"/>
    </svg>
  ),
  Pause: () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
    </svg>
  ),
  SkipBack: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M19 20L9 12l10-8v16zM5 19V5"/>
    </svg>
  ),
  SkipForward: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M5 4l10 8-10 8V4zM19 5v14"/>
    </svg>
  ),
  Volume2: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
    </svg>
  ),
  VolumeX: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6"/>
    </svg>
  ),
  Scissors: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
      <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"/>
    </svg>
  ),
  Type: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M4 7V4h16v3M9 20h6M12 4v16"/>
    </svg>
  ),
  Image: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    </svg>
  ),
  Layers: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  ),
  Download: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
    </svg>
  ),
  Upload: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
    </svg>
  ),
  Trash: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
    </svg>
  ),
  Copy: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
    </svg>
  ),
  Eye: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  EyeOff: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/>
    </svg>
  ),
  Lock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
  ),
  Unlock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 019.9-1"/>
    </svg>
  ),
  ChevronUp: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M18 15l-6-6-6 6"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M6 9l6 6 6-6"/>
    </svg>
  ),
  Settings: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
  Link: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
    </svg>
  ),
  X: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  ),
  Plus: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  Folder: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
    </svg>
  ),
  Grid: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  Zap: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  Film: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
      <path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"/>
    </svg>
  ),
  Maximize: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
    </svg>
  ),
  Move: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>
    </svg>
  ),
  RotateCcw: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M1 4v6h6M23 20v-6h-6"/>
      <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/>
    </svg>
  ),
  Square: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    </svg>
  ),
  Circle: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"/>
    </svg>
  ),
  Triangle: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 2L2 22h20L12 2z"/>
    </svg>
  ),
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const generateId = () => Math.random().toString(36).substr(2, 9)

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function VideoEditor() {
  // Video state
  const [videoSrc, setVideoSrc] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [videoDuration, setVideoDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [playbackRate, setPlaybackRate] = useState(1)

  // Trim state
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)

  // Canvas/Export settings
  const [canvasWidth, setCanvasWidth] = useState(1080)
  const [canvasHeight, setCanvasHeight] = useState(1920)
  const [selectedPreset, setSelectedPreset] = useState('instagram-reel')

  // Layers state
  const [layers, setLayers] = useState([])
  const [selectedLayerId, setSelectedLayerId] = useState(null)

  // UI state
  const [activeTab, setActiveTab] = useState('layers') // layers, templates, assets
  const [showExportModal, setShowExportModal] = useState(false)
  const [showUrlModal, setShowUrlModal] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [exportProgress, setExportProgress] = useState(0)
  const [scale, setScale] = useState(0.4)

  // Supabase data
  const [designAssets, setDesignAssets] = useState([])
  const [categories, setCategories] = useState([])
  const [discoveredVideos, setDiscoveredVideos] = useState([])

  // FFmpeg state
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false)
  const [ffmpegLoading, setFfmpegLoading] = useState(false)

  // Refs
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const timelineRef = useRef(null)
  const fileInputRef = useRef(null)
  const ffmpegRef = useRef(null)

  // ============================================================
  // EFFECTS
  // ============================================================

  // Load Supabase data
  useEffect(() => {
    loadSupabaseData()
  }, [])

  // Update trim end when duration changes
  useEffect(() => {
    if (videoDuration > 0 && trimEnd === 0) {
      setTrimEnd(videoDuration)
    }
  }, [videoDuration])

  // Video time update
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      const newTime = video.currentTime
      setCurrentTime(newTime)

      // Auto-pause at trim end (sadece oynatma sırasında)
      if (!video.paused && newTime >= trimEnd) {
        video.pause()
        video.currentTime = trimStart
        setIsPlaying(false)
      }
    }

    const handleLoadedMetadata = () => {
      const duration = video.duration
      if (duration && !isNaN(duration) && duration > 0) {
        console.log('Video loaded, duration:', duration)
        setVideoDuration(duration)
        setTrimEnd(duration)
      }
    }

    const handleLoadedData = () => {
      // Bazı videolarda loadedmetadata yerine loadeddata'da duration gelir
      const duration = video.duration
      if (duration && !isNaN(duration) && duration > 0 && videoDuration === 0) {
        console.log('Video data loaded, duration:', duration)
        setVideoDuration(duration)
        setTrimEnd(duration)
      }
    }

    const handleDurationChange = () => {
      // Duration değiştiğinde güncelle
      const duration = video.duration
      if (duration && !isNaN(duration) && duration > 0) {
        console.log('Duration changed:', duration)
        setVideoDuration(duration)
        if (trimEnd === 0) {
          setTrimEnd(duration)
        }
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      video.currentTime = trimStart
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('durationchange', handleDurationChange)
    video.addEventListener('ended', handleEnded)

    // Video zaten yüklüyse duration'ı al
    if (video.duration && !isNaN(video.duration) && video.duration > 0) {
      setVideoDuration(video.duration)
      if (trimEnd === 0) {
        setTrimEnd(video.duration)
      }
    }

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('durationchange', handleDurationChange)
      video.removeEventListener('ended', handleEnded)
    }
  }, [trimStart, trimEnd, videoSrc])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Space = play/pause
      if (e.code === 'Space' && !e.target.closest('input, textarea')) {
        e.preventDefault()
        togglePlay()
      }
      // Delete = remove selected layer
      if ((e.code === 'Delete' || e.code === 'Backspace') && selectedLayerId && !e.target.closest('input, textarea')) {
        e.preventDefault()
        deleteLayer(selectedLayerId)
      }
      // Ctrl+D = duplicate
      if (e.ctrlKey && e.code === 'KeyD' && selectedLayerId) {
        e.preventDefault()
        duplicateLayer(selectedLayerId)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedLayerId, isPlaying])

  // ============================================================
  // DATA LOADING
  // ============================================================

  const loadSupabaseData = async () => {
    try {
      // Load design assets (logos, badges)
      const { data: assets } = await supabase
        .from('design_assets')
        .select('*')
        .order('created_at', { ascending: false })

      if (assets) setDesignAssets(assets)

      // Load categories
      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (cats) setCategories(cats)

      // Load discovered videos
      const { data: videos } = await supabase
        .from('social_video_discoveries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (videos) setDiscoveredVideos(videos)

    } catch (error) {
      console.error('Supabase data load error:', error)
    }
  }

  // ============================================================
  // VIDEO CONTROLS
  // ============================================================

  const togglePlay = () => {
    const video = videoRef.current
    if (!video || !videoSrc) return

    if (isPlaying) {
      video.pause()
    } else {
      if (video.currentTime < trimStart || video.currentTime >= trimEnd) {
        video.currentTime = trimStart
      }
      video.play()
    }
    setIsPlaying(!isPlaying)
  }

  const seekTo = (time) => {
    const video = videoRef.current
    if (!video || !videoDuration) return
    // Tüm video boyunca gezinebilsin (trim sınırlaması kaldırıldı)
    const clampedTime = Math.max(0, Math.min(videoDuration, time))
    video.currentTime = clampedTime
    setCurrentTime(clampedTime)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleVolumeChange = (newVolume) => {
    const video = videoRef.current
    if (!video) return
    video.volume = newVolume
    setVolume(newVolume)
    if (newVolume === 0) {
      setIsMuted(true)
      video.muted = true
    } else if (isMuted) {
      setIsMuted(false)
      video.muted = false
    }
  }

  const skipBackward = () => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(trimStart, video.currentTime - 5)
  }

  const skipForward = () => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.min(trimEnd, video.currentTime + 5)
  }

  // ============================================================
  // VIDEO LOADING
  // ============================================================

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      alert('Lütfen bir video dosyası seçin')
      return
    }

    setVideoFile(file)
    const url = URL.createObjectURL(file)
    setVideoSrc(url)
    setTrimStart(0)
    setTrimEnd(0)
    setCurrentTime(0)
    setIsPlaying(false)
  }

  const loadVideoFromUrl = async () => {
    if (!videoUrl.trim()) return

    setIsLoading(true)
    setLoadingMessage('Video yükleniyor...')

    try {
      // Proxy üzerinden yükle (CORS bypass)
      const proxyUrl = `/api/video-proxy?url=${encodeURIComponent(videoUrl)}`

      // Video'nun yüklenip yüklenemediğini test et
      const testResponse = await fetch(proxyUrl, { method: 'HEAD' }).catch(() => null)

      if (testResponse && testResponse.ok) {
        setVideoSrc(proxyUrl)
      } else {
        // Proxy başarısızsa direkt URL'i dene
        setVideoSrc(videoUrl)
      }

      setShowUrlModal(false)
      setVideoUrl('')
      setTrimStart(0)
      setTrimEnd(0)
      setCurrentTime(0)
    } catch (error) {
      alert('Video yüklenemedi: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const loadDiscoveredVideo = (video) => {
    if (video.video_url) {
      // Proxy üzerinden yükle
      const proxyUrl = `/api/video-proxy?url=${encodeURIComponent(video.video_url)}`
      setVideoSrc(proxyUrl)
      setTrimStart(0)
      setTrimEnd(0)
      setCurrentTime(0)
      setIsPlaying(false)

      // Auto-add source attribution layer
      addTextLayer(`Kaynak: @${video.username || 'unknown'}`, 'source')
    }
  }

  // ============================================================
  // PRESET & CANVAS
  // ============================================================

  const handlePresetChange = (presetId) => {
    const preset = VIDEO_PRESETS.find(p => p.id === presetId)
    if (preset) {
      setSelectedPreset(presetId)
      setCanvasWidth(preset.width)
      setCanvasHeight(preset.height)
    }
  }

  // ============================================================
  // LAYER MANAGEMENT
  // ============================================================

  const addTextLayer = (text = 'Yeni Metin', style = 'default') => {
    const styles = {
      default: {
        fontSize: 48,
        fontWeight: 700,
        color: '#ffffff',
        backgroundColor: 'transparent',
        padding: 10,
      },
      headline: {
        fontSize: 72,
        fontWeight: 900,
        color: '#ffffff',
        backgroundColor: 'rgba(220, 38, 38, 0.9)',
        padding: 20,
      },
      source: {
        fontSize: 24,
        fontWeight: 400,
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 8,
      },
      'lower-third': {
        fontSize: 36,
        fontWeight: 600,
        color: '#ffffff',
        backgroundColor: 'linear-gradient(90deg, rgba(220,38,38,1) 0%, rgba(220,38,38,0.8) 100%)',
        padding: 15,
      }
    }

    const layerStyle = styles[style] || styles.default

    const newLayer = {
      id: generateId(),
      type: 'text',
      name: `Metin ${layers.filter(l => l.type === 'text').length + 1}`,
      text,
      x: 50,
      y: canvasHeight - 200,
      width: canvasWidth - 100,
      height: 100,
      fontSize: layerStyle.fontSize,
      fontFamily: "'Gilroy', sans-serif",
      fontWeight: layerStyle.fontWeight,
      color: layerStyle.color,
      backgroundColor: layerStyle.backgroundColor,
      padding: layerStyle.padding,
      textAlign: 'left',
      opacity: 1,
      rotation: 0,
      visible: true,
      locked: false,
      startTime: 0,
      endTime: videoDuration || 10,
      animation: 'none',
      animationDuration: 0.5,
      shadow: false,
      shadowColor: 'rgba(0,0,0,0.5)',
      shadowBlur: 10,
      shadowOffsetX: 2,
      shadowOffsetY: 2,
      borderRadius: 4,
    }

    setLayers([...layers, newLayer])
    setSelectedLayerId(newLayer.id)
    return newLayer
  }

  const addImageLayer = (src, type = 'image') => {
    const newLayer = {
      id: generateId(),
      type: 'image',
      imageType: type, // 'logo', 'badge', 'image'
      name: type === 'logo' ? 'Logo' : type === 'badge' ? 'Rozet' : `Görsel ${layers.filter(l => l.type === 'image').length + 1}`,
      src,
      x: type === 'logo' ? canvasWidth - 150 : 50,
      y: type === 'logo' ? canvasHeight - 150 : 50,
      width: type === 'logo' ? 100 : type === 'badge' ? 120 : 200,
      height: type === 'logo' ? 100 : type === 'badge' ? 120 : 200,
      opacity: type === 'logo' ? 0.9 : 1,
      rotation: 0,
      visible: true,
      locked: false,
      startTime: 0,
      endTime: videoDuration || 10,
      animation: 'none',
      animationDuration: 0.5,
      objectFit: 'contain',
    }

    setLayers([...layers, newLayer])
    setSelectedLayerId(newLayer.id)
    return newLayer
  }

  const addShapeLayer = (shape = 'rectangle') => {
    const newLayer = {
      id: generateId(),
      type: 'shape',
      shape, // 'rectangle', 'circle', 'triangle'
      name: `Şekil ${layers.filter(l => l.type === 'shape').length + 1}`,
      x: 100,
      y: 100,
      width: 200,
      height: shape === 'circle' ? 200 : 100,
      fill: 'rgba(220, 38, 38, 0.8)',
      stroke: 'transparent',
      strokeWidth: 0,
      opacity: 1,
      rotation: 0,
      visible: true,
      locked: false,
      startTime: 0,
      endTime: videoDuration || 10,
      animation: 'none',
      animationDuration: 0.5,
      borderRadius: shape === 'rectangle' ? 8 : 0,
    }

    setLayers([...layers, newLayer])
    setSelectedLayerId(newLayer.id)
    return newLayer
  }

  const addGradientOverlay = () => {
    const newLayer = {
      id: generateId(),
      type: 'gradient',
      name: 'Gradient Overlay',
      x: 0,
      y: canvasHeight - (canvasHeight * 0.4),
      width: canvasWidth,
      height: canvasHeight * 0.4,
      gradientType: 'linear',
      gradientDirection: 'to top',
      gradientStops: [
        { offset: 0, color: 'rgba(0,0,0,0.9)' },
        { offset: 100, color: 'rgba(0,0,0,0)' },
      ],
      opacity: 1,
      visible: true,
      locked: false,
      startTime: 0,
      endTime: videoDuration || 10,
      animation: 'none',
    }

    setLayers([...layers, newLayer])
    setSelectedLayerId(newLayer.id)
  }

  const updateLayer = (id, updates) => {
    setLayers(layers.map(layer =>
      layer.id === id ? { ...layer, ...updates } : layer
    ))
  }

  const deleteLayer = (id) => {
    setLayers(layers.filter(layer => layer.id !== id))
    if (selectedLayerId === id) {
      setSelectedLayerId(null)
    }
  }

  const duplicateLayer = (id) => {
    const layer = layers.find(l => l.id === id)
    if (!layer) return

    const newLayer = {
      ...layer,
      id: generateId(),
      name: `${layer.name} (kopya)`,
      x: layer.x + 20,
      y: layer.y + 20,
    }

    setLayers([...layers, newLayer])
    setSelectedLayerId(newLayer.id)
  }

  const moveLayerUp = (id) => {
    const index = layers.findIndex(l => l.id === id)
    if (index < layers.length - 1) {
      const newLayers = [...layers]
      ;[newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]]
      setLayers(newLayers)
    }
  }

  const moveLayerDown = (id) => {
    const index = layers.findIndex(l => l.id === id)
    if (index > 0) {
      const newLayers = [...layers]
      ;[newLayers[index], newLayers[index - 1]] = [newLayers[index - 1], newLayers[index]]
      setLayers(newLayers)
    }
  }

  // ============================================================
  // TEMPLATE APPLICATION
  // ============================================================

  const applyTemplate = (templateId) => {
    const template = VIDEO_TEMPLATES.find(t => t.id === templateId)
    if (!template) return

    // Clear existing layers
    setLayers([])

    // Find Turkville logo from assets
    const turkvilleLogo = designAssets.find(a =>
      a.name?.toLowerCase().includes('turkville') ||
      a.type === 'logo'
    )

    template.layers.forEach(layerDef => {
      if (layerDef.type === 'logo' && turkvilleLogo) {
        const positions = {
          'bottom-right': { x: canvasWidth - (layerDef.size + 30), y: canvasHeight - (layerDef.size + 30) },
          'top-right': { x: canvasWidth - (layerDef.size + 30), y: 30 },
          'top-left': { x: 30, y: 30 },
          'bottom-left': { x: 30, y: canvasHeight - (layerDef.size + 30) },
          'top-center': { x: (canvasWidth - layerDef.size) / 2, y: 30 },
        }
        const pos = positions[layerDef.position] || positions['bottom-right']

        addImageLayer(turkvilleLogo.url || turkvilleLogo.image_url, 'logo')
        // Update the just-added layer position
        setLayers(prev => {
          const updated = [...prev]
          const lastLayer = updated[updated.length - 1]
          if (lastLayer) {
            lastLayer.x = pos.x
            lastLayer.y = pos.y
            lastLayer.width = layerDef.size
            lastLayer.height = layerDef.size
            lastLayer.opacity = layerDef.opacity || 0.9
          }
          return updated
        })
      }

      if (layerDef.type === 'lower-third') {
        addTextLayer(layerDef.text || 'Haber Başlığı', 'lower-third')
      }

      if (layerDef.type === 'breaking-banner') {
        addTextLayer(layerDef.text || 'SON DAKİKA', 'headline')
      }

      if (layerDef.type === 'source-tag') {
        addTextLayer(layerDef.text || 'Kaynak: @username', 'source')
      }

      if (layerDef.type === 'headline') {
        addTextLayer(layerDef.text || 'BAŞLIK', 'headline')
      }
    })
  }

  // ============================================================
  // EXPORT (FFmpeg.wasm)
  // ============================================================

  const loadFFmpeg = async () => {
    if (ffmpegLoaded || ffmpegLoading) return

    setFfmpegLoading(true)
    setLoadingMessage('FFmpeg yükleniyor...')

    try {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg')
      const { fetchFile, toBlobURL } = await import('@ffmpeg/util')

      const ffmpeg = new FFmpeg()

      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      })

      ffmpegRef.current = { ffmpeg, fetchFile }
      setFfmpegLoaded(true)

    } catch (error) {
      console.error('FFmpeg load error:', error)
      alert('FFmpeg yüklenemedi. Tarayıcınız desteklenmiyor olabilir.')
    } finally {
      setFfmpegLoading(false)
      setLoadingMessage('')
    }
  }

  const exportVideo = async (format = 'mp4', quality = 'high') => {
    if (!videoSrc) {
      alert('Önce bir video yükleyin')
      return
    }

    if (!ffmpegLoaded) {
      await loadFFmpeg()
    }

    if (!ffmpegRef.current) {
      alert('FFmpeg hazır değil')
      return
    }

    setIsLoading(true)
    setExportProgress(0)
    setLoadingMessage('Video işleniyor...')

    try {
      const { ffmpeg, fetchFile } = ffmpegRef.current

      // Fetch video
      setLoadingMessage('Video alınıyor...')
      setExportProgress(10)

      let videoData
      if (videoFile) {
        videoData = await fetchFile(videoFile)
      } else {
        videoData = await fetchFile(videoSrc)
      }

      await ffmpeg.writeFile('input.mp4', videoData)
      setExportProgress(30)

      // Build FFmpeg command
      const qualitySettings = {
        low: '-crf 35 -preset ultrafast',
        medium: '-crf 28 -preset fast',
        high: '-crf 23 -preset medium',
      }

      const outputName = `output.${format}`
      const trimDuration = trimEnd - trimStart

      // Basic trim command
      setLoadingMessage('Video kırpılıyor...')
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-ss', trimStart.toString(),
        '-t', trimDuration.toString(),
        '-c:v', 'libx264',
        '-c:a', 'aac',
        ...qualitySettings[quality].split(' '),
        '-vf', `scale=${canvasWidth}:${canvasHeight}:force_original_aspect_ratio=decrease,pad=${canvasWidth}:${canvasHeight}:(ow-iw)/2:(oh-ih)/2`,
        '-y',
        outputName
      ])

      setExportProgress(80)
      setLoadingMessage('Dosya oluşturuluyor...')

      // Read output
      const outputData = await ffmpeg.readFile(outputName)
      const blob = new Blob([outputData.buffer], { type: `video/${format}` })

      // Download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `turkville-video-${Date.now()}.${format}`
      a.click()
      URL.revokeObjectURL(url)

      setExportProgress(100)
      setLoadingMessage('Tamamlandı!')

      setTimeout(() => {
        setShowExportModal(false)
        setExportProgress(0)
        setLoadingMessage('')
      }, 1000)

    } catch (error) {
      console.error('Export error:', error)
      alert('Video export hatası: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Canvas Recording ile Overlay'li Export
  const exportWithOverlays = async () => {
    if (!videoSrc || !canvasRef.current) {
      alert('Önce bir video yükleyin')
      return
    }

    setIsLoading(true)
    setExportProgress(0)
    setLoadingMessage('Overlay\'li export hazırlanıyor...')

    try {
      // Canvas elementi oluştur
      const exportCanvas = document.createElement('canvas')
      exportCanvas.width = canvasWidth
      exportCanvas.height = canvasHeight
      const ctx = exportCanvas.getContext('2d')

      // Video elementini al
      const video = videoRef.current
      if (!video) throw new Error('Video elementi bulunamadı')

      // MediaRecorder için stream oluştur
      const stream = exportCanvas.captureStream(30) // 30 FPS

      // Audio track ekle (eğer video muted değilse)
      if (!isMuted && video.captureStream) {
        try {
          const videoStream = video.captureStream()
          const audioTracks = videoStream.getAudioTracks()
          audioTracks.forEach(track => stream.addTrack(track))
        } catch (e) {
          console.log('Audio track eklenemedi:', e)
        }
      }

      // MediaRecorder ayarları
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm'

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8000000, // 8 Mbps
      })

      const chunks = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      // Kayıt bittiğinde
      const recordingPromise = new Promise((resolve) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType })
          resolve(blob)
        }
      })

      // Kaydı başlat
      mediaRecorder.start(100) // Her 100ms'de bir chunk

      // Video'yu baştan başlat
      video.currentTime = trimStart
      video.muted = isMuted

      setLoadingMessage('Video kaydediliyor...')

      // Frame render loop
      const renderFrame = () => {
        if (video.currentTime >= trimEnd || video.paused) {
          mediaRecorder.stop()
          return
        }

        // Canvas'ı temizle
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, canvasWidth, canvasHeight)

        // Video frame'i çiz
        const videoAspect = video.videoWidth / video.videoHeight
        const canvasAspect = canvasWidth / canvasHeight
        let drawWidth, drawHeight, drawX, drawY

        if (videoAspect > canvasAspect) {
          drawWidth = canvasWidth
          drawHeight = canvasWidth / videoAspect
          drawX = 0
          drawY = (canvasHeight - drawHeight) / 2
        } else {
          drawHeight = canvasHeight
          drawWidth = canvasHeight * videoAspect
          drawX = (canvasWidth - drawWidth) / 2
          drawY = 0
        }

        ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight)

        // Overlay'leri çiz
        layers.forEach(layer => {
          if (!layer.visible) return
          if (video.currentTime < layer.startTime || video.currentTime > layer.endTime) return

          if (layer.type === 'text') {
            // Text layer
            ctx.save()
            ctx.globalAlpha = layer.opacity

            // Background
            if (layer.backgroundColor && layer.backgroundColor !== 'transparent') {
              ctx.fillStyle = layer.backgroundColor
              ctx.fillRect(layer.x, layer.y, layer.width, layer.height)
            }

            // Text
            ctx.fillStyle = layer.color
            ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily.replace(/'/g, '')}`
            ctx.textAlign = layer.textAlign || 'left'
            ctx.textBaseline = 'middle'

            const textX = layer.textAlign === 'center'
              ? layer.x + layer.width / 2
              : layer.textAlign === 'right'
                ? layer.x + layer.width - layer.padding
                : layer.x + layer.padding

            ctx.fillText(layer.text, textX, layer.y + layer.height / 2)
            ctx.restore()
          }

          if (layer.type === 'image') {
            // Image layer (async loading gerekli - basitleştirilmiş)
            ctx.save()
            ctx.globalAlpha = layer.opacity
            // Not: Gerçek implementasyonda image'ları önceden yüklemek gerekir
            ctx.restore()
          }

          if (layer.type === 'shape') {
            ctx.save()
            ctx.globalAlpha = layer.opacity
            ctx.fillStyle = layer.fill
            if (layer.shape === 'circle') {
              ctx.beginPath()
              ctx.arc(
                layer.x + layer.width / 2,
                layer.y + layer.height / 2,
                Math.min(layer.width, layer.height) / 2,
                0,
                Math.PI * 2
              )
              ctx.fill()
            } else {
              ctx.fillRect(layer.x, layer.y, layer.width, layer.height)
            }
            ctx.restore()
          }

          if (layer.type === 'gradient') {
            ctx.save()
            ctx.globalAlpha = layer.opacity
            const gradient = ctx.createLinearGradient(
              layer.x,
              layer.y + layer.height,
              layer.x,
              layer.y
            )
            layer.gradientStops.forEach(stop => {
              gradient.addColorStop(stop.offset / 100, stop.color)
            })
            ctx.fillStyle = gradient
            ctx.fillRect(layer.x, layer.y, layer.width, layer.height)
            ctx.restore()
          }
        })

        // Progress güncelle
        const progress = ((video.currentTime - trimStart) / (trimEnd - trimStart)) * 100
        setExportProgress(Math.round(progress))

        requestAnimationFrame(renderFrame)
      }

      // Video'yu oynat ve kaydet
      await video.play()
      renderFrame()

      // Kayıt bitene kadar bekle
      const blob = await recordingPromise

      setLoadingMessage('İndiriliyor...')
      setExportProgress(100)

      // Download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `turkville-video-${Date.now()}.webm`
      a.click()
      URL.revokeObjectURL(url)

      setLoadingMessage('Tamamlandı!')

      setTimeout(() => {
        setShowExportModal(false)
        setExportProgress(0)
        setLoadingMessage('')
      }, 1000)

    } catch (error) {
      console.error('Export with overlays error:', error)
      alert('Export hatası: ' + error.message)
    } finally {
      setIsLoading(false)
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.currentTime = currentTime
      }
    }
  }

  // ============================================================
  // RENDER HELPERS
  // ============================================================

  const selectedLayer = layers.find(l => l.id === selectedLayerId)

  const isLayerVisible = (layer) => {
    if (!layer.visible) return false
    return currentTime >= layer.startTime && currentTime <= layer.endTime
  }

  const getAnimationStyle = (layer) => {
    if (layer.animation === 'none') return {}

    const progress = Math.min(1, (currentTime - layer.startTime) / layer.animationDuration)

    switch (layer.animation) {
      case 'fadeIn':
        return { opacity: layer.opacity * progress }
      case 'slideInLeft':
        return { transform: `translateX(${(1 - progress) * -100}px)` }
      case 'slideInRight':
        return { transform: `translateX(${(1 - progress) * 100}px)` }
      case 'slideInUp':
        return { transform: `translateY(${(1 - progress) * 100}px)` }
      case 'slideInDown':
        return { transform: `translateY(${(1 - progress) * -100}px)` }
      case 'scaleIn':
        return { transform: `scale(${0.5 + progress * 0.5})` }
      default:
        return {}
    }
  }

  const renderLayer = (layer) => {
    if (!isLayerVisible(layer)) return null

    const animStyle = getAnimationStyle(layer)
    const isSelected = selectedLayerId === layer.id

    const handleDragStop = (e, d) => {
      updateLayer(layer.id, {
        x: d.x / scale,
        y: d.y / scale,
      })
    }

    const handleResizeStop = (e, direction, ref, delta, position) => {
      updateLayer(layer.id, {
        width: parseInt(ref.style.width) / scale,
        height: parseInt(ref.style.height) / scale,
        x: position.x / scale,
        y: position.y / scale,
      })
    }

    const commonRndProps = {
      position: { x: layer.x * scale, y: layer.y * scale },
      size: { width: layer.width * scale, height: layer.height * scale },
      onDragStop: handleDragStop,
      onResizeStop: handleResizeStop,
      disableDragging: layer.locked,
      enableResizing: !layer.locked,
      bounds: 'parent',
      onClick: (e) => {
        e.stopPropagation()
        setSelectedLayerId(layer.id)
      },
    }

    const baseContentStyle = {
      width: '100%',
      height: '100%',
      opacity: layer.opacity,
      transform: `rotate(${layer.rotation || 0}deg)`,
      ...animStyle,
    }

    if (layer.type === 'text') {
      return (
        <Rnd
          key={layer.id}
          {...commonRndProps}
          className={`${isSelected ? 'ring-2 ring-blue-500' : ''}`}
        >
          <div
            style={{
              ...baseContentStyle,
              fontSize: layer.fontSize * scale,
              fontFamily: layer.fontFamily,
              fontWeight: layer.fontWeight,
              color: layer.color,
              background: layer.backgroundColor,
              padding: layer.padding * scale,
              textAlign: layer.textAlign,
              display: 'flex',
              alignItems: 'center',
              borderRadius: layer.borderRadius * scale,
              boxShadow: layer.shadow
                ? `${layer.shadowOffsetX}px ${layer.shadowOffsetY}px ${layer.shadowBlur}px ${layer.shadowColor}`
                : 'none',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              overflow: 'hidden',
              cursor: layer.locked ? 'default' : 'move',
            }}
          >
            {layer.text}
          </div>
        </Rnd>
      )
    }

    if (layer.type === 'image') {
      return (
        <Rnd
          key={layer.id}
          {...commonRndProps}
          lockAspectRatio={true}
          className={`${isSelected ? 'ring-2 ring-blue-500' : ''}`}
        >
          <div style={{ ...baseContentStyle, cursor: layer.locked ? 'default' : 'move' }}>
            <img
              src={layer.src}
              alt={layer.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: layer.objectFit || 'contain',
              }}
              draggable={false}
            />
          </div>
        </Rnd>
      )
    }

    if (layer.type === 'shape') {
      return (
        <Rnd
          key={layer.id}
          {...commonRndProps}
          lockAspectRatio={layer.shape === 'circle'}
          className={`${isSelected ? 'ring-2 ring-blue-500' : ''}`}
        >
          <div
            style={{
              ...baseContentStyle,
              backgroundColor: layer.fill,
              border: layer.strokeWidth > 0 ? `${layer.strokeWidth}px solid ${layer.stroke}` : 'none',
              borderRadius: layer.shape === 'circle' ? '50%' : layer.borderRadius * scale,
              cursor: layer.locked ? 'default' : 'move',
            }}
          />
        </Rnd>
      )
    }

    if (layer.type === 'gradient') {
      return (
        <Rnd
          key={layer.id}
          {...commonRndProps}
          className={`${isSelected ? 'ring-2 ring-blue-500' : ''}`}
        >
          <div
            style={{
              ...baseContentStyle,
              background: `linear-gradient(${layer.gradientDirection}, ${layer.gradientStops.map(s => `${s.color} ${s.offset}%`).join(', ')})`,
              cursor: layer.locked ? 'default' : 'move',
            }}
          />
        </Rnd>
      )
    }

    return null
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      <Head>
        <title>Video Editor - Turkville</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Bebas+Neue&display=swap" rel="stylesheet" />
        <style>{`
          @font-face {
            font-family: 'Gilroy';
            src: url('/fonts/Gilroy-ExtraBold.woff2') format('woff2');
            font-weight: 800;
            font-style: normal;
          }
          @font-face {
            font-family: 'Gilroy';
            src: url('/fonts/Gilroy-Bold.woff2') format('woff2');
            font-weight: 700;
            font-style: normal;
          }
          @font-face {
            font-family: 'Gilroy';
            src: url('/fonts/Gilroy-SemiBold.woff2') format('woff2');
            font-weight: 600;
            font-style: normal;
          }
          @font-face {
            font-family: 'Gilroy';
            src: url('/fonts/Gilroy-Medium.woff2') format('woff2');
            font-weight: 500;
            font-style: normal;
          }
          @font-face {
            font-family: 'Gilroy';
            src: url('/fonts/Gilroy-Regular.woff2') format('woff2');
            font-weight: 400;
            font-style: normal;
          }

          input[type="range"] {
            -webkit-appearance: none;
            background: transparent;
          }
          input[type="range"]::-webkit-slider-runnable-track {
            height: 4px;
            background: #374151;
            border-radius: 2px;
          }
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            height: 14px;
            width: 14px;
            background: #dc2626;
            border-radius: 50%;
            margin-top: -5px;
            cursor: pointer;
          }

          .scrollbar-thin::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          .scrollbar-thin::-webkit-scrollbar-track {
            background: #1a1a24;
          }
          .scrollbar-thin::-webkit-scrollbar-thumb {
            background: #374151;
            border-radius: 3px;
          }
          .scrollbar-thin::-webkit-scrollbar-thumb:hover {
            background: #4b5563;
          }
        `}</style>
      </Head>

      <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
        {/* Header */}
        <header className="h-14 bg-[#12121a] border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-bold text-sm">
                TV
              </div>
              <span className="font-semibold">Video Editor</span>
            </a>

            {/* Preset selector */}
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="bg-[#1a1a24] border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-red-500"
            >
              {VIDEO_PRESETS.map(preset => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} ({preset.aspectRatio})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom */}
            <div className="flex items-center gap-2 mr-4">
              <span className="text-xs text-gray-400">Zoom:</span>
              <input
                type="range"
                min="0.2"
                max="1"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-24"
              />
              <span className="text-xs text-gray-400 w-10">{Math.round(scale * 100)}%</span>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a24] hover:bg-[#252530] rounded text-sm transition-colors"
            >
              <Icons.Upload />
              <span>Video Yükle</span>
            </button>

            <button
              onClick={() => setShowUrlModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a24] hover:bg-[#252530] rounded text-sm transition-colors"
            >
              <Icons.Link />
              <span>URL'den</span>
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              disabled={!videoSrc}
              className="flex items-center gap-2 px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
            >
              <Icons.Download />
              <span>Dışa Aktar</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Toolbar */}
          <div className="w-16 bg-[#12121a] border-r border-gray-800 flex flex-col items-center py-4 gap-2 shrink-0">
            <button
              onClick={() => addTextLayer()}
              className="w-10 h-10 rounded-lg bg-[#1a1a24] hover:bg-[#252530] flex items-center justify-center transition-colors group relative"
              title="Metin Ekle"
            >
              <Icons.Type />
              <span className="absolute left-12 bg-gray-900 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Metin Ekle
              </span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 rounded-lg bg-[#1a1a24] hover:bg-[#252530] flex items-center justify-center transition-colors group relative"
              title="Görsel Ekle"
            >
              <Icons.Image />
              <span className="absolute left-12 bg-gray-900 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Görsel Ekle
              </span>
            </button>

            <button
              onClick={() => addShapeLayer('rectangle')}
              className="w-10 h-10 rounded-lg bg-[#1a1a24] hover:bg-[#252530] flex items-center justify-center transition-colors group relative"
              title="Dikdörtgen"
            >
              <Icons.Square />
              <span className="absolute left-12 bg-gray-900 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Dikdörtgen
              </span>
            </button>

            <button
              onClick={() => addShapeLayer('circle')}
              className="w-10 h-10 rounded-lg bg-[#1a1a24] hover:bg-[#252530] flex items-center justify-center transition-colors group relative"
              title="Daire"
            >
              <Icons.Circle />
              <span className="absolute left-12 bg-gray-900 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Daire
              </span>
            </button>

            <button
              onClick={addGradientOverlay}
              className="w-10 h-10 rounded-lg bg-[#1a1a24] hover:bg-[#252530] flex items-center justify-center transition-colors group relative"
              title="Gradient Overlay"
            >
              <div className="w-5 h-5 rounded bg-gradient-to-t from-black to-transparent border border-gray-600" />
              <span className="absolute left-12 bg-gray-900 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Gradient
              </span>
            </button>

            <div className="w-8 h-px bg-gray-700 my-2" />

            <button
              onClick={() => setActiveTab('templates')}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors group relative ${activeTab === 'templates' ? 'bg-red-600' : 'bg-[#1a1a24] hover:bg-[#252530]'}`}
              title="Şablonlar"
            >
              <Icons.Grid />
              <span className="absolute left-12 bg-gray-900 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Şablonlar
              </span>
            </button>

            <button
              onClick={() => setActiveTab('assets')}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors group relative ${activeTab === 'assets' ? 'bg-red-600' : 'bg-[#1a1a24] hover:bg-[#252530]'}`}
              title="Varlıklar"
            >
              <Icons.Folder />
              <span className="absolute left-12 bg-gray-900 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Varlıklar
              </span>
            </button>

            <button
              onClick={() => setActiveTab('videos')}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors group relative ${activeTab === 'videos' ? 'bg-red-600' : 'bg-[#1a1a24] hover:bg-[#252530]'}`}
              title="Keşfedilen Videolar"
            >
              <Icons.Film />
              <span className="absolute left-12 bg-gray-900 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Videolar
              </span>
            </button>
          </div>

          {/* Secondary Panel */}
          {(activeTab === 'templates' || activeTab === 'assets' || activeTab === 'videos') && (
            <div className="w-64 bg-[#12121a] border-r border-gray-800 flex flex-col shrink-0">
              <div className="p-3 border-b border-gray-800">
                <h3 className="font-medium text-sm">
                  {activeTab === 'templates' && 'Şablonlar'}
                  {activeTab === 'assets' && 'Varlıklar'}
                  {activeTab === 'videos' && 'Keşfedilen Videolar'}
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
                {activeTab === 'templates' && (
                  <div className="space-y-2">
                    {VIDEO_TEMPLATES.map(template => (
                      <button
                        key={template.id}
                        onClick={() => applyTemplate(template.id)}
                        className="w-full p-3 bg-[#1a1a24] hover:bg-[#252530] rounded-lg text-left transition-colors"
                      >
                        <div className="font-medium text-sm">{template.name}</div>
                        <div className="text-xs text-gray-400 mt-1">{template.description}</div>
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === 'assets' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs text-gray-400 uppercase mb-2">Logolar</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {designAssets.filter(a => a.type === 'logo').map(asset => (
                          <button
                            key={asset.id}
                            onClick={() => addImageLayer(asset.url || asset.image_url, 'logo')}
                            className="aspect-square bg-[#1a1a24] hover:bg-[#252530] rounded-lg p-2 transition-colors"
                          >
                            <img
                              src={asset.url || asset.image_url}
                              alt={asset.name}
                              className="w-full h-full object-contain"
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs text-gray-400 uppercase mb-2">Kategori Rozetleri</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {categories.filter(c => c.badge_url).map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => addImageLayer(cat.badge_url, 'badge')}
                            className="aspect-square bg-[#1a1a24] hover:bg-[#252530] rounded-lg p-2 transition-colors"
                          >
                            <img
                              src={cat.badge_url}
                              alt={cat.name}
                              className="w-full h-full object-contain"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'videos' && (
                  <div className="space-y-2">
                    {discoveredVideos.map(video => (
                      <button
                        key={video.id}
                        onClick={() => loadDiscoveredVideo(video)}
                        className="w-full p-3 bg-[#1a1a24] hover:bg-[#252530] rounded-lg text-left transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          {video.thumbnail_url && (
                            <img
                              src={video.thumbnail_url}
                              alt=""
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-400">@{video.username}</div>
                            <div className="text-sm truncate">{video.description || 'Video'}</div>
                            <div className="text-xs text-gray-500 mt-1">{video.platform}</div>
                          </div>
                        </div>
                      </button>
                    ))}

                    {discoveredVideos.length === 0 && (
                      <div className="text-center text-gray-500 text-sm py-8">
                        Henüz keşfedilen video yok
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Canvas Area */}
          <div className="flex-1 bg-[#0a0a0f] flex items-center justify-center overflow-auto p-8">
            <div
              ref={canvasRef}
              className="relative bg-black shadow-2xl"
              style={{
                width: canvasWidth * scale,
                height: canvasHeight * scale,
              }}
              onClick={() => setSelectedLayerId(null)}
            >
              {/* Video Layer */}
              {videoSrc && (
                <video
                  ref={videoRef}
                  src={videoSrc}
                  className="absolute inset-0 w-full h-full object-contain"
                  muted={isMuted}
                  playsInline
                />
              )}

              {/* Placeholder when no video */}
              {!videoSrc && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Icons.Film />
                    <div className="mt-2 text-sm">Video yükleyin veya seçin</div>
                  </div>
                </div>
              )}

              {/* Overlay Layers */}
              {layers.map(layer => renderLayer(layer))}
            </div>
          </div>

          {/* Right Sidebar - Properties */}
          <div className="w-72 bg-[#12121a] border-l border-gray-800 flex flex-col shrink-0">
            {/* Layers Tab */}
            <div className="flex border-b border-gray-800">
              <button
                onClick={() => setActiveTab('layers')}
                className={`flex-1 px-4 py-2 text-sm ${activeTab === 'layers' ? 'text-white border-b-2 border-red-500' : 'text-gray-400'}`}
              >
                Katmanlar
              </button>
              <button
                onClick={() => setActiveTab('properties')}
                className={`flex-1 px-4 py-2 text-sm ${activeTab === 'properties' ? 'text-white border-b-2 border-red-500' : 'text-gray-400'}`}
              >
                Özellikler
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {activeTab === 'layers' && (
                <div className="p-3 space-y-1">
                  {layers.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm py-8">
                      Henüz katman yok.<br />
                      Sol taraftan ekleyin.
                    </div>
                  ) : (
                    [...layers].reverse().map(layer => (
                      <div
                        key={layer.id}
                        onClick={() => setSelectedLayerId(layer.id)}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                          selectedLayerId === layer.id ? 'bg-[#252530]' : 'hover:bg-[#1a1a24]'
                        }`}
                      >
                        <div className="w-6 h-6 flex items-center justify-center text-gray-400">
                          {layer.type === 'text' && <Icons.Type />}
                          {layer.type === 'image' && <Icons.Image />}
                          {layer.type === 'shape' && <Icons.Square />}
                          {layer.type === 'gradient' && <div className="w-4 h-4 rounded bg-gradient-to-t from-black to-transparent" />}
                        </div>

                        <span className="flex-1 text-sm truncate">{layer.name}</span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            updateLayer(layer.id, { visible: !layer.visible })
                          }}
                          className="text-gray-400 hover:text-white"
                        >
                          {layer.visible ? <Icons.Eye /> : <Icons.EyeOff />}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            updateLayer(layer.id, { locked: !layer.locked })
                          }}
                          className="text-gray-400 hover:text-white"
                        >
                          {layer.locked ? <Icons.Lock /> : <Icons.Unlock />}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'properties' && selectedLayer && (
                <div className="p-3 space-y-4">
                  {/* Common Properties */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">İsim</label>
                    <input
                      type="text"
                      value={selectedLayer.name}
                      onChange={(e) => updateLayer(selectedLayer.id, { name: e.target.value })}
                      className="w-full bg-[#1a1a24] border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-red-500"
                    />
                  </div>

                  {/* Position */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">X</label>
                      <input
                        type="number"
                        value={Math.round(selectedLayer.x)}
                        onChange={(e) => updateLayer(selectedLayer.id, { x: parseInt(e.target.value) || 0 })}
                        className="w-full bg-[#1a1a24] border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Y</label>
                      <input
                        type="number"
                        value={Math.round(selectedLayer.y)}
                        onChange={(e) => updateLayer(selectedLayer.id, { y: parseInt(e.target.value) || 0 })}
                        className="w-full bg-[#1a1a24] border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  {/* Size */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Genişlik</label>
                      <input
                        type="number"
                        value={Math.round(selectedLayer.width)}
                        onChange={(e) => updateLayer(selectedLayer.id, { width: parseInt(e.target.value) || 100 })}
                        className="w-full bg-[#1a1a24] border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Yükseklik</label>
                      <input
                        type="number"
                        value={Math.round(selectedLayer.height)}
                        onChange={(e) => updateLayer(selectedLayer.id, { height: parseInt(e.target.value) || 100 })}
                        className="w-full bg-[#1a1a24] border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  {/* Opacity */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Opaklık: {Math.round(selectedLayer.opacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={selectedLayer.opacity}
                      onChange={(e) => updateLayer(selectedLayer.id, { opacity: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  {/* Rotation */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Döndürme: {selectedLayer.rotation || 0}°
                    </label>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={selectedLayer.rotation || 0}
                      onChange={(e) => updateLayer(selectedLayer.id, { rotation: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  {/* Text Properties */}
                  {selectedLayer.type === 'text' && (
                    <>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Metin</label>
                        <textarea
                          value={selectedLayer.text}
                          onChange={(e) => updateLayer(selectedLayer.id, { text: e.target.value })}
                          rows={3}
                          className="w-full bg-[#1a1a24] border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-red-500 resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Font</label>
                          <select
                            value={selectedLayer.fontFamily}
                            onChange={(e) => updateLayer(selectedLayer.id, { fontFamily: e.target.value })}
                            className="w-full bg-[#1a1a24] border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-red-500"
                          >
                            {FONTS.map(font => (
                              <option key={font.name} value={font.value}>{font.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Kalınlık</label>
                          <select
                            value={selectedLayer.fontWeight}
                            onChange={(e) => updateLayer(selectedLayer.id, { fontWeight: parseInt(e.target.value) })}
                            className="w-full bg-[#1a1a24] border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-red-500"
                          >
                            {FONT_WEIGHTS.map(fw => (
                              <option key={fw.value} value={fw.value}>{fw.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Font Boyutu: {selectedLayer.fontSize}px
                        </label>
                        <input
                          type="range"
                          min="12"
                          max="200"
                          value={selectedLayer.fontSize}
                          onChange={(e) => updateLayer(selectedLayer.id, { fontSize: parseInt(e.target.value) })}
                          className="w-full"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Metin Rengi</label>
                          <input
                            type="color"
                            value={selectedLayer.color}
                            onChange={(e) => updateLayer(selectedLayer.id, { color: e.target.value })}
                            className="w-full h-8 bg-transparent cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Arka Plan</label>
                          <input
                            type="color"
                            value={selectedLayer.backgroundColor.startsWith('rgba') ? '#000000' : selectedLayer.backgroundColor}
                            onChange={(e) => updateLayer(selectedLayer.id, { backgroundColor: e.target.value })}
                            className="w-full h-8 bg-transparent cursor-pointer"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Shape Properties */}
                  {selectedLayer.type === 'shape' && (
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Dolgu Rengi</label>
                      <input
                        type="color"
                        value={selectedLayer.fill?.startsWith('rgba') ? '#dc2626' : selectedLayer.fill}
                        onChange={(e) => updateLayer(selectedLayer.id, { fill: e.target.value })}
                        className="w-full h-8 bg-transparent cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Animation */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Animasyon</label>
                    <select
                      value={selectedLayer.animation}
                      onChange={(e) => updateLayer(selectedLayer.id, { animation: e.target.value })}
                      className="w-full bg-[#1a1a24] border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-red-500"
                    >
                      {ANIMATION_TYPES.map(anim => (
                        <option key={anim.id} value={anim.id}>{anim.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Timing */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Başlangıç (s)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={selectedLayer.startTime}
                        onChange={(e) => updateLayer(selectedLayer.id, { startTime: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-[#1a1a24] border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Bitiş (s)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={selectedLayer.endTime}
                        onChange={(e) => updateLayer(selectedLayer.id, { endTime: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-[#1a1a24] border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-gray-800">
                    <button
                      onClick={() => duplicateLayer(selectedLayer.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#1a1a24] hover:bg-[#252530] rounded text-sm transition-colors"
                    >
                      <Icons.Copy />
                      Kopyala
                    </button>
                    <button
                      onClick={() => deleteLayer(selectedLayer.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-sm transition-colors"
                    >
                      <Icons.Trash />
                      Sil
                    </button>
                  </div>

                  {/* Layer Order */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => moveLayerUp(selectedLayer.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#1a1a24] hover:bg-[#252530] rounded text-sm transition-colors"
                    >
                      <Icons.ChevronUp />
                      Öne
                    </button>
                    <button
                      onClick={() => moveLayerDown(selectedLayer.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#1a1a24] hover:bg-[#252530] rounded text-sm transition-colors"
                    >
                      <Icons.ChevronDown />
                      Arkaya
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'properties' && !selectedLayer && (
                <div className="p-3 text-center text-gray-500 text-sm py-8">
                  Düzenlemek için bir katman seçin
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Timeline / Video Controls */}
        <div className="h-40 bg-[#12121a] border-t border-gray-800 flex flex-col shrink-0">
          {/* Video Controls */}
          <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-800">
            <div className="flex items-center gap-1">
              <button
                onClick={skipBackward}
                disabled={!videoSrc}
                className="p-1.5 hover:bg-[#252530] rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icons.SkipBack />
              </button>
              <button
                onClick={togglePlay}
                disabled={!videoSrc}
                className="p-2 bg-red-600 hover:bg-red-700 rounded-full disabled:bg-gray-700 disabled:cursor-not-allowed"
              >
                {isPlaying ? <Icons.Pause /> : <Icons.Play />}
              </button>
              <button
                onClick={skipForward}
                disabled={!videoSrc}
                className="p-1.5 hover:bg-[#252530] rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icons.SkipForward />
              </button>
            </div>

            {/* Time Display */}
            <div className="text-sm font-mono">
              <span className="text-white">{formatTime(currentTime)}</span>
              <span className="text-gray-500"> / {formatTime(videoDuration)}</span>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-1.5 hover:bg-[#252530] rounded"
              >
                {isMuted || volume === 0 ? <Icons.VolumeX /> : <Icons.Volume2 />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-20"
              />
            </div>

            {/* Playback Speed */}
            <select
              value={playbackRate}
              onChange={(e) => {
                const rate = parseFloat(e.target.value)
                setPlaybackRate(rate)
                if (videoRef.current) videoRef.current.playbackRate = rate
              }}
              className="bg-[#1a1a24] border border-gray-700 rounded px-2 py-1 text-xs"
            >
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>

            {/* Trim Info */}
            <div className="flex items-center gap-2 text-xs text-gray-400 ml-auto">
              <Icons.Scissors />
              <span>Trim: {formatTime(trimStart)} - {formatTime(trimEnd)}</span>
              <span className="text-white">({formatTime(trimEnd - trimStart)})</span>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex-1 px-4 py-2 overflow-hidden" ref={timelineRef}>
            {/* Seek Bar */}
            <div
              className="relative h-8 mb-2 cursor-pointer group"
              onClick={(e) => {
                if (!videoDuration) return
                const rect = e.currentTarget.getBoundingClientRect()
                const clickX = e.clientX - rect.left
                const percentage = clickX / rect.width
                const newTime = percentage * videoDuration
                seekTo(newTime)
              }}
            >
              <div className="absolute inset-0 bg-[#1a1a24] rounded" />

              {/* Trim Region */}
              <div
                className="absolute top-0 bottom-0 bg-red-600/20 border-l border-r border-red-500/50"
                style={{
                  left: `${(trimStart / (videoDuration || 1)) * 100}%`,
                  width: `${((trimEnd - trimStart) / (videoDuration || 1)) * 100}%`,
                }}
              />

              {/* Progress (dolgu) */}
              <div
                className="absolute top-0 bottom-0 bg-red-600/30 rounded-l transition-all duration-75"
                style={{
                  width: `${(currentTime / (videoDuration || 1)) * 100}%`,
                }}
              />

              {/* Current Position Indicator (çizgi) */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-red-500 rounded shadow-lg transition-all duration-75"
                style={{
                  left: `calc(${(currentTime / (videoDuration || 1)) * 100}% - 2px)`,
                }}
              >
                {/* Üstte yuvarlak gösterge */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full shadow group-hover:scale-125 transition-transform" />
              </div>

              {/* Time markers */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1 text-[10px] text-gray-500 pointer-events-none">
                <span>0:00</span>
                <span>{formatTime(videoDuration / 2)}</span>
                <span>{formatTime(videoDuration)}</span>
              </div>
            </div>

            {/* Trim Controls */}
            <div className="flex items-center gap-4 mb-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400">Başlangıç:</label>
                <input
                  type="number"
                  min="0"
                  max={trimEnd}
                  step="0.1"
                  value={trimStart.toFixed(1)}
                  onChange={(e) => setTrimStart(Math.min(parseFloat(e.target.value) || 0, trimEnd - 0.1))}
                  className="w-16 bg-[#1a1a24] border border-gray-700 rounded px-2 py-1 text-xs"
                />
                <button
                  onClick={() => setTrimStart(currentTime)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Şu an
                </button>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400">Bitiş:</label>
                <input
                  type="number"
                  min={trimStart}
                  max={videoDuration}
                  step="0.1"
                  value={trimEnd.toFixed(1)}
                  onChange={(e) => setTrimEnd(Math.max(parseFloat(e.target.value) || videoDuration, trimStart + 0.1))}
                  className="w-16 bg-[#1a1a24] border border-gray-700 rounded px-2 py-1 text-xs"
                />
                <button
                  onClick={() => setTrimEnd(currentTime)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Şu an
                </button>
              </div>

              <button
                onClick={() => {
                  setTrimStart(0)
                  setTrimEnd(videoDuration)
                }}
                className="text-xs text-gray-400 hover:text-white"
              >
                Sıfırla
              </button>
            </div>

            {/* Layer Tracks */}
            <div className="space-y-1 overflow-y-auto max-h-16">
              {layers.map(layer => (
                <div
                  key={layer.id}
                  className="relative h-5 bg-[#1a1a24] rounded cursor-pointer"
                  onClick={() => setSelectedLayerId(layer.id)}
                >
                  <div
                    className={`absolute top-0 bottom-0 rounded text-xs flex items-center px-2 truncate ${
                      selectedLayerId === layer.id ? 'bg-red-600' : 'bg-blue-600/50'
                    }`}
                    style={{
                      left: `${(layer.startTime / (videoDuration || 10)) * 100}%`,
                      width: `${((layer.endTime - layer.startTime) / (videoDuration || 10)) * 100}%`,
                    }}
                  >
                    {layer.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* URL Modal */}
        {showUrlModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-[#1a1a24] rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">URL'den Video Yükle</h2>
                <button
                  onClick={() => setShowUrlModal(false)}
                  className="p-1 hover:bg-[#252530] rounded"
                >
                  <Icons.X />
                </button>
              </div>

              <p className="text-sm text-gray-400 mb-4">
                TikTok, Instagram, Twitter veya YouTube video URL'si girin
              </p>

              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-[#12121a] border border-gray-700 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:border-red-500"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setShowUrlModal(false)}
                  className="flex-1 px-4 py-2 bg-[#252530] hover:bg-[#303040] rounded-lg transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={loadVideoFromUrl}
                  disabled={!videoUrl.trim() || isLoading}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                >
                  {isLoading ? 'Yükleniyor...' : 'Yükle'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-[#1a1a24] rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Videoyu Dışa Aktar</h2>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-1 hover:bg-[#252530] rounded"
                >
                  <Icons.X />
                </button>
              </div>

              {isLoading ? (
                <div className="py-8">
                  <div className="text-center mb-4">{loadingMessage}</div>
                  <div className="w-full h-2 bg-[#252530] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-600 transition-all"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                  <div className="text-center text-sm text-gray-400 mt-2">{exportProgress}%</div>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Format</label>
                      <div className="flex gap-2">
                        {['mp4', 'webm'].map(format => (
                          <button
                            key={format}
                            onClick={() => {}}
                            className="flex-1 px-4 py-2 bg-[#252530] hover:bg-[#303040] rounded-lg text-sm uppercase font-medium"
                          >
                            {format}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Kalite</label>
                      <div className="flex gap-2">
                        {[
                          { id: 'low', name: 'Düşük', desc: 'Küçük dosya' },
                          { id: 'medium', name: 'Orta', desc: 'Dengeli' },
                          { id: 'high', name: 'Yüksek', desc: 'En iyi kalite' },
                        ].map(q => (
                          <button
                            key={q.id}
                            onClick={() => {}}
                            className="flex-1 px-3 py-2 bg-[#252530] hover:bg-[#303040] rounded-lg text-center"
                          >
                            <div className="text-sm font-medium">{q.name}</div>
                            <div className="text-xs text-gray-500">{q.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-[#252530] rounded-lg">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Çözünürlük:</span>
                        <span>{canvasWidth} x {canvasHeight}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Süre:</span>
                        <span>{formatTime(trimEnd - trimStart)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Katman:</span>
                        <span>{layers.length} adet</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <button
                      onClick={() => exportVideo('mp4', 'high')}
                      className="w-full px-4 py-3 bg-[#252530] hover:bg-[#303040] rounded-lg transition-colors text-left"
                    >
                      <div className="font-medium">Sadece Video (MP4)</div>
                      <div className="text-xs text-gray-400 mt-1">
                        FFmpeg ile video kırp ve boyutlandır. Overlay'siz.
                      </div>
                    </button>
                    <button
                      onClick={exportWithOverlays}
                      disabled={layers.length === 0}
                      className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors text-left"
                    >
                      <div className="font-medium flex items-center gap-2">
                        <Icons.Layers />
                        Overlay'li Video (WebM)
                      </div>
                      <div className="text-xs text-red-200 mt-1">
                        Tüm katmanlar dahil. Canvas Recording ile.
                      </div>
                    </button>
                  </div>

                  <button
                    onClick={() => setShowExportModal(false)}
                    className="w-full px-4 py-2 bg-[#1a1a24] border border-gray-700 hover:bg-[#252530] rounded-lg transition-colors"
                  >
                    İptal
                  </button>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    Not: Overlay'li export tarayıcıda yapılır ve WebM formatında çıkar.
                    MP4 için FFmpeg.wasm kullanılır.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && !showExportModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <div className="text-lg">{loadingMessage}</div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
