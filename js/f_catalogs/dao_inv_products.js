
import { collections } from "../persist/firebase_collections.js";
import { db, dbRef } from "../persist/firebase_conexion.js";
import { ahoraEC } from "../util/fecha-util.js";
import { roundTwo } from "../util/numbers-util.js";

const IVA = 0.12

/**
 * Consulta de productos
 * @param {Objetc} voFilters Objeto que contiene los filtros de la consulta: active, provider, category, code or description
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
export function findProducts(voFilters, callback, callbackError) {
  db.ref(collections.catalogProducts).orderByKey()
    .once('value')
    .then(snap => {
      let products = []
      snap.forEach(child => {
        let keywordExp = voFilters.keyword ? new RegExp(voFilters.keyword, "i") : null,
          prod = child.val()
        if ((voFilters.active === "TODOS" || voFilters.active === prod.active.toString())
          && (!voFilters.provider || voFilters.provider === prod.provider)
          && (!voFilters.category || voFilters.category === prod.category)
          && (!voFilters.keyword || prod.code.match(keywordExp) || prod.description.match(keywordExp))) {
          products.push(prod)
        }
      })
      callback(products)
    })
    .catch(error => callbackError(error))
}

/**
 * 
 * @param {Object} voProduct 
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
export function insertProduct(voProduct, callback, callbackError) {
  let product = {
    active: voProduct.active || true,
    date: voProduct.date || ahoraEC().toMillis(),
    retentionIVA: true,
    type: "P",
    ...voProduct
  }

  // Calcular auxiliares de IVA
  product.retailTaxIVA = roundTwo(voProduct.retailValue * IVA)
  product.retailFinalValue = roundTwo(voProduct.retailValue + product.retailTaxIVA)
  product.baseValue = product.retailValue
  product.taxIVA = product.retailTaxIVA
  product.finalValue = product.retailFinalValue
  product.wholesaleTaxIVA = roundTwo(voProduct.wholesaleValue * IVA)
  product.wholesaleFinalValue = roundTwo(voProduct.wholesaleValue + product.wholesaleTaxIVA)

  dbRef.child(collections.catalogProducts).child(product.code).set(product)
    .then(() => callback(product))
    .catch(error => callbackError(voProduct, error))
}

/**
 * Actualiza el campo 'active' de la colleccion correspondiente a un catalogo: products, services.
 * @param {object} voData Objeto con informacion de la tx bancaria  con los atributos: collection, uid, active
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
export function updateActive(voData, callback, callbackError) {
  var updates = {}
  updates[`${voData.collection}/${voData.code}/active`] = voData.active

  console.log(updates)
  dbRef.update(updates, error => { error ? callbackError(voData.code, error) : callback(voData.code) })
}
