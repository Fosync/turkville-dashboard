// Badge Upload API
import fs from 'fs'
import path from 'path'
import formidable from 'formidable'

export const config = {
  api: {
    bodyParser: false
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const form = formidable({
    uploadDir: path.join(process.cwd(), 'public', 'images'),
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    filter: ({ mimetype }) => mimetype && mimetype.includes('image')
  })

  try {
    const [fields, files] = await form.parse(req)

    const file = files.badge?.[0]
    const key = fields.key?.[0]

    if (!file) {
      return res.status(400).json({ error: 'Badge dosyası gerekli' })
    }

    if (!key) {
      return res.status(400).json({ error: 'Kategori key gerekli' })
    }

    // Dosya uzantısını al
    const ext = path.extname(file.originalFilename || '.png')

    // Yeni dosya adı: Turkville_{key}.png
    const newFilename = `Turkville_${key.toLowerCase()}${ext}`
    const newPath = path.join(process.cwd(), 'public', 'images', newFilename)

    // Eski dosyayı sil (varsa)
    if (fs.existsSync(newPath)) {
      fs.unlinkSync(newPath)
    }

    // Dosyayı yeniden adlandır
    fs.renameSync(file.filepath, newPath)

    const badgePath = `/images/${newFilename}`

    return res.status(200).json({
      success: true,
      path: badgePath,
      filename: newFilename
    })
  } catch (error) {
    console.error('Upload error:', error)
    return res.status(500).json({ error: error.message })
  }
}
