"use client"

import { useEffect, useState, useCallback } from "react"
import { Search, ShoppingCart, Phone, Instagram, Facebook, Globe as WebIcon, Minus, Plus, Trash2 } from "lucide-react"
import { PublicMenuSkeleton } from "@/components/ui/skeleton-patterns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"

import { logger } from "@/lib/logger";
/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

interface MenuData {
  tenant: {
    id: string
    name: string
    slug: string
    theme_color: string
    whatsapp_number: string | null
    welcome_message: string
    social_links: {
      instagram?: string
      facebook?: string
      website?: string
    }
  }
  categories: Array<{
    id: string
    name: string
    description?: string
  }>
  products: Array<{
    id: string
    name: string
    description?: string
    price: number
    category_id: string
    image_url?: string
    is_available: boolean
    product_variations?: Array<{
      id: string
      name: string
      price: number
      is_available: boolean
    }>
    product_extras?: Array<{
      id: string
      name: string
      price: number
      is_available: boolean
    }>
  }>
}

interface CartItem {
  product_id: string
  product_name: string
  product_price: number
  quantity: number
  variation_id?: string
  variation_name?: string
  variation_price_modifier?: number
  extras: Array<{
    id: string
    name: string
    price: number
  }>
}

interface MenuPublicClientProps {
  slug: string
}

/* -------------------------------------------------------------------------- */
/*                                 COMPONENT                                  */
/* -------------------------------------------------------------------------- */

