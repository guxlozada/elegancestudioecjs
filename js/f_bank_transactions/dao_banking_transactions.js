import { roundFour, roundTwo } from "../util/numbers-util.js";
import timestampToDatekey, { generateDateProperties } from "../persist/dao_generic.js";
import { db, dbRef } from "../persist/firebase_conexion.js";
import { collections } from "../persist/firebase_collections.js";
import { dateTimeToKeyDateString, dateTimeToKeyMonthString } from "../util/fecha-util.js";

export const BANCO_PRODUBANCO = "PROD"
export const BANCO_PICHINCHA = "PICH"


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
    bank: vsBank || BANCO_PRODUBANCO,
    verified: false
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
      .then(snap => {
        if (snap.exists()) {
          let sale = snap.val()
          if (sale.bankTxUid) {
            return `La venta Nro ${voBankTx.saleUid} ya esta relacionado a la transaccion bancaria Nro. ${sale.bankTxUid} por valor de ${sale.bankTxValue}.
            No puede relacionar mas de una transaccion bancaria a la misma venta.`
          }
        } else {
          return `La venta Nro. ${voBankTx.saleUid} no existe.
            Verifique que tenga el formato correcto: ANIOMESDIA"T"HORASMINUTOSEGUNDOS. Ejemplo: 20221231T180159`
        }
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

  //Agregar propiedad con valores por omision
  bankTx.verified = false

  var updates = {};
  updates[`${collections.bankingTransactions}/${key}`] = bankTx;
  // SOLO Tx bancaria relacionada a una venta por propinas
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
 * Actualiza la informacion de verificacion de la tx bancaria en la conciliacion.
 * @param {object} voTx Objeto con informacion de la tx bancaria  con los atributos: uid, value, verified, verifiedValue
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
export function updateBankTxVerified(voTx, callback, callbackError) {
  var updates = {}
  updates[`${collections.bankingTransactions}/${voTx.uid}/verified`] = voTx.verified
  updates[`${collections.bankingTransactions}/${voTx.uid}/verifiedValue`] = voTx.verifiedValue

  dbRef.update(updates, (error) => {
    if (error) {
      callbackError(error)
    } else {
      callback(voTx.uid)
    }
  })
}

/**
 * Consulta de transacciones bancarias por rango de fechas, tipo de transaccion y banco
 * @param {Objetc} voFilters Objeto que contien los filtros de la consulta: Array con tipos de transaccion
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
export function findBankTxs(voFilters, callback, callbackError) {
  let rangeStart = dateTimeToKeyDateString(voFilters.periodStart),
    rangeEnd = dateTimeToKeyDateString(voFilters.periodEnd)

  db.ref(collections.bankingTransactions).orderByKey().startAt(rangeStart + "T").endAt(rangeEnd + "\uf8ff")
    .once('value')
    .then(snap => {
      let transactions = []
      snap.forEach(child => {
        let tx = child.val()
        if ((voFilters.typePayment.includes("TODOS") || voFilters.typePayment.includes(tx.type))
          && (voFilters.bank === "TOTAL" || voFilters.bank === tx.bank)
          && (voFilters.verified === "TODOS" || voFilters.verified === tx.verified.toString())) {
          tx.tmpUid = child.key
          transactions.push(tx)
        }
      })

      let lastMonth = dateTimeToKeyMonthString(voFilters.periodStart.minus({ month: 1 })),
        currentMonth = dateTimeToKeyMonthString(voFilters.periodStart)
      db.ref(collections.bankReconciliation).orderByKey().startAt(lastMonth).endAt(currentMonth)
        .once('value')
        .then(snap => {
          let balances = []
          snap.forEach(child => {
            let item = child.val()
            item.tmpUid = child.key
            balances.push(item)
          })
          callback(voFilters, transactions, balances)
        })

    })
    .catch(error => callbackError(error))

}