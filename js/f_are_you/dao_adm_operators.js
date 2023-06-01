import { dbRef } from "../persist/firebase_conexion.js";
import { collections } from "../persist/firebase_collections.js";
import { localdb } from "../repo-browser.js";
import { getShop } from "../dom/manager_user.js";

/**
 * Buscar un operador por su codigo
 * @param {string} vsAuth Data
 * @param {function} callback 
 * @param {funcion} callbackError 
 */
export function findOperator(vsAuth, callback, callbackError) {
  dbRef.child(collections.catalogOperators).orderByChild("code").equalTo(vsAuth.user.trim().toUpperCase())
    .once('value')
    .then(snap => {
      console.log("findOperator exist=", snap.exists())
      if (snap.exists()) {
        snap.forEach(child => {
          let opr = child.val()
          callback(opr, vsAuth)
        })
      } else {
        callback()
      }
    })
    .catch(error => callbackError(error))
}

/**
 * Buscar los operadores por sucursal
 * @param {string} vsShop 
 * @param {function} callback 
 * @param {funcion} callbackError 
 */
export function findOperatorsByShop(callback, callbackError) {
  let opersBD = localStorage.getItem(localdb.catalogOperators)
  if (opersBD) {
    callback(JSON.parse(opersBD))
    return
  }

  let shop = getShop()
  if (!shop) {
    callbackError(`No se pudo obtener la informacion de la barberia,
      intente nuevamente ingresando al sistema;
      si el error persiste, por favor comunicar a Carlos Quinteros.`)
    return
  }

  dbRef.child(collections.catalogOperators).orderByChild("location").equalTo(shop.code)
    .once('value')
    .then(snap => {
      const res = []
      console.log("findOperatorsByShop exist=", snap.exists())
      if (snap.exists()) {
        snap.forEach((child) => {
          let item = child.val()
          delete item.location
          delete item.name
          delete item.pwd
          res.push(item)
        })
      }

      localStorage.setItem(localdb.catalogOperators, JSON.stringify([...res]))
      callback(res)
    })
    .catch(error => callbackError(error))
}
