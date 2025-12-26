import type { Order } from "@/lib/types/order"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

/**
 * Exporta pedidos para CSV
 */
export function exportToCSV(orders: Order[], filename = "pedidos.csv") {
  // Headers
  const headers = [
    "ID",
    "Data",
    "Cliente",
    "Telefone",
    "Tipo",
    "Endereço",
    "Status",
    "Itens",
    "Total",
    "Observações"
  ]

  // Rows
  const rows = orders.map(order => [
    order.id.slice(0, 8),
    format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
    order.customer_name || "Sem nome",
    order.customer_phone || "Sem telefone",
    order.delivery_type === "delivery" ? "Entrega" : "Retirada",
    order.delivery_address || "-",
    getStatusLabel(order.status),
    order.order_items?.length || 0,
    `R$ ${order.total_amount.toFixed(2)}`,
    order.notes || "-"
  ])

  // Criar CSV
  const csvContent = [
    headers.join(","),
    ...rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
  ].join("\n")

  // Download
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Exporta pedidos para PDF (via print)
 */
export function exportToPDF(orders: Order[]) {
  // Criar HTML para impressão
  const printWindow = window.open("", "_blank")
  
  if (!printWindow) {
    alert("Bloqueador de pop-up ativo. Permita pop-ups para exportar PDF.")
    return
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Relatório de Pedidos</title>
        <style>
          @media print {
            @page { margin: 1cm; }
          }
          
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            margin: 0;
            padding: 20px;
          }
          
          h1 {
            font-size: 20px;
            margin-bottom: 10px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          
          .meta {
            font-size: 11px;
            color: #666;
            margin-bottom: 20px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          
          th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          
          tr:nth-child(even) {
            background-color: #fafafa;
          }
          
          .status {
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: bold;
          }
          
          .status-pending { background: #fef3c7; color: #92400e; }
          .status-preparing { background: #dbeafe; color: #1e40af; }
          .status-completed { background: #d1fae5; color: #065f46; }
          .status-cancelled { background: #fee2e2; color: #991b1b; }
          
          .summary {
            margin-top: 30px;
            padding: 15px;
            background: #f5f5f5;
            border-radius: 5px;
          }
          
          .summary h2 {
            font-size: 14px;
            margin-top: 0;
          }
          
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-top: 10px;
          }
          
          .summary-item {
            padding: 8px;
            background: white;
            border-radius: 3px;
          }
          
          .summary-label {
            font-size: 10px;
            color: #666;
            text-transform: uppercase;
          }
          
          .summary-value {
            font-size: 16px;
            font-weight: bold;
            margin-top: 4px;
          }
        </style>
      </head>
      <body>
        <h1>Relatório de Pedidos</h1>
        <div class="meta">
          Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          • Total: ${orders.length} pedido(s)
        </div>

        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Cliente</th>
              <th>Telefone</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Itens</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(order => `
              <tr>
                <td>${format(new Date(order.created_at), "dd/MM/yy HH:mm")}</td>
                <td>${order.customer_name || "Sem nome"}</td>
                <td>${order.customer_phone || "-"}</td>
                <td>${order.delivery_type === "delivery" ? "Entrega" : "Retirada"}</td>
                <td>
                  <span class="status status-${order.status}">
                    ${getStatusLabel(order.status)}
                  </span>
                </td>
                <td>${order.order_items?.length || 0}</td>
                <td>R$ ${order.total_amount.toFixed(2)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div class="summary">
          <h2>Resumo</h2>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Total de Pedidos</div>
              <div class="summary-value">${orders.length}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Faturamento Total</div>
              <div class="summary-value">R$ ${orders.reduce((sum, o) => sum + o.total_amount, 0).toFixed(2)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Ticket Médio</div>
              <div class="summary-value">R$ ${orders.length > 0 ? (orders.reduce((sum, o) => sum + o.total_amount, 0) / orders.length).toFixed(2) : "0.00"}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Pedidos Concluídos</div>
              <div class="summary-value">${orders.filter(o => o.status === "completed").length}</div>
            </div>
          </div>
        </div>

        <script>
          window.onload = () => {
            window.print()
            window.onafterprint = () => window.close()
          }
        </script>
      </body>
    </html>
  `

  printWindow.document.write(html)
  printWindow.document.close()
}

/**
 * Helper para traduzir status
 */
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pendente",
    preparing: "Preparando",
    completed: "Concluído",
    cancelled: "Cancelado"
  }
  return labels[status] || status
}