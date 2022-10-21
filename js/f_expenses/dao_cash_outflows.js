import timestampToDatekey, { generateDateProperties } from "../persist/dao_generic.js"
import { collections } from "../persist/firebase_collections.js"
import { db } from "../persist/firebase_conexion.js"
import { dateTimeToKeyDateString } from "../util/fecha-util.js"

/**
 * Guarda el egreso
 * @param {Object} voExpense Informacion del egreso
 * @param {function} callback 
 * @param {function} callbackError 
 */
export function insertExpenseDB(voExpense, callback, callbackError) {

  // Copia inmutable
  const expenseAux = JSON.parse(JSON.stringify(voExpense))

  let expenseData = generateDateProperties(expenseAux),
    key = timestampToDatekey(expenseData.date) + "-" + expenseData.type.slice(0, 3)

  db.ref(`${collections.expenses}/${key}`).set(expenseData)
    .then(() => { callback(expenseData) })
    .catch((error) => { callbackError(error) })

}

/**
 * Obtiene los egresos de caja para el reporte de egresos.
 * @param {Object} voFilters Filtros: dateStart, dateEnd, types, responsable
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
export function findExpensesReport(voFilters, callback, callbackError) {
  let periodStart = dateTimeToKeyDateString(voFilters.periodStart),
    periodEnd = dateTimeToKeyDateString(voFilters.periodEnd),
    res = new Map()

  db.ref(collections.expenses).orderByKey().startAt(periodStart + "T").endAt(periodEnd + "\uf8ff").once('value')
    .then(snap => {
      snap.forEach(child => {
        const dta = child.val()
        dta.tmpUid = child.key
        if ((voFilters.type.includes("TODOS") || voFilters.type.includes(dta.type)) &&
          (voFilters.responsable === "TODOS" || voFilters.responsable === dta.responsable)) {
          let arryTmp = res.get(dta.type) || []
          arryTmp.push(dta)
          res.set(dta.type, arryTmp)
        }
      })
      callback(res, voFilters)
    })
    .catch(error => callbackError(error))
}


/**
 * Obtiene los egresos de caja y ventas para el pago de comisiones.
 * @param {Object} voFilters Filtros: dateStart, dateEnd, seller
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
export async function findForCommissionsPayment(voFilters, callback, callbackError) {
  let periodStart = dateTimeToKeyDateString(voFilters.periodStart),
    periodEnd = dateTimeToKeyDateString(voFilters.periodEnd),
    arryTmp

  const sales = new Map(),
    advancesToBarber = {
      advancePayment: new Map(),
      drinks: new Map(),
      paidCommissions: new Map(),
      paidTips: new Map()
    }


  await db.ref(collections.expenses).orderByKey().startAt(periodStart + "T").endAt(periodEnd + "\uf8ff")
    .once('value')
    .then(snap => snap.forEach(child => {
      const dta = child.val()
      if (voFilters.seller === "TODOS" || voFilters.seller === dta.responsable) {
        switch (dta.type) {
          case 'ADELANTO':
            arryTmp = advancesToBarber.advancePayment.get(dta.responsable) || []
            arryTmp.push(dta)
            advancesToBarber.advancePayment.set(dta.responsable, arryTmp)
            break
          case 'BEBIDA':
            arryTmp = advancesToBarber.drinks.get(dta.responsable) || []
            arryTmp.push(dta)
            advancesToBarber.drinks.set(dta.responsable, arryTmp)
            break
          case 'COMISION':
            arryTmp = advancesToBarber.paidCommissions.get(dta.responsable) || []
            arryTmp.push(dta)
            advancesToBarber.paidCommissions.set(dta.responsable, arryTmp)
            break
          case 'PROPINA':
            arryTmp = advancesToBarber.paidTips.get(dta.responsable) || []
            arryTmp.push(dta)
            advancesToBarber.paidTips.set(dta.responsable, arryTmp)
            break
        }
      }
    }))
    .catch(error => callbackError("Busqueda de egresos de caja con error", error))

  await db.ref(collections.sales).orderByKey().startAt(periodStart + "T").endAt(periodEnd + "\uf8ff").once('value')
    .then(snap => snap.forEach(child => {
      const dta = child.val()
      if (voFilters.seller === "TODOS" || voFilters.seller === dta.seller) {
        console.log(dta.responsable)
        arryTmp = sales.get(dta.seller) || []
        arryTmp.push(child.val())
        sales.set(dta.seller, arryTmp)
      }
    }))
    .catch(error => callbackError("Busqueda de ventas con error", error))

  callback(voFilters, sales, advancesToBarber)
}

// /**
//  * Obtiene los egresos de caja y ventas para el pago de comisiones.
//  * @param {Object} voFilters Filtros: dateStart, dateEnd, seller
//  * @param {Function} callback
//  * @param {Function} callbackError
//  */
// export async function findForCommissionsPayment(voFilters, callback, callbackError) {
//   let periodStart = dateTimeToKeyDateString(voFilters.periodStart),
//     periodEnd = dateTimeToKeyDateString(voFilters.periodEnd)

//   const types = ['ADELANTO', 'BEBIDA', 'COMISION', 'PROPINA'],
//     sales = new Map(),
//     advancesToBarber = {
//       adelanto: 0,
//       bebida: 0,
//       comision: 0,
//       propina: 0
//     }

//   await db.ref(collections.expenses).orderByKey().startAt(periodStart + "T").endAt(periodEnd + "\uf8ff").once('value')
//     .then(snap => snap.forEach(child => {
//       const dta = child.val()
//       if (types.includes(dta.type) && (voFilters.seller === "TODOS" || voFilters.seller === dta.responsable))
//         advancesToBarber[dta.type.toLowerCase()] += dta.value
//     }))
//     .catch(error => callbackError("Busqueda de egresos de caja con error", error))

//   await db.ref(collections.sales).orderByKey().startAt(periodStart + "T").endAt(periodEnd + "\uf8ff").once('value')
//     .then(snap => snap.forEach(child => {
//       const dta = child.val()
//       if (voFilters.seller === "TODOS" || voFilters.seller === dta.seller) {
//         console.log(dta.responsable)
//         let arryTmp = sales.get(dta.seller) || []
//         arryTmp.push(child.val())
//         sales.set(dta.seller, arryTmp)
//       }
//     }))
//     .catch(error => callbackError("Busqueda de ventas con error", error))

//   callback(voFilters, sales, advancesToBarber)
// }