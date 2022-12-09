import { collections } from "../persist/firebase_collections.js"
import { dbRef } from "../persist/firebase_conexion.js"


/**
 * Ultimo numero del sorteo
 * @param {function} callback 
 * @param {funcion} callbackError 
 */
export function findLastRaffleNumber(callback, callbackError) {
  dbRef.child(collections.tmpRaffle).child("lastNumber").get()
    .then(snap => {
      if (snap.exists()) {
        callback(parseInt(snap.val()))
      }
    })
    .catch(error => callbackError(error))
}

/**
 * Registrar los cupones adicionales de encuestas para sorteo navidad
 * @param {Object} voClient Informacion del cliente
 * @param {function} callback 
 * @param {funcion} callbackError 
 */
export function updatePollCupons(voClient, callback, callbackError) {
  findLastRaffleNumber(vnLastNumber => {
    let updates = {},
      stPollCupons = vnLastNumber + " " + (++vnLastNumber),
      stRaffleCupons = (voClient.stRaffleCupons || "") + " " + stPollCupons

    updates[`${collections.customers}/${voClient.uid}/stPollCupons`] = stPollCupons.trim()
    updates[`${collections.customers}/${voClient.uid}/stRaffleCupons`] = stRaffleCupons.trim()
    updates[`${collections.tmpRaffle}/lastNumber`] = ++vnLastNumber

    // Registrar los cupones en la BD
    dbRef.update(updates, (error) => {
      if (error) {
        callbackError(error)
      } else {
        callback()
      }
    })
  },
    error => callbackError(error))

}