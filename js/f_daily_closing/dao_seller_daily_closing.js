import { DateTime } from "../luxon.min.js"
import { generateDateProperties } from "../persist/dao_generic.js"
import { collections } from "../persist/firebase_collections.js"
import { dbRef } from "../persist/firebase_conexion.js"
import { dateTimeToKeyDateString, hoyEC, PATTERN_KEY_DATE } from "../util/fecha-util.js"

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

/**
 * Inyecta a la funcion 'callback' los cierres de caja del dia anterior y posterior a la fecha 
 * de consulta si existen
 * @param {DateTime} vdDateTime DateTime luxon
 * @param {Function} callback 
 * @param {Function} callbackError Inyecta a la funcion 'callbackError' la representacion de la
 * clave del dia anterior o posterior que genra el error y el error ensi
 */
export async function inyectBeforeAfterDailyCashClosing(vdDateTime, callback, callbackError) {

  const beforeKey = dateTimeToKeyDateString(vdDateTime.minus({ days: 1 })),
    afterKey = dateTimeToKeyDateString(vdDateTime.plus({ days: 1 })),
    actualKey = dateTimeToKeyDateString(vdDateTime)

  let beforeDay = await dbRef.child(collections.dailyClosing).child(beforeKey).get()
    .then(snap => snap.exists() ? snap.val() : undefined)
    .catch(error => callbackError(beforeKey, error))
  let afterDay = await dbRef.child(collections.dailyClosing).child(afterKey).get()
    .then(snap => snap.exists() ? snap.val() : undefined)
    .catch(error => callbackError(afterKey, error))
  let actualDay = await dbRef.child(collections.dailyClosing).child(actualKey).get()
    .then(snap => snap.exists() ? snap.val() : undefined)
    .catch(error => callbackError(afterKey, error))

  callback(beforeDay, actualDay, afterDay)
}

/**
 * Consultar ventas, egresos y tx bancarias para el cierre de caja diario
 * @param {DateTime} vdDateTime Fecha del cierre de caja
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
export async function findSalesExpensesBankTxsByDay(vdDateTime, callback, callbackError) {

  let vsDate = dateTimeToKeyDateString(vdDateTime),
    searchDay = vdDateTime.toLocaleString(DateTime.DATE_SHORT)
  const salesData = [],
    expensesData = [],
    depositsData = []

  await dbRef.child(collections.sales).orderByKey().startAt(vsDate + "T").endAt(vsDate + "\uf8ff")
    .once('value')
    .then(snap => {
      snap.forEach(child => {
        let sale = child.val()
        sale.tmpUid = child.key
        salesData.push(sale)
      })
    })
    .catch(error => callbackError(`Busqueda de ventas del dia ${searchDay}`, error))

  await dbRef.child(collections.expenses).orderByKey().startAt(vsDate + "T").endAt(vsDate + "\uf8ff")
    .once('value')
    .then(snap => snap.forEach(child => {
      let dta = child.val()
      dta.tmpUid = child.key
      expensesData.push(dta)
    }))
    .catch(error => callbackError(`Busqueda de egresos de caja del dia ${searchDay}`, error))

  await dbRef.child(collections.bankingTransactions).orderByKey().startAt(vsDate + "T").endAt(vsDate + "\uf8ff")
    .once('value')
    .then(snap => {
      snap.forEach(child => {
        const dta = child.val()
        if (dta.type === "DEPOSITO") {
          dta.tmpUid = child.key
          depositsData.push(dta)
        }
      })
    })
    .catch(error => callbackError(`Busqueda de depositos del dia ${searchDay}`, error))

  callback(salesData, expensesData, depositsData)
}

/**
 * Almacena o actualiza la informacion del cierre diario de caja
 * @param {Object} voDailyClosing 
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
export function insertDailyClosing(voDailyClosing, callback, callbackError) {
  // Copia inmutable
  const dailyClosingAux = JSON.parse(JSON.stringify(voDailyClosing)),
    dailyClosing = generateDateProperties(dailyClosingAux),
    dailyKey = dateTimeToKeyDateString(voDailyClosing.tmpDateTime)

  //Remover atributos temporales
  delete dailyClosing.tmpDateTime
  delete dailyClosing.tmpTipsAlert

  dbRef.child(collections.dailyClosing).child(dailyKey).set(dailyClosing)
    .then(snap => callback(dailyClosing.searchDate))
    .catch(error => callbackError(error))
}
