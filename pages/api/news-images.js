// News Images API - GET, DELETE, PUT
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default async function handler(req, res) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // GET - Haberin görsellerini getir
  if (req.method === 'GET') {
    const { news_id } = req.query

    if (!news_id) {
      return res.status(400).json({ error: 'news_id is required' })
    }

    try {
      const { data, error } = await supabase
        .from('news_images')
        .select('*')
        .eq('news_id', news_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      return res.status(200).json({ images: data || [] })
    } catch (error) {
      console.error('GET news-images error:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  // DELETE - Görseli sil (storage + db)
  if (req.method === 'DELETE') {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: 'id is required' })
    }

    try {
      // Önce görseli bul (storage_path için)
      const { data: image, error: findError } = await supabase
        .from('news_images')
        .select('*')
        .eq('id', id)
        .single()

      if (findError || !image) {
        return res.status(404).json({ error: 'Image not found' })
      }

      // Storage'dan sil
      if (image.storage_path) {
        const { error: storageError } = await supabase.storage
          .from('news-images')
          .remove([image.storage_path])

        if (storageError) {
          console.error('Storage delete error:', storageError)
          // Storage silme başarısız olsa bile DB'den silmeye devam et
        }
      }

      // DB'den sil
      const { error: deleteError } = await supabase
        .from('news_images')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      return res.status(200).json({ success: true, deleted: image })
    } catch (error) {
      console.error('DELETE news-images error:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  // PUT - Görseli seç (is_selected güncelle)
  if (req.method === 'PUT') {
    const { id, news_id } = req.query

    if (!id || !news_id) {
      return res.status(400).json({ error: 'id and news_id are required' })
    }

    try {
      // Önce tüm görsellerin is_selected'ını false yap
      const { error: resetError } = await supabase
        .from('news_images')
        .update({ is_selected: false })
        .eq('news_id', news_id)

      if (resetError) throw resetError

      // Seçilen görseli is_selected = true yap
      const { data: updated, error: updateError } = await supabase
        .from('news_images')
        .update({ is_selected: true })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      return res.status(200).json({ success: true, selected: updated })
    } catch (error) {
      console.error('PUT news-images error:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
