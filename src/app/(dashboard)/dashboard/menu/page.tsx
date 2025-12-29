"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { MenuSettingsSkeleton } from "@/components/ui/skeleton-patterns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Copy, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import type { MenuSettings } from "@/lib/types/menu";

export default function MenuSettingsPage() {
  const supabase = createBrowserSupabaseClient();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tenantId, setTenantId] = useState<string>("");
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const [settings, setSettings] = useState<MenuSettings>({
    slug: "",
    menu_enabled: false,
    theme_color: "#ea580c",
    whatsapp_number: "",
    opening_hours: {
      monday: { open: "08:00", close: "22:00" },
      tuesday: { open: "08:00", close: "22:00" },
      wednesday: { open: "08:00", close: "22:00" },
      thursday: { open: "08:00", close: "22:00" },
      friday: { open: "08:00", close: "22:00" },
      saturday: { open: "08:00", close: "23:00" },
      sunday: { open: "10:00", close: "22:00" },
    },
    welcome_message: "Bem-vindo ao nosso cardápio digital!",
    social_links: {
      instagram: "",
      facebook: "",
      website: "",
    },
  });

  /* Título */
  useEffect(() => {
    document.title = "Cardápio Digital - Dashboard";
  }, []);

  /* Gerar slug */
  const generateSlug = async (tenantName: string, currentTenantId: string) => {
    try {
      const { data, error } = await supabase.rpc("generate_unique_slug", {
        tenant_name: tenantName,
        tenant_id: currentTenantId,
      });

      if (error) throw error;

      setSettings((prev) => ({ ...prev, slug: data }));

      await supabase
        .from("tenants")
        .update({ slug: data })
        .eq("id", currentTenantId);

      return data;
    } catch (error) {
      logger.error("Erro ao gerar slug", error);
      toast.error("Erro ao gerar URL");
      return null;
    }
  };

  /* Carregar configurações */
  const loadSettings = async () => {
    try {
      setIsLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      setTenantId(profile.tenant_id);

      const { data: tenant, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", profile.tenant_id)
        .single();

      if (error) throw error;

      setSubscriptionPlan(tenant.subscription_plan);

      if (tenant.slug) {
        setSettings({
          slug: tenant.slug || "",
          menu_enabled: tenant.menu_enabled || false,
          theme_color: tenant.theme_color || "#ea580c",
          whatsapp_number: tenant.whatsapp_number || "",
          opening_hours: tenant.opening_hours,
          welcome_message: tenant.welcome_message,
          social_links: tenant.social_links,
        });
      } else {
        await generateSlug(tenant.name, profile.tenant_id);
      }
    } catch (error) {
      logger.error("Erro ao carregar configurações", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setIsLoading(false);
    }
  };

  /* Salvar */
  const handleSave = async () => {
    try {
      setIsSaving(true);

      if (!settings.slug.trim()) {
        toast.error("URL é obrigatória");
        return;
      }

      if (settings.menu_enabled && !settings.whatsapp_number.trim()) {
        toast.error(
          "Número do WhatsApp é obrigatório para ativar o cardápio"
        );
        return;
      }

      const { error } = await supabase
        .from("tenants")
        .update({
          slug: settings.slug,
          menu_enabled: settings.menu_enabled,
          theme_color: settings.theme_color,
          whatsapp_number: settings.whatsapp_number || null,
          opening_hours: settings.opening_hours,
          welcome_message: settings.welcome_message,
          social_links: settings.social_links,
        })
        .eq("id", tenantId);

      if (error) throw error;

      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      logger.error("Erro ao salvar", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  /* Copiar URL */
  const handleCopyUrl = () => {
    const url = `${window.location.origin}/cardapio/${settings.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("URL copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return <MenuSettingsSkeleton />;
  }

  const isPremium = subscriptionPlan === "premium";
  const menuUrl = `${window.location.origin}/cardapio/${settings.slug}`;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 space-y-8 overflow-x-hidden">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Cardápio Digital
        </h1>
        <p className="max-w-2xl text-sm sm:text-base text-muted-foreground">
          Configure seu cardápio público, personalize a aparência e controle
          como seus clientes acessam seu restaurante online.
        </p>
      </div>

      {/* Aviso Premium */}
      {!isPremium && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-1 shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold text-orange-900">
                  Recurso Premium
                </p>
                <p className="text-sm text-orange-700">
                  O Cardápio Digital está disponível apenas no plano Premium.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status */}
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Status do Cardápio</CardTitle>
            <Badge
              variant={settings.menu_enabled ? "default" : "secondary"}
            >
              {settings.menu_enabled ? "Ativo" : "Inativo"}
            </Badge>
          </div>
          <CardDescription>
            Controle a visibilidade do seu cardápio público
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <p className="font-medium">Cardápio Público</p>
              <p className="text-sm text-muted-foreground">
                Permite que clientes acessem seu cardápio online
              </p>
            </div>
            <Switch
              checked={settings.menu_enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, menu_enabled: checked })
              }
              disabled={!isPremium || isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label>URL do Cardápio</Label>
            <div className="relative">
              <Input value={menuUrl} readOnly className="pr-28" />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCopyUrl}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => window.open(menuUrl, "_blank")}
                  disabled={!settings.menu_enabled}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>URL Personalizada</Label>
            <div className="flex">
              <span className="flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm">
                /cardapio/
              </span>
              <Input
                value={settings.slug}
                disabled={!isPremium}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    slug: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, ""),
                  })
                }
                className="rounded-l-none"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Letras minúsculas, números e hífen
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personalização */}
        <Card>
          <CardHeader>
            <CardTitle>Personalização</CardTitle>
            <CardDescription>Aparência do cardápio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cor Principal</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  className="w-16 h-10 p-1"
                  value={settings.theme_color}
                  disabled={!isPremium}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      theme_color: e.target.value,
                    })
                  }
                />
                <Input
                  value={settings.theme_color}
                  disabled={!isPremium}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      theme_color: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mensagem de Boas-vindas</Label>
              <Textarea
                rows={3}
                value={settings.welcome_message}
                disabled={!isPremium}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    welcome_message: e.target.value,
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card>
          <CardHeader>
            <CardTitle>Contato</CardTitle>
            <CardDescription>
              WhatsApp e redes sociais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input
                value={settings.whatsapp_number}
                disabled={!isPremium}
                placeholder="5511999999999"
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    whatsapp_number: e.target.value.replace(/[^0-9]/g, ""),
                  })
                }
              />
            </div>

            <Separator />

            {(["instagram", "facebook", "website"] as const).map(
              (field) => (
                <div key={field} className="space-y-2">
                  <Label className="capitalize">{field}</Label>
                  <Input
                    value={settings.social_links[field]}
                    disabled={!isPremium}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        social_links: {
                          ...settings.social_links,
                          [field]: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ações */}
      <div className="flex flex-col sm:flex-row justify-end gap-3">
        <Button variant="outline" onClick={loadSettings}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={!isPremium || isSaving}>
          {isSaving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}
