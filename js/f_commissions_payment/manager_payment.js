import { dateTimeToKeyDateString, dateTimeToLocalString, hoyEC, inputDateToDateTime } from "../util/fecha-util.js";
import { db } from "../persist/firebase_conexion.js";
import { collections } from "../persist/firebase_collections.js";
import validAdminAccess from "../dom/manager_user.js";
import navbarBurgers from "../dom/navbar_burgers.js";
import NotificationBulma from '../dom/NotificacionBulma.js';
import { roundFour, roundTwo } from "../util/numbers-util.js";

const d = document,
  w = window,
  ntf = new NotificationBulma(),
  salesRef = db.ref(collections.sales),
  expensesRef = db.ref(collections.expenses)

const filters = {
  seller: "TODOS",
  period: "CURRENTWEEK"
}
//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

// EVENTO=load RAIZ=window 
w.addEventListener("load", () => search())

// EVENTO=DOMContentLoaded RAIZ=document ACCION: Termina de cargar el DOM
d.addEventListener("DOMContentLoaded", () => navbarBurgers())

// EVENTO=change RAIZ=button<search> ACCION=Realizar busqueda
d.getElementById("search").addEventListener("click", () => {
  let dateStart = d.getElementById("date-start").value,
    dateEnd = d.getElementById("date-end").value

  // NO se ha seleccionado al menos una fecha
  if (!dateStart && !dateEnd) {
    ntf.error("Información con errores", "Seleccione una fecha o un rango de fechas")
    search()
    return
  }

  if (!dateEnd) {
    dateEnd = dateStart
  } else if (!dateStart) {
    dateStart = dateEnd
  }

  // Validar rango y fecha maxima de consulta
  let dateTimeStart = inputDateToDateTime(dateStart),
    dateTimeEnd = inputDateToDateTime(dateEnd),
    hoy = hoyEC()
  if (dateTimeStart > hoy || dateTimeEnd > hoy) {
    ntf.error("Información con errores", "No puede seleccionar una fecha mayor a la actual")
  } else if (dateTimeStart > dateTimeEnd) {
    ntf.error("Información con errores", "La fecha del primer campo no puede ser mayor a la fecha del segundo campo")
  }

  // Si hay msj de error finaliza
  if (ntf.enabled) return

  // Desactivar los periodos delfiltro
  d.getElementsByName("period").forEach($el => $el.checked = false)
  delete filters.period
  filters.dateStart = dateTimeStart
  filters.dateEnd = dateTimeEnd
  search()
})

// EVENTO=change RAIZ=section<section> ACCION=detectar cambios en inputs 
d.getElementById("filters").addEventListener("change", e => {
  let $input = e.target
  if ($input.name === "seller") {
    filters.seller = $input.value
    search()
  } else if ($input.name === "period") {
    filters.period = $input.value
    // Setear valores de rango de fechas
    d.getElementById("date-start").value = ""
    d.getElementById("date-end").value = ""
    search()
  }
})

//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------

function search() {
  if (validAdminAccess()) {
    calculatePeriod()
    findExpenses()
  }
}

