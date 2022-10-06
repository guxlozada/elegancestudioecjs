import { compareTruncDay, dateIsValid, hoyEC, inputDateToDateTime, localStringToDateTime } from "../util/fecha-util.js";
import navbarBurgers from "../dom/navbar_burgers.js";
import NotificationBulma from '../dom/NotificacionBulma.js';
import { roundFour, roundTwo } from "../util/numbers-util.js";
import { deleteSaleByUid } from "../f_sales/dao_selller_sales.js";
import { localdb } from "../repo-browser.js";
import { isAdmin } from "../dom/manager_user.js";
import { addMinMaxPropsWithCashOutflowDates, inyectDailyData, updateDailyData } from "../util/daily-data-cache.js";
import { findSalesExpensesBankTxsByDay, inyectBeforeAfterDailyCashClosing, saveDailyClosing } from "./dao_seller_daily_closing.js";

const d = document,
  w = window,
  ntf = new NotificationBulma()

const dailyClosingInit = {
  date: null,
  initialBalance: 0,
  cashSales: 0,
  cardSales: 0,
  transferSales: 0,
  totalSales: 0,
  shopping: 0,
  expenses: 0,
  advances: 0,
  deposits: 0,
  commissions: 0,
  salaries: 0,
  tipsByBank: 0,
  fit: 0,
  finalBalance: 0,
  update: false
}
let dailyClosing


//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

// EVENTO=load RAIZ=window ACCION= Terminar de cargar la ventana
w.addEventListener("load", () => {
  inyectDailyData()
  //TODO: Temporalmente desactivado restriccion de rango de fechas
  // if (!isAdmin()) {
  //   addMinMaxPropsWithCashOutflowDates(".summary-day")
  // }
  changeDailyClosing(hoyEC())
})

// EVENTO=DOMContentLoaded RAIZ=document ACCION: Termina de cargar el DOM
d.addEventListener("DOMContentLoaded", () => { navbarBurgers() })

// EVENTO=change RAIZ=document ACCION=cambio de fecha de operacion, y responsable de cierre de caja
d.addEventListener("click", e => {
  let $el = e.target

  // Actualizar la informacion del mismo dia
  if ($el.matches(".summary-day-update") || $el.closest(".summary-day-update")) {
    changeDailyClosing(dailyClosing.tmpDateTime)
  }

  // Eliminar venta 
  if ($el.matches(".sale-delete") || $el.closest(".sale-delete")) {
    const $link = $el.closest(".sale-delete"),
      saleUid = $link.dataset.key
    if (confirm(`Esta seguro que desea eliminar la Venta ${saleUid}`)) {
      deleteSaleByUid(saleUid,
        (saleUid) => {
          ntf.ok("venta eliminada", `Se elimino correctamente la Venta ${saleUid}`)
          changeDailyClosing(dailyClosing.tmpDateTime)
        },
        error => ntf.tecnicalError("No se pudo eliminar la venta", error))
    }
  }

  //Guardar cierre diario
  if ($el.matches(".daily-closing-save") || $el.closest(".daily-closing-save")) {
    const $btnSave = e.target.closest(".daily-closing-save")
    if ($btnSave.disabled) {
      if ($btnSave.dataset.existBefore === "false") {
        ntf.error("Cierre diario de caja", "No puede realizar el cierre de caja porque no se ha realizado el cierre del dia anterior.", 10000)
      } else if ($btnSave.dataset.existAfter) {
        ntf.error("Cierre diario de caja", "No puede realizar el cierre de caja porque ya existe cierre de caja de dias posteriores.", 10000)
      }
      return
    }
    if (!dailyClosing.responsable) {
      ntf.error("Informacion requerida", "Seleccione el responsable")
    } else {
      // Insertar el cierre diario en la base de datos
      saveDailyClosing(dailyClosing,
        dateString => {
          // Actualiza el rango con fecha minima y maxima para registro de informacion de ingresos y egresos de caja
          updateDailyData()
          changeDailyClosing(dailyClosing.tmpDateTime)
          ntf.ok("Cierre de caja diario registrado",
            `Se guardo correctamente la informacion del cierre diario del dia ${dateString}`)
        },
        error => ntf.tecnicalError("Cierre de caja diario no registrado", error))
    }
  }

})

// EVENTO=change RAIZ=document ACCION=cambio de fecha de operacion, y responsable de cierre de caja
d.addEventListener("change", e => {
  let $input = e.target
  if ($input.matches(".summary-day") && dateIsValid($input.value)) {
    changeDailyClosing(inputDateToDateTime($input.value))
  }
  if ($input.name === "responsable") {
    dailyClosing.responsable = $input.value
  }
})

