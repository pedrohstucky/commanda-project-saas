import { WhatsAppStatusBanner } from "@/components/whatsapp-status-banner"
import { SubscriptionAlertBanner } from "@/components/subscription-alert-banner"
import { DashboardMetrics } from "@/components/dashboard/dashboard-metrics"
import { RecentOrders } from "@/components/dashboard/recent-orders"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <SubscriptionAlertBanner />
      <WhatsAppStatusBanner />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu restaurante</p>
      </div>
      <DashboardMetrics />
      <RecentOrders />
    </div>
  )
}