import { collections } from "../persist/firebase_collections.js"
import { dbRef } from "../persist/firebase_conexion.js";

/**
 * Elimina la informacion relacionada a una venta.
 * @param {string} vsSaleUid Vlave del nodo relacionado a la venta
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
export async function deleteSaleByUid(vsSaleUid, callback, callbackError) {
  // TODO: Validar que no se borre de fechas con cierre de caja

  dbRef.child(collections.sales).orderByKey().equalTo(vsSaleUid)
    .once('value')
    .then(snap => {
      let sale
      snap.forEach(child => {
        sale = child.val()
        sale.uid = child.key
      })
      deleteSaleDetailsBySaleUid(sale, callback, callbackError)
    })
    .catch(error => callbackError(error))
}

/**
 * Consulta los detalles de la venta e invocar la eliminacion de la venta
 * @param {Object} voSale Venta
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
function deleteSaleDetailsBySaleUid(voSale, callback, callbackError) {
  // Obtener los detalles de la venta
  dbRef.child(collections.salesDetails).orderByKey().startAt(voSale.uid).endAt(voSale.uid + "\uf8ff")
    .once('value')
    .then(snap => {
      let saleDetails = []
      snap.forEach(child => {
        let detail = child.val()
        detail.uid = child.key
        saleDetails.push(detail)
      })
      deleteSaleDetailsBankTx(voSale, saleDetails, callback, callbackError)
    })
    .catch(error => callbackError(error))
}

/**
 * Consulta opcionanlmente si existe la transaccion bancaria relacionada a la venta e invoca la eliminacion de la venta
 * @param {Object} voSale 
 * @param {Array} vaSaleDetails 
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
function deleteSaleDetailsBankTx(voSale, vaSaleDetails, callback, callbackError) {
  // Buscar si existe una transaccion bancaria relacionada
  dbRef.child(collections.bankingTransactions).orderByChild("saleUid").equalTo(voSale.uid)
    .once('value')
    .then(snap => {
      let bankTx
      snap.forEach(child => {
        bankTx = child.val()
        bankTx.uid = child.key
      })

      // Borrar y respaldar eliminacion
      var updates = {}

      // Eliminar y respaldar cabecera de la venta
      updates[`${collections.sales}/${voSale.uid}`] = null
      updates[`${collections.deletedSales}/${voSale.uid}`] = voSale

      // Eliminar y respaldar  detalles de la venta
      vaSaleDetails.forEach(detail => {
        updates[`${collections.salesDetails}/${detail.uid}`] = null
        updates[`${collections.deletedSalesDetails}/${detail.uid}`] = detail
      })

      // Eliminar tx relacionada
      if (bankTx) {
        updates[`${collections.deletedBankTx}/${bankTx.uid}`] = bankTx
        updates[`${collections.bankingTransactions}/${bankTx.uid}`] = null
      }
      console.log(updates)
      dbRef.update(updates, error => error ? callbackError(error) : callback(voSale.uid))
    })
    .catch(error => callbackError(error))
}