"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Camera, Upload, X, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface PhotoInputProps {
  onSelect: (file: File) => void
  required?: boolean
  label?: string
  accept?: string
  capture?: boolean
  disabled?: boolean
  preview?: boolean
}

export function PhotoInput({
  onSelect,
  required = false,
  label = "Foto",
  accept = "image/*",
  capture = true,
  disabled = false,
  preview = true,
}: PhotoInputProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      onSelect(file)

      if (preview) {
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
      }
    }
  }

  const handleCameraClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemove = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handlePreviewClick = () => {
    if (previewUrl) {
      setShowPreview(true)
    }
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Camera className="h-4 w-4" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        capture={capture ? "environment" : undefined}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {!selectedFile ? (
        <Button
          type="button"
          variant="outline"
          onClick={handleCameraClick}
          disabled={disabled}
          className="w-full h-32 border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 bg-transparent"
        >
          <div className="flex flex-col items-center gap-2">
            <Camera className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{capture ? "Tomar foto" : "Seleccionar imagen"}</span>
            <span className="text-xs text-muted-foreground">
              Toca para {capture ? "abrir cámara" : "seleccionar archivo"}
            </span>
          </div>
        </Button>
      ) : (
        <div className="relative">
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
            <div className="flex-shrink-0">
              {previewUrl ? (
                <img
                  src={previewUrl || "/placeholder.svg"}
                  alt="Preview"
                  className="w-16 h-16 object-cover rounded border"
                />
              ) : (
                <div className="w-16 h-16 bg-muted rounded border flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>

            <div className="flex gap-1">
              {preview && previewUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={handlePreviewClick}>
                  <Eye className="h-4 w-4" />
                </Button>
              )}

              <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={disabled}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {required && !selectedFile && <p className="text-xs text-muted-foreground">* Foto requerida</p>}

      {/* Preview Dialog */}
      {preview && previewUrl && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Vista previa</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              <img
                src={previewUrl || "/placeholder.svg"}
                alt="Preview"
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
