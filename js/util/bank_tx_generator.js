import { formatToOperationDayStringEc } from "../dom/fecha-util.js";
const TDEBIT_COMISSION = 0.0225,
  TCREDIT_COMISSION = 0.0448,
  TAX_WITHHOLDING_IVA = 0.7,
  TAX_WITHHOLDING_RENTA = 0.02

const txInit = {
  date: null,
  responsable: null,
  searchDate: null,
  searchDateTime: null,
  type: null,// [DEPOSITO, TRANSFERENCIA, TCREDITO, TDEBITO, RETIRO]
  value: null,
  voucher: null,// Para conciliar se coloca el numero de documento del banco
  details: null// Se debe colocar el IDENTIFICADOR de la venta. ID_SALE_20220402T133047
}
/**
 * Generar un movimiento bancario por una venta.
 * @param {*} voSale Informacion de la venta
 */
export function generarTxBySale(voSale) {
  const datafastPayments = ["TCREDITO", "TDEBITO"]
  const typePayments = ["TRANSFERENCIA", ...datafastPayments]
  if (!typePayments.includes(voSale.typePayment)) {
    return
  }
  let tx = JSON.parse(JSON.stringify(txInit))
  tx.saleUid = formatToOperationDayStringEc(voSale.date)
  tx.date = voSale.date
  tx.responsable = voSale.seller
  tx.searchDate = voSale.searchDate
  tx.searchDateTime = voSale.searchDateTime
  tx.type = voSale.typePayment
  tx.value = voSale.totalSale
  // Calcular el valor acreditado aproximado para datafast
  if (datafastPayments.includes(voSale.typePayment)) {
    const DATAFAST_COMMISSION = voSale.typePayment === "TCREDITO" ? TCREDIT_COMISSION : TDEBIT_COMISSION
    tx.percentCommission = DATAFAST_COMMISSION
    tx.percentTaxWithholdingIVA = TAX_WITHHOLDING_IVA
    tx.percentTaxWithholdingRENTA = TAX_WITHHOLDING_RENTA
    tx.saleValue = Math.round(voSale.totalSale * 100) / 100
    tx.saleTaxes = Math.round((voSale.totalSale / 112 * 12) * 10000) / 10000 //Math.round(voSale.taxes * 100) / 100
    tx.saleTaxableIncome = Math.round((tx.saleValue - tx.saleTaxes) * 10000) / 10000
    tx.dfCommission = Math.round(tx.saleValue * DATAFAST_COMMISSION * 10000) / 10000
    tx.dfTaxWithholdingIVA = Math.round(tx.saleTaxes * TAX_WITHHOLDING_IVA * 10000) / 10000
    tx.dfTaxWithholdingRENTA = Math.round(tx.saleTaxableIncome * TAX_WITHHOLDING_RENTA * 10000) / 10000
    tx.value = Math.round((tx.saleValue - tx.dfCommission - tx.dfTaxWithholdingIVA - tx.dfTaxWithholdingRENTA) * 10000) / 10000
    if (voSale.tipByBank && voSale.tipByBank > 0) {
      tx.tipByBank = Math.round((voSale.tipByBank * tx.value / tx.saleValue) * 10000) / 10000
    }
  }
  return tx
}