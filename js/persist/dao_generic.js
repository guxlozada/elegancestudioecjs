
import { getShop } from "../dom/manager_user.js"
import { DateTime } from "../luxon.min.js"
import { ahoraEC, dateIsValid } from "../util/fecha-util.js"
import { dbRef } from "./firebase_conexion.js"

/**
 * Convierte un Date in millisegundos para generar una clave con formato 'yyyyMMddThhmmss'
 * @param { number} timestampUTC ONLY UTC Date in millisegundos
 */
export default function timestampToDatekey(timestampUTC) {
  return DateTime.fromMillis(timestampUTC).toISO().replace(/[^0-9T]/g, "").replace(/ +/, " ").slice(0, -7)
}
/**
 * Agrega al objeto las propiedades: date, searchDate, searchDateTime
 * @param {Object} register Registro para persistir en la BD
 * @returns 
 */
export function generateDateProperties(register) {
  let audDate = ahoraEC()
  if (register.date && dateIsValid(register.date)) {
    const inDate = DateTime.fromMillis(register.date)
    audDate = audDate.set({ year: inDate.year, month: inDate.month, day: inDate.day })
  }
  const res = {
    ...register,
    date: audDate.toMillis(),
    searchDate: audDate.startOf('day').toLocaleString(DateTime.DATE_SHORT),
    searchDateTime: audDate.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS),
    shop: getShop().code
  }
  return res
}

/**
 * Obtiene un nodo de primer nivel por su clave (UID)
 * @param {string} vsCollection Colleccion relacionada al registro
 * @param {string} vsUid Identificador unico del registro
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
export function findByUid(vsCollection, vsUid, callback, callbackError) {
  dbRef.child(vsCollection).child(vsUid).get()
    .then(snap => {
      if (snap.exists())
        callback(snap.val())
      else
        callback(undefined)
    })
    .catch(error => callbackError(vsUid, error))
}