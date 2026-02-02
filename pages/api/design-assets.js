// Design Assets API - GET, POST, PUT, DELETE
import { createClient } from '@supabase/supabase-js'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const config = {
  api: { bodyParser: false }
}

export default async function handler(req, res) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // GET - Tüm asset'leri getir
  if (req.method === 'GET') {
    const { type, is_active } = req.query

    try {
      let query = supabase
        .from('design_assets')
        .select('*')
        .order('sort_order', { ascending: true })

      if (type && type !== 'all') {
        query = query.eq('type', type)
      }

      if (is_active !== undefined) {
        query = query.eq('is_active', is_active === 'true')
      } else {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) throw error

      return res.status(200).json({ assets: data || [] })
    } catch (error) {
      console.error('GET design-assets error:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  // POST - Yeni asset ekle (multipart/form-data)
  if (req.method === 'POST') {
    const form = formidable({
      uploadDir: path.join(process.cwd(), 'public', 'images'),
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB
      filter: ({ mimetype }) => mimetype && mimetype.includes('image')
    })

    try {
      const [fields, files] = await form.parse(req)

      const file = files.file?.[0]
      const name = fields.name?.[0] || 'Untitled'
      const type = fields.type?.[0] || 'other'
      const tags = fields.tags?.[0] || ''

      if (!file) {
        return res.status(400).json({ error: 'Dosya gerekli' })
      }

      // Slug oluştur
      const slug = name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')

      // Dosya uzantısı
      const ext = path.extname(file.originalFilename || '.png')
      const newFilename = `${slug}_${Date.now()}${ext}`
      const newPath = path.join(process.cwd(), 'public', 'images', newFilename)

      // Dosyayı taşı
      fs.renameSync(file.filepath, newPath)

      const filePath = `/images/${newFilename}`

      // Son sort_order'ı bul
      const { data: lastAsset } = await supabase
        .from('design_assets')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()

      const nextSortOrder = (lastAsset?.sort_order || 0) + 1

      // DB'ye ekle
      const { data, error } = await supabase
        .from('design_assets')
        .insert({
          name,
          slug,
          type,
          file_path: filePath,
          tags: tags ? tags.split(',').map(t => t.trim()) : [],
          sort_order: nextSortOrder,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      return res.status(201).json({ success: true, asset: data })
    } catch (error) {
      console.error('POST design-assets error:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  // PUT - Asset güncelle
  if (req.method === 'PUT') {
    try {
      // Body'yi parse et
      const chunks = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      const body = JSON.parse(Buffer.concat(chunks).toString())

      const { id, name, type, tags, is_active, sort_order } = body

      if (!id) {
        return res.status(400).json({ error: 'id is required' })
      }

      const updateData = {}
      if (name !== undefined) updateData.name = name
      if (type !== undefined) updateData.type = type
      if (tags !== undefined) updateData.tags = tags
      if (is_active !== undefined) updateData.is_active = is_active
      if (sort_order !== undefined) updateData.sort_order = sort_order

      const { data, error } = await supabase
        .from('design_assets')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return res.status(200).json({ success: true, asset: data })
    } catch (error) {
      console.error('PUT design-assets error:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  // DELETE - Asset sil (sadece is_active=false yap)
  if (req.method === 'DELETE') {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: 'id is required' })
    }

    try {
      // Soft delete - sadece is_active=false yap
      const { data, error } = await supabase
        .from('design_assets')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return res.status(200).json({ success: true, asset: data })
    } catch (error) {
      console.error('DELETE design-assets error:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
