
import { collections } from "../persist/firebase_collections.js";
import { db } from "../persist/firebase_conexion.js";


/**
 * Consulta de clientes
 * @param {Objetc} voFilters Objeto que contiene los filtros de la consulta: idNumber or name
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
export function findCustomers(voFilters, callback, callbackError) {
  db.ref(collections.customers).orderByChild(voFilters.orderBy)
    .once('value')
    .then(snap => {
      let res = []
      snap.forEach(child => {
        let keywordExp = voFilters.keyword ? new RegExp(voFilters.keyword, "i") : null,
          item = child.val()
        if (!voFilters.keyword || item.surnames.match(keywordExp) || item.idNumber.match(keywordExp)) {
          res.push(item)
        }
      })
      callback(res)
    })
    .catch(error => callbackError(error))
}
