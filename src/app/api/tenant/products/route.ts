import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { authenticateTenant } from '@/lib/auth/tenant'

interface Product {
  id: string
  name: string
  price: number
  is_available: boolean
}

interface ProductsResponse {
  success: boolean
  data?: {
    products: Product[]
    total: number
  }
  error?: string
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ProductsResponse>> {
  try {
    // 1. Autenticar tenant via instance_token
    const auth = await authenticateTenant(request)
    
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      )
    }

    const { tenantId } = auth.tenant

    // 2. Buscar produtos do tenant (apenas disponíveis)
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('id, name, price, is_available')
      .eq('tenant_id', tenantId)
      .eq('is_available', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('❌ Erro ao buscar produtos:', error)
      throw error
    }

    // 3. Retornar produtos
    return NextResponse.json({
      success: true,
      data: {
        products: products || [],
        total: products?.length || 0
      }
    })

  } catch (error) {
    console.error('❌ Erro na API de produtos:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao buscar produtos'
      },
      { status: 500 }
    )
  }
}