import api from './client'

export type ImportExportType = 'products' | 'warehouses' | 'suppliers' | 'inventory' | 'stock_movements' | 'audit_logs'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const importExportService = {
  async downloadTemplate(type: ImportExportType) {
    const blob = await api.download(`/import/templates/${type}`)
    downloadBlob(blob, `${type}-template.csv`)
  },

  async exportData(type: ImportExportType) {
    const blob = await api.download(`/export/${type}`)
    downloadBlob(blob, `${type}-${new Date().toISOString().slice(0, 10)}.csv`)
  },

  async importData(type: ImportExportType, content: string): Promise<{ ok: boolean; imported: number }> {
    return api.post<{ ok: boolean; imported: number }>(`/import/${type}`, { content })
  },
}

export default importExportService
