// Design Templates API - GET, POST, PUT, DELETE
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default async function handler(req, res) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // GET - Şablonları getir
  if (req.method === 'GET') {
    const { slug, type, is_default } = req.query

    try {
      let query = supabase
        .from('design_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (slug) {
        query = query.eq('slug', slug).single()
        const { data, error } = await query
        if (error) throw error
        return res.status(200).json({ template: data })
      }

      if (type) {
        query = query.eq('type', type)
      }

      if (is_default === 'true') {
        query = query.eq('is_default', true)
      }

      const { data, error } = await query

      if (error) throw error

      return res.status(200).json({ templates: data || [] })
    } catch (error) {
      console.error('GET design-templates error:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  // POST - Yeni şablon oluştur
  if (req.method === 'POST') {
    const { name, type, canvas_width, canvas_height, layers, variables, is_default } = req.body

    if (!name || !type) {
      return res.status(400).json({ error: 'name and type are required' })
    }

    try {
      // Slug oluştur
      const slug = name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')

      // Eğer is_default=true ise diğerlerini false yap
      if (is_default) {
        await supabase
          .from('design_templates')
          .update({ is_default: false })
          .eq('type', type)
      }

      const { data, error } = await supabase
        .from('design_templates')
        .insert({
          name,
          slug,
          type,
          canvas_width: canvas_width || 1080,
          canvas_height: canvas_height || 1350,
          layers: layers || {},
          variables: variables || {},
          is_default: is_default || false
        })
        .select()
        .single()

      if (error) throw error

      return res.status(201).json({ success: true, template: data })
    } catch (error) {
      console.error('POST design-templates error:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  // PUT - Şablon güncelle
  if (req.method === 'PUT') {
    const { id } = req.query
    const { name, layers, variables, is_default, canvas_width, canvas_height } = req.body

    if (!id) {
      return res.status(400).json({ error: 'id is required' })
    }

    try {
      // Eğer is_default=true yapılıyorsa diğerlerini false yap
      if (is_default) {
        const { data: current } = await supabase
          .from('design_templates')
          .select('type')
          .eq('id', id)
          .single()

        if (current) {
          await supabase
            .from('design_templates')
            .update({ is_default: false })
            .eq('type', current.type)
        }
      }

      const updateData = {}
      if (name !== undefined) updateData.name = name
      if (layers !== undefined) updateData.layers = layers
      if (variables !== undefined) updateData.variables = variables
      if (is_default !== undefined) updateData.is_default = is_default
      if (canvas_width !== undefined) updateData.canvas_width = canvas_width
      if (canvas_height !== undefined) updateData.canvas_height = canvas_height

      const { data, error } = await supabase
        .from('design_templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return res.status(200).json({ success: true, template: data })
    } catch (error) {
      console.error('PUT design-templates error:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  // DELETE - Şablon sil
  if (req.method === 'DELETE') {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: 'id is required' })
    }

    try {
      const { error } = await supabase
        .from('design_templates')
        .delete()
        .eq('id', id)

      if (error) throw error

      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('DELETE design-templates error:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
