"use client"

import React, { forwardRef, useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: number
  onChange?: (value: number) => void
  currency?: string
  locale?: string
  allowNegative?: boolean
  max?: number
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      value = 0,
      onChange,
      currency = "BRL",
      locale = "pt-BR",
      allowNegative = false,
      max,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = useState("")
    const [isFocused, setIsFocused] = useState(false)

    // Formatar valor para exibição
    useEffect(() => {
      if (!isFocused) {
        const formatted = new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value)
        setDisplayValue(formatted)
      }
    }, [value, isFocused, locale, currency])

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      // Mostrar apenas o valor numérico quando focado
      const numericValue = value.toFixed(2).replace(".", ",")
      setDisplayValue(numericValue)
      // Selecionar tudo para facilitar edição
      setTimeout(() => e.target.select(), 0)
    }

    const handleBlur = () => {
      setIsFocused(false)
      // Formatar novamente ao perder foco
      const formatted = new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)
      setDisplayValue(formatted)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value

      // Remover tudo exceto números e vírgula
      inputValue = inputValue.replace(/[^\d,]/g, "")

      // Permitir apenas uma vírgula
      const parts = inputValue.split(",")
      if (parts.length > 2) {
        inputValue = parts[0] + "," + parts.slice(1).join("")
      }

      // Limitar casas decimais a 2
      if (parts[1] && parts[1].length > 2) {
        inputValue = parts[0] + "," + parts[1].substring(0, 2)
      }

      // Atualizar display
      setDisplayValue(inputValue)

      // Converter para número
      const numericValue = parseFloat(inputValue.replace(",", ".")) || 0

      // Validar limites
      let finalValue = numericValue
      if (!allowNegative && finalValue < 0) {
        finalValue = 0
      }
      if (max !== undefined && finalValue > max) {
        finalValue = max
      }

      // Notificar mudança
      onChange?.(finalValue)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Permitir: backspace, delete, tab, escape, enter
      if (
        [46, 8, 9, 27, 13].includes(e.keyCode) ||
        // Permitir: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true) ||
        // Permitir: home, end, left, right
        (e.keyCode >= 35 && e.keyCode <= 39)
      ) {
        return
      }

      // Bloquear tudo exceto números e vírgula
      if (
        (e.shiftKey || e.keyCode < 48 || e.keyCode > 57) &&
        (e.keyCode < 96 || e.keyCode > 105) &&
        e.keyCode !== 188 &&
        e.keyCode !== 110
      ) {
        e.preventDefault()
      }
    }

    return (
      <div className="relative">
        {!isFocused && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            R$
          </span>
        )}
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(!isFocused && "pl-10", className)}
          {...props}
        />
      </div>
    )
  }
)

CurrencyInput.displayName = "CurrencyInput"