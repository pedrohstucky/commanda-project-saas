'use client'

import { NotificationSettings } from "@/components/dashboard/notification-settings"

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Configurações</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Gerencie as configurações do seu restaurante
        </p>
      </div>

      <NotificationSettings />
    </div>
  )
}