import { roundFour, roundTwo } from "../util/numbers-util.js";
import timestampToDatekey, { generateDateProperties } from "./dao_generic.js";
const TDEBIT_COMISSION = 0.0225,
  TCREDIT_COMISSION = 0.0448,
  TAX_WITHHOLDING_IVA = 0.7,
  TAX_WITHHOLDING_RENTA = 0.02

const txInit = {
  date: null,
  responsable: null,
  saleUid: null, // Se debe colocar el IDENTIFICADOR de la venta. ID_SALE_20220402T133047
  type: null,// [DEPOSITO, TRANSFERENCIA, TCREDITO, TDEBITO, RETIRO]
  value: null,
  voucher: null,// Para conciliar se coloca el numero de documento del banco
  details: null
}
/**
 * Generar un movimiento bancario por una venta.
 * @param {Object} voSale Informacion de la venta
 */
export function saleToBanktransaction(voSale) {
  const datafastPayments = ["TCREDITO", "TDEBITO"]
  const typePayments = ["TRANSFERENCIA", ...datafastPayments]
  if (!typePayments.includes(voSale.typePayment)) {
    return
  }
  let tx = JSON.parse(JSON.stringify(txInit))
  // Se asigna el timestamp similar de la venta
  tx.date = voSale.date
  tx.saleUid = timestampToDatekey(voSale.date)
  tx.responsable = voSale.seller
  tx.type = voSale.typePayment
  tx.value = voSale.totalSale
  // Calcular el valor acreditado aproximado para datafast
  if (datafastPayments.includes(voSale.typePayment)) {
    const DATAFAST_COMMISSION = voSale.typePayment === "TCREDITO" ? TCREDIT_COMISSION : TDEBIT_COMISSION
    tx.percentCommission = DATAFAST_COMMISSION
    tx.percentTaxWithholdingIVA = TAX_WITHHOLDING_IVA
    tx.percentTaxWithholdingRENTA = TAX_WITHHOLDING_RENTA
    tx.saleValue = roundTwo(voSale.totalSale)
    tx.saleTaxes = roundFour(voSale.totalSale / 112 * 12)
    tx.saleTaxableIncome = roundFour(tx.saleValue - tx.saleTaxes)
    tx.dfCommission = roundFour(tx.saleValue * DATAFAST_COMMISSION)
    tx.dfTaxWithholdingIVA = roundFour(tx.saleTaxes * TAX_WITHHOLDING_IVA)
    tx.dfTaxWithholdingRENTA = roundFour(tx.saleTaxableIncome * TAX_WITHHOLDING_RENTA)
    tx.value = roundFour(tx.saleValue - tx.dfCommission - tx.dfTaxWithholdingIVA - tx.dfTaxWithholdingRENTA)
    if (voSale.tipByBank && voSale.tipByBank > 0) {
      tx.tipByBank = roundFour(voSale.tipByBank * tx.value / tx.saleValue)
    }
  }

  return generateDateProperties(tx)
}