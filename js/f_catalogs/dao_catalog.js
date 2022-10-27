
import { db, dbRef } from "../persist/firebase_conexion.js";

/**
 * Consulta de catalogos por nombre 
 * @param {string} vsCollection Nombre de la colleccion asociada al catalogo
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
export function findCatalog(vsCollection, vsProperty, callback, callbackError) {
  db.ref(vsCollection).orderByChild(vsProperty)
    .once('value')
    .then(snap => {
      let res = []
      snap.forEach(child => {
        let item = child.val()
        item.tmpUid = child.key
        res.push(item)
      })
      callback(res)
    })
    .catch(error => callbackError(error))
}

/**
 * Consulta  TODOS los registros de una coleccion ordenados por su clave. 
 * @param {string} vsCollection Nombre de la colleccion asociada al catalogo
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
export function findAll(vsCollection, callback, callbackError) {
  db.ref(vsCollection).orderByKey().once('value').then(snap => {
    let res = []
    snap.forEach(child => {
      let item = child.val()
      item.tmpUid = child.key
      res.push(item)
    })
    callback(res)
  }).catch(error => callbackError(error))
}

/**
 * Consulta una collecion para obtener un catalogo clave-valor simple.
 * @param {string} vsCollection Nombre de la colleccion 
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
export function findCatalogKeyValue(vsCollection, callback, callbackError) {
  db.ref(vsCollection).orderByKey()
    .once('value')
    .then(snap => {
      let res = []
      snap.forEach(child => { res.push({ "key": child.key, "value": child.val() }) })
      callback(res)
    }).catch(error => callbackError(error))
}

/**
 * Actualiza el campo 'active' de la colleccion correspondiente a un catalogo: products, services.
 * @param {string} vsCollection Colleccion relacionada al catalogo
 * @param {object} voData Objeto con informacion de la tx bancaria  con los atributos: collection, uid, active
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
export function updateActive(vsCollection, voData, callback, callbackError) {
  var updates = {}
  updates[`${vsCollection}/${voData.code}/active`] = voData.active

  dbRef.update(updates, error => { error ? callbackError(voData.code, error) : callback(voData.code) })
}
