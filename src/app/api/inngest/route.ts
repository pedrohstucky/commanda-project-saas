import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import {
  disconnectWhatsApp,
  deleteWhatsAppInstance,
  reconnectWhatsApp,
} from "@/lib/inngest/functions";

// Registrar todas as funções
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    disconnectWhatsApp,
    deleteWhatsAppInstance,
    reconnectWhatsApp,
  ],
});