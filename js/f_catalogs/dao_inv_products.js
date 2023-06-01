
import { getShop } from "../dom/manager_user.js";
import { collections } from "../persist/firebase_collections.js";
import { db, dbRef } from "../persist/firebase_conexion.js";
import { IVA } from "../repo-browser.js";
import { ahoraEC } from "../util/fecha-util.js";
import { roundTwo } from "../util/numbers-util.js";

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
      let res = []
      snap.forEach(child => {
        let keywordExp = voFilters.keyword ? new RegExp(voFilters.keyword, "i") : null,
          item = child.val()
        if ((voFilters.active === "TODOS" || voFilters.active === item.active.toString())
          && (!voFilters.provider || voFilters.provider === item.provider)
          && (!voFilters.category || voFilters.category === item.category)
          && (!voFilters.keyword || item.code.match(keywordExp) || item.description.match(keywordExp))) {
          res.push(item)
        }
      })
      callback(res)
    })
    .catch(error => callbackError(error))
}

/**
 * Registrar o actualizar un producto
 * @param {Object} voProduct 
 * @param {Function} callback 
 * @param {Function} callbackError 
 */
export function insertProduct(voProduct, callback, callbackError) {
  let product = {
    date: voProduct.date || ahoraEC().toMillis(),
    retentionIVA: true,
    type: "P",
    shop: getShop().code,
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
