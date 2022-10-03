import { DateTime } from "../luxon.min.js"
import { collections } from "../persist/firebase_collections.js"
import { dbRef } from "../persist/firebase_conexion.js"
import { hoyEC, PATTERN_KEY_DATE } from "../util/fecha-util.js"

/**
 * Inyecta a la callback un DateTime obtenido a partir de la clave (yyyyMMdd) del registro del maximo dia de cierre 
 * de caja diario o en caso de error el dia actual-1.
 * @param {function} callback Funcion de operacion que requiere TODOS los datos de ayuda diarios
 */
export function maxClosingDay(callback) {
  dbRef.child(collections.dailyClosing).orderByKey().limitToLast(1).once('value')
    .then((snap) => {
      snap.forEach((child) => {
        callback(DateTime.fromFormat(child.key, PATTERN_KEY_DATE))
      })
    })
    .catch((error) => {
      console.error(error)
      callback(hoyEC().minus({ days: 1 }))
    })
}
