import { DateTime, Settings } from "../luxon.min.js";

const locale = "es-EC",
  timezoneEC = "America/Guayaquil",
  tzoffset = (new Date()).getTimezoneOffset() * 60000// horas de diferencia en zona horaria del ecuador

// Configurar la zona horaria por defecto para luxon
Settings.defaultZoneName = timezoneEC;


Date.prototype.addHours = function (h) {
  this.setTime(this.getTime() + (h * 60 * 60 * 1000));
  return this;
}

/**
 * Add hours
 * @param {Date} vdDatetime 
 * @param {number} vnHours 
 * @returns 
 */
export function addHours(vdDatetime, vnHours) {
  return new Date(vdDatetime).addHours(vnHours)
}
/**
 * Validate if date is valid
 * @param {Number} timestamp Miliseconds
 * @returns 
 */
export function dateIsValid(timestamp) {
  return !Number.isNaN(new Date(timestamp).getTime());
}

/**
 * Text representation of the date-time with locale='es-EC' time zone 'America/Guayaquil'
 * @returns 
 */
export function nowEcToString() {
  return nowEc().toLocaleString(locale, { timeZone: timezoneEC });
}

/**
 * Text representation with ISO format of the date-time with time zone 'America/Guayaquil'
 * @returns 
 */
export function nowEcToISOString() {
  return new Date(timestampEc() - tzoffset).toISOString().slice(0, -1)
}

/**
 * New date-time with time zone 'America/Guayaquil'
 * @returns 
 */
export function nowEc() {
  var nowEC = new Date().toLocaleString("en-US", { timeZone: timezoneEC })
  return new Date(nowEC);
}

/**
 * Conversion to milliseconds of the date and time with time zone 'America/Guayaquil'
 * @returns 
 */
export function timestampEc() {
  return nowEc().getTime()
}

/**
 * Text representation of the date with locale='es-EC', time zone 'America/Guayaquil'
 * @returns {string}
 */
export function todayEcToString() {
  return todayEc().toLocaleDateString(locale, { timeZone: timezoneEC })
}

/**
 * Text representation of the date with locale='es-EC', time zone 'America/Guayaquil'
 * @returns {Date} vdDatetime
 */
export function dateToStringEc(vdDatetime) {
  return vdDatetime.toLocaleDateString(locale, { timeZone: timezoneEC })
}

/**
 * New date with time zone 'America/Guayaquil'
 * @returns {Date}
 */
export function todayEc() {
  var todayEC = new Date().toLocaleDateString("en-US", { timeZone: timezoneEC })
  return new Date(todayEC);
}

/**
 * Format date to string 'yyyyMMddThhmmss'
 * @param { number} timestampUTC Date in millisegundos
 */
export function formatToOperationDayString(timestamp) {
  return new Date(timestamp).toISOString().replace(/[^0-9T]/g, "").replace(/ +/, " ").slice(0, -3)
}

/**
 * Format date to string 'yyyyMMddThhmmss'
 * @param { number} timestampUTC ONLY UTC Date in millisegundos
 */
export function formatToOperationDayStringEc(timestampUTC) {
  return new Date(timestampUTC - tzoffset).toISOString().replace(/[^0-9T]/g, "").replace(/ +/, " ").slice(0, -3)
}

/**
 * Format date to ISO string without milliseconds 'yyyy-MM-ddThh:mm:ss'
 * @param { number} timestampUTC ONLY UTC Date in millisegundos
 */
export function formatToISOStringEc(timestampUTC) {
  return new Date(timestampUTC - tzoffset).toISOString().slice(0, -1)
}

/**
 * Truncate the string date 'yyyyMMddThhmmss' to: year, month, date, hours, minutes, seconds
 * @param {number} timestamp Date in millisegundos
 * @param {string} to part of date string: year, month, date, hours, minutes, seconds
 */
export function truncOperationDayString(timestamp, to) {
  let cut = 0
  switch (to) {
    case "year":
      cut = 4
      break;
    case "month":
      cut = 6
      break;
    case "date":
      cut = 8
      break;
    case "hours":
      cut = 11
      break;
    case "minutes":
      cut = 13
      break;
    default:
      cut = 15
      break;
  }
  return formatToOperationDayString(timestamp).slice(0, cut)
}

//TODO: Verificar uso y eliminar
export function timestampInputDateToDateEc(vsDate) {
  return new Date(vsDate).addHours(tzoffset).getTime()
}


//////////////////////////////////////////
export const PATTERN_KEY_DATE = "yyyyMMdd"
export const PATTERN_INPUT_DATE = "yyyy-MM-dd"

export const ahoraEC = () => { return DateTime.local() }

export const hoyEC = () => { return DateTime.local().startOf('day') }

/**
 * Convierte el valor de un input type=date con formato 'yyyy-MM-dd' a un DateTime Luxon
 * @param {string} vsDate valor de un input type=date con formato 'yyyy-MM-dd'
 * @returns 
 */
export function inputDateToDateTime(vsDate) {
  return DateTime.fromFormat(vsDate, PATTERN_INPUT_DATE)
}

/**
 * Convierte una cadena con formato 'yyyy-MM-dd' a un DateTime Luxon
 * @param {string} vsDate cadena con formato 'yyyy-MM-dd'
 * @returns 
 */
export function localStringToDateTime(vsDate) {
  return DateTime.fromFormat(vsDate, PATTERN_INPUT_DATE)
}

export function inputDatetimeToDateTime(vsDate) {
  let isoString = new Date(vsDate).toISOString()
  return DateTime.fromISO(isoString)
}

/**
 * Convierte un DateTime Luxon a una cadena 'yyyyMMdd'
 * @param {DateTime} vdDateTime DateTime Luxon
 * @returns 
 */
export function dateTimeToKeyDateString(vdDateTime) {
  return vdDateTime.toFormat(PATTERN_KEY_DATE)
}

/**
 * Compara dos DateTime utilizando la operacion solicitada
 * @param {DateTime} vdDateTimeCompare DateTime que se verifica
 * @param {string} operation lt='antes', le='antes o igual', eq='igual', ge='posterior o igual', gt='posterior'
 * @param {DateTime} vdDateTimeBase DateTime contra la que se compara
 * @returns 
 */
export function compareTruncDay(vdDateTimeCompare, operation, vdDateTimeBase) {
  if (!vdDateTimeBase || !vdDateTimeCompare) return undefined
  let res,
    base = vdDateTimeBase.startOf("day"),
    comparar = vdDateTimeCompare.startOf("day")
  switch (operation) {
    case "lt":
      res = comparar < base
      break
    case "le":
      res = comparar <= base
      break
    case "eq":
      res = comparar == base
      break
    case "ge":
      res = comparar >= base
      break
    case "gt":
      res = comparar > base
      break
  }
  return res
}
