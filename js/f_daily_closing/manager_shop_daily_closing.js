import { compareTruncDay, dateIsValid, hoyEC, inputDateToDateTime, localStringToDateTime } from "../util/fecha-util.js";
import NotificationBulma from '../dom/NotificacionBulma.js';
import { roundFour, roundTwo } from "../util/numbers-util.js";
import { deleteSaleByUid } from "../f_sales/dao_selller_sales.js";
import { deleteExpenseByUid } from "../f_expenses/dao_cash_outflows.js";
import { deleteDepositByUid } from "../f_bank_transactions/dao_banking_transactions.js";
import { localdb } from "../repo-browser.js";
import { getShop, isAdmin } from "../dom/manager_user.js";
import { addMinMaxPropsWithCashOutflowDates, updateDailyData } from "../util/daily-data-cache.js";
import { findSalesExpensesBankTxsByDay, inyectBeforeAfterDailyCashClosing, insertDailyClosing, deleteDailyClosing } from "./dao_seller_daily_closing.js";
import { addOperators } from "../dom/manager_operators.js";

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
  update: false,
  shop: getShop().code
}
let dailyClosing


//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

// EVENTO=load RAIZ=window ACCION= Terminar de cargar la ventana
w.addEventListener("load", () => {
  enabledChangeDate()
  changeDailyClosing(hoyEC())
  if (!isAdmin()) {
    addMinMaxPropsWithCashOutflowDates(".summary-day")
  }
})

// EVENTO=DOMContentLoaded RAIZ=document 
d.addEventListener("DOMContentLoaded", () => {
  // Agregar vendedores
  addOperators(".responsables-container", null,
    () => { },
    () => ntf.errorAndLog(`No se pudo obtener la informacion de los responsables, 
  por favor intente nuevamente ingresando al sistema;
  si el problema continua, comuniquelo a Carlos Quinteros`))
})

// EVENTO=change RAIZ=document ACCION=cambio de fecha de operacion, y responsable de cierre de caja
d.addEventListener("click", e => {
  let $el = e.target

  // Actualizar la informacion del mismo dia
  if ($el.matches(".summary-day-update") || $el.closest(".summary-day-update")) {
    changeDailyClosing(dailyClosing.tmpDateTime)
  }

  // Eliminar venta 
  if ($el.matches(".sale-delete") || $el.closest(".sale-delete")) {
    const saleUid = $el.closest(".sale-delete").dataset.key
    deleteSale(saleUid)
  }

  // Eliminar egreso 
  if ($el.matches(".expense-delete") || $el.closest(".expense-delete")) {
    const expenseUid = $el.closest(".expense-delete").dataset.key
    deleteExpense(expenseUid)
  }

  //Guardar cierre diario
  if ($el.matches(".daily-closing-save") || $el.closest(".daily-closing-save")) {
    const $btnSave = e.target.closest(".daily-closing-save")
    if ($btnSave.disabled) {
      if ($btnSave.dataset.existBefore === "false") {
        ntf.validation("No puede realizar el cierre de caja porque no se ha realizado el cierre del dia anterior.")
      } else if ($btnSave.dataset.existAfter) {
        ntf.validation("No puede realizar el cierre de caja porque ya existe cierre de caja de dias posteriores.")
      }
    } else if (dailyClosing.tmpTipsAlert &&
      !confirm(`ALERTA: Existen propinas pagadas por un valor mayor a las registradas.
      Para guardar el cierre de caja de todas formas de clic <<Aceptar>>, 
      Para NO guardar el cierre de caja de clic en <<Cancelar>> `)) {
      return
    }

    if (ntf.enabled) return

    saveDailyClosing()
  }

  //Eliminar cierre diario
  if ($el.matches(".daily-closing-delete") || $el.closest(".daily-closing-delete")) {
    const $btnDelete = e.target.closest(".daily-closing-delete")
    if ($btnDelete.disabled) return

    if (!confirm(`ALERTA: Esta seguro de eliminar el cierre de caja del dia actual?`)) {
      return
    }

    removeDailyClosing()
  }

})

