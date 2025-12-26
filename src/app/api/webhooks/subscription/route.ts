import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.log("📨 Webhook recebido:", payload);

    const { table, record, old_record } = payload;

    // Processar apenas mudanças na tabela tenants
    if (table !== "tenants") {
      return NextResponse.json({ received: true });
    }

    // Detectar mudanças de status
    const oldStatus = old_record?.subscription_status;
    const newStatus = record?.subscription_status;

    if (oldStatus === newStatus) {
      // Status não mudou, ignorar
      return NextResponse.json({ received: true });
    }

    console.log(`🔄 Status mudou: ${oldStatus} → ${newStatus}`);

    // Disparar eventos Inngest baseado APENAS no novo status
    if (oldStatus === "active" && newStatus === "expired") {
      // Subscription expirou
      await inngest.send({
        name: "subscription/expired",
        data: {
          tenantId: record.id,
          tenantName: record.name,
          expiredAt: new Date().toISOString(),
        },
      });
      console.log("✅ Evento 'subscription/expired' enviado");
    } 
    else if (oldStatus === "expired" && newStatus === "cancelled") {
      // Subscription cancelada
      await inngest.send({
        name: "subscription/cancelled",
        data: {
          tenantId: record.id,
          tenantName: record.name,
          cancelledAt: new Date().toISOString(),
        },
      });
      console.log("✅ Evento 'subscription/cancelled' enviado");
    } 
    else if ((oldStatus === "expired" || oldStatus === "cancelled") && newStatus === "active") {
      // Subscription reativada
      const wasDeleted = oldStatus === "cancelled";
      
      await inngest.send({
        name: "subscription/reactivated",
        data: {
          tenantId: record.id,
          tenantName: record.name,
          wasDeleted,
          reactivatedAt: new Date().toISOString(),
        },
      });
      console.log("✅ Evento 'subscription/reactivated' enviado");
    }
    else {
      console.log(`⚠️ Mudança de status não mapeada: ${oldStatus} → ${newStatus}`);
    }

    return NextResponse.json({ 
      success: true,
      statusChange: `${oldStatus} → ${newStatus}`
    });

  } catch (error) {
    console.error("❌ Erro no webhook:", error);
    return NextResponse.json(
      { error: "Erro ao processar webhook" },
      { status: 500 }
    );
  }
}