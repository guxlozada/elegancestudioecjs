import { calculatePeriod, dateTimeToPageDateString, hoyEC } from "../util/fecha-util.js";
import NotificationBulma from '../dom/NotificacionBulma.js';
import { roundFour, roundTwo } from "../util/numbers-util.js";
import convertFormToObject from "../util/form_util.js";
import { findForCommissionsPayment } from "../f_expenses/dao_cash_outflows.js";
import exportTableToExcel from "../util/excel-util.js";
import { addOperators } from "../dom/manager_operators.js";

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
d.querySelector(".tabs").addEventListener("click", e => {
  const $el = e.target
  if ($el.matches(".export-excel") || $el.closest(".export-excel")) {
    const $export = e.target.closest(".export-excel")
    exportTableToExcel($export.dataset.table, $export.dataset.filename)
  }
  if ($el.matches(".filter-clean") || $el.closest(".filter-clean")) {
    $filters.reset()
    search()
  }
})

// EVENTO=DOMContentLoaded RAIZ=document 
d.addEventListener("DOMContentLoaded", () => {
  // Agregar vendedores
  addOperators(".sellers-container", null,
    () => { },
    () => ntf.errorAndLog(`No se pudo obtener la informacion de los vendedores, 
  por favor intente nuevamente ingresando al sistema;
  si el problema continua, comuniquelo a Carlos Quinteros`),
    true)
})

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

  // Cuando cambia la busqueda por rango de fechas se espera el evento 'submit'
  if ($input.type === "date") return

  search()
})

//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------

function search() {

  let filters = convertFormToObject($filters)

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

  } else if (!filters.period && !filters.periodMonth) {
    ntf.validation("Seleccione un periodo, mes o un rango de fechas")
  }

  // Si hay msj de error finaliza
  if (ntf.enabled) return

  // Ejecutar consulta de informacion
  filters = calculatePeriod(filters)
  findForCommissionsPayment(filters,
    (filters, vmSales, voAdvancesToBarber) => renderCommissionsPayment(filters, vmSales, voAdvancesToBarber),
    (vsTitle, error) => ntf.errorAndLog(vsTitle, error))

}

