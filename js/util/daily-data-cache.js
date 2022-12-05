
import { maxClosingDay } from "../f_daily_closing/dao_seller_daily_closing.js"
import { DateTime } from "../luxon.min.js"
import { localdb } from "../repo-browser.js"
import { hoyEC } from "./fecha-util.js"

const dailyData = [localdb.cashOutflowMaxDay, localdb.cashOutflowMinDay, localdb.operativeDay, localdb.accesskey, localdb.catalogProducts, localdb.catalogServices, localdb.tmpPollQA],
  tmpData = [localdb.tmpBankReconciliation]

/** Eliminar la informacion de ayuda diaria. */
const dailyDataCleaning = () => { dailyData.forEach(item => localStorage.removeItem(item)) }

/** Eliminar la informacion de ayuda temporal. */
export const tmpDataCleaning = () => { tmpData.forEach(item => localStorage.removeItem(item)) }

/** Formato generico */
function formatDateTimeToInputRange(vdDateTime) {
  return vdDateTime.toJSDate().toISOString().split("T")[0]
}

/**
* Genera la informacion de ayuda diaria
 * @param {DateTime} vdMaxClosingDay Maximo dia con cierre de caja diario
 * @param {Function} callback 
 */
const dailyDataGenerate = (vdMaxClosingDay, callback) => {
  let operativeDay = formatDateTimeToInputRange(hoyEC()),
    cashOutflowMinDay = formatDateTimeToInputRange(vdMaxClosingDay.plus({ days: 1 }))

  // Almacena en el localStorage los datos de ayuda diarios
  localStorage.setItem(localdb.operativeDay, operativeDay)
  localStorage.setItem(localdb.cashOutflowMaxDay, operativeDay)
  localStorage.setItem(localdb.cashOutflowMinDay, cashOutflowMinDay)

  // Inyecta los datos de ayuda diarios a la funcion
  if (callback) {
    callback({
      cashOutflowMaxDay: localStorage.getItem(localdb.operativeDay),
      cashOutflowMinDay: localStorage.getItem(localdb.cashOutflowMinDay)
    })
  }
}

/**
 * Genera los datos de ayuda diaria y opcionalmente inyecta el rango de fechas minimo y maximo de 
 * operacion para registro de flujos de caja: callback({cashOutflowMinDay,cashOutflowMaxDay}). 
 * @param {Function} callback (Opcional)
 * @returns 
 */
export const inyectDailyData = (callback) => {
  let isValid = localStorage.getItem(localdb.operativeDay) === formatDateTimeToInputRange(hoyEC())
  if (isValid) {
    if (callback) {
      callback({
        cashOutflowMaxDay: localStorage.getItem(localdb.cashOutflowMaxDay),
        cashOutflowMinDay: localStorage.getItem(localdb.cashOutflowMinDay)
      })
    }
    return
  }
  dailyDataCleaning()
  // Invoca la consulta de la fecha maxima de cierre de caja diario
  maxClosingDay(dateTime => dailyDataGenerate(dateTime, callback))
}

/**
 * Actualiza los datos de ayuda diaria, borrando los datos previamente generados.
 */
export const updateDailyData = () => {
  dailyDataCleaning()
  // Invoca la consulta de la fecha maxima de cierre de caja diario
  maxClosingDay(dateTime => dailyDataGenerate(dateTime))
}

/**
 * Asigna a un input type="date" la fecha minima y maxima para registro de informacion de ingresos y egresos de caja
 * @param {string} vsClassSelector Selector de clase del input type=date a quien se asigna los atributos min y max
 * @param {Object} range Rango con fecha minima y maxima para registro de informacion de ingresos y egresos de caja
 */
const processMinMaxPropsWithCashOutflowDates = (vsClassSelector, range) => {
  document.querySelectorAll(vsClassSelector).forEach($el => {
    $el.max = range.cashOutflowMaxDay
    $el.min = range.cashOutflowMinDay
  })
}

/**
 * Asigna a un input type="date" la fecha maxima de registro de informacion de ingresos y egresos de caja
 * @param {string} vsClassSelector Selector de clase del input type=date a quien se asigna los atributos min y max
 */
export function addMinMaxPropsWithCashOutflowDates(vsClassSelector) {
  inyectDailyData(range => processMinMaxPropsWithCashOutflowDates(vsClassSelector, range))
}