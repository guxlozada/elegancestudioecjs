
import { maxClosingDateTime } from "../f_daily_closing/dao_seller_daily_closing.js"
import { DateTime } from "../luxon.min.js"
import { localdb } from "../repo-browser.js"
import { hoyEC } from "./fecha-util.js"

const dailyData = [localdb.cashOutflowMaxDay, localdb.cashOutflowMinDay, localdb.operativeDay, localdb.accesskey]

/** Eliminar la informacion de ayuda diaria. */
const dailyDataCleaning = () => { dailyData.forEach(item => localStorage.removeItem(item)) }

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
  callback({
    cashOutflowMaxDay: localStorage.getItem(localdb.operativeDay),
    cashOutflowMinDay: localStorage.getItem(localdb.cashOutflowMinDay)
  })
}

/**
* Inyecta el rango de fechas minimo y maximo de operacion para 
* registro de flujos de caja: callback({cashOutflowMinDay,cashOutflowMaxDay}). 
* @returns 
*/
export const inyectDailyData = (callback) => {
  let isValid = localStorage.getItem(localdb.operativeDay) === formatDateTimeToInputRange(hoyEC())
  if (isValid) {
    callback({
      cashOutflowMaxDay: localStorage.getItem(localdb.cashOutflowMaxDay),
      cashOutflowMinDay: localStorage.getItem(localdb.cashOutflowMinDay)
    })
    return
  }
  dailyDataCleaning()
  // Invoca la consulta de la fecha maxima de cierre de caja diario
  maxClosingDateTime(dailyDataGenerate, callback)
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