import { collections } from "../persist/firebase_collections.js"
import { dbRef } from "../persist/firebase_conexion.js"


/**
 * Ultimo numero del sorteo
 * @param {function} callback 
 * @param {funcion} callbackError 
 */
export function findLastNumber(callback, callbackError) {
  dbRef.child(collections.tmpRaffle).child("lastNumber").get()
    .then(snap => {
      if (snap.exists()) {
        callback(parseInt(snap.val()))
      }
    })
    .catch(error => callbackError(error))
}