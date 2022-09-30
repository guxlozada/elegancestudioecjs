import { roundFour, roundTwo } from "../util/numbers-util.js";
import timestampToDatekey, { generateDateProperties } from "../persist/dao_generic.js";
import { db, dbRef } from "../persist/firebase_conexion.js";
import { collections } from "../persist/firebase_collections.js";
import { dateTimeToKeyDateString } from "../util/fecha-util.js";

export const BANCO_PRODUBANCO = "PROD"

const TDEBIT_COMISSION = 0.0225,
  TCREDIT_COMISSION = 0.0448,
  TAX_WITHHOLDING_IVA = 0.7,
  TAX_WITHHOLDING_RENTA = 0.02

/**
 * Generar un movimiento bancario por una venta.
 * @param {Object} voSale Informacion de la venta
 */
export function saleToBanktransaction(voSale, vsBank) {
  const datafastPayments = ["TCREDITO", "TDEBITO"]
  const typePayments = ["TRANSFERENCIA", ...datafastPayments]
  if (!typePayments.includes(voSale.typePayment)) {
    return
  }
  let tx = {
    date: voSale.date,// Se asigna el timestamp similar de la venta
    searchDate: voSale.searchDate,
    searchDateTime: voSale.searchDateTime,
    saleUid: timestampToDatekey(voSale.date),
    responsable: voSale.seller,
    type: voSale.typePayment,
    value: voSale.totalSale,
    bank: vsBank || BANCO_PRODUBANCO
  }
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
 * Guarda la tx bancaria
 * @param {Object} voBankTx Informacion de la tx bancaria
 * @param {function} callback 
 * @param {function} callbackError 
 * @param {function} callbackSaleNoExist Funcion que se invoca cuando no existe el numero de venta 
 */
export async function insertBankTx(voBankTx, callback, callbackError, callbackSaleNoExist) {
  // Valida si existe la venta asociada
  if (voBankTx.saleUid) {
    let msjError = await dbRef.child(collections.sales).child(voBankTx.saleUid).once('value')
      .then((snap) => {
        if (snap && snap.exists()) {
          let sale = snap.val()
          if (sale.bankTxUid) {
            return `La venta Nro ${voBankTx.saleUid} ya esta relacionado a la transaccion bancaria Nro. ${sale.bankTxUid} por valor de ${sale.bankTxValue}.
            No puede relacionar mas de una transaccion bancaria a la misma venta.`
          }
        }
        return `La venta Nro. ${voBankTx.saleUid} no existe.
          Verifique que tenga el formato correcto: ANIOMESDIA"T"HORASMINUTOSEGUNDOS. Ejemplo: 20221231T180159`
      }).catch(error => error)

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
  // Tx bancaria relacionada a una venta
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

/**
 * Actualiza la informacion de verificacion de la tx bancaria en la consiliacion.
 * @param {object} voTx Objeto con informacion de la tx bancaria  con los atributos: uid, value, verified, verifiedValue
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
export function updateBankTxVerified(voTx, callback, callbackError) {
  var updates = {}
  updates[`${collections.bankReconciliation}/${voTx.uid}/verified`] = voTx.verified
  updates[`${collections.bankReconciliation}/${voTx.uid}/verifiedValue`] = voTx.verifiedValue

  dbRef.update(updates, (error) => {
    if (error) {
      callbackError(error)
    } else {
      callback(voTx)
    }
  })
}

/**
 * Consulta de transacciones bancarias por rango de fechas, tipo de transaccion y banco
 * @param {DateTime} vdStart DateTime utilizado como fecha de inicio del rango
 * @param {DateTime} vdEnd DateTime utilizado como fecha final del rango
 * @param {Array} vaTypes Array con tipos de transaccion
 * @param {Array} vaBanks Array con bancos
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
export function findBankTxs(vaTypes, vaBanks, vdStart, vdEnd, callback, callbackError) {
  let rangeStart = dateTimeToKeyDateString(vdStart),
    rangeEnd = dateTimeToKeyDateString(vdEnd)

  db.ref(collections.bankReconciliation).orderByKey().startAt(rangeStart + "T").endAt(rangeEnd + "\uf8ff")
    .once('value')
    .then((snap) => {
      let transactions = []
      snap.forEach((child) => {
        let tx = child.val()
        tx.tmpUid = child.key
        if (vaTypes.includes(tx.type) && vaBanks.includes(tx.bank)) transactions.push(tx)
      })
      callback(transactions)
    })
    .catch((error) => {
      callbackError(error)
    })

}