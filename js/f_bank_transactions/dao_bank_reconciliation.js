import { roundFour, roundTwo } from "../util/numbers-util.js";
import timestampToDatekey, { generateDateProperties } from "../persist/dao_generic.js";
import { dbRef } from "../persist/firebase_conexion.js";
import { collections } from "../persist/firebase_collections.js";

const TDEBIT_COMISSION = 0.0225,
  TCREDIT_COMISSION = 0.0448,
  TAX_WITHHOLDING_IVA = 0.7,
  TAX_WITHHOLDING_RENTA = 0.02

const txInit = {
  date: null,
  responsable: null,
  type: null,// [DEPOSITO, TRANSFERENCIA, TCREDITO, TDEBITO, TRANSFRETIRO]
  value: null,
  voucher: null,// Para conciliar se coloca el numero de documento del banco
  details: null
  ////saleUid: null, // Se debe colocar el IDENTIFICADOR de la venta. ID_SALE_20220402T133047
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
  tx.searchDate = voSale.searchDate
  tx.searchDateTime = voSale.searchDateTime
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
  return tx
}

/**
 * Guarda el movimiento bancario
 * @param {Object} voBankTx Informacion del movimiento bancario
 * @param {function} callback 
 * @param {function} callbackError 
 */
export async function insertBankTransaction(voBankTx, callback, callbackError, callbackSaleNoExist) {
  // Valida si existe la venta asociada
  if (voBankTx.saleUid) {
    const msjError = await dbRef.child(collections.sales).child(voBankTx.saleUid).once('value')
      .then((snap) => {
        if (!snap || !snap.exists()) {
          return `La venta Nro. ${voBankTx.saleUid} no existe.
          Verifique que tenga el formato correcto: ANIOMESDIA"T"HORASMINUTOSEGUNDOS. Ejemplo: 20221231T180159`
        }
        let sale = snap.val()
        return sale.bankTxUid ? `La venta Nro ${voBankTx.saleUid} ya esta relacionado a la transaccion bancaria Nro. ${sale.bankTxUid} por valor de ${sale.bankTxValue}.
          No puede relacionar mas de una transaccion bancaria a la misma venta.`: ""
      }).catch((error) => error)

    if (msjError) {
      callbackSaleNoExist(msjError)
      return
    }
  }

  // Copia inmutable
  const bankTxAux = JSON.parse(JSON.stringify(voBankTx)),
    bankTx = generateDateProperties(bankTxAux),
    key = timestampToDatekey(bankTx.date) + "-" + bankTx.type.slice(0, 3)

  var updates = {};
  updates[`${collections.bankReconciliation}/${key}`] = bankTx;
  // Movimiento bancario relacionado a una venta
  if (bankTx.saleUid) {
    updates[`${collections.sales}/${bankTx.saleUid}/bankTxUid`] = key
    updates[`${collections.sales}/${bankTx.saleUid}/bankTxValue`] = bankTx.value
  }

  dbRef.update(updates, (error) => {
    if (error) {
      callbackError(error)
    } else {
      callback(bankTx)
    }
  })

}