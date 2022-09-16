/**
 * Redondear a dos decimales
 * @param {Number} vnDecimal Valor decimal
 * @returns 
 */
export function roundTwo(vnDecimal) {
  return Math.round(vnDecimal * 100) / 100
}

/**
 * Redondear a cuatro decimales
 * @param {Number} vnDecimal Valor decimal
 * @returns 
 */
export function roundFour(vnDecimal) {
  return Math.round(vnDecimal * 10000) / 10000
}