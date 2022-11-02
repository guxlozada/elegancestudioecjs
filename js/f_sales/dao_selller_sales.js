import { collections } from "../persist/firebase_collections.js"
import { dbRef } from "../persist/firebase_conexion.js";
import { dateTimeToKeyDateString } from "../util/fecha-util.js";

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
      ////console.log(updates)
      dbRef.update(updates, error => error ? callbackError(error) : callback(voSale.uid))
    })
    .catch(error => callbackError(error))
}


/**
 * Elimina la informacion relacionada a un egreso.
 * @param {string} vsUid Clave del nodo relacionado al egreso
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
export async function deleteExpenseByUid(vsUid, callback, callbackError) {
  // TODO: Validar que no se borre de fechas con cierre de caja

  dbRef.child(collections.expenses).child(vsUid).get()
    .then(snap => {
      if (snap.exists()) {
        var updates = {}
        // Eliminar y respaldar el egreso
        updates[`${collections.expenses}/${vsUid}`] = null
        updates[`${collections.deletedExpense}/${vsUid}`] = snap.val()
        dbRef.update(updates, error => error ? callbackError(error) : callback(vsUid))
      }
    })
    .catch(error => callbackError(error))
}

/**
 * Obtiene el resumen de ventas por producto y/o servicio para el reporte de ventas.
 * @param {Object} voFilters Filtros: periodStart, periodEnd, keyword, type
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
export async function findSalesReport(voFilters, callback, callbackError) {
  const { type = "TODOS", keyword, periodStart, periodEnd } = voFilters
  let startAt = dateTimeToKeyDateString(periodStart),
    endAt = dateTimeToKeyDateString(periodEnd),
    vaProducts = [],
    vaServices = []

  const [vmProducts, vmServices] = await dbRef.child(collections.salesDetails).orderByKey().startAt(startAt + "T").endAt(endAt + "\uf8ff")
    .once('value')
    .then(snap => {
      let products = new Map(),
        services = new Map(),
        keywordExp = keyword ? new RegExp(keyword, "i") : null
      snap.forEach(child => {
        const dta = child.val()
        if ((type === "TODOS" || type === dta.type) && (!keyword || dta.code.match(keywordExp))) {
          let map = dta.type === "P" ? products : services
          let voItem = map.get(dta.code) || { type: dta.type, code: dta.code, description: "Pendiente", amount: 0, grossValue: 0, taxes: 0, barberCommission: 0, purchasePrice: -1, netValue: -1 }
          voItem.amount += dta.numberOfUnits
          voItem.grossValue += dta.total
          voItem.taxes += dta.taxes
          voItem.barberCommission += dta.barberCommission
          map.set(dta.code, voItem)
        }
      })
      return [products, services]
    })
    .catch(error => callbackError(error))

  if (vmProducts.size > 0) {
    let productCodes = [...vmProducts.keys()]
    let products = await dbRef.child(collections.catalogProducts).orderByKey().once('value')
      .then(snap => {
        let res = []
        snap.forEach(child => {
          const dta = child.val()
          if (productCodes.includes(dta.code)) {
            let voProduct = vmProducts.get(dta.code)
            voProduct.description = dta.description
            voProduct.purchasePrice = voProduct.amount * dta.purchasePrice
            voProduct.netValue = voProduct.grossValue - voProduct.taxes - voProduct.barberCommission - voProduct.purchasePrice
            res.push(voProduct)
          }
        })
        return res
      })
      .catch(error => callbackError(error))
    vaProducts = products.sort(
      (p1, p2) => (p1.amount < p2.amount) ? 1 : (p1.amount > p2.amount) ? -1 : 0)
  }
  if (vmServices.size > 0) {
    let serviceCodes = [...vmServices.keys()]
    let services = await dbRef.child(collections.catalogServices).orderByKey().once('value')
      .then(snap => {
        let res = []
        snap.forEach(child => {
          const dta = child.val()
          if (serviceCodes.includes(dta.code)) {
            let voService = vmServices.get(dta.code)
            voService.description = dta.description
            voService.netValue = voService.grossValue - voService.taxes - voService.barberCommission
            res.push(voService)
          }
        })
        return res
      })
      .catch(error => callbackError(error))
    vaServices = services.sort(
      (p1, p2) => (p1.amount < p2.amount) ? 1 : (p1.amount > p2.amount) ? -1 : 0)
  }


  callback(vaProducts, vaServices, voFilters)
}