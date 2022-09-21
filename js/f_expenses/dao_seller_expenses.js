import timestampToDatekey, { generateDateProperties } from "../persist/dao_generic.js"
import { collections } from "../persist/firebase_collections.js"
import { db } from "../persist/firebase_conexion.js"

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