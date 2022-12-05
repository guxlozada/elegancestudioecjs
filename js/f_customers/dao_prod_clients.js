import { collections } from "../persist/firebase_collections.js"
import { dbRef } from "../persist/firebase_conexion.js"


/**
 * Buscar cliente por numero de identificacion
 * @param {string} vsIdNumber Numero de identificacion
 * @param {function} callback 
 * @param {funcion} callbackError 
 */
export function findClientByIdNumber(vsIdNumber, callback, callbackError) {
  dbRef.child(collections.clients).orderByChild("idNumber").equalTo(vsIdNumber)
    .once('value')
    .then(snap => {
      console.log("findByIdNumber exist=", snap.exists())
      if (snap.exists()) {
        snap.forEach(child => {
          let cli = child.val()
          callback(cli)
        })
      } else {
        callback()
      }
    })
    .catch(error => callbackError(error))
}