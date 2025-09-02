"use client"

import type React from "react"
import { useState, useRef, useCallback } from "react"
import { Camera, Upload, X, Eye, ImageIcon, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface PhotoInputProps {
  onSelect: (file: File) => void
  required?: boolean
  label?: string
  accept?: string
  capture?: boolean
  disabled?: boolean
  preview?: boolean
  className?: string
}

export function PhotoInput({
  onSelect,
  required = false,
  label = "Foto",
  accept = "image/*",
  capture = true,
  disabled = false,
  preview = true,
  className,
}: PhotoInputProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(
    async (file: File) => {
      setIsLoading(true)

      try {
        setSelectedFile(file)
        onSelect(file)

        if (preview) {
          const url = URL.createObjectURL(file)
          setPreviewUrl(url)
        }
      } catch (error) {
        console.error("Error processing file:", error)
      } finally {
        setIsLoading(false)
      }
    },
    [onSelect, preview],
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      const file = e.dataTransfer.files?.[0]
      if (file && file.type.startsWith("image/")) {
        handleFileSelect(file)
      }
    },
    [handleFileSelect],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

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
    <div className={cn("space-y-3", className)}>
      <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10">
          <Camera className="h-3 w-3 text-primary" />
        </div>
        {label}
        {required && <span className="text-destructive text-xs">*</span>}
      </Label>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        capture={capture ? "environment" : undefined}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleCameraClick}
          className={cn(
            "group relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer",
            "bg-gradient-to-br from-muted/30 to-muted/10 hover:from-muted/50 hover:to-muted/20",
            "min-h-[140px] sm:min-h-[160px] flex items-center justify-center",
            isDragOver
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-muted-foreground/20 hover:border-primary/50",
            disabled && "opacity-50 cursor-not-allowed hover:border-muted-foreground/20",
            isLoading && "pointer-events-none",
          )}
        >
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] group-hover:opacity-[0.05] transition-opacity" />

          <div className="relative z-10 flex flex-col items-center gap-4 p-6 text-center">
            <div
              className={cn(
                "relative flex items-center justify-center rounded-full transition-all duration-300",
                "w-16 h-16 sm:w-20 sm:h-20",
                "bg-gradient-to-br from-primary/10 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10",
                "group-hover:scale-110 group-hover:rotate-3",
              )}
            >
              {capture ? (
                <div className="flex items-center justify-center">
                  <Camera className="h-8 w-8 sm:h-10 sm:w-10 text-primary transition-transform group-hover:scale-110" />
                  <Smartphone className="h-4 w-4 text-primary/60 absolute -bottom-1 -right-1" />
                </div>
              ) : (
                <ImageIcon className="h-8 w-8 sm:h-10 sm:w-10 text-primary transition-transform group-hover:scale-110" />
              )}

              <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors">
                {capture ? "Tomar Foto" : "Subir Imagen"}
              </h3>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {capture ? "Toca para abrir la cámara" : "Arrastra una imagen o toca para seleccionar"}
                </p>
                <p className="text-xs text-muted-foreground/80 hidden sm:block">Formatos: JPG, PNG, WEBP • Máx: 10MB</p>
              </div>
            </div>

            {isLoading && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-xl">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="group relative overflow-hidden rounded-xl border bg-card shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-4 p-4">
            <div className="relative flex-shrink-0">
              {previewUrl ? (
                <div className="relative overflow-hidden rounded-lg border-2 border-muted">
                  <img
                    src={previewUrl || "/placeholder.svg"}
                    alt="Preview"
                    className="w-20 h-20 sm:w-24 sm:h-24 object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-muted rounded-lg border-2 border-muted flex items-center justify-center">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
              )}

              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-background">
                <Camera className="h-3 w-3 text-white" />
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <h4 className="font-medium text-sm sm:text-base truncate text-foreground">{selectedFile.name}</h4>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
                <span className="hidden sm:inline">{selectedFile.type.split("/")[1].toUpperCase()}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {preview && previewUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handlePreviewClick}
                  className="h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={disabled}
                className="h-9 w-9 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {required && !selectedFile && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-1 h-1 bg-destructive rounded-full" />
          Foto requerida para continuar
        </div>
      )}

      {preview && previewUrl && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-4">
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Vista Previa
              </DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6">
              <div className="relative rounded-lg overflow-hidden bg-muted/20">
                <img
                  src={previewUrl || "/placeholder.svg"}
                  alt="Preview"
                  className="w-full max-h-[60vh] object-contain"
                />
              </div>
              <div className="mt-4 text-sm text-muted-foreground text-center">
                {selectedFile?.name} • {((selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
