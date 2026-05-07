export const ownerContact = {
  name: 'faiznute',
  whatsappLocal: '085155043133',
  whatsappIntl: '6285155043133',
  email: 'faiznute07@gmail.com',
}

export function buildWhatsAppUrl(message: string) {
  return `https://wa.me/${ownerContact.whatsappIntl}?text=${encodeURIComponent(message)}`
}