function renderCommissionsPayment() {
  const $rowTmp = d.getElementById("sale-row").content,
    $rowBarber = d.getElementById("sale-row-header").content,
    $totalsTmp = d.getElementById("sale-row-summary").content,
    $fragment = d.createDocumentFragment(),
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
    $clone,
    barbers = [...filters.barberSales.keys()]

  barbers.forEach(barber => {
    vnTotalTaxes = vnTotalTaxableIncome = vnTotalSales = vnTotalBarberCommissions = vnTotalBarberCommissionsTmp = vnTotalBarberTips = 0
    vnTotalBarberAdvancePayment = vnTotalBarberPaidCommissions = vnTotalBarberPaidTips = vnTotalBarberDrinks = vnTotalBarberDiscounts = 0
    ////console.log("barbero:", barber)

    // Encabezado con barbero de
    $rowBarber.querySelector(".barber").innerText = barber
    $clone = d.importNode($rowBarber, true)
    $fragment.appendChild($clone)

    // GRUPO 1: Agregar detalles de servicios y venta de productos
    const salesByBarber = filters.barberSales.get(barber) || []

    salesByBarber.forEach((sale, index) => {
      vnValueSale = roundTwo(sale.totalSale)
      vnTaxes = roundTwo(sale.taxes)
      vnTaxableIncome = roundTwo(sale.taxableIncome)
      vnBarberCommission = roundTwo(sale.barberCommission)
      // Temporalmente a los pagos con tarjeta de credito o debito la comision al valor final es igual a la de base imponib
      if (sale.typePayment === 'TCREDITO' || sale.typePayment === 'TDEBITO') {
        vnBarberCommissionTmp = vnBarberCommission
      } else {
        vnBarberCommissionTmp = roundFour(sale.barberCommission * 1.12)
      }
      // Tiene precedencia la propina con descuento datafast (tipByBankPayment), luego la propina
      // relacionada a una tx bancaria (bankTxValue) y por ultimo la registrada en la venta (tipByBank)
      // IMPORTANTE: Debe conincidir con el calculo en manager_daily_closing.js
      vnBarberTip = roundTwo(sale.tipByBankPayment || sale.bankTxValue || sale.tipByBank || 0)
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
      $rowTmp.querySelector(".payment").innerText = sale.typePayment
      $rowTmp.querySelector(".value").innerText = vnValueSale.toFixed(2)
      $rowTmp.querySelector(".taxes").innerText = sale.taxes.toFixed(2)
      $rowTmp.querySelector(".taxable-income").innerText = sale.taxableIncome.toFixed(2)
      $rowTmp.querySelector(".barber-commission").innerText = vnBarberCommission.toFixed(2)
      $rowTmp.querySelector(".barber-commission-tmp").innerText = vnBarberCommissionTmp.toFixed(2)
      $rowTmp.querySelector(".barber-tip").innerText = vnBarberTip > 0 ? vnBarberTip.toFixed(2) : ''
      $clone = d.importNode($rowTmp, true)
      $fragment.appendChild($clone)
    })

    // Agregar totales
    $totalsTmp.querySelector(".total-value").innerText = vnTotalSales.toFixed(2)
    $totalsTmp.querySelector(".total-taxes").innerText = vnTotalTaxes.toFixed(2)
    $totalsTmp.querySelector(".total-taxable-income").innerText = vnTotalTaxableIncome.toFixed(2)
    $totalsTmp.querySelector(".total-barber-commissions").innerText = vnTotalBarberCommissions.toFixed(2)
    $totalsTmp.querySelector(".total-barber-commissions-tmp").innerText = vnTotalBarberCommissionsTmp.toFixed(2)
    $totalsTmp.querySelector(".total-barber-tips").innerText = vnTotalBarberTips.toFixed(2)

    // GRUPO 2: Totalizar comisiones adelantadas y pagadas 
    let discounts = filters.barberPaidCommissions.get(barber)
    if (discounts) {
      vnTotalBarberPaidCommissions = roundTwo(discounts.reduce((acc, el) => acc + el.value, 0))
      vnTotalBarberDiscounts += vnTotalBarberPaidCommissions
    }

    // GRUPO 3: Totalizar adelantos
    discounts = filters.barberAdvancePayment.get(barber)
    if (discounts) {
      vnTotalBarberAdvancePayment = roundTwo(discounts.reduce((acc, el) => acc + el.value, 0))
      vnTotalBarberDiscounts += vnTotalBarberAdvancePayment
    }

    // GRUPO 4: Totalizar propinas pagadas
    discounts = filters.barberPaidTips.get(barber)
    if (discounts) {
      vnTotalBarberPaidTips = roundTwo(discounts.reduce((acc, el) => acc + el.value, 0))
    }

    // GRUPO 5: Totalizar bebidas consumidas
    discounts = filters.barberDrinks.get(barber)
    if (discounts) {
      vnTotalBarberDrinks = roundTwo(discounts.reduce((acc, el) => acc + el.value, 0))
      vnTotalBarberDiscounts += vnTotalBarberDrinks
    }

    $totalsTmp.querySelector(".barber-paid-commissions").innerText = vnTotalBarberPaidCommissions.toFixed(2)
    $totalsTmp.querySelector(".barber-paid-commissions-tmp").innerText = vnTotalBarberPaidCommissions.toFixed(2)
    $totalsTmp.querySelector(".barber-advance-payments").innerText = vnTotalBarberAdvancePayment.toFixed(2)
    $totalsTmp.querySelector(".barber-advance-payments-tmp").innerText = vnTotalBarberAdvancePayment.toFixed(2)
    $totalsTmp.querySelector(".barber-drinks").innerText = vnTotalBarberDrinks.toFixed(2)
    $totalsTmp.querySelector(".barber-drinks-tmp").innerText = vnTotalBarberDrinks.toFixed(2)
    $totalsTmp.querySelector(".barber-paid-tips").innerText = vnTotalBarberPaidTips.toFixed(2)
    $totalsTmp.querySelector(".barber-pending-payment").innerText = (vnTotalBarberCommissions - vnTotalBarberDiscounts).toFixed(2)
    $totalsTmp.querySelector(".barber-pending-payment-tmp").innerText = (vnTotalBarberCommissionsTmp - vnTotalBarberDiscounts).toFixed(2)
    $totalsTmp.querySelector(".barber-pending-tips").innerText = (vnTotalBarberTips - vnTotalBarberPaidTips).toFixed(2)
    $clone = d.importNode($totalsTmp, true)
    $fragment.appendChild($clone)
  })
  $paymentsDetails.innerHTML = "";
  $paymentsDetails.appendChild($fragment)

  // Agregar totales por consulta
  d.querySelector(".search-period").innerText = dateTimeToLocalString(filters.dateStart) + " al " + dateTimeToLocalString(filters.dateEnd)
  d.querySelector(".search-sales").innerText = vnSearchSales.toFixed(2)
  ////d.querySelector(".search-barber-commissions").innerText = vnSearchBarberCommissions.toFixed(2)
  d.querySelector(".search-barber-commissions-tmp").innerText = vnSearchBarberCommissionsTmp.toFixed(2)
  d.querySelector(".search-sales-result").innerText = "= " + (vnSearchSales - vnSearchBarberCommissionsTmp).toFixed(2)
}

