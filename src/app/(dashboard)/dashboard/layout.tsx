"use client"

import { useState } from "react"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Toaster } from "sonner"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Sidebar */}
      <DashboardSidebar
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Área principal */}
      <div className="pt-16 lg:pl-64">
        {/* Header fixo */}
        <DashboardHeader onMenuClick={() => setIsMobileOpen(true)} />

        {/* Conteúdo */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Toast */}
      <Toaster
        position="top-right"
        expand={false}
        richColors
        closeButton
        duration={3000}
        toastOptions={{
          classNames: {
            toast: "animate-in slide-in-from-top-full",
          },
          style: {
            zIndex: 9999,
          },
        }}
      />
    </div>
  )
}