//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------

function changeDailyClosing(vdDateTime) {
  dailyClosing = JSON.parse(JSON.stringify(dailyClosingInit))
  dailyClosing.tmpDateTime = vdDateTime ? vdDateTime.startOf("day") : hoyEC()
  d.querySelectorAll(".summary-day").forEach($el => $el.valueAsDate = dailyClosing.tmpDateTime.toJSDate())
  d.getElementsByName("responsable").forEach($el => $el.checked = false)
  localStorage.removeItem("COMMISSIONS")
  localStorage.removeItem("TIPS")

  // Consultar las ventas, egresos de caja y transacciones bancarias
  findSalesExpensesBankTxsByDay(dailyClosing.tmpDateTime,
    (salesData, expensesData, depositsData) => renderSections(salesData, expensesData, depositsData),
    (titleError, error) => ntf.tecnicalError(titleError, error))
}

function renderSections(salesData, expensesData, depositsData) {
  renderSummary(salesData)
  // Se procesa primero los egresos porque se requiere data para las ventas por barbero
  renderExpenses(expensesData, depositsData)
  renderSummaryBySeller(salesData)
  // Consulta si existe los cierres de caja diario anterior y posterior, luego actualiza la vista
  inyectBeforeAfterDailyCashClosing(dailyClosing.tmpDateTime,
    (voBeforeClosingDay, voAfterClosingDay) => renderDailyCashClosing(voBeforeClosingDay, voAfterClosingDay),
    (vsClosingDay, error) => ntf.tecnicalError(`Busqueda de cierre diario del dia ${vsClosingDay}`, error))
}

function renderSummary(salesData) {
  const $template = d.getElementById("sale-row").content,
    $fragment = d.createDocumentFragment(),
    $body = d.getElementById("summary-body"),
    $footer = d.getElementById("summary-footer")

  let vnTotalTaxes = 0,
    vnTotalTaxableIncome = 0,
    vnTotalCash = 0,
    vnTotalCard = 0,
    vnTotalTransfer = 0,
    vnTotalSales = 0,
    vnTotalTipsByBank = 0,
    vnTotalBarberCommissions = 0,
    vnTotalBarberCommissionsTmp = 0,
    vnTaxes,
    vnTaxableIncome,
    vnValueSale

  if (salesData.length == 0) {
    $body.innerHTML = `<tr><td class="is-size-6" colspan="8">No existen ventas para la fecha seleccionada</td></tr>`
  } else {

    // Validacion para habilitar la opcion de eliminacion de venta
    const base = localStringToDateTime(localStorage.getItem(localdb.cashOutflowMinDay)),
      deletedEnabled = compareTruncDay(dailyClosing.tmpDateTime, "ge", base)

    $body.innerHTML = ""

    salesData.forEach((sale, index) => {
      vnTaxableIncome = roundTwo(sale.taxableIncome)
      vnTaxes = roundTwo(sale.taxes)
      vnValueSale = roundTwo(sale.totalSale)
      // Tiene precedencia la propina con descuento datafast (paymentTip), luego la propina
      // relacionada a una tx bancaria registrada solo para propina (bankTxValue) y por ultimo
      // la registrada en la venta (tipByBank)
      // IMPORTANTE: Debe conincidir con el calculo en manager_payments.js
      sale.tmpTipByBank = roundTwo(sale.paymentTip || sale.bankTxValue || sale.tipByBank || 0)
      sale.tmpBarberCommission = roundTwo(sale.barberCommission)
      // Temporalmente a los pagos con tarjeta de credito o debito la comision al valor final es igual a la de base imponib
      if (sale.typePayment === 'TCREDITO' || sale.typePayment === 'TDEBITO') {
        sale.tmpBarberCommissionTmp = sale.tmpBarberCommission
      } else {
        sale.tmpBarberCommissionTmp = roundFour(sale.barberCommission * 1.12)
      }
      vnTotalTaxableIncome += vnTaxableIncome
      vnTotalTaxes += vnTaxes
      vnTotalSales += vnValueSale
      vnTotalTipsByBank += sale.tmpTipByBank
      vnTotalBarberCommissions += sale.tmpBarberCommission
      vnTotalBarberCommissionsTmp += sale.tmpBarberCommissionTmp
      $template.querySelector(".index").innerText = index + 1
      $template.querySelector(".time").innerText = sale.searchDateTime.slice(-8)
      $template.querySelector(".seller").innerText = sale.seller
      $template.querySelector(".payment").innerText = sale.typePayment.toLowerCase()
      $template.querySelector(".taxable-income").innerText = vnTaxableIncome.toFixed(2)
      $template.querySelector(".taxes").innerText = vnTaxes.toFixed(2)
      $template.querySelector(".tips-by-bank").innerText = sale.tmpTipByBank > 0 ? sale.tmpTipByBank.toFixed(2) : ''
      $template.querySelector(".value").innerText = vnValueSale.toFixed(2)
      $template.querySelector(".barber-commission").innerText = sale.tmpBarberCommission.toFixed(2)
      $template.querySelector(".barber-commission-tmp").innerText = sale.tmpBarberCommissionTmp.toFixed(2)
      let $removeSale = $template.querySelector(".sale-delete")
      if (deletedEnabled) {
        $removeSale.classList.remove("is-hidden")
        $removeSale.dataset.key = sale.tmpUid
      } else {
        $removeSale.classList.add("is-hidden")
        delete $removeSale.dataset.key
      }

      if (sale.typePayment === "EFECTIVO") {
        vnTotalCash += vnValueSale
      } else if (sale.typePayment === "TRANSFERENCIA") {
        vnTotalTransfer += vnValueSale
      } else {
        vnTotalCard += vnValueSale
      }
      let $clone = d.importNode($template, true)
      $fragment.appendChild($clone)
    })
    $body.appendChild($fragment)
  }
  $footer.querySelector(".total-taxable-income").innerText = vnTotalTaxableIncome.toFixed(2)
  $footer.querySelector(".total-taxes").innerText = vnTotalTaxes.toFixed(2)
  $footer.querySelector(".total-tips-by-bank").innerText = vnTotalTipsByBank.toFixed(2)
  $footer.querySelector(".total-value").innerText = vnTotalSales.toFixed(2)
  $footer.querySelector(".total-barber-commissions").innerText = vnTotalBarberCommissions.toFixed(2)
  $footer.querySelector(".total-barber-commissions-tmp").innerText = vnTotalBarberCommissionsTmp.toFixed(2)
  $footer.querySelector(".total-cash").innerText = vnTotalCash.toFixed(2)
  $footer.querySelector(".total-card").innerText = vnTotalCard.toFixed(2)
  $footer.querySelector(".total-transfer").innerText = vnTotalTransfer.toFixed(2)

  // Asignar valores al cierre diario
  dailyClosing.cardSales = vnTotalCard
  dailyClosing.transferSales = vnTotalTransfer
  dailyClosing.cashSales = vnTotalCash
  dailyClosing.totalSales = vnTotalSales
}

