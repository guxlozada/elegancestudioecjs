import { DateTime, Settings } from "../luxon.min.js";

const timezoneEC = "America/Guayaquil"

// Configurar la zona horaria por defecto para luxon
Settings.defaultZoneName = timezoneEC;


Date.prototype.addHours = function (h) {
  this.setTime(this.getTime() + (h * 60 * 60 * 1000));
  return this;
}

/**
 * Add hours. SOLO queda una referencia en manager-sales.js
 * @param {Date} vdDatetime 
 * @param {number} vnHours 
 * @returns 
 * @deprecated
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
 * New date-time with time zone 'America/Guayaquil'. SOLO queda una referencia en manager-sales.js
 * @returns 
 * @deprecated
 */
export function nowEc() {
  var nowEC = new Date().toLocaleString("en-US", { timeZone: timezoneEC })
  return new Date(nowEC);
}

//////////////////////////////////////////
export const PATTERN_KEY_DATE = "yyyyMMdd"
export const PATTERN_KEY_DATETIME = "yyyyMMddThhmmss"
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
 * Convierte un DateTime Luxon a una cadena 'yyyyMMddThhmmss'
 * @param {DateTime} vdDateTime DateTime Luxon
 * @returns 
 */
export function dateTimeToKeyDatetimeString(vdDateTime) {
  return vdDateTime.toFormat(PATTERN_KEY_DATETIME)
}

/**
 * Convierte un DateTime Luxon a una cadena 'yyyy-MM-dd'
 * @param {DateTime} vdDateTime DateTime Luxon
 * @returns 
 */
export function dateTimeToLocalString(vdDateTime) {
  return vdDateTime.toFormat(PATTERN_INPUT_DATE)
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

/**
 * Inyecta al objeto 'voFilters' los atributos 'periodStart' y 'periodEnd'
 * @param {Object} voFilters Objeto que debe contener el atributo 'period' con uno de los valores
 * posibles: LASTMONTH, LASTWEEK, TODAY, CURRENTWEEK, CURRENTMONTH
 * @returns 
 */
export function calculatePeriod(voFilters) {
  if (!voFilters.period) return voFilters

  // Por omision el periodo esta ajustado para periodo 'TODAY'
  let baseDate = hoyEC()
  let truncPeriod = "day"
  switch (voFilters.period) {
    case "LASTMONTH":
      truncPeriod = "month"
      baseDate = baseDate.minus({ months: 1 })
      break
    case "LASTWEEK":
      baseDate = baseDate.minus({ weeks: 1 })
      truncPeriod = "week"
      break
    case "CURRENTWEEK":
      truncPeriod = "week"
      break
    case "CURRENTMONTH":
      truncPeriod = "month"
      break
  }
  return {
    ...voFilters,
    periodStart: baseDate.startOf(truncPeriod),
    periodEnd: baseDate.endOf(truncPeriod)
  }
}
