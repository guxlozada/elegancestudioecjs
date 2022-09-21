
import { DateTime } from "../luxon.min.js"
import { ahoraEC, dateIsValid } from "../util/fecha-util.js"

/**
 * Convierte un Date in millisegundos para genrar una clave con formato 'yyyyMMddThhmmss'
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
    searchDateTime: audDate.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS)
  }
  return res
}