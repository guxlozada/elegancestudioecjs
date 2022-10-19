
import { db } from "../persist/firebase_conexion.js";

/**
 * Consulta de catalogos por nombre 
 * @param {string} vsCollection Nombre de la colleccion asociada al catalogo
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
export function findCatalog(vsCollection, callback, callbackError) {

  db.ref(vsCollection).orderByChild("description")
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