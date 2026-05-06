import React, { createContext, useContext, useState, ReactNode } from 'react'
import { Modal } from '@/components/ui/Modal'
import { AlertTriangle, Trash2 } from 'lucide-react'

interface ConfirmOptions {
  title: string
  message: ReactNode
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null)

  const confirm = (opts: ConfirmOptions) => {
    setOptions(opts)
    setIsOpen(true)
    return new Promise<boolean>((resolve) => {
      setResolvePromise(() => resolve)
    })
  }

  const handleClose = () => {
    setIsOpen(false)
    if (resolvePromise) {
      resolvePromise(false)
      setResolvePromise(null)
    }
  }

  const handleConfirm = () => {
    setIsOpen(false)
    if (resolvePromise) {
      resolvePromise(true)
      setResolvePromise(null)
    }
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Modal open={isOpen} onClose={handleClose} maxWidth="sm">
        {options && (
          <div className="p-2 sm:p-4 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500 dark:bg-red-500/20">
              {options.danger !== false ? <Trash2 size={28} /> : <AlertTriangle size={28} />}
            </div>
            <h3 className="mb-2 text-xl font-bold text-light-ink-primary dark:text-dark-ink-primary">
              {options.title}
            </h3>
            <div className="mb-8 text-sm text-light-ink-secondary dark:text-dark-ink-secondary leading-relaxed">
              {options.message}
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={handleClose}
                className="btn-ghost flex-1 justify-center py-2.5 sm:flex-none sm:min-w-[120px]"
              >
                {options.cancelText ?? 'Cancel'}
              </button>
              <button
                onClick={handleConfirm}
                className={`btn flex-1 justify-center py-2.5 sm:flex-none sm:min-w-[120px] ${
                  options.danger !== false
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/25 hover:bg-red-600 focus:ring-red-500'
                    : 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-600 focus:ring-indigo-500'
                }`}
              >
                {options.confirmText ?? 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </ConfirmContext.Provider>
  )
}
