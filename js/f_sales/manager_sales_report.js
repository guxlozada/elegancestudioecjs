import { ahoraEC, calculatePeriod, dateTimeToInputMonthString, dateTimeToLocalString, hoyEC } from "../util/fecha-util.js";
import NotificationBulma from '../dom/NotificacionBulma.js';
import convertFormToObject from "../util/form_util.js";
import { findSalesReport } from "./dao_selller_sales.js";
import { roundTwo } from "../util/numbers-util.js";

const d = document,
  w = window,
  ntf = new NotificationBulma(),
  $form = d.querySelector("#filters")

//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

// EVENTO=load RAIZ=window 
w.addEventListener("load", () => {
  d.getElementById("period-month").value = dateTimeToInputMonthString(ahoraEC())
  search()
})

// EVENTO=change RAIZ=button<search> ACCION=Realizar busqueda
d.addEventListener("submit", e => {
  e.preventDefault()
  search()
})

// EVENTO=change RAIZ=section<section> ACCION=detectar cambios en inputs 
d.getElementById("filters").addEventListener("change", e => {
  let $input = e.target

  if ($input.name === "periodMonth") {
    d.getElementById("period-start").value = ""
    d.getElementById("period-end").value = ""
  }

  if ($input.name === "periodStart" || $input.name === "periodEnd") {
    d.getElementById("period-month").value = ""
  }

  // Cuando cambia la busqueda por rango de fechas se espera el evento 'submit'
  if ($input.type === "date") return

  search()
})

//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------

function search() {

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

  } else if (!filters.periodMonth) {
    ntf.validation("Seleccione un mes o un rango de fechas")
  }

  // Si hay msj de error finaliza
  if (ntf.enabled) return

  // Ejecutar consulta de informacion
  filters = calculatePeriod(filters)
  findSalesReport(filters,
    (vaProducts, vaServices, voFilters) => renderSales(vaProducts, vaServices, voFilters),
    error => ntf.errorAndLog("Busqueda de egresos con error", error))

}

