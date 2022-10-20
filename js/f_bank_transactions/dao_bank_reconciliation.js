import { dbRef } from "../persist/firebase_conexion.js";
import { collections } from "../persist/firebase_collections.js";
import { dateTimeToKeyMonthString } from "../util/fecha-util.js";
import { DateTime } from "../luxon.min.js";

/**
 * Guarda la conciliacion bancaria mensual
 * @param {Object} voMonthlyReconciliation Informacion del resumen de la conciliacion bancaria mensual
 * @param {function} callback 
 * @param {function} callbackError 
 */
export function insertMonthlyReconciliation(voMonthlyReconciliation, callback, callbackError) {
  let vdMonth = DateTime.fromMillis(voMonthlyReconciliation.date),
    monthKey = dateTimeToKeyMonthString(vdMonth)

  dbRef.child(collections.bankReconciliation).child(monthKey).set(voMonthlyReconciliation)
    .then(() => callback(vdMonth))
    .catch(error => callbackError(error))
}
