"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import {
  uploadProductImage,
  compressImage,
  extractPathFromUrl,
  deleteProductImage,
} from "@/lib/utils/upload";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  tenantId: string;
  disabled?: boolean;
  maxSizeMB?: number;
  compress?: boolean;
}

/**
 * Componente de upload de imagem
 */
export function ImageUpload({
  value,
  onChange,
  tenantId,
  disabled = false,
  maxSizeMB = 5,
  compress = true,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Seleciona arquivo
   */
  const handleSelectFile = useCallback(() => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  }, [disabled, isUploading]);

  /**
   * Processa arquivo selecionado
   */
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        setIsUploading(true);

        // Criar preview local
        const previewUrl = URL.createObjectURL(file);
        setPreview(previewUrl);

        // Comprimir se necessário
        let fileToUpload = file;
        if (compress) {
          try {
            fileToUpload = await compressImage(file, 1200, 0.8);
          } catch (error) {
            logger.warn("⚠️ Erro ao comprimir, usando original:", error);
          }
        }

        // Fazer upload
        const result = await uploadProductImage(fileToUpload, tenantId, {
          maxSizeMB,
        });

        if (!result.success || !result.url) {
          throw new Error(result.error || "Erro ao fazer upload");
        }

        // Limpar preview local
        URL.revokeObjectURL(previewUrl);

        // Atualizar com URL final
        setPreview(result.url);
        onChange(result.url);

        toast.success("Imagem enviada com sucesso!");
      } catch (error) {
        logger.error("❌ Erro ao fazer upload:", error);
        toast.error(
          error instanceof Error ? error.message : "Erro ao fazer upload"
        );
        setPreview(value || null);
      } finally {
        setIsUploading(false);
        // Limpar input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [tenantId, maxSizeMB, compress, value, onChange]
  );

  /**
   * Remove imagem
   */
  const handleRemove = useCallback(async () => {
    if (disabled || isUploading) return;

    if (!confirm("Tem certeza que deseja remover esta imagem?")) {
      return;
    }

    try {
      setIsUploading(true);

      // Deletar do storage se tiver URL
      if (value) {
        const path = extractPathFromUrl(value);
        if (path) {
          await deleteProductImage(path);
        }
      }

      setPreview(null);
      onChange(null);

      toast.success("Imagem removida!");
    } catch (error) {
      logger.error("❌ Erro ao remover imagem:", error);
      toast.error("Erro ao remover imagem");
    } finally {
      setIsUploading(false);
    }
  }, [value, onChange, disabled, isUploading]);

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {preview ? (
        <div className="relative aspect-video w-full rounded-lg overflow-hidden border bg-muted">
          <Image
            src={preview}
            alt="Preview"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw" // ✅ ADICIONAR
          />

          {/* Overlay com botão de remover */}
          <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleSelectFile}
              disabled={disabled || isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span className="ml-2">Trocar</span>
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={disabled || isUploading}
            >
              <X className="h-4 w-4" />
              <span className="ml-2">Remover</span>
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSelectFile}
          disabled={disabled || isUploading}
          className="relative aspect-video w-full rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors flex flex-col items-center justify-center gap-2 bg-muted/50 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Enviando...</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  Clique para adicionar imagem
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG ou WEBP (máx. {maxSizeMB}MB)
                </p>
              </div>
            </>
          )}
        </button>
      )}
    </div>
  );
}