function calculatePeriod() {
  if (!filters.period) return

  let baseDate = hoyEC()
  let truncPeriod = "month"
  switch (filters.period) {
    case "CURRENTMONTH":
      break
    case "CURRENTWEEK":
      truncPeriod = "week"
      break
    case "TODAY":
      truncPeriod = "day"
      break
    case "LASTWEEK":
      baseDate = baseDate.minus({ weeks: 1 })
      truncPeriod = "week"
      break
    case "LASTMONTH":
      baseDate = baseDate.minus({ months: 1 })
      break
  }
  filters.dateStart = baseDate.startOf(truncPeriod)
  filters.dateEnd = baseDate.endOf(truncPeriod)
}

// --------------------------
// Database operations
// --------------------------

async function findExpenses() {
  let rangeStart = dateTimeToKeyDateString(filters.dateStart),
    rangeEnd = dateTimeToKeyDateString(filters.dateEnd),
    arryTmp

  filters.barberAdvancePayment = new Map()
  filters.barberDrinks = new Map()
  filters.barberPaidCommissions = new Map()
  filters.barberPaidTips = new Map()
  filters.barberSales = new Map()

  await expensesRef.orderByKey().startAt(rangeStart + "T").endAt(rangeEnd + "\uf8ff").once('value')
    .then(snap => snap.forEach(child => {
      const dta = child.val()
      if (filters.seller === "TODOS" || filters.seller === dta.responsable) {
        switch (dta.type) {
          case 'ADELANTO':
            arryTmp = filters.barberAdvancePayment.get(dta.responsable) || []
            arryTmp.push(dta)
            filters.barberAdvancePayment.set(dta.responsable, arryTmp)
            break
          case 'BEBIDA':
            arryTmp = filters.barberDrinks.get(dta.responsable) || []
            arryTmp.push(dta)
            filters.barberDrinks.set(dta.responsable, arryTmp)
            break
          case 'COMISION':
            arryTmp = filters.barberPaidCommissions.get(dta.responsable) || []
            arryTmp.push(dta)
            filters.barberPaidCommissions.set(dta.responsable, arryTmp)
            break
          case 'PROPINA':
            arryTmp = filters.barberPaidTips.get(dta.responsable) || []
            arryTmp.push(dta)
            filters.barberPaidTips.set(dta.responsable, arryTmp)
            break
        }
      }
    }))
    .catch(error => ntf.tecnicalError("Busqueda de adelantos y comisiones pagadas con error", error))

  await salesRef.orderByKey().startAt(rangeStart + "T").endAt(rangeEnd + "\uf8ff").once('value')
    .then(snap => snap.forEach(child => {
      const dta = child.val()
      if (filters.seller === "TODOS" || filters.seller === dta.seller) {
        console.log(dta.responsable)
        arryTmp = filters.barberSales.get(dta.seller) || []
        arryTmp.push(child.val())
        filters.barberSales.set(dta.seller, arryTmp)
      }
    }))
    .catch(error => ntf.tecnicalError("Busqueda de ventas con error", error))

  renderCommissionsPayment()
}

