"use client"

import { useState, useRef, useCallback, useMemo } from "react"
import { Upload, X, FileIcon } from "lucide-react"
import { createClient } from "@/utils/client"
import type { FieldProps } from "./types"

interface UploadedFile {
  name: string
  url: string
  size: number
}

export default function FileField({ question, value, onChange }: FieldProps) {
  const files = useMemo(() => (value as UploadedFile[]) ?? [], [value])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = useCallback(
    async (fileList: FileList) => {
      setUploading(true)
      setError("")
      const supabase = createClient()
      const newFiles: UploadedFile[] = [...files]

      for (const file of Array.from(fileList)) {
        const ext = file.name.split(".").pop()
        const path = `intake/${question.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from("intake-uploads")
          .upload(path, file)

        if (uploadError) {
          setError(`Failed to upload ${file.name}: ${uploadError.message}`)
          continue
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("intake-uploads").getPublicUrl(path)

        newFiles.push({
          name: file.name,
          url: publicUrl,
          size: file.size,
        })
      }

      onChange(newFiles)
      setUploading(false)
    },
    [files, onChange, question.id]
  )

  function removeFile(index: number) {
    const next = files.filter((_, i) => i !== index)
    onChange(next)
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-2">
      <label className="block font-body text-sm text-lyp-white/80">
        {question.fieldLabel}
        {question.required && <span className="text-lyp-cherry ml-1">*</span>}
      </label>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (e.dataTransfer.files.length > 0) {
            upload(e.dataTransfer.files)
          }
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 transition-colors ${
          dragOver
            ? "border-lyp-cherry bg-lyp-cherry/10"
            : "border-lyp-white/20 hover:border-lyp-white/40"
        }`}
      >
        <Upload className="mb-2 h-8 w-8 text-lyp-white/40" />
        <p className="font-body text-sm text-lyp-white/60">
          {uploading ? "Uploading..." : "Drop files here or click to browse"}
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              upload(e.target.files)
            }
          }}
          className="hidden"
        />
      </div>

      {error && <p className="font-body text-xs text-lyp-cherry">{error}</p>}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-lyp-white/10 px-4 py-2"
            >
              <FileIcon className="h-4 w-4 text-lyp-white/40" />
              <div className="flex-1 min-w-0">
                <p className="truncate font-body text-sm text-lyp-white">
                  {f.name}
                </p>
                <p className="font-body text-xs text-lyp-white/40">
                  {formatSize(f.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeFile(i)
                }}
                className="text-lyp-white/40 hover:text-lyp-cherry transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