function renderCommissionsPayment(voFilters, vmSales, voAdvancesToBarber) {
  const $fragment = d.createDocumentFragment(),
    $paymentsDetails = d.getElementById("payments-details")

  let vnSearchSales = 0,
    vnSearchBarberCommissions = 0,
    vnSearchBarberCommissionsTmp = 0,
    vnTotalBarberTips,
    vnTotalTaxes,
    vnTotalTaxableIncome,
    vnTotalSales,
    vnTotalBarberAdvancePayment,
    vnTotalBarberCommissions,
    vnTotalBarberCommissionsTmp,
    vnTotalBarberDrinks,
    vnTotalBarberPaidCommissions,
    vnTotalBarberPaidTips,
    vnTotalBarberDiscounts,
    vnValueSale,
    vnTaxes,
    vnTaxableIncome,
    vnBarberTip,
    vnBarberCommission,
    vnBarberCommissionTmp,
    barbers = [...vmSales.keys()]

  // Agregar totales por consulta
  d.querySelector(".search-period").innerText = dateTimeToPageDateString(voFilters.periodStart) + " a " + dateTimeToPageDateString(voFilters.periodEnd)

  barbers.forEach(barber => {
    vnTotalTaxes = vnTotalTaxableIncome = vnTotalSales = vnTotalBarberCommissions = vnTotalBarberCommissionsTmp = vnTotalBarberTips = 0
    vnTotalBarberAdvancePayment = vnTotalBarberPaidCommissions = vnTotalBarberPaidTips = vnTotalBarberDrinks = vnTotalBarberDiscounts = 0
    ////console.log("barbero:", barber)

    // Encabezado con barbero de
    let $rowBarber = d.getElementById("sale-row-header").content.cloneNode(true)
    $rowBarber.querySelector(".barber").innerText = barber
    $fragment.appendChild($rowBarber)

    // GRUPO 1: Agregar detalles de servicios y venta de productos
    const salesByBarber = vmSales.get(barber) || []

    salesByBarber.forEach((sale, index) => {
      let $rowTmp = d.getElementById("sale-row").content.cloneNode(true)
      vnValueSale = roundTwo(sale.totalSale)
      vnTaxes = roundTwo(sale.taxes)
      vnTaxableIncome = roundTwo(sale.taxableIncome)
      vnBarberCommission = roundTwo(sale.barberCommission)
      // Temporalmente a los pagos con tarjeta de credito o debito la comision al valor final es igual a la de base imponib
      if (sale.typePayment === 'TCREDITO' || sale.typePayment === 'TDEBITO') {
        vnBarberCommissionTmp = vnBarberCommission
      } else {
        vnBarberCommissionTmp = roundFour(sale.barberCommission * (1 + (sale.iva || 0.12)))
      }
      // Tiene precedencia la propina con descuento datafast (paymentTip), luego la propina
      // relacionada a una tx bancaria registrada solo para propina (bankTxValue) y por ultimo
      // la registrada en la venta (tipByBank)
      // IMPORTANTE: Debe conincidir con el calculo en manager_daily_closing.js
      vnBarberTip = roundTwo(sale.paymentTip || sale.bankTxValue || sale.tipByBank || 0)
      // Totales por barbero
      vnTotalSales += vnValueSale
      vnTotalTaxes += vnTaxes
      vnTotalTaxableIncome += vnTaxableIncome
      vnTotalBarberCommissions += vnBarberCommission
      vnTotalBarberCommissionsTmp += vnBarberCommissionTmp
      vnTotalBarberTips += vnBarberTip
      // Totales por Consulta
      vnSearchSales += vnValueSale
      vnSearchBarberCommissions += vnBarberCommission
      vnSearchBarberCommissionsTmp += vnBarberCommissionTmp
      $rowTmp.querySelector(".index").innerText = index + 1
      $rowTmp.querySelector(".date").innerText = sale.searchDateTime
      $rowTmp.querySelector(".payment").innerText = sale.typePayment.toLowerCase().slice(0, 8)
      $rowTmp.querySelector(".value").innerText = vnValueSale.toFixed(2)
      $rowTmp.querySelector(".taxes").innerText = sale.taxes.toFixed(2)
      $rowTmp.querySelector(".taxable-income").innerText = sale.taxableIncome.toFixed(2)
      //$rowTmp.querySelector(".barber-commission").innerText = vnBarberCommission.toFixed(2)
      $rowTmp.querySelector(".barber-commission-tmp").innerText = vnBarberCommissionTmp.toFixed(2)
      if (vnBarberTip > 0) $rowTmp.querySelector(".barber-tip").innerText = vnBarberTip.toFixed(2)
      $fragment.appendChild($rowTmp)
    })

    // Agregar totales
    let $totalsTmp = d.getElementById("sale-row-summary").content.cloneNode(true)
    $totalsTmp.querySelector(".total-value").innerText = vnTotalSales.toFixed(2)
    $totalsTmp.querySelector(".total-taxes").innerText = vnTotalTaxes.toFixed(2)
    $totalsTmp.querySelector(".total-taxable-income").innerText = vnTotalTaxableIncome.toFixed(2)
    //$totalsTmp.querySelector(".total-barber-commissions").innerText = vnTotalBarberCommissions.toFixed(2)
    $totalsTmp.querySelector(".total-barber-commissions-tmp").innerText = vnTotalBarberCommissionsTmp.toFixed(2)
    $totalsTmp.querySelector(".total-barber-tips").innerText = vnTotalBarberTips.toFixed(2)

    // GRUPO 2: Totalizar comisiones adelantadas y pagadas 
    let discounts = voAdvancesToBarber.paidCommissions.get(barber)
    if (discounts) {
      vnTotalBarberPaidCommissions = roundTwo(discounts.reduce((acc, el) => acc + el.value, 0))
      vnTotalBarberDiscounts += vnTotalBarberPaidCommissions
    }

    // GRUPO 3: Totalizar adelantos
    discounts = voAdvancesToBarber.advancePayment.get(barber)
    if (discounts) {
      vnTotalBarberAdvancePayment = roundTwo(discounts.reduce((acc, el) => acc + el.value, 0))
      vnTotalBarberDiscounts += vnTotalBarberAdvancePayment
    }

    // GRUPO 4: Totalizar propinas pagadas
    discounts = voAdvancesToBarber.paidTips.get(barber)
    if (discounts) {
      vnTotalBarberPaidTips = roundTwo(discounts.reduce((acc, el) => acc + el.value, 0))
    }

    // GRUPO 5: Totalizar bebidas consumidas
    discounts = voAdvancesToBarber.drinks.get(barber)
    if (discounts) {
      vnTotalBarberDrinks = roundTwo(discounts.reduce((acc, el) => acc + el.value, 0))
      vnTotalBarberDiscounts += vnTotalBarberDrinks
    }

    //$totalsTmp.querySelector(".barber-paid-commissions").innerText = vnTotalBarberPaidCommissions.toFixed(2)
    $totalsTmp.querySelector(".barber-paid-commissions-tmp").innerText = vnTotalBarberPaidCommissions.toFixed(2)
    //$totalsTmp.querySelector(".barber-advance-payments").innerText = vnTotalBarberAdvancePayment.toFixed(2)
    $totalsTmp.querySelector(".barber-advance-payments-tmp").innerText = vnTotalBarberAdvancePayment.toFixed(2)
    //$totalsTmp.querySelector(".barber-drinks").innerText = vnTotalBarberDrinks.toFixed(2)
    $totalsTmp.querySelector(".barber-drinks-tmp").innerText = vnTotalBarberDrinks.toFixed(2)
    $totalsTmp.querySelector(".barber-paid-tips").innerText = vnTotalBarberPaidTips.toFixed(2)
    //$totalsTmp.querySelector(".barber-pending-payment").innerText = (vnTotalBarberCommissions - vnTotalBarberDiscounts).toFixed(2)
    $totalsTmp.querySelector(".barber-pending-payment-tmp").innerText = (vnTotalBarberCommissionsTmp - vnTotalBarberDiscounts).toFixed(2)
    let $barberPendingTips = $totalsTmp.querySelector(".barber-pending-tips"),
      barberPendingTips = vnTotalBarberTips - vnTotalBarberPaidTips
    $barberPendingTips.innerText = barberPendingTips.toFixed(2)
    if (barberPendingTips.toFixed(2) !== "0.00") $barberPendingTips.classList.add("has-background-warning")
    $totalsTmp.querySelector(".barber").innerText = barber

    $fragment.appendChild($totalsTmp)
  })
  $paymentsDetails.innerHTML = "";
  $paymentsDetails.appendChild($fragment)

  // Totales
  d.querySelector(".search-sales").innerText = vnSearchSales.toFixed(2)
  ////d.querySelector(".search-barber-commissions").innerText = vnSearchBarberCommissions.toFixed(2)
  d.querySelector(".search-barber-commissions-tmp").innerText = vnSearchBarberCommissionsTmp.toFixed(2)
  d.querySelector(".search-sales-result").innerText = (vnSearchSales - vnSearchBarberCommissionsTmp).toFixed(2)
}