function renderSales(vaProducts, vaServices, voFilters) {
  const $fragment = d.createDocumentFragment(),
    $details = d.getElementById("details")

  //Periodo de consulta
  d.querySelector(".search-period").innerText = dateTimeToLocalString(voFilters.periodStart) +
    " al " + dateTimeToLocalString(voFilters.periodEnd)

  let vnGrossValue = 0,
    vnTaxes = 0,
    vnCommissions = 0,
    vnPurchasePrice = 0,
    vnNetValue = 0,
    vnTotalGrossValue = 0,
    vnTotalTaxes = 0,
    vnTotalCommissions = 0,
    vnTotalPurchasePrice = 0,
    vnTotalNetValue = 0

  // Renderizar productos
  if (voFilters.type !== "S" && vaProducts.length > 0) {
    vaProducts.forEach(item => {
      let $rowTmp = d.getElementById("row").content.cloneNode(true)
      $rowTmp.querySelector(".type").innerText = item.type
      $rowTmp.querySelector(".code").innerText = item.code
      let $description = $rowTmp.querySelector(".description")
      $description.innerText = item.description
      $description.title = item.description
      $rowTmp.querySelector(".amount").innerText = item.amount.toFixed()
      $rowTmp.querySelector(".gross-value").innerText = roundTwo(item.grossValue).toFixed(2)
      $rowTmp.querySelector(".taxes").innerText = roundTwo(item.taxes).toFixed(2)
      $rowTmp.querySelector(".commisions").innerText = roundTwo(item.barberCommission).toFixed(2)
      $rowTmp.querySelector(".purchase-price").innerText = roundTwo(item.purchasePrice).toFixed(2)
      $rowTmp.querySelector(".net-value").innerText = roundTwo(item.netValue).toFixed(2)
      $fragment.appendChild($rowTmp)
      vnGrossValue += roundTwo(item.grossValue)
      vnTaxes += roundTwo(item.taxes)
      vnCommissions += roundTwo(item.barberCommission)
      vnPurchasePrice += roundTwo(item.purchasePrice)
      vnNetValue += roundTwo(item.netValue)
    })
    vnTotalGrossValue += vnGrossValue
    vnTotalTaxes += vnTaxes
    vnTotalCommissions += vnCommissions
    vnTotalPurchasePrice += vnPurchasePrice
    vnTotalNetValue += vnNetValue

    // Subtotal se despliega cuando se visualiza productos y servicios
    if (voFilters.type === "TODOS") {
      let $rowSummary = d.getElementById("row-summary").content.cloneNode(true)
      $rowSummary.querySelector(".type").innerText = "Subtotal productos"
      $rowSummary.querySelector(".gross-value").innerText = vnGrossValue.toFixed(2)
      $rowSummary.querySelector(".taxes").innerText = vnTaxes.toFixed(2)
      $rowSummary.querySelector(".commisions").innerText = vnCommissions.toFixed(2)
      $rowSummary.querySelector(".purchase-price").innerText = vnPurchasePrice.toFixed(2)
      $rowSummary.querySelector(".net-value").innerText = vnNetValue.toFixed(2)
      $fragment.appendChild($rowSummary)
      //Setear valores de subtotales por tipo
      vnGrossValue = 0
      vnTaxes = 0
      vnCommissions = 0
      vnPurchasePrice = 0
      vnNetValue = 0
    }
  }

  // Renderizar servicios
  if (voFilters.type !== "P" && vaServices.length > 0) {
    vaServices.forEach(item => {
      let $rowTmp = d.getElementById("row").content.cloneNode(true)
      $rowTmp.querySelector(".type").innerText = item.type
      $rowTmp.querySelector(".code").innerText = item.code
      let $description = $rowTmp.querySelector(".description")
      $description.innerText = item.description
      $description.title = item.description
      $rowTmp.querySelector(".amount").innerText = item.amount.toFixed()
      $rowTmp.querySelector(".gross-value").innerText = roundTwo(item.grossValue).toFixed(2)
      $rowTmp.querySelector(".taxes").innerText = roundTwo(item.taxes).toFixed(2)
      $rowTmp.querySelector(".commisions").innerText = roundTwo(item.barberCommission).toFixed(2)
      $rowTmp.querySelector(".net-value").innerText = roundTwo(item.netValue).toFixed(2)
      $fragment.appendChild($rowTmp)
      vnGrossValue += roundTwo(item.grossValue)
      vnTaxes += roundTwo(item.taxes)
      vnCommissions += roundTwo(item.barberCommission)
      vnNetValue += roundTwo(item.netValue)
    })

    vnTotalGrossValue += vnGrossValue
    vnTotalTaxes += vnTaxes
    vnTotalCommissions += vnCommissions
    vnTotalNetValue += vnNetValue

    // Subtotal se despliega cuando se visualiza productos y servicios
    if (voFilters.type === "TODOS") {
      let $rowSummary = d.getElementById("row-summary").content.cloneNode(true)
      $rowSummary.querySelector(".type").innerText = "Subtotal servicios"
      $rowSummary.querySelector(".gross-value").innerText = vnGrossValue.toFixed(2)
      $rowSummary.querySelector(".taxes").innerText = vnTaxes.toFixed(2)
      $rowSummary.querySelector(".commisions").innerText = vnCommissions.toFixed(2)
      $rowSummary.querySelector(".net-value").innerText = vnNetValue.toFixed(2)
      $fragment.appendChild($rowSummary)
    }
  }

  $details.innerHTML = "";
  $details.appendChild($fragment)

  // Agregar totales por consulta
  d.querySelector(".total-gross-value").innerText = vnTotalGrossValue.toFixed(2)
  d.querySelector(".total-taxes").innerText = vnTotalTaxes.toFixed(2)
  d.querySelector(".total-commissions").innerText = vnTotalCommissions.toFixed(2)
  d.querySelector(".total-purchase-price").innerText = vnTotalPurchasePrice.toFixed(2)
  d.querySelector(".total-net-value").innerText = vnTotalNetValue.toFixed(2)
}
