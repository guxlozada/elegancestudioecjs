/**
 * Complementa con ceros a la izquierda el valor de un numero
 * @param {Number} num Numero
 * @param {Number} places Tamanio total del texto
 * @returns 
 */
export const zeroPad = (num, places) => String(num).padStart(places, '0')