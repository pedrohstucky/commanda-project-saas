import { NotificationSettings } from "@/components/dashboard/notification-settings"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações do seu restaurante
        </p>
      </div>

      <NotificationSettings />
      
      {/* Outras seções de configurações podem vir aqui */}
    </div>
  )
}