function renderSummaryBySeller(salesData) {
  const $rowTmp = d.getElementById("seller-row").content,
    $totalsTmp = d.getElementById("seller-totals").content,
    $fragment = d.createDocumentFragment(),
    $body = d.getElementById("seller-body")

  if (salesData.length == 0) {
    $body.innerHTML = `<tr><td class="is-size-6" colspan="6">No existen ventas para la fecha seleccionada</td></tr>`
    return
  }
  $body.innerHTML = ""

  salesData.sort((a, b) => {
    if (a.seller > b.seller) return 1
    if (a.seller < b.seller) return -1
    return 0
  })

  let vnTotalTaxes = 0,
    vnTotalTaxableIncome = 0,
    vnTotalSales = 0,
    vnTotalBarberTips = 0,
    vnTotalBarberCommissions = 0,
    vnTotalBarberCommissionsTmp = 0,
    index = 1,
    vnTaxes,
    vnTaxableIncome,
    vnValueSale,
    vnPaidBarberCommission,
    vnPaidBarberTip,
    $clone

  const barberCommissions = JSON.parse(localStorage.getItem("COMMISSIONS")) || {},
    barberTips = JSON.parse(localStorage.getItem("TIPS")) || {}

  // aux bucle  
  let i = 0,
    sale = salesData[i],
    seller = sale.seller
  do {
    vnTaxableIncome = roundTwo(sale.taxableIncome)
    vnTaxes = roundTwo(sale.taxes)
    vnValueSale = roundTwo(sale.totalSale)
    vnTotalTaxableIncome += vnTaxableIncome
    vnTotalTaxes += vnTaxes
    vnTotalSales += vnValueSale
    vnTotalBarberTips += sale.tmpTipByBank
    vnTotalBarberCommissions += sale.tmpBarberCommission
    vnTotalBarberCommissionsTmp += sale.tmpBarberCommissionTmp
    $rowTmp.querySelector(".index").innerText = index
    $rowTmp.querySelector(".time").innerText = sale.searchDateTime.slice(-8)
    $rowTmp.querySelector(".taxable-income").innerText = vnTaxableIncome.toFixed(2)
    $rowTmp.querySelector(".taxes").innerText = vnTaxes.toFixed(2)
    $rowTmp.querySelector(".tips-by-bank").innerText = sale.tmpTipByBank > 0 ? sale.tmpTipByBank.toFixed(2) : ''
    $rowTmp.querySelector(".value").innerText = vnValueSale.toFixed(2)
    $rowTmp.querySelector(".barber-commission").innerText = sale.tmpBarberCommission.toFixed(2)
    $rowTmp.querySelector(".barber-commission-tmp").innerText = sale.tmpBarberCommissionTmp.toFixed(2)
    $clone = d.importNode($rowTmp, true)
    $fragment.appendChild($clone)

    // verificar si cambia de vendedor o ya no existen registros
    sale = salesData[++i]
    index++

    if (!sale || seller !== sale.seller) {// Cambio de vendedor
      $totalsTmp.querySelector(".seller").innerText = seller
      $totalsTmp.querySelector(".total-taxable-income").innerText = vnTotalTaxableIncome.toFixed(2)
      $totalsTmp.querySelector(".total-taxes").innerText = vnTotalTaxes.toFixed(2)
      $totalsTmp.querySelector(".total-barber-tips").innerText = vnTotalBarberTips.toFixed(2)
      $totalsTmp.querySelector(".total-value").innerText = vnTotalSales.toFixed(2)
      $totalsTmp.querySelector(".total-barber-commissions").innerText = vnTotalBarberCommissions.toFixed(2)
      $totalsTmp.querySelector(".total-barber-commissions-tmp").innerText = vnTotalBarberCommissionsTmp.toFixed(2)
      vnPaidBarberCommission = parseFloat(barberCommissions[seller] || 0)
      vnPaidBarberTip = parseFloat(barberTips[seller] || 0)
      $totalsTmp.querySelector(".paid-barber-commissions").innerText = vnPaidBarberCommission.toFixed(2)
      $totalsTmp.querySelector(".paid-barber-commissions-tmp").innerText = vnPaidBarberCommission.toFixed(2)
      $totalsTmp.querySelector(".paid-barber-tips").innerText = vnPaidBarberTip.toFixed(2)
      $totalsTmp.querySelector(".pending-barber-commissions").innerText = (vnTotalBarberCommissions - vnPaidBarberCommission).toFixed(2)
      $totalsTmp.querySelector(".pending-barber-commissions-tmp").innerText = (vnTotalBarberCommissionsTmp - vnPaidBarberCommission).toFixed(2)
      $totalsTmp.querySelector(".pending-barber-tips").innerText = (vnTotalBarberTips - vnPaidBarberTip).toFixed(2)
      $clone = d.importNode($totalsTmp, true)
      $fragment.appendChild($clone)

      if (!sale) {
        break
      }
      // reset
      seller = sale.seller
      vnTotalTaxes = vnTotalTaxableIncome = vnTotalSales = vnTotalBarberTips = vnTotalBarberCommissions = vnTotalBarberCommissionsTmp = 0
      index = 1
    }
  } while (i < 1000)

  $body.appendChild($fragment)
}