export default function MenuPublicClient({ slug }: MenuPublicClientProps) {
  // States
  const [menuData, setMenuData] = useState<MenuData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  
  // Modal states
  const [selectedProduct, setSelectedProduct] = useState<MenuData["products"][0] | null>(null)
  const [selectedVariation, setSelectedVariation] = useState<string | undefined>()
  const [selectedExtras, setSelectedExtras] = useState<string[]>([])
  const [quantity, setQuantity] = useState(1)
  const [showCart, setShowCart] = useState(false)

  /* -------------------------------------------------------------------------- */
  /*                                  EFFECTS                                   */
  /* -------------------------------------------------------------------------- */

  /**
   * Carregar dados do cardápio
   */
  const loadMenu = useCallback(async () => {
    try {
      setIsLoading(true)

      const response = await fetch(`/api/public/menu/${slug}`)
      const result = await response.json()

      if (!result.success || !result.data) {
        throw new Error(result.error || "Erro ao carregar cardápio")
      }

      setMenuData(result.data)
    } catch (error) {
      logger.error("Erro ao carregar cardápio:", error)
    } finally {
      setIsLoading(false)
    }
  }, [slug])

  useEffect(() => {
    loadMenu()
  }, [loadMenu])

  /* -------------------------------------------------------------------------- */
  /*                                  HELPERS                                   */
  /* -------------------------------------------------------------------------- */

  /**
   * Formatar preço
   */
  const formatPrice = useCallback((price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price)
  }, [])

  /**
   * Filtrar produtos
   */
  const filteredProducts = useCallback(() => {
    if (!menuData) return []

    let products = menuData.products

    // Filtrar por categoria
    if (selectedCategory !== "all") {
      products = products.filter((p) => p.category_id === selectedCategory)
    }

    // Filtrar por busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      )
    }

    return products
  }, [menuData, selectedCategory, searchQuery])

  /**
   * Total do carrinho
   */
  const cartTotal = useCallback(() => {
    return cart.reduce((total, item) => {
      const basePrice = item.product_price + (item.variation_price_modifier || 0)
      const extrasPrice = item.extras.reduce((sum, extra) => sum + extra.price, 0)
      return total + (basePrice + extrasPrice) * item.quantity
    }, 0)
  }, [cart])

  /**
   * Total de itens no carrinho
   */
  const cartItemsCount = useCallback(() => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }, [cart])

  /**
   * Calcular preço de um item do carrinho
   */
  const getCartItemPrice = useCallback((item: CartItem) => {
    const basePrice = item.product_price + (item.variation_price_modifier || 0)
    const extrasPrice = item.extras.reduce((sum, extra) => sum + extra.price, 0)
    return (basePrice + extrasPrice) * item.quantity
  }, [])

  /**
   * Resetar seleções do modal
   */
  const resetModal = useCallback(() => {
    setSelectedProduct(null)
    setSelectedVariation(undefined)
    setSelectedExtras([])
    setQuantity(1)
  }, [])

  /**
   * Calcular preço total do item selecionado
   */
  const calculateItemPrice = useCallback(() => {
    if (!selectedProduct) return 0

    let price = selectedProduct.price

    // Adicionar modificador da variação
    if (selectedVariation) {
      const variation = selectedProduct.product_variations?.find(
        (v) => v.id === selectedVariation
      )
      if (variation) {
        price += variation.price
      }
    }

    // Adicionar preço dos extras
    if (selectedExtras.length > 0) {
      const extrasPrice = selectedProduct.product_extras
        ?.filter((e) => selectedExtras.includes(e.id))
        .reduce((sum, extra) => sum + extra.price, 0) || 0
      price += extrasPrice
    }

    return price * quantity
  }, [selectedProduct, selectedVariation, selectedExtras, quantity])

  /**
   * Adicionar produto ao carrinho
   */
  const addToCart = useCallback(() => {
    if (!selectedProduct) return

    // Buscar variação selecionada
    const variation = selectedProduct.product_variations?.find(
      (v) => v.id === selectedVariation
    )

    // Buscar extras selecionados
    const extras =
      selectedProduct.product_extras?.filter((e) =>
        selectedExtras.includes(e.id)
      ) || []

    // Criar item do carrinho
    const cartItem: CartItem = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      product_price: selectedProduct.price,
      quantity,
      variation_id: variation?.id,
      variation_name: variation?.name,
      variation_price_modifier: variation?.price || 0,
      extras: extras.map((e) => ({
        id: e.id,
        name: e.name,
        price: e.price,
      })),
    }

    // Verificar se já existe no carrinho (mesmo produto, variação e extras)
    const existingIndex = cart.findIndex(
      (item) =>
        item.product_id === cartItem.product_id &&
        item.variation_id === cartItem.variation_id &&
        JSON.stringify(item.extras.map((e) => e.id).sort()) ===
          JSON.stringify(cartItem.extras.map((e) => e.id).sort())
    )

    if (existingIndex >= 0) {
      // Atualizar quantidade
      const newCart = [...cart]
      newCart[existingIndex].quantity += quantity
      setCart(newCart)
    } else {
      // Adicionar novo item
      setCart([...cart, cartItem])
    }

    // Resetar e fechar modal
    resetModal()
  }, [selectedProduct, selectedVariation, selectedExtras, quantity, cart, resetModal])

  /**
   * Atualizar quantidade de item no carrinho
   */
  const updateCartItemQuantity = useCallback((index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      // Remover item
      setCart(cart.filter((_, i) => i !== index))
    } else {
      // Atualizar quantidade
      const newCart = [...cart]
      newCart[index].quantity = newQuantity
      setCart(newCart)
    }
  }, [cart])

  /**
   * Remover item do carrinho
   */
  const removeCartItem = useCallback((index: number) => {
    setCart(cart.filter((_, i) => i !== index))
  }, [cart])

  /**
   * Limpar carrinho
   */
  const clearCart = useCallback(() => {
    setCart([])
    setShowCart(false)
  }, [])

  /**
   * Gerar mensagem do WhatsApp
   */
  const generateWhatsAppMessage = useCallback(() => {
    if (!menuData) return ""

    let message = `🛒 *Pedido - ${menuData.tenant.name}*\n\n`

    cart.forEach((item, index) => {
      message += `${index + 1}. *${item.product_name}*\n`
      
      if (item.variation_name) {
        message += `   Tamanho: ${item.variation_name}\n`
      }
      
      if (item.extras.length > 0) {
        message += `   Extras: ${item.extras.map(e => e.name).join(", ")}\n`
      }
      
      const itemPrice = getCartItemPrice(item)
      message += `   Quantidade: ${item.quantity}x\n`
      message += `   Subtotal: ${formatPrice(itemPrice)}\n\n`
    })

    message += `💰 *Total: ${formatPrice(cartTotal())}*\n\n`
    message += `_Pedido via Cardápio Digital_`

    return encodeURIComponent(message)
  }, [menuData, cart, cartTotal, getCartItemPrice, formatPrice])

  /**
   * Enviar pedido via WhatsApp
   */
  const sendWhatsAppOrder = useCallback(() => {
    if (!menuData?.tenant.whatsapp_number) return

    const message = generateWhatsAppMessage()
    const whatsappUrl = `https://wa.me/${menuData.tenant.whatsapp_number}?text=${message}`
    
    window.open(whatsappUrl, "_blank")
    
    // Limpar carrinho após enviar
    setTimeout(() => {
      clearCart()
    }, 1000)
  }, [menuData, generateWhatsAppMessage, clearCart])

  /* -------------------------------------------------------------------------- */
  /*                                  RENDER                                    */
  /* -------------------------------------------------------------------------- */

  if (isLoading) {
    return <PublicMenuSkeleton />
  }

  if (!menuData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Cardápio não encontrado</h1>
          <p className="text-muted-foreground">
            O cardápio que você está procurando não existe ou foi desativado.
          </p>
        </div>
      </div>
    )
  }

  const { tenant, categories } = menuData

  return (
    <div 
      className="min-h-screen bg-background"
      style={{ 
        "--theme-color": tenant.theme_color 
      } as React.CSSProperties}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4 py-4">
          {/* Nome do restaurante */}
          <div className="text-center mb-4">
            <h1 className="text-2xl md:text-3xl font-bold">{tenant.name}</h1>
            {tenant.welcome_message && (
              <p className="text-sm text-muted-foreground mt-1">
                {tenant.welcome_message}
              </p>
            )}
          </div>

          {/* Redes sociais e WhatsApp */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {tenant.whatsapp_number && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  window.open(
                    `https://wa.me/${tenant.whatsapp_number}`,
                    "_blank"
                  )
                }}
              >
                <Phone className="h-4 w-4" />
                WhatsApp
              </Button>
            )}

            {tenant.social_links?.instagram && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => window.open(tenant.social_links.instagram, "_blank")}
              >
                <Instagram className="h-4 w-4" />
              </Button>
            )}

            {tenant.social_links?.facebook && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => window.open(tenant.social_links.facebook, "_blank")}
              >
                <Facebook className="h-4 w-4" />
              </Button>
            )}

            {tenant.social_links?.website && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => window.open(tenant.social_links.website, "_blank")}
              >
                <WebIcon className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Busca */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar produtos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </header>

      {/* Categorias */}
      <div className="sticky top-[180px] md:top-[160px] z-40 bg-background border-b">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
              className="whitespace-nowrap"
            >
              Todos
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="whitespace-nowrap"
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid de produtos */}
      <div className="container mx-auto px-4 py-6 pb-24">
        {filteredProducts().length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery
                ? "Nenhum produto encontrado"
                : "Nenhum produto disponível"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts().map((product) => (
              <div
                key={product.id}
                className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedProduct(product)}
              >
                {/* Imagem */}
                {product.image_url ? (
                  <div className="relative aspect-video bg-muted">
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <span className="text-4xl">🍽️</span>
                  </div>
                )}

                {/* Conteúdo */}
                <div className="p-4">
                  <h3 className="font-semibold line-clamp-1">{product.name}</h3>
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {product.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-lg font-bold" style={{ color: tenant.theme_color }}>
                      {formatPrice(product.price)}
                    </span>

                    {product.product_variations && product.product_variations.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {product.product_variations.length} tamanhos
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de detalhes do produto */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && resetModal()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedProduct.name}</DialogTitle>
                {selectedProduct.description && (
                  <DialogDescription>{selectedProduct.description}</DialogDescription>
                )}
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Imagem */}
                {selectedProduct.image_url ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden">
                    <Image
                      src={selectedProduct.image_url}
                      alt={selectedProduct.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                    <span className="text-6xl">🍽️</span>
                  </div>
                )}

                {/* Variações */}
                {selectedProduct.product_variations && 
                 selectedProduct.product_variations.filter(v => v.is_available).length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">
                      Escolha o tamanho *
                    </Label>
                    <RadioGroup
                      value={selectedVariation}
                      onValueChange={setSelectedVariation}
                    >
                      {selectedProduct.product_variations
                        .filter(v => v.is_available)
                        .map((variation) => (
                          <div
                            key={variation.id}
                            className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer"
                          >
                            <RadioGroupItem
                              value={variation.id}
                              id={variation.id}
                            />
                            <Label
                              htmlFor={variation.id}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="flex items-center justify-between">
                                <span>{variation.name}</span>
                                <span className="font-semibold">
                                  {variation.price > 0 && "+"}
                                  {formatPrice(variation.price)}
                                </span>
                              </div>
                            </Label>
                          </div>
                        ))}
                    </RadioGroup>
                  </div>
                )}

                {/* Extras */}
                {selectedProduct.product_extras && 
                 selectedProduct.product_extras.filter(e => e.is_available).length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">
                      Adicionais (opcional)
                    </Label>
                    <div className="space-y-2">
                      {selectedProduct.product_extras
                        .filter(e => e.is_available)
                        .map((extra) => (
                          <div
                            key={extra.id}
                            className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50"
                          >
                            <Checkbox
                              id={extra.id}
                              checked={selectedExtras.includes(extra.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedExtras([...selectedExtras, extra.id])
                                } else {
                                  setSelectedExtras(
                                    selectedExtras.filter((id) => id !== extra.id)
                                  )
                                }
                              }}
                            />
                            <Label
                              htmlFor={extra.id}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="flex items-center justify-between">
                                <span>{extra.name}</span>
                                <span className="font-semibold">
                                  +{formatPrice(extra.price)}
                                </span>
                              </div>
                            </Label>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Quantidade */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Quantidade</Label>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-xl font-semibold w-12 text-center">
                      {quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Preço total */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between text-lg">
                    <span className="font-semibold">Total:</span>
                    <span className="font-bold text-2xl" style={{ color: tenant.theme_color }}>
                      {formatPrice(calculateItemPrice())}
                    </span>
                  </div>
                </div>

                {/* Botão adicionar */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={addToCart}
                  disabled={
                    selectedProduct.product_variations &&
                    selectedProduct.product_variations.length > 0 &&
                    !selectedVariation
                  }
                  style={{ backgroundColor: tenant.theme_color }}
                >
                  Adicionar ao Carrinho
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal do carrinho */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Seu Carrinho</DialogTitle>
            <DialogDescription>
              {cartItemsCount()} {cartItemsCount() === 1 ? "item" : "itens"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Seu carrinho está vazio</p>
              </div>
            ) : (
              <>
                {/* Lista de itens */}
                <div className="space-y-3">
                  {cart.map((item, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold">{item.product_name}</h4>
                          {item.variation_name && (
                            <p className="text-sm text-muted-foreground">
                              {item.variation_name}
                            </p>
                          )}
                          {item.extras.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                              + {item.extras.map(e => e.name).join(", ")}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeCartItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateCartItemQuantity(index, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-semibold w-8 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateCartItemQuantity(index, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <span className="font-bold" style={{ color: tenant.theme_color }}>
                          {formatPrice(getCartItemPrice(item))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Total */}
                <div className="flex items-center justify-between text-lg">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold text-2xl" style={{ color: tenant.theme_color }}>
                    {formatPrice(cartTotal())}
                  </span>
                </div>

                {/* Botões */}
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={sendWhatsAppOrder}
                    disabled={!tenant.whatsapp_number}
                    style={{ backgroundColor: tenant.theme_color }}
                  >
                    <Phone className="mr-2 h-5 w-5" />
                    Finalizar Pedido via WhatsApp
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={clearCart}
                  >
                    Limpar Carrinho
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Carrinho flutuante */}
      {cartItemsCount() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg z-50">
          <div className="container mx-auto max-w-md">
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={() => setShowCart(true)}
              style={{ backgroundColor: tenant.theme_color }}
            >
              <ShoppingCart className="h-5 w-5" />
              <span>Ver Carrinho ({cartItemsCount()})</span>
              <span className="ml-auto font-bold">{formatPrice(cartTotal())}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}