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
 * @param {Object} filters Filtros: dateStart, dateEnd, types, responsable
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
export function findExpensesReport(filters, callback, callbackError) {
  let periodStart = dateTimeToKeyDateString(filters.periodStart),
    periodEnd = dateTimeToKeyDateString(filters.periodEnd),
    res = new Map()

  db.ref(collections.expenses).orderByKey().startAt(periodStart + "T").endAt(periodEnd + "\uf8ff").once('value')
    .then(snap => {
      snap.forEach(child => {
        const dta = child.val()
        if ((filters.type.includes("TODOS") || filters.type.includes(dta.type)) &&
          (filters.responsable === "TODOS" || filters.responsable === dta.responsable)) {
          let arryTmp = res.get(dta.type) || []
          arryTmp.push(dta)
          res.set(dta.type, arryTmp)
        }
      })
      callback(res)
    })
    .catch(error => callbackError(error))

}