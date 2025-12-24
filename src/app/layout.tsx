import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import "./globals.css"

/* Fonts */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
})

/* Metadata */
export const metadata: Metadata = {
  title: "Commanda | Automatize os Pedidos do seu Restaurante",
  description: "SaaS de pedidos e automação para restaurantes",
  icons: {
    icon: [
      { url: "/favicon/favicon.ico" },
      { url: "/favicon/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/favicon/apple-touch-icon.png",
  },
}

/* Viewport */
export const viewport: Viewport = {
  themeColor: "#10b981",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${geistMono.variable}`}>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
