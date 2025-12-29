"use client"

import { NotificationSettings } from "@/components/dashboard/notification-settings"

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-screen-xl space-y-10 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
          Configurações
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Gerencie as configurações do seu restaurante
        </p>
      </div>

      {/* Configurações */}
      <div className="space-y-8">
        <NotificationSettings />

        {/* Adicionar mais cards de configuração aqui no futuro */}
      </div>
    </div>
  )
}
