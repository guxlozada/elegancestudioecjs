export const services = [
  { code: "SERVCRT01", category: "Cortes", description: "Corte básico", taxBase: 10.00, finalValue: 11.20, taxIVA: 1.20, taxDebit: 0.25, taxDebit: 0.50, sellerCommission: 40, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVCRT03", category: "Cortes", description: "Corte premium", taxBase: 12.00, finalValue: 13.44, taxIVA: 1.44, taxDebit: 0.30, taxDebit: 0.60, sellerCommission: 40, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVCRT06", category: "Cortes", description: "Corte + barba", taxBase: 15.00, finalValue: 16.80, taxIVA: 1.80, taxDebit: 0.38, taxDebit: 0.75, sellerCommission: 40, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVCRT09", category: "Cortes", description: "Corte + facial  básico", taxBase: 15.00, finalValue: 16.80, taxIVA: 1.80, taxDebit: 0.38, taxDebit: 0.75, sellerCommission: 40, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVCRT12", category: "Cortes", description: "Corte + barba + tinturado de barba", taxBase: 17.00, finalValue: 19.04, taxIVA: 2.04, taxDebit: 0.43, taxDebit: 0.85, sellerCommission: 40, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVCRT15", category: "Cortes", description: "Corte + facial profundo", taxBase: 25.00, finalValue: 28.00, taxIVA: 3.00, taxDebit: 0.63, taxDebit: 1.25, sellerCommission: 40, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVCRT18", category: "Cortes", description: "Corte + tinturado de canas", taxBase: 25.00, finalValue: 28.00, taxIVA: 3.00, taxDebit: 0.63, taxDebit: 1.25, sellerCommission: 40, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVCRT21", category: "Cortes", description: "Corte + rulos permanentes", taxBase: 45.00, finalValue: 50.40, taxIVA: 5.40, taxDebit: 1.13, taxDebit: 2.26, sellerCommission: 40, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVBRB01", category: "Barba", description: "Barba", taxBase: 8.00, finalValue: 8.96, taxIVA: 0.96, taxDebit: 0.20, taxDebit: 0.40, sellerCommission: 40, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVBRB03", category: "Barba", description: "Barba + tinturado de barba", taxBase: 10.00, finalValue: 11.20, taxIVA: 1.20, taxDebit: 0.25, taxDebit: 0.50, sellerCommission: 40, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVCJA01", category: "Cejas", description: "Cejas", taxBase: 5.00, finalValue: 5.60, taxIVA: 0.60, taxDebit: 0.13, taxDebit: 0.25, sellerCommission: 40, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVCJA03", category: "Cejas", description: "Cejas + pigmentación", taxBase: 8.00, finalValue: 8.96, taxIVA: 0.96, taxDebit: 0.20, taxDebit: 0.40, sellerCommission: 40, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVCJA06", category: "Cejas", description: "Depilación con cera", taxBase: 7.00, finalValue: 7.84, taxIVA: 0.84, taxDebit: 0.18, taxDebit: 0.35, sellerCommission: 40, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVCJA09", category: "Cejas", description: "Depilación con cera + pigmentación", taxBase: 10.00, finalValue: 11.20, taxIVA: 1.20, taxDebit: 0.25, taxDebit: 0.50, sellerCommission: 40, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVFAC01", category: "Facial", description: "Limpieza facial básica", taxBase: 7.00, finalValue: 7.84, taxIVA: 0.84, taxDebit: 0.18, taxDebit: 0.35, sellerCommission: 40, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVFAC03", category: "Facial", description: "Limpieza facial profunda", taxBase: 20.00, finalValue: 22.40, taxIVA: 2.40, taxDebit: 0.50, taxDebit: 1.00, sellerCommission: 40, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVTNT01", category: "Tinturado", description: "Tinturado cubre canas", taxBase: 15.00, finalValue: 16.80, taxIVA: 1.80, taxDebit: 0.38, taxDebit: 0.75, sellerCommission: 40, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVTNT03", category: "Tinturado", description: "Tinturado tonos fantasía", taxBase: 50.00, finalValue: 56.00, taxIVA: 6.00, taxDebit: 1.26, taxDebit: 2.51, sellerCommission: 40, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVTNT06", category: "Tinturado", description: "Tinturado en tonos platinados", taxBase: 80.00, finalValue: 89.60, taxIVA: 9.60, taxDebit: 2.02, taxDebit: 4.01, sellerCommission: 40, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVTNT09", category: "Tinturado", description: "Rayitos amarillos", taxBase: 50.00, finalValue: 56.00, taxIVA: 6.00, taxDebit: 1.26, taxDebit: 2.51, sellerCommission: 40, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVTNT12", category: "Tinturado", description: "Rayitos platinados", taxBase: 70.00, finalValue: 78.40, taxIVA: 8.40, taxDebit: 1.76, taxDebit: 3.51, sellerCommission: 40, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVUNA01", category: "Uñas", description: "Manicure rusa hombre", taxBase: 5.00, finalValue: 5.60, taxIVA: 0.60, taxDebit: 0.13, taxDebit: 0.25, sellerCommission: 60, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVUNA03", category: "Uñas", description: "Manicure rusa + esmaltado tradicional mujer", taxBase: 7.00, finalValue: 7.84, taxIVA: 0.84, taxDebit: 0.18, taxDebit: 0.35, sellerCommission: 60, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVUNA06", category: "Uñas", description: "Manicure rusa + esmaltado semipermanente", taxBase: 12.00, finalValue: 13.44, taxIVA: 1.44, taxDebit: 0.30, taxDebit: 0.60, sellerCommission: 60, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVUNA09", category: "Uñas", description: "Baño de acrílicas en uñas naturales", taxBase: 15.00, finalValue: 16.80, taxIVA: 1.80, taxDebit: 0.38, taxDebit: 0.75, sellerCommission: 60, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVUNA12", category: "Uñas", description: "Acrílicas (diseños básicos)", taxBase: 20.00, finalValue: 22.40, taxIVA: 2.40, taxDebit: 0.50, taxDebit: 1.00, sellerCommission: 60, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVUNA15", category: "Uñas", description: "Acrílicas (diseños elaborados)", taxBase: 25.00, finalValue: 28.00, taxIVA: 3.00, taxDebit: 0.63, taxDebit: 1.25, sellerCommission: 60, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVUNA18", category: "Uñas", description: "Retoques de acrílicas", taxBase: 12.00, finalValue: 13.44, taxIVA: 1.44, taxDebit: 0.30, taxDebit: 0.60, sellerCommission: 60, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVUNA21", category: "Uñas", description: "Retoque de acrílicas retoque cambio de diseño", taxBase: 15.00, finalValue: 16.80, taxIVA: 1.80, taxDebit: 0.38, taxDebit: 0.75, sellerCommission: 60, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVUNA24", category: "Uñas", description: "Retiro de acrílicas", taxBase: 8.00, finalValue: 8.96, taxIVA: 0.96, taxDebit: 0.20, taxDebit: 0.40, sellerCommission: 60, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVUNA27", category: "Uñas", description: "Pedicure spa hombre", taxBase: 6.00, finalValue: 6.72, taxIVA: 0.72, taxDebit: 0.15, taxDebit: 0.30, sellerCommission: 60, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVUNA30", category: "Uñas", description: "Pedicure spa + esmaltado tradicional", taxBase: 8.00, finalValue: 8.96, taxIVA: 0.96, taxDebit: 0.20, taxDebit: 0.40, sellerCommission: 60, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVUNA33", category: "Uñas", description: "Pedicure spa + esmaltado semipermanente", taxBase: 13.00, finalValue: 14.56, taxIVA: 1.56, taxDebit: 0.33, taxDebit: 0.65, sellerCommission: 60, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVDPI01", category: "Especiales", description: "Depilación de bigote mujer", taxBase: 5.00, finalValue: 5.60, taxIVA: 0.60, taxDebit: 0.13, taxDebit: 0.25, sellerCommission: 40, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVDPI03", category: "Especiales", description: "Depilación de bigote hombre", taxBase: 7.00, finalValue: 7.84, taxIVA: 0.84, taxDebit: 0.18, taxDebit: 0.35, sellerCommission: 40, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } },
  { code: "SERVPLC01", category: "Especiales", description: "Secado y planchado de cabello", taxBase: 15.00, finalValue: 16.80, taxIVA: 1.80, taxDebit: 0.38, taxDebit: 0.75, sellerCommission: 40, status: "A", retentionIVA: true, promo: { discountDay: 20, cash: 12 } }
]