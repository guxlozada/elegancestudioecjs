import { DateTime } from "../luxon.min.js"
import { collections } from "../persist/firebase_collections.js"
import { dbRef } from "../persist/firebase_conexion.js"
import { hoyEC, PATTERN_KEY_DATE } from "../util/fecha-util.js"

/**
 * Inyecta a 'fnDailyDataGenerate' un DateTime obtenido a partir de la clave (yyyyMMdd) del registro del maximo dia de cierre 
 * de caja diario o en caso de error el dia actual-1.
 * @param {function} fnDailyDataGenerate Funcion que genera los datos de ayuda diarios y requiere
 * la fecha maxima de cierre de caja diario 
 * @param {function} callback Funcion de operacion que requiere TODOS los datos de ayuda diarios
 */
export function maxClosingDateTime(fnDailyDataGenerate, callback) {
  dbRef.child(collections.dailyClosing).orderByKey().limitToLast(1).once('value')
    .then((snap) => {
      snap.forEach((child) => {
        fnDailyDataGenerate(DateTime.fromFormat(child.key, PATTERN_KEY_DATE), callback)
      })
    })
    .catch((error) => {
      console.error(error)
      fnDailyDataGenerate(hoyEC().plus({ days: -1 }), callback)
    })
}
