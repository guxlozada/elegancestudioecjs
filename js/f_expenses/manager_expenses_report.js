import { calculatePeriod, dateTimeToLocalString, hoyEC } from "../util/fecha-util.js";
import validAdminAccess from "../dom/manager_user.js";
import navbarBurgers from "../dom/navbar_burgers.js";
import NotificationBulma from '../dom/NotificacionBulma.js';
import { findExpensesReport } from "./dao_cash_outflows.js";
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
    d.getElementById("period-start").value = ""
    d.getElementById("period-end").value = ""
    d.getElementById("period-month").value = ""
  }

  if ($input.name === "periodMonth") {
    d.getElementsByName("period").forEach($el => $el.checked = false)
    d.getElementById("period-start").value = ""
    d.getElementById("period-end").value = ""
  }

  if ($input.name === "periodStart" || $input.name === "periodEnd") {
    d.getElementsByName("period").forEach($el => $el.checked = false)
    d.getElementById("period-month").value = ""
  }

  if ($input.name === "type") {
    if ($input.value === "TODOS") {
      d.getElementsByName("type").forEach($el => $el.checked = $el.value === "TODOS")
    } else {
      d.getElementById("type-all").checked = false
    }
  }

  // Cuando cambia la busqueda por rango de fechas se espera el evento 'submit'
  if ($input.type === "date") return

  search()
})

//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------

function search() {
  // Validar acceso de administrador
  if (!validAdminAccess()) return

  let filters = convertFormToObject($form)

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
      ntf.validation("No puede seleccionar una fecha mayor a la actual")
    } else if (filters.periodStart > filters.periodEnd) {
      ntf.validation("La fecha del primer campo no puede ser mayor a la fecha del segundo campo")
    }

    // Desactivar los periodos del filtro
    d.getElementsByName("period").forEach($el => $el.checked = false)
    delete filters.period
  } else if (!filters.period && !filters.periodMonth) {
    ntf.validation("Seleccione una fecha o un rango de fechas")
  }

  // Si hay msj de error finaliza
  if (ntf.enabled) return

  // Cuando se desmarcan todas las casillas, se coloca la opcion 'TODOS'
  if (!filters.type) {
    filters.type = ["TODOS"]
    d.getElementById("type-all").checked = true
  }

  // Ejecutar consulta de informacion
  filters = calculatePeriod(filters)
  findExpensesReport(filters,
    (vmExpenses, voFilters) => renderExpense(vmExpenses, voFilters),
    error => ntf.errorAndLog("Busqueda de egresos con error", error))

}

function renderExpense(vmExpenses, voFilters) {
  const $fragment = d.createDocumentFragment(),
    $details = d.getElementById("details"),
    types = [...vmExpenses.keys()]

  //Periodo de consulta
  d.querySelector(".search-period").innerText = dateTimeToLocalString(voFilters.periodStart) +
    " al " + dateTimeToLocalString(voFilters.periodEnd)

  let vnTotalValue = 0
  types.forEach(type => {
    const expensesByType = vmExpenses.get(type) || []
    let vnTotalValueByType = 0
    expensesByType.forEach((exp, index) => {
      let $rowTmp = d.getElementById("row").content.cloneNode(true)
      $rowTmp.querySelector(".index").innerText = index + 1
      let $date = $rowTmp.querySelector(".date")
      $date.innerText = exp.searchDateTime
      $date.title = exp.tmpUid
      $rowTmp.querySelector(".type").innerText = type
      $rowTmp.querySelector(".responsable").innerText = exp.responsable
      $rowTmp.querySelector(".value").innerText = exp.value.toFixed(2)
      $rowTmp.querySelector(".details").innerText = exp.voucher ? "Comprobante Nro. exp.voucher" : (exp.details || "")
      $fragment.appendChild($rowTmp)
      vnTotalValueByType += exp.value
    })
    vnTotalValue += vnTotalValueByType
    let $rowSummary = d.getElementById("row-summary").content.cloneNode(true)
    $rowSummary.querySelector(".total-value").innerText = vnTotalValueByType.toFixed(2)
    $fragment.appendChild($rowSummary)
  })

  $details.innerHTML = "";
  $details.appendChild($fragment)

  // Agregar totales por consulta
  d.querySelector(".search-total").innerText = vnTotalValue.toFixed(2)
}