function renderExpenses(expensesData, depositsData) {
  const $rowTmp = d.getElementById("expense-row").content,
    $totalsTmp = d.getElementById("expense-totals").content,
    $fragment = d.createDocumentFragment(),
    $body = d.getElementById("expenses-body")

  $body.innerHTML = ""
  let data = expensesData.concat(depositsData)

  if (data.length == 0) {
    $body.innerHTML = `<tr><td class="is-size-6" colspan="6">No existen registros para la fecha seleccionada</td></tr>`
    return
  }

  data.sort((a, b) => {
    if (a.type > b.type) return 1
    if (a.type < b.type) return -1
    return 0
  })

  let vnTotal = 0,
    index = 1,
    vnValue,
    vnCommission,
    vnTip,
    $clone

  const barberCommissions = {},
    barberTips = {}

  // aux bucle  
  let i = 0,
    item = data[i],
    type = item.type
  do {
    vnValue = roundTwo(item.value)
    vnCommission = roundTwo(item.barberCommission)
    vnTotal += vnValue
    $rowTmp.querySelector(".index").innerText = index
    $rowTmp.querySelector(".type").innerText = item.type.toLowerCase()
    $rowTmp.querySelector(".responsable").innerText = item.responsable
    $rowTmp.querySelector(".voucher").innerText = item.voucher || "N/A"
    $rowTmp.querySelector(".details").innerText = item.details || "N/A"
    $rowTmp.querySelector(".details").title = item.details || ""
    $rowTmp.querySelector(".value").innerText = vnValue.toFixed(2)
    $clone = d.importNode($rowTmp, true)
    $fragment.appendChild($clone)

    if (type === 'COMISION') {
      vnCommission = (barberCommissions[item.responsable] || 0) + item.value
      barberCommissions[item.responsable] = vnCommission
    } else if (type === 'PROPINA') {
      vnTip = (barberTips[item.responsable] || 0) + item.value
      barberTips[item.responsable] = vnTip
    }

    // verificar si cambia el tipo de ingreso/egreso o ya no existen registros
    item = data[++i]
    index++

    if (!item || type !== item.type) {// Cambio de tipo de ingreso/egreso
      $totalsTmp.querySelector(".type").innerText = `Total ${type.toLowerCase()}s`
      $totalsTmp.querySelector(".total").innerText = vnTotal.toFixed(2)
      $clone = d.importNode($totalsTmp, true)
      $fragment.appendChild($clone)
      switch (type) {//ADELANTO,AJUSTE,COMPRA,DEPOSITO,GASTO,COMISION, SUELDO
        case "ADELANTO":
          dailyClosing.advances = vnTotal
          break;
        case "AJUSTE":
          dailyClosing.fit = vnTotal
          break;
        case "COMISION":
          dailyClosing.commissions = vnTotal
          localStorage.setItem("COMMISSIONS", JSON.stringify(barberCommissions))
          break;
        case "COMPRA":
          dailyClosing.shopping = vnTotal
          break;
        case "DEPOSITO":
          dailyClosing.deposits = vnTotal
          break;
        case "GASTO":
          dailyClosing.expenses = vnTotal
          break;
        case "SUELDO":
          dailyClosing.salaries = vnTotal
          break;
        case "PROPINA":
          dailyClosing.tipsByBank = vnTotal
          localStorage.setItem("TIPS", JSON.stringify(barberTips))
          break;
        default:
          break;
      }

      if (!item) {
        break
      }
      // reset
      type = item.type
      vnTotal = 0
      index = 1
    }
  } while (i < 1000)

  $body.appendChild($fragment)
}