// EVENTO=change RAIZ=document ACCION=cambio de fecha de operacion, y responsable de cierre de caja
d.addEventListener("change", e => {
  let $input = e.target
  if ($input.matches(".summary-day") && dateIsValid($input.value)) {
    if (isAdmin()) {
      enabledChangeDate()
      changeDailyClosing(inputDateToDateTime($input.value))
    } else {
      changeDailyClosing()
    }
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
  // Validacion para habilitar la opcion de eliminacion de ventas y egresos
  const base = localStringToDateTime(localStorage.getItem(localdb.cashOutflowMinDay)),
    deletedEnabled = compareTruncDay(dailyClosing.tmpDateTime, "ge", base)

  renderSummary(salesData, deletedEnabled)
  // Se procesa primero los egresos porque se requiere data para las ventas por barbero
  renderExpenses(expensesData, depositsData, deletedEnabled)
  renderSummaryBySeller(salesData)
  // Consulta si existe los cierres de caja diario anterior y posterior, luego actualiza la vista
  inyectBeforeAfterDailyCashClosing(dailyClosing.tmpDateTime,
    (voBeforeClosingDay, voActualClosingDay, voAfterClosingDay) => renderDailyCashClosing(voBeforeClosingDay, voActualClosingDay, voAfterClosingDay),
    (vsClosingDay, error) => ntf.errorAndLog(`Busqueda de cierre diario del dia ${vsClosingDay}`, error))
}

function renderSummary(salesData, deletedEnabled) {
  const $fragment = d.createDocumentFragment(),
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
      let $saleRow = d.getElementById("sale-row").content.cloneNode(true)
      $saleRow.querySelector(".index").innerText = index + 1
      $saleRow.querySelector(".time").innerText = sale.searchDateTime.slice(-8)
      $saleRow.querySelector(".seller").innerText = sale.seller
      $saleRow.querySelector(".payment").innerText = sale.typePayment.toLowerCase().slice(0, 8)
      $saleRow.querySelector(".taxable-income").innerText = vnTaxableIncome.toFixed(2)
      $saleRow.querySelector(".taxes").innerText = vnTaxes.toFixed(2)
      if (sale.tmpTipByBank > 0) $saleRow.querySelector(".tips-by-bank").innerText = sale.tmpTipByBank.toFixed(2)
      $saleRow.querySelector(".value").innerText = vnValueSale.toFixed(2)
      $saleRow.querySelector(".barber-commission").innerText = sale.tmpBarberCommission.toFixed(2)
      $saleRow.querySelector(".barber-commission-tmp").innerText = sale.tmpBarberCommissionTmp.toFixed(2)
      if (deletedEnabled) {
        let $saleDelete = $saleRow.querySelector(".sale-delete")
        $saleDelete.classList.remove("is-hidden")
        $saleDelete.dataset.key = sale.tmpUid
      }

      if (sale.typePayment === "EFECTIVO") {
        vnTotalCash += vnValueSale
      } else if (sale.typePayment === "TRANSFERENCIA") {
        vnTotalTransfer += vnValueSale
      } else {
        vnTotalCard += vnValueSale
      }
      $fragment.appendChild($saleRow)
    })
    $body.innerHTML = ""
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
  const $fragment = d.createDocumentFragment(),
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
    vnPaidBarberTip

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
    let $rowTmp = d.getElementById("seller-row").content.cloneNode(true)
    $rowTmp.querySelector(".index").innerText = index
    $rowTmp.querySelector(".time").innerText = sale.searchDateTime.slice(-8)
    $rowTmp.querySelector(".seller").innerText = sale.seller
    $rowTmp.querySelector(".customer").innerText = sale.clientId === "9999999999999" ? "Cons Final" : sale.clientId
    $rowTmp.querySelector(".taxable-income").innerText = vnTaxableIncome.toFixed(2)
    $rowTmp.querySelector(".taxes").innerText = vnTaxes.toFixed(2)
    if (sale.tmpTipByBank > 0) $rowTmp.querySelector(".tips-by-bank").innerText = sale.tmpTipByBank.toFixed(2)
    $rowTmp.querySelector(".value").innerText = vnValueSale.toFixed(2)
    $rowTmp.querySelector(".barber-commission").innerText = sale.tmpBarberCommission.toFixed(2)
    $rowTmp.querySelector(".barber-commission-tmp").innerText = sale.tmpBarberCommissionTmp.toFixed(2)
    $fragment.appendChild($rowTmp)

    // verificar si cambia de vendedor o ya no existen registros
    sale = salesData[++i]
    index++

    if (!sale || seller !== sale.seller) {// Cambio de vendedor
      let $totalsTmp = d.getElementById("seller-totals").content.cloneNode(true)
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
      let pendingBarberTips = vnTotalBarberTips - vnPaidBarberTip,
        $pendingBarberTips = $totalsTmp.querySelector(".pending-barber-tips")
      $pendingBarberTips.innerText = (pendingBarberTips).toFixed(2)
      if (pendingBarberTips < 0) {
        // Alertar que se ha pagado propinas bancarias sin transaccion bancaria de sustento
        dailyClosing.tmpTipsAlert = true
        $pendingBarberTips.classList.add("has-background-danger")
      }
      $fragment.appendChild($totalsTmp)

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

function renderExpenses(expensesData, depositsData, deletedEnabled) {
  const $fragment = d.createDocumentFragment(),
    $body = d.getElementById("expenses-body")

  if (expensesData.length == 0 && depositsData.length == 0) {
    $body.innerHTML = `<tr><td class="is-size-6" colspan="6">No existen registros para la fecha seleccionada</td></tr>`
    return
  }

  expensesData.sort((a, b) => {
    if (a.type > b.type) return 1
    if (a.type < b.type) return -1
    return 0
  })

  let data = expensesData.concat(depositsData),
    vnTotal = 0,
    index = 1,
    vnValue,
    vnCommission,
    vnTip

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
    let $rowTmp = d.getElementById("expense-row").content.cloneNode(true)
    $rowTmp.querySelector(".index").innerText = index
    $rowTmp.querySelector(".type").innerText = item.type.toLowerCase()
    $rowTmp.querySelector(".responsable").innerText = item.responsable
    $rowTmp.querySelector(".voucher").innerText = item.voucher || "N/A"
    let $details = $rowTmp.querySelector(".details")
    $details.innerText = item.details || "N/A"
    $details.title = item.details || ""
    $rowTmp.querySelector(".value").innerText = vnValue.toFixed(2)
    if (deletedEnabled) {
      let $expenseDelete = $rowTmp.querySelector(".expense-delete")
      $expenseDelete.classList.remove("is-hidden")
      $expenseDelete.dataset.key = item.tmpUid
    }
    $fragment.appendChild($rowTmp)

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
      let $totalsTmp = d.getElementById("expense-totals").content.cloneNode(true)
      $totalsTmp.querySelector(".type").innerText = `Total ${type.toLowerCase()}s`
      $totalsTmp.querySelector(".total").innerText = vnTotal.toFixed(2)
      $fragment.appendChild($totalsTmp)
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
  $body.innerHTML = ""
  $body.appendChild($fragment)
}

function renderDailyCashClosing(voBeforeClosingDay, voActualClosingDay, voAfterClosingDay) {
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
  let $btnSave = d.querySelector(".daily-closing-save"),
    $btnDelete = d.querySelector(".daily-closing-delete")
  $btnSave.dataset.existBefore = voBeforeClosingDay ? true : false
  $btnSave.dataset.existAfter = voAfterClosingDay ? true : false
  $btnSave.setAttribute("disabled", true)
  $btnDelete.setAttribute("disabled", true)

  // Habilitar botones para guardar y eliminar
  if (voBeforeClosingDay && !voAfterClosingDay) {
    $btnSave.removeAttribute("disabled")
    // Existe el registro del cierre contable del dia seleccionado
    if (voActualClosingDay) {
      $btnDelete.removeAttribute("disabled")
    }
  }
}

function deleteSale(vsSaleUid) {
  if (confirm(`Esta seguro que desea eliminar la Venta ${vsSaleUid}`)) {
    deleteSaleByUid(vsSaleUid,
      (vsSaleUid) => {
        ntf.okey(`Venta eliminada correctamente: ${vsSaleUid}`)
        changeDailyClosing(dailyClosing.tmpDateTime)
      },
      error => ntf.errorAndLog("Venta NO eliminada", error))
  }
}

function deleteExpense(vsExpenseUid) {
  if (confirm(`Esta seguro que desea eliminar el Egreso ${vsExpenseUid}`)) {
    if (vsExpenseUid.includes("-DEP")) {
      deleteDepositByUid(vsExpenseUid,
        (vsDepositUid) => {
          ntf.okey(`Deposito eliminadao correctamente: ${vsDepositUid}`)
          changeDailyClosing(dailyClosing.tmpDateTime)
        },
        error => ntf.errorAndLog("Deposito NO eliminado", error))
    } else {
      deleteExpenseByUid(vsExpenseUid,
        (vsExpenseUid) => {
          ntf.okey(`Egreso eliminadao correctamente: ${vsExpenseUid}`)
          changeDailyClosing(dailyClosing.tmpDateTime)
        },
        error => ntf.errorAndLog("Egreso NO eliminado", error))
    }

  }
}

function saveDailyClosing() {
  if (!dailyClosing.responsable) {
    ntf.errors("Seleccione el responsable")
  }

  if (ntf.enabled) return

  // Insertar el cierre diario en la base de datos
  insertDailyClosing(dailyClosing,
    dateString => {
      // Actualiza el rango con fecha minima y maxima para registro de informacion de ingresos y egresos de caja
      updateDailyData()
      changeDailyClosing(dailyClosing.tmpDateTime)
      ntf.okey(`Cierre de caja diario registrado: ${dateString}`)
    },
    error => ntf.errorAndLog("Cierre de caja diario NO registrado", error))
}

function removeDailyClosing() {
  // elimina el cierre diario en la base de datos
  deleteDailyClosing(dailyClosing.tmpDateTime,
    dateString => {
      // Actualiza el rango con fecha minima y maxima para registro de informacion de ingresos y egresos de caja
      updateDailyData()
      ntf.okey(`Cierre de caja diario eliminado: ${dateString}`)
    },
    error => ntf.errorAndLog("Cierre de caja diario NO eliminado", error))
}

function enabledChangeDate() {
  //Habilita el boton de eliminacion de cierre de caja solo para administradores
  if (isAdmin()) {
    const $btnDelete = d.querySelector(".daily-closing-delete")
    $btnDelete.classList.remove("is-hidden")
  }
}

/**
function validAdminAccess() {

  if (isAdmin()) return true

  cleanControlAccess()

  let ask = true,
    res = false,
    keyIn
  do {
    keyIn = prompt("Acceso restringido para administrador, ingrese la clave:")
    res = keyIn && keyIn.startsWith(ADM_PW)
    if (res) {
      localStorage.setItem(localdb.accesskey, hoyEC().toFormat(FD))
      break
    } else {
      ask = confirm(`Acceso denegado - la clave no es valida.
      ¿Desea intentar con otra clave?`)
    }
  } while (ask)

  return res
}
 */