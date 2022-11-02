import validAdminAccess from "../dom/manager_user.js"
import navbarBurgers from "../dom/navbar_burgers.js"
import NotificationBulma from '../dom/NotificacionBulma.js'
import convertFormToObject from "../util/form_util.js"
import { findCatalogKeyValue, updateActive } from "./dao_catalog.js"
import { collections } from "../persist/firebase_collections.js"
import { findProducts, insertProduct } from "./dao_inv_products.js"
import { localdb } from "../repo-browser.js"
import { findByUid } from "../persist/dao_generic.js"

const d = document,
  w = window,
  ntf = new NotificationBulma(),
  $filtersForm = d.querySelector("#filters"),
  $registerForm = d.querySelector("#registration")

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

// EVENTO=change RAIZ=table<tbody>#details ACCION: Activar/inactivar el registro
d.getElementById("details").addEventListener("change", e => {
  const $el = e.target
  if ($el.type === "checkbox")
    changeStatus($el.dataset.key, $el.checked)
})

// EVENTO=click RAIZ=table<tbody>#details ACCION=Editar registro
d.getElementById("details").addEventListener("click", e => {
  const $el = e.target
  // Elemento a eliminar 
  if ($el.matches(".edit") || $el.closest(".edit")) {
    const $edit = e.target.closest(".edit")

    findByUid(collections.catalogProducts, $edit.dataset.key,
      voRecord => callUpdate(voRecord),
      (vsUid, error) => ntf.errorAndLog(`No existe un producto registrado con el codigo: ${vsUid}`, error))

  }
})

// EVENTO=reset RAIZ=form#registration ACCION=Realizar busqueda
d.querySelector("#registration").addEventListener("reset", () => w.scroll({ top: 0, behavior: 'smooth' }))

// EVENTO=submit RAIZ=form#registration ACCION=Realizar busqueda
d.querySelector("#registration").addEventListener("submit", e => {
  e.preventDefault()
  saveForm()
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
    (vaRecords) => renderCatalog(vaRecords),
    error => ntf.errorAndLog("Busqueda de productos con error", error))

}

function renderCatalog(vaRecords) {
  const $fragment = d.createDocumentFragment(),
    $details = d.getElementById("details")

  vaRecords.forEach(item => {
    let $rowTmp = d.getElementById("row").content.cloneNode(true)
    $rowTmp.querySelector(".provider").innerText = item.provider
    $rowTmp.querySelector(".category").innerText = item.category
    $rowTmp.querySelector(".code").innerText = item.code
    $rowTmp.querySelector(".description").innerText = item.description
    $rowTmp.querySelector(".purchase-price").innerText = item.purchasePrice.toFixed(2)
    $rowTmp.querySelector(".retail-value").innerText = item.retailValue.toFixed(2)
    $rowTmp.querySelector(".wholesale-value").innerText = item.wholesaleValue.toFixed(2)
    $rowTmp.querySelector(".commission").innerText = item.sellerCommission.toFixed(2)
    let $active = $rowTmp.querySelector(".active")
    $active.checked = item.active === true
    $active.dataset.key = item.code
    $rowTmp.querySelector(".edit").dataset.key = item.code
    $fragment.appendChild($rowTmp)
  })

  $details.innerHTML = "";
  $details.appendChild($fragment)
}

function saveForm() {
  // Validar acceso de administrador
  if (!validAdminAccess()) return

  let registration = convertFormToObject($registerForm)
  // Asignar 'active' desde input type=hidden
  registration.active = registration.activeString === "true"
  delete registration.activeString

  insertProduct(registration,
    voRecord => {
      $registerForm.reset()
      $registerForm.querySelector(".code").removeAttribute("readonly")// Desactivado para edicion
      search()
      // Eliminar cache de catalogo de productos de la funcionalidad de 'ventas',
      // para que se reconsulte al ingresar a 'ventas'
      localStorage.removeItem(localdb.catalogProducts)
      ntf.okey(`Producto registrado: "${voRecord.code} / ${voRecord.description}"`)
    },
    (voRecord, error) => ntf.errorAndLog(`Producto "${voRecord.code}" NO registrado`, error))
}

function changeStatus(vsCode, vbActive) {
  const data = {
    code: vsCode,
    active: vbActive
  }

  // Actualizar la informacion del estado del registro en la BD
  updateActive(collections.catalogProducts, data,
    vsCode => {
      search()
      // Eliminar cache de catalogo de productos de la funcionalidad de 'ventas',
      // para que se reconsulte al ingresar a 'ventas'
      localStorage.removeItem(localdb.catalogProducts)
      ntf.okey(`El producto "${vsCode}" fue actualizado correctamente`, 1500)
    },
    (vsCode, error) => ntf.errorAndLog(`El producto "${vsCode}" NO fue actualizado.
      Intente consultar nuevamente la informacion y reintente 'activar/inactivar' el registro.`, error)
  )
}

function callUpdate(voRecord) {
  if (!voRecord) return

  let $code = $registerForm.querySelector(".code")
  $code.value = voRecord.code
  $code.setAttribute("readonly", true)
  $registerForm.querySelector(".description").value = voRecord.description
  $registerForm.querySelector(".providers-edit").value = voRecord.provider
  $registerForm.querySelector(".categories-edit").value = voRecord.category
  $registerForm.querySelector(".retail-value").value = voRecord.retailValue || voRecord.baseValue
  $registerForm.querySelector(".wholesale-value").value = voRecord.wholesaleValue
  $registerForm.querySelector(".seller-commission").value = voRecord.sellerCommission
  $registerForm.querySelector(".purchase-price").value = voRecord.purchasePrice
  $registerForm.querySelector(".active-string").value = voRecord.active
}
