
import { collections } from "../persist/firebase_collections.js";
import { db, dbRef } from "../persist/firebase_conexion.js";
import { IVA } from "../repo-browser.js";
import { ahoraEC } from "../util/fecha-util.js";
import { roundTwo } from "../util/numbers-util.js";

/**
 * Consulta de servicios
 * @param {Objetc} voFilters Objeto que contiene los filtros de la consulta: active, barber, category, code or description
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
export function findServices(voFilters, callback, callbackError) {
  db.ref(collections.catalogServices).orderByKey()
    .once('value')
    .then(snap => {
      let keywordExp = voFilters.keyword ? new RegExp(voFilters.keyword, "i") : null,
        res = []
      snap.forEach(child => {
        let item = child.val()
        if ((voFilters.active === "TODOS" || voFilters.active === item.active.toString())
          && (!voFilters.barber || voFilters.barber === item.barber)
          && (!voFilters.category || voFilters.category === item.category)
          && (!voFilters.keyword || item.code.match(keywordExp) || item.description.match(keywordExp))) {
          res.push(item)
        }
      })
      callback(res)
    })
    .catch(error => callbackError(error))
}

/**
 * Registrar o actualizar un servivio
 * @param {Object} voService 
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
export function insertService(voService, callback, callbackError) {
  let service = {
    date: voService.date || ahoraEC().toMillis(),
    retentionIVA: true,
    type: "S",
    promo: { cash: 12, discountDay: 0 },
    ...voService
  }

  // Calcular auxiliares de IVA
  service.retailTaxIVA = roundTwo(voService.retailValue * IVA)
  service.retailFinalValue = roundTwo(voService.retailValue + service.retailTaxIVA)
  service.baseValue = service.retailValue
  service.taxIVA = service.retailTaxIVA
  service.finalValue = service.retailFinalValue

  dbRef.child(collections.catalogServices).child(service.code).set(service)
    .then(() => callback(service))
    .catch(error => callbackError(voService, error))
}
