import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'
import AdmZip from 'adm-zip'
import { textModel } from '@/utils/gemini'

/**
 * Extracts readable text from a file buffer based on its MIME type.
 * Returns null if extraction is unsupported or fails.
 */
export async function extractTextContent(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string | null> {
  const normalizedMime = mimeType.toLowerCase()

  try {
    // 1. Plain Text
    if (normalizedMime === 'text/plain') {
      return buffer.toString('utf-8')
    }

    // 2. PDF
    if (normalizedMime === 'application/pdf') {
      const parser = new PDFParse({ data: buffer })
      const data = await parser.getText()
      const text = data.text || ''
      await parser.destroy()
      return text
    }

    // 3. Word Document (.docx)
    if (
      normalizedMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      normalizedMime === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer })
      return result.value || ''
    }

    // 4. PowerPoint (.pptx)
    if (
      normalizedMime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      normalizedMime === 'application/vnd.ms-powerpoint'
    ) {
      return extractTextFromPptx(buffer)
    }

    // 5. Images (JPEG/PNG) via Gemini Vision
    if (normalizedMime === 'image/jpeg' || normalizedMime === 'image/png') {
      return await extractTextFromImage(buffer, normalizedMime)
    }

    console.warn(`Unsupported MIME type for text extraction: ${mimeType}`)
    return null
  } catch (error) {
    console.error(`Error extracting text from ${fileName} (${mimeType}):`, error)
    return null
  }
}

/**
 * Parses a PPTX file (which is a ZIP) and extracts all text within slide XMLs.
 */
function extractTextFromPptx(buffer: Buffer): string {
  try {
    const zip = new AdmZip(buffer)
    const zipEntries = zip.getEntries()
    let text = ''

    // Filter and sort slide XML files (e.g. ppt/slides/slide1.xml)
    const slideEntries = zipEntries
      .filter(
        (entry) =>
          entry.entryName.startsWith('ppt/slides/slide') &&
          entry.entryName.endsWith('.xml')
      )
      .sort((a, b) =>
        a.entryName.localeCompare(b.entryName, undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      )

    for (const entry of slideEntries) {
      const slideXml = entry.getData().toString('utf-8')
      // Extract text content inside <a:t>...</a:t> elements
      const matches = slideXml.match(/<a:t>([^<]*)<\/a:t>/g) || []
      const slideText = matches
        .map((m) => m.replace(/<\/?a:t>/g, ''))
        .join(' ')

      if (slideText.trim()) {
        const slideNum = entry.entryName.match(/\d+/)?.[0] ?? ''
        text += `[Slide ${slideNum}]\n${slideText}\n\n`
      }
    }

    return text.trim()
  } catch (error) {
    console.error('Failed to parse PPTX file:', error)
    return ''
  }
}

/**
 * Sends image data to Gemini Vision to extract readable text.
 */
async function extractTextFromImage(buffer: Buffer, mimeType: string): Promise<string> {
  const imageParts = [
    {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: mimeType,
      },
    },
  ]

  const prompt = `
    Extract all readable text, syllabus sections, chapter headings, topics, and notes from this image.
    Keep the format as plain text. Return only the extracted text content.
  `

  const result = await textModel.generateContent([prompt, ...imageParts])
  return result.response.text() || ''
}
