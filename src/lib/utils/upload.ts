import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"

/**
 * Opções de upload
 */
interface UploadOptions {
  maxSizeMB?: number
  allowedTypes?: string[]
  folder?: string
}

/**
 * Resultado do upload
 */
interface UploadResult {
  success: boolean
  url?: string
  path?: string
  error?: string
}

/**
 * Valida arquivo antes do upload
 */
function validateFile(
  file: File,
  options: UploadOptions = {}
): { valid: boolean; error?: string } {
  const {
    maxSizeMB = 5,
    allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  } = options

  // Validar tipo
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido. Use: ${allowedTypes
        .map((t) => t.split("/")[1].toUpperCase())
        .join(", ")}`,
    }
  }

  // Validar tamanho
  const sizeMB = file.size / 1024 / 1024
  if (sizeMB > maxSizeMB) {
    return {
      valid: false,
      error: `Arquivo muito grande. Máximo: ${maxSizeMB}MB (atual: ${sizeMB.toFixed(2)}MB)`,
    }
  }

  return { valid: true }
}

/**
 * Gera nome único e seguro para arquivo usando crypto
 */
function generateFileName(file: File, tenantId: string): string {
  const timestamp = Date.now()
  
  // Usar crypto.randomUUID() para geração segura
  const randomId = crypto.randomUUID().replace(/-/g, '').substring(0, 15)
  
  const extension = file.name.split(".").pop()
  return `${tenantId}/${timestamp}-${randomId}.${extension}`
}

/**
 * Faz upload de imagem para Supabase Storage
 */
export async function uploadProductImage(
  file: File,
  tenantId: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  try {
    // Validar arquivo
    const validation = validateFile(file, options)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      }
    }

    const supabase = createBrowserSupabaseClient()

    // Gerar nome do arquivo
    const fileName = generateFileName(file, tenantId)
    const filePath = options.folder ? `${options.folder}/${fileName}` : fileName

    logger.debug("Fazendo upload", { filePath, size: file.size })

    // Fazer upload
    const { data, error } = await supabase.storage
      .from("product-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

    if (error) {
      logger.error("Erro no upload", error)
      return {
        success: false,
        error: error.message,
      }
    }

    // Obter URL pública
    const {
      data: { publicUrl },
    } = supabase.storage.from("product-images").getPublicUrl(data.path)

    logger.debug("Upload concluído", { url: publicUrl })

    return {
      success: true,
      url: publicUrl,
      path: data.path,
    }
  } catch (error) {
    logger.error("Erro ao fazer upload", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao fazer upload",
    }
  }
}

/**
 * Deleta imagem do Supabase Storage
 */
export async function deleteProductImage(path: string): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient()

    logger.debug("Deletando imagem", { path })

    const { error } = await supabase.storage
      .from("product-images")
      .remove([path])

    if (error) {
      logger.error("Erro ao deletar", error)
      return false
    }

    logger.debug("Imagem deletada", { path })
    return true
  } catch (error) {
    logger.error("Erro ao deletar imagem", error)
    return false
  }
}

/**
 * Extrai path da URL do Supabase
 */
export function extractPathFromUrl(url: string): string | null {
  try {
    const match = url.match(/product-images\/(.+)$/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

/**
 * Comprime imagem no client-side antes do upload
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        // Calcular novas dimensões
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        // Criar canvas
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Não foi possível criar contexto do canvas"))
          return
        }

        // Desenhar imagem redimensionada
        ctx.drawImage(img, 0, 0, width, height)

        // Converter para blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Erro ao comprimir imagem"))
              return
            }

            // Criar novo arquivo
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            })

            const originalSizeKB = (file.size / 1024).toFixed(2)
            const compressedSizeKB = (compressedFile.size / 1024).toFixed(2)
            
            logger.debug("Compressão concluída", {
              original: `${originalSizeKB}KB`,
              compressed: `${compressedSizeKB}KB`
            })

            resolve(compressedFile)
          },
          file.type,
          quality
        )
      }

      img.onerror = () => {
        reject(new Error("Erro ao carregar imagem"))
      }

      img.src = e.target?.result as string
    }

    reader.onerror = () => {
      reject(new Error("Erro ao ler arquivo"))
    }

    reader.readAsDataURL(file)
  })
}