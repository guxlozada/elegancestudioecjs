import validAdminAccess from "../dom/manager_user.js"
import navbarBurgers from "../dom/navbar_burgers.js"
import NotificationBulma from '../dom/NotificacionBulma.js'
import convertFormToObject from "../util/form_util.js"
import { findCatalogKeyValue } from "./dao_catalog.js"
import { collections } from "../persist/firebase_collections.js"
import { findProducts, insertProduct, updateActive } from "./dao_inv_products.js"
import { localdb } from "../repo-browser.js"
import { findByUid } from "../persist/dao_generic.js"

const d = document,
  w = window,
  ntf = new NotificationBulma(),
  $filtersForm = d.querySelector("#filters"),
  $productForm = d.querySelector("#product")

//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

// EVENTO=load RAIZ=window 
w.addEventListener("load", () => filtersInit())

// EVENTO=DOMContentLoaded RAIZ=document ACCION: Termina de cargar el DOM
d.addEventListener("DOMContentLoaded", () => navbarBurgers())

// EVENTO=reset RAIZ=form#filters ACCION=Realizar busqueda
d.querySelector("#filters").querySelector(".clean").addEventListener("click", () => {
  $filtersForm.reset()
  search()
})

// EVENTO=submit RAIZ=form#filters ACCION=Realizar busqueda
d.querySelector("#filters").addEventListener("submit", e => {
  e.preventDefault()
  search()
})

// EVENTO=change RAIZ=form#filters ACCION=detectar cambios en inputs 
d.querySelector("#filters").addEventListener("change", () => search())

// EVENTO=change RAIZ=table<tbody>#details ACCION: Activar/inactivar producto
d.getElementById("details").addEventListener("change", e => {
  const $el = e.target
  if ($el.type === "checkbox")
    activeInactiveProduct($el.dataset.key, $el.checked)
})

// EVENTO=click RAIZ=table<tbody>#details ACCION=Editar producto
d.getElementById("details").addEventListener("click", e => {
  const $el = e.target
  // Elemento a eliminar 
  if ($el.matches(".edit") || $el.closest(".edit")) {
    const $productLink = e.target.closest(".edit")

    findByUid(collections.catalogProducts, $productLink.dataset.key,
      voProduct => updateProduct(voProduct),
      (vsUid, error) => ntf.errorAndLog(`No existe un producto registrado con el codigo: ${vsUid}`, error))

  }
})

// EVENTO=reset RAIZ=form#product ACCION=Realizar busqueda
d.querySelector("#product").addEventListener("reset", () => w.scroll({ top: 0, behavior: 'smooth' }))

// EVENTO=submit RAIZ=form#product ACCION=Realizar busqueda
d.querySelector("#product").addEventListener("submit", e => {
  e.preventDefault()
  saveProduct()
})


//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------
function filtersInit() {
  let $providers = d.querySelector(".providers"),
    $providersEdit = d.querySelector(".providers-edit"),
    $categories = d.querySelector(".categories"),
    $categoriesEdit = d.querySelector(".categories-edit")
  // Agregar proveedores
  findCatalogKeyValue(collections.catalogProviders,
    (vaProviders) => vaProviders.forEach(p => {
      $providers.add(new Option(p.value, p.value), undefined)
      $providersEdit.add(new Option(p.value, p.value), undefined)
    }),
    (error) => ntf.errorAndLog("Busqueda de proveedores con error", error))
  // Agregar categorias
  findCatalogKeyValue(collections.catalogProductsCategory,
    (vaCategories) => vaCategories.forEach(c => {
      $categories.add(new Option(c.value, c.value), undefined)
      $categoriesEdit.add(new Option(c.value, c.value), undefined)
    }),
    (error) => ntf.errorAndLog("Busqueda de categorias de productos con error", error))
  search()
}

function search() {
  // Validar acceso de administrador
  if (!validAdminAccess()) return

  let filters = convertFormToObject($filtersForm)
  if (filters.keyword) filters.keyword.trim()
  // Ejecutar consulta de informacion
  findProducts(filters,
    (vaProducts) => renderProducts(vaProducts),
    error => ntf.errorAndLog("Busqueda de productos con error", error))

}

function renderProducts(vaProducts) {
  const $fragment = d.createDocumentFragment(),
    $details = d.getElementById("details")

  vaProducts.forEach(prod => {
    let $rowTmp = d.getElementById("row").content.cloneNode(true)
    $rowTmp.querySelector(".code").innerText = prod.code
    $rowTmp.querySelector(".provider").innerText = prod.provider
    $rowTmp.querySelector(".category").innerText = prod.category
    $rowTmp.querySelector(".description").innerText = prod.description
    $rowTmp.querySelector(".base-value").innerText = prod.baseValue.toFixed(2)
    $rowTmp.querySelector(".wholesale-value").innerText = prod.wholesaleValue.toFixed(2)
    $rowTmp.querySelector(".commission").innerText = prod.sellerCommission.toFixed(2)
    let $active = $rowTmp.querySelector(".active")
    $active.checked = prod.active === true
    $active.dataset.key = prod.code
    $rowTmp.querySelector(".edit").dataset.key = prod.code
    $fragment.appendChild($rowTmp)
  })

  $details.innerHTML = "";
  $details.appendChild($fragment)
}

function saveProduct() {
  // Validar acceso de administrador
  if (!validAdminAccess()) return

  let product = convertFormToObject($productForm)
  insertProduct(product,
    voProduct => {
      $productForm.reset()
      $productForm.querySelector(".code").removeAttribute("readonly")// Desactivado para edicion
      search()
      // Eliminar cache de catalogo de productos de la funcionalidad de 'ventas',
      // para que se reconsulte al ingresar a 'ventas'
      localStorage.removeItem(localdb.catalogProducts)
      ntf.okey(`Producto registrado: "${voProduct.code} / ${voProduct.description}"`)
    },
    (voProduct, error) => ntf.errorAndLog(`Producto "${voProduct.code}" NO registrado`, error))
}

function activeInactiveProduct(vsCode, vbActive) {
  let productData = {
    collection: collections.catalogProducts,
    code: vsCode,
    active: vbActive
  }

  // Actualizar la informacion de verificacion de la tx en la BD
  updateActive(productData,
    vsCode => {
      search()
      ntf.okey(`El producto "${vsCode}" fue actualizado correctamente`, 1500)
    },
    (vsCode, error) => ntf.errorAndLog(`El producto "${vsCode}" NO fue actualizado.
      Intente consultar nuevamente la informacion y reintente 'activar/inactivar' el registro.`, error)
  )
}

function updateProduct(voProduct) {
  if (!voProduct) return

  let $code = $productForm.querySelector(".code")
  $code.value = voProduct.code
  $code.setAttribute("readonly", true)
  $productForm.querySelector(".description").value = voProduct.description
  $productForm.querySelector(".providers-edit").value = voProduct.provider
  $productForm.querySelector(".categories-edit").value = voProduct.category
  $productForm.querySelector(".retailValue").value = voProduct.retailValue || voProduct.baseValue
  $productForm.querySelector(".wholesaleValue").value = voProduct.wholesaleValue
  $productForm.querySelector(".sellerCommission").value = voProduct.sellerCommission
  $productForm.querySelector(".purchasePrice").value = voProduct.purchasePrice
}