function renderDailyCashClosing(voBeforeClosingDay, voAfterClosingDay) {
  dailyClosing.initialBalance = voBeforeClosingDay ? voBeforeClosingDay.finalBalance : 0

  // Calcular saldo en caja
  dailyClosing.finalBalance = dailyClosing.initialBalance + dailyClosing.cashSales + dailyClosing.fit
    - dailyClosing.advances - dailyClosing.deposits - dailyClosing.shopping
    - dailyClosing.expenses - dailyClosing.commissions - dailyClosing.salaries - dailyClosing.tipsByBank

  dailyClosing.finalBalance = roundTwo(dailyClosing.finalBalance)
  //Asignar valores
  let $contenedor = d.getElementById("daily-closing")
  $contenedor.querySelector(".initial-balance").innerText = dailyClosing.initialBalance.toFixed(2)
  $contenedor.querySelector(".cash-sales").innerText = dailyClosing.cashSales.toFixed(2)
  $contenedor.querySelector(".advances").innerText = dailyClosing.advances.toFixed(2)
  $contenedor.querySelector(".deposits").innerText = dailyClosing.deposits.toFixed(2)
  $contenedor.querySelector(".shopping").innerText = dailyClosing.shopping.toFixed(2)
  $contenedor.querySelector(".expenses").innerText = dailyClosing.expenses.toFixed(2)
  $contenedor.querySelector(".commissions").innerText = dailyClosing.commissions.toFixed(2)
  $contenedor.querySelector(".salaries").innerText = dailyClosing.salaries.toFixed(2)
  $contenedor.querySelector(".tips-by-bank").innerText = dailyClosing.tipsByBank.toFixed(2)
  $contenedor.querySelector(".fit").innerText = dailyClosing.fit.toFixed(2)
  $contenedor.querySelector(".total-sales").innerText = dailyClosing.finalBalance.toFixed(2)
  $contenedor.querySelector(".card-sales").innerText = dailyClosing.cardSales.toFixed(2)
  $contenedor.querySelector(".transfer-sales").innerText = dailyClosing.transferSales.toFixed(2)
  let $btnSave = d.querySelector(".daily-closing-save")
  $btnSave.dataset.existBefore = voBeforeClosingDay ? true : false
  $btnSave.dataset.existAfter = voAfterClosingDay ? true : false
  if (!voBeforeClosingDay || voAfterClosingDay) {
    $btnSave.setAttribute("disabled", true)
  } else {
    $btnSave.removeAttribute("disabled")
  }
}
