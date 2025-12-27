import { Metadata } from "next"
import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"
import MenuPublicClient from "./client"

interface PageProps {
  params: Promise<{ slug: string }>
}

/**
 * Gera metadata dinâmica com o nome do restaurante
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params

  try {
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("name")
      .eq("slug", slug)
      .eq("menu_enabled", true)
      .single()

    if (!tenant) {
      return {
        title: "Cardápio não encontrado",
      }
    }

    return {
      title: `${tenant.name} - Cardápio Digital`,
      description: `Confira o cardápio completo de ${tenant.name}`,
      openGraph: {
        title: `${tenant.name} - Cardápio Digital`,
        description: `Confira o cardápio completo de ${tenant.name}`,
      },
    }
  } catch {
    return {
      title: "Cardápio Digital",
    }
  }
}

/**
 * Página pública do cardápio
 */
export default async function MenuPublicPage({ params }: PageProps) {
  const { slug } = await params

  // Buscar dados do cardápio
  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("*")
    .eq("slug", slug)
    .eq("menu_enabled", true)
    .single()

  if (!tenant) {
    notFound()
  }

  // Verificar se é premium
  if (tenant.subscription_plan !== "premium") {
    notFound()
  }

  return <MenuPublicClient slug={slug} />
}