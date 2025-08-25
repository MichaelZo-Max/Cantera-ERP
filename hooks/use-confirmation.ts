"use client"

import { useState } from "react"

interface UseConfirmationOptions {
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
}

export function useConfirmation() {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<UseConfirmationOptions | null>(null)
  const [onConfirm, setOnConfirm] = useState<(() => void) | null>(null)

  const confirm = (opts: UseConfirmationOptions, callback: () => void) => {
    setOptions(opts)
    setOnConfirm(() => callback)
    setIsOpen(true)
  }

  const handleConfirm = () => {
    onConfirm?.()
    setIsOpen(false)
    setOptions(null)
    setOnConfirm(null)
  }

  const handleCancel = () => {
    setIsOpen(false)
    setOptions(null)
    setOnConfirm(null)
  }

  return {
    isOpen,
    options,
    confirm,
    handleConfirm,
    handleCancel,
  }
}
