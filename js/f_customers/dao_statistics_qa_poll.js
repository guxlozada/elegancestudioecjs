import timestampToDatekey, { generateDateProperties } from "../persist/dao_generic.js"
import { collections } from "../persist/firebase_collections.js"
import { db } from "../persist/firebase_conexion.js"

/**
 * Guarda la encuesta
 * @param {Object} voPoll Informacion de la encuesta
 * @param {function} callback 
 * @param {function} callbackError 
 */
export function insertPollDB(voPoll, callback, callbackError) {
  const version = 'v1'
  let pollData = generateDateProperties(voPoll),
    key = timestampToDatekey(pollData.date)

  db.ref(`${collections.qualityAssurance}/${version}/${key}`).set(pollData)
    .then(() => { callback(pollData) })
    .catch((error) => { callbackError(error) })

}