import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Erro de autenticação:", authError);
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      console.error("Perfil não encontrado para user:", user.id);
      return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
    }

    console.log("Tenant ID:", profile.tenant_id);

    const { data: instance } = await supabase
      .from("whatsapp_instances")
      .select("instance_token")
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (!instance || !instance.instance_token) {
      console.error("Instância não encontrada para tenant:", profile.tenant_id);
      return NextResponse.json({ error: "Instância não encontrada" }, { status: 404 });
    }

    console.log("Instance token:", instance.instance_token);

    const apiUrl = process.env.UAZAPI_API_URL;
    if (!apiUrl) {
      console.error("UAZAPI_API_URL não configurada");
      return NextResponse.json({ error: "URL da API não configurada" }, { status: 500 });
    }

    console.log("Chamando Uazapi DELETE:", `${apiUrl}/instance`);

    // Chamar API Uazapi para deletar
    const uazapiResponse = await fetch(`${apiUrl}/instance`, {
      method: "DELETE",
      headers: {
        "Accept": "application/json",
        "token": instance.instance_token
      }
    });

    console.log("Uazapi response status:", uazapiResponse.status);

    const uazapiData = await uazapiResponse.json();
    console.log("Uazapi response data:", uazapiData);

    if (!uazapiResponse.ok) {
      console.error("Erro na Uazapi:", uazapiData);
      // Mesmo com erro, vamos deletar do banco
    }

    // Deletar instância do banco
    const { error: deleteError } = await supabase
      .from("whatsapp_instances")
      .delete()
      .eq("tenant_id", profile.tenant_id);

    if (deleteError) {
      console.error("Erro ao deletar do banco:", deleteError);
      return NextResponse.json(
        { error: "Erro ao deletar instância do banco", details: deleteError },
        { status: 500 }
      );
    }

    console.log("Instância deletada com sucesso");

    return NextResponse.json({
      success: true,
      message: "Instância deletada com sucesso",
      uazapi: uazapiData
    });

  } catch (error) {
    console.error("Erro ao deletar instância:", error);
    return NextResponse.json(
      { error: "Erro ao deletar instância", details: String(error) },
      { status: 500 }
    );
  }
}