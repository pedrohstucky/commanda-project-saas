import { inngest } from "./client";
import { logger } from "@/lib/logger";
// =====================================================
// FUNÇÃO: Desconectar WhatsApp ao expirar
// =====================================================
export const disconnectWhatsApp = inngest.createFunction(
    {
      id: "disconnect-whatsapp",
      name: "Desconectar WhatsApp ao Expirar Subscription",
    },
    { event: "subscription/expired" },
    async ({ event, step }) => {
      const { tenantId } = event.data;
  
      await step.run("disconnect-whatsapp-uazapi", async () => {
        logger.debug(`🔌 Desconectando WhatsApp do tenant: ${tenantId}`);
  
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/disconnect`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-inngest-secret": process.env.INNGEST_INTERNAL_SECRET || "",
            },
            body: JSON.stringify({ tenantId }),
          }
        );
  
        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Erro ao desconectar: ${JSON.stringify(error)}`);
        }
  
        const result = await response.json();
        logger.debug(`✅ WhatsApp desconectado:`, result);
        return result;
      });
  
      return { success: true, tenantId };
    }
  );

// =====================================================
// FUNÇÃO: Deletar instância após 5 dias
// =====================================================
export const deleteWhatsAppInstance = inngest.createFunction(
  {
    id: "delete-whatsapp-instance",
    name: "Deletar Instância WhatsApp ao Cancelar",
  },
  { event: "subscription/cancelled" },
  async ({ event, step }) => {
    const { tenantId } = event.data;

    await step.run("delete-whatsapp-instance", async () => {
      logger.debug(`🗑️ Deletando instância WhatsApp do tenant: ${tenantId}`);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/delete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-inngest-secret": process.env.INNGEST_INTERNAL_SECRET || "",
          },
          body: JSON.stringify({ tenantId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Erro ao deletar: ${JSON.stringify(error)}`);
      }

      const result = await response.json();
      logger.debug(`✅ Instância deletada:`, result);
      return result;
    });

    return { success: true, tenantId };
  }
);

// =====================================================
// FUNÇÃO: Reconectar WhatsApp ao reativar (dentro de 5 dias)
// =====================================================
export const reconnectWhatsApp = inngest.createFunction(
    {
      id: "reconnect-whatsapp",
      name: "Reconectar WhatsApp ao Reativar Subscription",
    },
    { event: "subscription/reactivated" },
    async ({ event, step }) => {
      const { tenantId, wasDeleted } = event.data;
  
      if (wasDeleted) {
        // Se foi deletado, criar nova instância
        await step.run("create-new-instance", async () => {
          logger.debug(`🆕 Criando nova instância para tenant: ${tenantId}`);
  
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/create`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-inngest-secret": process.env.INNGEST_INTERNAL_SECRET || "",
              },
              body: JSON.stringify({ tenantId }),
            }
          );
  
          if (!response.ok) {
            const error = await response.json();
            throw new Error(`Erro ao criar instância: ${JSON.stringify(error)}`);
          }
  
          const result = await response.json();
          logger.debug(`✅ Nova instância criada:`, result);
          return result;
        });
      } else {
        // Se não foi deletado, apenas gerar novo QR Code
        await step.run("generate-qrcode", async () => {
          logger.debug(`📱 Gerando QR Code para tenant: ${tenantId}`);
  
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/qrcode`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-inngest-secret": process.env.INNGEST_INTERNAL_SECRET || "",
              },
              body: JSON.stringify({ tenantId }),
            }
          );
  
          if (!response.ok) {
            const error = await response.json();
            throw new Error(`Erro ao gerar QR Code: ${JSON.stringify(error)}`);
          }
  
          const result = await response.json();
          logger.debug(`✅ QR Code gerado:`, result);
          return result;
        });
      }
  
      return { success: true, tenantId, wasDeleted };
    }
  );

  export const functions = [
    disconnectWhatsApp,
    deleteWhatsAppInstance,
    reconnectWhatsApp,
  ]