import { calculatePeriod, hoyEC } from "../util/fecha-util.js";
import validAdminAccess from "../dom/manager_user.js";
import navbarBurgers from "../dom/navbar_burgers.js";
import NotificationBulma from '../dom/NotificacionBulma.js';
import { findExpensesReport } from "./dao_seller_expenses.js";
import convertFormToObject from "../util/form_util.js";

const d = document,
  w = window,
  ntf = new NotificationBulma(),
  $form = d.querySelector("#filters")

//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

// EVENTO=load RAIZ=window 
w.addEventListener("load", () => search())

// EVENTO=DOMContentLoaded RAIZ=document ACCION: Termina de cargar el DOM
d.addEventListener("DOMContentLoaded", () => navbarBurgers())

// EVENTO=change RAIZ=button<search> ACCION=Realizar busqueda
d.addEventListener("submit", e => {
  e.preventDefault()
  search()
})

// EVENTO=change RAIZ=section<section> ACCION=detectar cambios en inputs 
d.getElementById("filters").addEventListener("change", e => {
  let $input = e.target
  if ($input.name === "period") {
    // Setear valores de rango de fechas
    d.getElementById("period-start").value = ""
    d.getElementById("period-end").value = ""
    search()
  } else if ($input.name === "type") {
    if ($input.value === "TODOS") {
      d.getElementsByName("type").forEach($el => $el.checked = $el.value === "TODOS")
    } else {
      d.getElementById("type-all").checked = false
    }
    search()
  }

})

//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------

function search(voFilters) {
  let filters = voFilters || convertFormToObject($form)

  // Se ha seleccionado al menos una fecha
  if (filters.periodStart || filters.periodEnd) {
    if (!filters.periodEnd) {
      filters.periodEnd = filters.periodStart
    }
    if (!filters.periodStart) {
      filters.periodStart = filters.periodEnd
    }

    // Validar rango y fecha maxima de consulta
    let hoy = hoyEC()
    if (filters.periodStart > hoy || filters.periodEnd > hoy) {
      ntf.error("Informacion con errores", "No puede seleccionar una fecha mayor a la actual")
    } else if (filters.periodStart > filters.periodEnd) {
      ntf.error("Informacion con errores", "La fecha del primer campo no puede ser mayor a la fecha del segundo campo")
    }

    // Si hay msj de error finaliza
    if (ntf.enabled) return

    // Desactivar los periodos delfiltro
    d.getElementsByName("period").forEach($el => $el.checked = false)
    delete filters.period
  } else if (!filters.period) {
    ntf.error("Informacion con errores", "Seleccione una fecha o un rango de fechas")
    search(filters)
    return
  }

  if (validAdminAccess()) {
    filters = calculatePeriod(filters)

    findExpensesReport(filters,
      (vmExpenses, voFilters) => renderExpense(vmExpenses, voFilters),
      error => ntf.tecnicalError("Busqueda de egresos con error", error))
  }
}

function renderExpense(vmExpenses, voFilters) {
  const $rowTmp = d.getElementById("row").content,
    $rowSummary = d.getElementById("row-summary").content,
    $fragment = d.createDocumentFragment(),
    $details = d.getElementById("details"),
    types = [...vmExpenses.keys()]

  let $clone

  types.forEach(type => {
    const expensesByType = vmExpenses.get(type) || []
    let vnTotalValue = 0
    expensesByType.forEach((exp, index) => {
      vnTotalValue += exp.value
      $rowTmp.querySelector(".index").innerText = index + 1
      let $date = $rowTmp.querySelector(".date")
      $date.innerText = exp.searchDateTime
      $date.title = exp.tmpUid
      $rowTmp.querySelector(".responsable").innerText = exp.responsable
      $rowTmp.querySelector(".value").innerText = exp.value.toFixed(2)
      $rowTmp.querySelector(".details").innerText = exp.voucher ? "Comprobante Nro. exp.voucher" : (exp.details || "")

      $clone = d.importNode($rowTmp, true)
      $fragment.appendChild($clone)
    })
    $rowSummary.querySelector(".type").innerText = type
    $rowSummary.querySelector(".total-value").innerText = vnTotalValue.toFixed(2)
    $clone = d.importNode($rowSummary, true)
    $fragment.appendChild($clone)
  })
  $details.innerHTML = "";
  $details.appendChild($fragment)

  d.querySelector(".search-period").innerText = voFilters.periodStart.toFormat('dd/MM/yyyy') + " al " + voFilters.periodEnd.toFormat('dd/MM/yyyy')
}
