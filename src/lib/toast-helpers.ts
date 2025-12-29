import { toast } from "sonner"

/**
 * Toast com ação de desfazer
 */
export const toastWithUndo = (
  message: string,
  onUndo: () => void | Promise<void>,
  options?: {
    description?: string
    duration?: number
  }
) => {
  return toast.success(message, {
    description: options?.description,
    duration: options?.duration || 5000,
    action: {
      label: "Desfazer",
      onClick: async () => {
        try {
          await onUndo()
          toast.success("Ação desfeita!")
        } catch (error) {
          toast.error("Erro ao desfazer")
        }
      },
    },
  })
}

/**
 * Toast com ação de visualizar
 */
export const toastWithAction = (
  message: string,
  actionLabel: string,
  onAction: () => void,
  options?: {
    description?: string
    duration?: number
  }
) => {
  return toast.success(message, {
    description: options?.description,
    duration: options?.duration || 4000,
    action: {
      label: actionLabel,
      onClick: onAction,
    },
  })
}

/**
 * Toast de progresso com promise
 */
export const toastPromise = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((error: Error) => string)
  }
) => {
  return toast.promise(promise, {
    loading: messages.loading,
    success: (data) => {
      return typeof messages.success === "function"
        ? messages.success(data)
        : messages.success
    },
    error: (error) => {
      return typeof messages.error === "function"
        ? messages.error(error as Error)
        : messages.error
    },
  })
}

/**
 * Toast de upload com progresso
 */
export const toastUpload = (fileName: string) => {
  const id = toast.loading(`Enviando ${fileName}...`, {
    description: "0%",
  })

  return {
    id,
    updateProgress: (progress: number) => {
      toast.loading(`Enviando ${fileName}...`, {
        id,
        description: `${progress}%`,
      })
    },
    success: () => {
      toast.success("Upload concluído!", {
        id,
        description: fileName,
      })
    },
    error: (error: string) => {
      toast.error("Erro no upload", {
        id,
        description: error,
      })
    },
  }
}

/**
 * Toast de erro melhorado
 */
export const toastError = (
  title: string,
  error: unknown,
  options?: {
    showDetails?: boolean
  }
) => {
  const message = error instanceof Error ? error.message : "Erro desconhecido"
  
  toast.error(title, {
    description: options?.showDetails ? message : undefined,
    duration: 5000,
  })
}

/**
 * Toast agrupado (múltiplas ações)
 */
let toastGroupCount = 0
let toastGroupId: string | number | undefined

export const toastGroup = {
  start: (message: string) => {
    toastGroupCount = 0
    toastGroupId = toast.loading(message, {
      description: "Processando...",
    })
  },
  
  increment: () => {
    toastGroupCount++
    if (toastGroupId) {
      toast.loading("Processando...", {
        id: toastGroupId,
        description: `${toastGroupCount} item(ns) processado(s)`,
      })
    }
  },
  
  success: (message: string) => {
    if (toastGroupId) {
      toast.success(message, {
        id: toastGroupId,
        description: `${toastGroupCount} item(ns) processado(s)`,
      })
    }
    toastGroupCount = 0
    toastGroupId = undefined
  },
  
  error: (message: string) => {
    if (toastGroupId) {
      toast.error(message, {
        id: toastGroupId,
        description: `Erro após ${toastGroupCount} item(ns)`,
      })
    }
    toastGroupCount = 0
    toastGroupId = undefined
  },
}