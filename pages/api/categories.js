// Categories API - GET, POST, PUT, DELETE
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default async function handler(req, res) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // GET - Tüm kategorileri getir
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error

      return res.status(200).json({ categories: data || [] })
    } catch (error) {
      console.error('GET categories error:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  // POST - Yeni kategori ekle
  if (req.method === 'POST') {
    const { key, label_tr, badge_path, scene_description } = req.body

    if (!key || !label_tr) {
      return res.status(400).json({ error: 'key and label_tr are required' })
    }

    try {
      // Key benzersiz olmalı
      const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('key', key.toUpperCase())
        .single()

      if (existing) {
        return res.status(400).json({ error: 'Bu kategori key zaten mevcut' })
      }

      // Son sort_order'ı bul
      const { data: lastCategory } = await supabase
        .from('categories')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()

      const nextSortOrder = (lastCategory?.sort_order || 0) + 1

      const { data, error } = await supabase
        .from('categories')
        .insert({
          key: key.toUpperCase(),
          label_tr,
          badge_path: badge_path || '/images/turkvillelogo.png',
          scene_description: scene_description || '',
          sort_order: nextSortOrder,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      return res.status(201).json({ success: true, category: data })
    } catch (error) {
      console.error('POST categories error:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  // PUT - Kategori güncelle
  if (req.method === 'PUT') {
    const { id } = req.query
    const { label_tr, badge_path, sort_order, is_active, scene_description } = req.body

    if (!id) {
      return res.status(400).json({ error: 'id is required' })
    }

    try {
      const updateData = {}
      if (label_tr !== undefined) updateData.label_tr = label_tr
      if (badge_path !== undefined) updateData.badge_path = badge_path
      if (sort_order !== undefined) updateData.sort_order = sort_order
      if (is_active !== undefined) updateData.is_active = is_active
      if (scene_description !== undefined) updateData.scene_description = scene_description

      const { data, error } = await supabase
        .from('categories')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return res.status(200).json({ success: true, category: data })
    } catch (error) {
      console.error('PUT categories error:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  // DELETE - Kategori sil
  if (req.method === 'DELETE') {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: 'id is required' })
    }

    try {
      // Önce bu kategoride haber var mı kontrol et
      const { data: category } = await supabase
        .from('categories')
        .select('key')
        .eq('id', id)
        .single()

      if (category) {
        const { count } = await supabase
          .from('news_items')
          .select('id', { count: 'exact', head: true })
          .eq('category', category.key)

        if (count > 0) {
          return res.status(400).json({
            error: `Bu kategoride ${count} haber bulunuyor. Silmeden önce haberleri başka kategoriye taşıyın.`
          })
        }
      }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (error) throw error

      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('DELETE categories error:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
