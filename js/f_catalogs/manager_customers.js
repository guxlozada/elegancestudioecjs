import { DateTime } from "../luxon.min.js"
import validAdminAccess from "../dom/manager_user.js"
import NotificationBulma from '../dom/NotificacionBulma.js'
import convertFormToObject from "../util/form_util.js"
import { collections } from "../persist/firebase_collections.js"
import { findByUid } from "../persist/dao_generic.js"
import { findCustomers } from "./dao_adm_customers.js"
import { dateTimeToLocalString } from "../util/fecha-util.js"
import exportTableToExcel from "../util/excel-util.js"


const d = document,
  w = window,
  ntf = new NotificationBulma(),
  $filters = d.querySelector("#filters")

//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

// EVENTO=load RAIZ=window 
w.addEventListener("load", () => search())

// EVENTO=reset RAIZ=form#filters ACCION=Realizar busqueda
d.querySelector(".filter-clean").addEventListener("click", () => {
  $filters.reset()
  search()
})

// EVENTO=reset RAIZ=form#filters ACCION=Realizar busqueda
d.querySelector(".tabs").addEventListener("click", e => {
  const $el = e.target
  if ($el.matches(".export-excel") || $el.closest(".export-excel")) {
    const $export = e.target.closest(".export-excel")
    exportTableToExcel($export.dataset.table, $export.dataset.filename)
  }
})

// EVENTO=submit RAIZ=form#filters ACCION=Realizar busqueda
d.addEventListener("submit", e => {
  e.preventDefault()
  search()
})

// EVENTO=change RAIZ=form#filters ACCION=detectar cambios en inputs 
d.querySelector(".filter-order").addEventListener("change", () => search())

// EVENTO=click RAIZ=table<tbody>#details ACCION=Editar registro
d.getElementById("details").addEventListener("click", e => {
  const $el = e.target
  // Elemento a editar 
  if ($el.matches(".edit") || $el.closest(".edit")) {
    const $edit = e.target.closest(".edit")

    findByUid(collections.customers, $edit.dataset.key,
      voRecord => callUpdate(voRecord),
      (vsUid, error) => ntf.errorAndLog(`No existe un registrado con el codigo: ${vsUid}`, error))
  }
})

function search() {
  // Validar acceso de administrador
  if (!validAdminAccess()) return

  let filters = convertFormToObject($filters)
  if (filters.keyword) filters.keyword.trim()
  // Ejecutar consulta de informacion
  findCustomers(filters,
    (vaRecords) => renderReport(vaRecords),
    error => ntf.errorAndLog("Busqueda de registros con error", error))
}

function renderReport(vaRecords) {
  const $fragment = d.createDocumentFragment(),
    $details = d.getElementById("details")

  vaRecords.forEach(item => {
    let $rowTmp = d.getElementById("row").content.cloneNode(true)
    $rowTmp.querySelector(".id").innerText = item.idNumber
    $rowTmp.querySelector(".id").title = item.idType
    $rowTmp.querySelector(".name").innerText = (item.surnames || "---") + " " + (item.names || "---")
    $rowTmp.querySelector(".name").title = item.name
    $rowTmp.querySelector(".cellphone").innerText = item.cellphone || "---"
    $rowTmp.querySelector(".registration").innerText =
      (item.aud[0].registeredBy || item.aud[0].seller).substring(0, 4) + " " + dateTimeToLocalString(DateTime.fromMillis(item.aud[0].date))
    $rowTmp.querySelector(".last-service").innerText = item.stLastService ? dateTimeToLocalString(DateTime.fromMillis(item.stLastService))
      : (item.lastService || "---")
    $rowTmp.querySelector(".total-services").innerText = item.stTotalServices || 0
    $rowTmp.querySelector(".sixth-cut").innerText = item.stFreeSixthCut || 0
    $rowTmp.querySelector(".poll-cupons").innerText = item.stPollCupons || "---"
    $rowTmp.querySelector(".raffle-cupons").innerText = item.stRaffleCupons || "---"
    $rowTmp.querySelector(".edit").dataset.key = item.uid
    $fragment.appendChild($rowTmp)
  })
  d.querySelector(".customer-count").innerText = vaRecords.length

  $details.innerHTML = "";
  $details.appendChild($fragment)
}
