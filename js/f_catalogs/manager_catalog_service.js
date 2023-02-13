import NotificationBulma from '../dom/NotificacionBulma.js'
import convertFormToObject from "../util/form_util.js"
import { findCatalogKeyValue, updateActive } from "./dao_catalog.js"
import { collections } from "../persist/firebase_collections.js"
import { findServices, insertService } from "./dao_inv_services.js"
import { localdb } from "../repo-browser.js"
import { findByUid } from "../persist/dao_generic.js"
import exportTableToExcel from "../util/excel-util.js"

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

// EVENTO=reset RAIZ=tabs ACCION=Operaciones de la funcionalidad
d.querySelector(".tabs").addEventListener("click", e => {
  const $el = e.target
  if ($el.matches(".filter-clean") || $el.closest(".filter-clean")) {
    $filtersForm.reset()
    search()
  }
  
  if ($el.matches(".export-excel") || $el.closest(".export-excel")) {
    const $export = e.target.closest(".export-excel")
    exportTableToExcel($export.dataset.table, $export.dataset.filename)
  }
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

    findByUid(collections.catalogServices, $edit.dataset.key,
      voRecord => callUpdate(voRecord),
      (vsUid, error) => ntf.errorAndLog(`No existe un servicio registrado con el codigo: ${vsUid}`, error))

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
  let $categories = d.querySelector(".categories"),
    $categoriesEdit = d.querySelector(".categories-edit")
  // Agregar categorias
  findCatalogKeyValue(collections.catalogServicesCategory,
    (vaCategories) => vaCategories.forEach(c => {
      $categories.add(new Option(c.value, c.value), undefined)
      $categoriesEdit.add(new Option(c.value, c.value), undefined)
    }),
    (error) => ntf.errorAndLog("Busqueda de categorias de servicios con error", error))
  search()
}

function search() {
  let filters = convertFormToObject($filtersForm)
  if (filters.keyword) filters.keyword.trim()
  // Ejecutar consulta de informacion
  findServices(filters,
    (vaRecords) => renderCatalog(vaRecords),
    error => ntf.errorAndLog("Busqueda de servicios con error", error))

}

function renderCatalog(vaRecords) {
  const $fragment = d.createDocumentFragment(),
    $details = d.getElementById("details")

  vaRecords.forEach(item => {
    let $rowTmp = d.getElementById("row").content.cloneNode(true)
    $rowTmp.querySelector(".code").innerText = item.code
    $rowTmp.querySelector(".category").innerText = item.category
    $rowTmp.querySelector(".barber").innerText = item.barber || "TODOS"
    $rowTmp.querySelector(".description").innerText = item.description
    $rowTmp.querySelector(".retail-value").innerText = item.retailValue.toFixed(2)
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
  let registration = convertFormToObject($registerForm)
  // Asignar 'active' desde input type=hidden
  registration.active = registration.activeString === "true"
  delete registration.activeString

  insertService(registration,
    voRecord => {
      $registerForm.reset()
      $registerForm.querySelector(".code").removeAttribute("readonly")// Desactivado para edicion
      search()
      // Eliminar cache de catalogo de servicios de la funcionalidad de 'ventas',
      // para que se reconsulte al ingresar a 'ventas'
      localStorage.removeItem(localdb.catalogServices)
      ntf.okey(`Servicio registrado: "${voRecord.code} / ${voRecord.description}"`)
    },
    (voRecord, error) => ntf.errorAndLog(`Servicio "${voRecord.code}" NO registrado`, error))
}

function changeStatus(vsCode, vbActive) {
  const data = {
    code: vsCode,
    active: vbActive
  }

  // Actualizar la informacion del estado del registro en la BD
  updateActive(collections.catalogServices, data,
    vsCode => {
      search()
       // Eliminar cache de catalogo de servicios de la funcionalidad de 'ventas',
      // para que se reconsulte al ingresar a 'ventas'
      localStorage.removeItem(localdb.catalogServices)
      ntf.okey(`El servicio "${vsCode}" fue actualizado correctamente`, 1500)
    },
    (vsCode, error) => ntf.errorAndLog(`El servicio "${vsCode}" NO fue actualizado.
      Intente consultar nuevamente la informacion y reintente 'activar/inactivar' el registro.`, error)
  )
}

function callUpdate(voRecord) {
  if (!voRecord) return

  let $code = $registerForm.querySelector(".code")
  $code.value = voRecord.code
  $code.setAttribute("readonly", true)
  $registerForm.querySelector(".description").value = voRecord.description
  $registerForm.querySelector(".barber").value = voRecord.barber
  $registerForm.querySelector(".categories-edit").value = voRecord.category
  $registerForm.querySelector(".retail-value").value = voRecord.retailValue || voRecord.baseValue
  $registerForm.querySelector(".seller-commission").value = voRecord.sellerCommission
  $registerForm.querySelector(".active-string").value = voRecord.active
}
