'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Upload, Trash2, FileText, Image, Loader2, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface UploadedDoc {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  createdAt: string
  userId?: string
}

interface FileUploaderProps {
  planId?: string
  workspaceId?: string
  maxFiles?: number
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️'
  return '📄'
}

export function FileUploader({ planId, workspaceId, maxFiles = 5 }: FileUploaderProps) {
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch existing docs on mount
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        // Fetch current user ID for ownership check
        const { createClient } = await import('@/utils/supabase/client')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUserId(user.id)
        }

        const params = new URLSearchParams()
        if (planId) params.set('planId', planId)
        if (workspaceId) params.set('workspaceId', workspaceId)

        const res = await fetch(`/api/documents/list?${params.toString()}`, {
          credentials: 'include',
        })
        if (res.ok) {
          const json = await res.json()
          if (Array.isArray(json.documents)) {
            setUploadedDocs(
              json.documents.map((d: any) => ({
                id: d.id,
                fileName: d.file_name || d.fileName,
                fileSize: d.file_size || d.fileSize,
                mimeType: d.mime_type || d.mimeType,
                createdAt: d.created_at || d.createdAt,
                userId: d.user_id || d.userId,
              }))
            )
          }
        }
      } catch (err) {
        console.error('Failed to fetch documents:', err)
      }
    }

    fetchDocs()
  }, [planId, workspaceId])

  const clearFeedback = () => {
    setTimeout(() => {
      setError(null)
      setWarning(null)
    }, 4000)
  }

  const handleUpload = useCallback(
    async (files: FileList) => {
      setError(null)
      setWarning(null)

      for (const file of Array.from(files)) {
        if (uploadedDocs.length >= maxFiles) {
          setWarning(`Maximum ${maxFiles} files reached`)
          clearFeedback()
          break
        }

        if (file.size > 10 * 1024 * 1024) {
          setError(`${file.name} exceeds 10MB limit`)
          clearFeedback()
          continue
        }

        setUploading(true)
        setUploadProgress(10)

        // Simulate progress ticks
        const progressInterval = setInterval(() => {
          setUploadProgress((p) => (p < 85 ? p + 10 : p))
        }, 300)

        const formData = new FormData()
        formData.append('file', file)
        if (planId) formData.append('planId', planId)
        if (workspaceId) formData.append('workspaceId', workspaceId)

        try {
          const res = await fetch('/api/documents/upload', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          })
          const json = await res.json()
          clearInterval(progressInterval)
          setUploadProgress(100)

          if (!res.ok) {
            setError(json.error || 'Upload failed')
            clearFeedback()
          } else {
            setUploadedDocs((prev) => [
              ...prev,
              {
                id: json.id,
                fileName: json.fileName,
                fileSize: json.fileSize,
                mimeType: file.type,
                createdAt: new Date().toISOString(),
              },
            ])
          }
        } catch (err) {
          clearInterval(progressInterval)
          setError('Network error — please try again')
          clearFeedback()
        } finally {
          setUploading(false)
          setTimeout(() => setUploadProgress(0), 600)
        }
      }
    },
    [uploadedDocs, maxFiles, planId, workspaceId]
  )

  const handleDelete = async (docId: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        setUploadedDocs((prev) => prev.filter((d) => d.id !== docId))
      } else {
        const json = await res.json()
        setError(json.error || 'Delete failed')
        clearFeedback()
      }
    } catch (err) {
      setError('Network error — delete failed')
      clearFeedback()
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files?.length) {
      handleUpload(e.dataTransfer.files)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      handleUpload(e.target.files)
      // Reset input so same file can be re-uploaded if deleted
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          📚 STUDY MATERIALS
        </span>
        <p className="text-[10px] font-bold text-amber-400 leading-snug">
          ⚠️ DO NOT UPLOAD FULL TEXTBOOKS — Upload ONLY the Title Page and Table of Contents pages to
          build your AI-powered learning path.
        </p>
      </div>

      {/* Drop Zone */}
      <motion.div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        animate={
          isDragOver
            ? {
                borderColor: 'rgba(0,240,255,0.4)',
                boxShadow: '0 0 20px rgba(0,240,255,0.1)',
              }
            : {
                borderColor: 'rgba(255,255,255,0.08)',
                boxShadow: '0 0 0px rgba(0,240,255,0)',
              }
        }
        transition={{ duration: 0.2 }}
        className="relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all select-none group bg-white/[0.02] hover:bg-white/[0.04]"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        whileHover={{
          borderColor: 'rgba(0,240,255,0.25)',
          backgroundColor: 'rgba(255,255,255,0.03)',
        }}
      >
        {/* Decorative glow blob */}
        <div
          className={`absolute inset-0 rounded-2xl transition-opacity duration-300 pointer-events-none ${
            isDragOver ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(0,240,255,0.06) 0%, transparent 70%)',
          }}
        />

        <div className="flex flex-col items-center gap-3 relative z-10">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300 ${
              isDragOver
                ? 'bg-[rgba(0,240,255,0.1)] border-[rgba(0,240,255,0.3)]'
                : 'bg-white/5 border-white/10 group-hover:bg-[rgba(0,240,255,0.07)] group-hover:border-[rgba(0,240,255,0.2)]'
            }`}
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 text-[#00F0FF] animate-spin" />
            ) : (
              <Upload
                className={`w-5 h-5 transition-colors duration-300 ${
                  isDragOver ? 'text-[#00F0FF]' : 'text-gray-500 group-hover:text-[#00F0FF]'
                }`}
              />
            )}
          </div>

          <div>
            <p className="text-sm font-black text-white uppercase tracking-wide leading-tight">
              DROP YOUR CONTENTS PAGE HERE
            </p>
            <p className="text-[10px] text-gray-500 mt-1.5 leading-snug">
              Or click to browse — PDF snippets, DOCX, PPTX, or screenshots
            </p>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/jpeg,image/png"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />
      </motion.div>

      {/* File Count Warning */}
      <AnimatePresence>
        {uploadedDocs.length >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3.5 py-3"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-400 font-medium leading-snug">
              ⚠️ Approaching limit — uploading large image scans may increase AI processing time.
              Keep snippets under 2MB each for best results.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Progress Bar */}
      <AnimatePresence>
        {uploading && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-1.5"
          >
            <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #6366f1, #00F0FF)',
                }}
                initial={{ width: '0%' }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
            <p className="text-[9px] text-gray-500 text-center font-bold tracking-widest uppercase">
              Uploading… {uploadProgress}%
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error / Warning Toast Pills */}
      <AnimatePresence>
        {error && (
          <motion.div
            key="error-toast"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-xl px-3.5 py-2.5"
          >
            <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
            <p className="text-[10px] text-red-400 font-bold leading-tight">{error}</p>
          </motion.div>
        )}
        {warning && !error && (
          <motion.div
            key="warn-toast"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3.5 py-2.5"
          >
            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
            <p className="text-[10px] text-amber-400 font-bold leading-tight">{warning}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Uploaded Files List */}
      <AnimatePresence>
        {uploadedDocs.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-2"
          >
            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest px-1">
              Uploaded ({uploadedDocs.length}/{maxFiles})
            </span>

            <div className="flex flex-col gap-1.5">
              <AnimatePresence initial={false}>
                {uploadedDocs.map((doc) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5 group hover:border-white/10 transition-all"
                  >
                    {/* File icon */}
                    <span className="text-base shrink-0">
                      {getFileIcon(doc.mimeType)}
                    </span>

                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-white truncate leading-tight">
                        {doc.fileName}
                      </p>
                      <p className="text-[9px] text-gray-600 mt-0.5 font-medium">
                        {formatBytes(doc.fileSize)}
                      </p>
                    </div>

                    {/* Delete button */}
                    {(!doc.userId || doc.userId === currentUserId) && (
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90"
                        title="Delete file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
