import { addHours, dateIsValid, nowEc, timestampEc, todayEc, truncOperationDayString } from "./dom/fecha-util.js";
import { sellerDB } from "./dom/firebase_collections.js";
import { db } from "./dom/firebase_conexion.js";
import navbarBurgers from "./dom/navbar_burgers.js";
import NotificationBulma from './dom/NotificacionBulma.js';

const d = document,
  w = window,
  ntf = new NotificationBulma(),
  salesRef = db.ref(sellerDB.sales),
  expensesRef = db.ref(sellerDB.expenses),
  depositsRef = db.ref(sellerDB.deposits),
  dailyClosingRef = db.ref(sellerDB.dailyClosing)

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
let operationDay = todayEc(),
  dailyClosing = JSON.parse(JSON.stringify(dailyClosingInit))


//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

// EVENTO=DOMContentLoaded RAIZ=document 
d.addEventListener("DOMContentLoaded", e => {
  navbarBurgers()
  changeDailyClosing()
})

// EVENTO=click RAIZ=section<daily-closing> ACCION=Guardar cierre diario
d.querySelector(".daily-closing .card-footer").addEventListener("click", e => {
  let $el = e.target
  if ($el.matches(".daily-closing-save") || $el.closest(".daily-closing-save")) {
    const $btnSave = e.target.closest(".daily-closing-save")
    if ($btnSave.disabled) {
      if ($btnSave.dataset.existBefore === "false") {
        ntf.error("Cierre diario de caja", "No puede realizar el cierre de caja porque no se ha realizado el cierre del día anterior.", 10000)
      } else if ($btnSave.dataset.existAfter) {
        ntf.error("Cierre diario de caja", "No puede realizar el cierre de caja porque ya existe cierre de caja de dias posteriores.", 10000)
      }
      return
    }
    if (!dailyClosing.responsable) {
      ntf.error("Información requerida", "Seleccione el responsable")
    } else {
      // Insertar el cierre diario en la base de datos
      saveDailyClosing()
    }
  }

})

// EVENTO=change RAIZ=document ACCION=cambio de fecha de operacion, y responsable de cierre de caja
d.addEventListener("change", e => {
  let $input = e.target
  /*   if (e.target.matches("#initial-balance")) {
      dailyClosing.initialBalance = parseFloat(e.target.value)
      dailyClosing.update = true
    } */
  if ($input.matches(".summary-day")) {
    if (dateIsValid($input.value)) {
      operationDay = new Date($input.value)
      changeDailyClosing()
    }
    return
  }
  if ($input.name === "responsable") {
    dailyClosing.responsable = $input.value
  }
})

/* d.getElementById("initial-balance").addEventListener("focusout", e => {
  // Si existe cambios en cantidad o descuento de items, se actualiza el carrito 
  if (dailyClosing.update) {
    dailyClosing.update = false
    dailyCashClosing()
  }
}) */

// EVENTO=resize RAIZ=header ACCION=cambiar el menu hamburguesa
w.addEventListener("resize", e => {
  navbarBurgers()
})

//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------

function changeDailyClosing() {
  d.querySelectorAll(".summary-day").forEach(($el) => $el.valueAsDate = operationDay)
  dailyClosing = JSON.parse(JSON.stringify(dailyClosingInit))
  let filterDayString = truncOperationDayString(operationDay.getTime(), "date")
  ////console.log("operationDay=", operationDay, "filterDayString=", filterDayString,)
  updateSalesByDay(filterDayString)
}

async function updateSalesByDay(vsDate) {
  const salesData = [],
    expensesData = [],
    depositsData = []

  await salesRef.orderByKey().startAt(vsDate + "T").endAt(vsDate + "\uf8ff")
    /////.orderByChild("searchDate").equalTo(vsDate)
    .once('value')
    .then((snap) => {
      console.log(snap.toJSON())
      snap.forEach((child) => {
        salesData.push(child.val())
      })
    })
    .catch((error) => {
      ntf.tecnicalError(`Búsqueda de ventas del día ${operationDay.toLocaleDateString()}`, error)
    })

  await expensesRef.orderByKey().startAt(vsDate + "T").endAt(vsDate + "\uf8ff")
    .once('value')
    .then((snap) => {
      console.log(snap.toJSON())
      snap.forEach((child) => {
        expensesData.push(child.val())
      })
    })
    .catch((error) => {
      ntf.tecnicalError(`Búsqueda de ingresos/egresos del día ${operationDay.toLocaleDateString()}`, error)
    })
  await depositsRef.orderByKey().startAt(vsDate + "T").endAt(vsDate + "\uf8ff")
    .once('value')
    .then((snap) => {
      console.log(snap.toJSON())
      snap.forEach((child) => {
        depositsData.push(child.val())
      })
    })
    .catch((error) => {
      ntf.tecnicalError(`Búsqueda de depositos del día ${operationDay.toLocaleDateString()}`, error)
    })

  renderSections(salesData, expensesData, depositsData)
}

function renderSections(salesData, expensesData, depositsData) {
  renderSummary(salesData)
  renderSummaryBySeller(salesData)
  renderExpenses(expensesData, depositsData)
  updateDailyCashClosing()
}

function renderSummary(salesData) {
  const $template = d.getElementById("sale-row").content,
    $fragment = d.createDocumentFragment(),
    $body = d.getElementById("summary-body"),
    $footer = d.getElementById("summary-footer")

  let vnTotalDiscounts = 0,
    vnTotalTaxes = 0,
    vnTotalTaxableIncome = 0,
    vnTotalCash = 0,
    vnTotalCard = 0,
    vnTotalTransfer = 0,
    vnTotalSales = 0,
    vnTotalTipsByBank = 0,
    vnDiscounts,
    vnTaxes,
    vnTaxableIncome,
    vnValueSale,
    vnTipByBank

  if (salesData.length == 0) {
    $body.innerHTML = `<tr><td class="is-size-6" colspan="8">No existen ventas para la fecha seleccionada</td></tr>`
  } else {

    $body.innerHTML = ""

    salesData.forEach((sale, index) => {
      vnDiscounts = Math.round(parseFloat(sale.discounts) * 100) / 100
      vnTaxableIncome = Math.round(parseFloat(sale.taxableIncome) * 100) / 100
      vnTaxes = Math.round(parseFloat(sale.taxes) * 100) / 100
      vnValueSale = Math.round(parseFloat(sale.totalSale) * 100) / 100
      vnTipByBank = Math.round(parseFloat(sale.tipByBank || 0) * 100) / 100
      vnTotalDiscounts += vnDiscounts
      vnTotalTaxableIncome += vnTaxableIncome
      vnTotalTaxes += vnTaxes
      vnTotalSales += vnValueSale
      vnTotalTipsByBank += vnTipByBank
      $template.querySelector(".index").innerText = index + 1
      $template.querySelector(".time").innerText = sale.searchDateTime.slice(-8)
      $template.querySelector(".seller").innerText = sale.seller
      $template.querySelector(".payment").innerText = sale.typePayment.toLowerCase()
      $template.querySelector(".discounts").innerText = parseFloat(vnDiscounts).toFixed(2)
      $template.querySelector(".taxable-income").innerText = parseFloat(vnTaxableIncome).toFixed(2)
      $template.querySelector(".taxes").innerText = parseFloat(vnTaxes).toFixed(2)
      $template.querySelector(".tips-by-bank").innerText = parseFloat(vnTipByBank).toFixed(2)
      $template.querySelector(".value").innerText = parseFloat(vnValueSale).toFixed(2)
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
  $footer.querySelector(".total-discounts").innerText = vnTotalDiscounts.toFixed(2)
  $footer.querySelector(".total-taxable-income").innerText = vnTotalTaxableIncome.toFixed(2)
  $footer.querySelector(".total-taxes").innerText = vnTotalTaxes.toFixed(2)
  $footer.querySelector(".total-tips-by-bank").innerText = vnTotalTipsByBank.toFixed(2)
  $footer.querySelector(".total-value").innerText = vnTotalSales.toFixed(2)
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
    vnTotalTipsByBank = 0,
    index = 1,
    vnTaxes,
    vnTaxableIncome,
    vnValueSale,
    vnTipByBank,
    $clone

  // aux bucle  
  let i = 0,
    sale = salesData[i],
    seller = sale.seller
  do {
    vnTaxableIncome = Math.round(parseFloat(sale.taxableIncome) * 100) / 100
    vnTaxes = Math.round(parseFloat(sale.taxes) * 100) / 100
    vnTipByBank = Math.round(parseFloat(sale.tipByBank || 0) * 100) / 100
    vnValueSale = Math.round(parseFloat(sale.totalSale) * 100) / 100
    vnTotalTaxableIncome += vnTaxableIncome
    vnTotalTaxes += vnTaxes
    vnTotalTipsByBank += vnTipByBank
    vnTotalSales += vnValueSale
    $rowTmp.querySelector(".index").innerText = index
    $rowTmp.querySelector(".time").innerText = sale.searchDateTime.slice(-8)
    $rowTmp.querySelector(".taxable-income").innerText = vnTaxableIncome.toFixed(2)
    $rowTmp.querySelector(".taxes").innerText = vnTaxes.toFixed(2)
    $rowTmp.querySelector(".tips-by-bank").innerText = vnTipByBank.toFixed(2)
    $rowTmp.querySelector(".value").innerText = vnValueSale.toFixed(2)
    $clone = d.importNode($rowTmp, true)
    $fragment.appendChild($clone)

    // vrificar si cambia de vendedor o ya no existen registros
    sale = salesData[++i]
    index++

    if (!sale || seller !== sale.seller) {// Cambio de vendedor
      $totalsTmp.querySelector(".seller").innerText = seller
      $totalsTmp.querySelector(".total-taxable-income").innerText = vnTotalTaxableIncome.toFixed(2)
      $totalsTmp.querySelector(".total-taxes").innerText = vnTotalTaxes.toFixed(2)
      $totalsTmp.querySelector(".total-tips-by-bank").innerText = vnTotalTipsByBank.toFixed(2)
      $totalsTmp.querySelector(".total-value").innerText = vnTotalSales.toFixed(2)
      $clone = d.importNode($totalsTmp, true)
      $fragment.appendChild($clone)

      if (!sale) {
        break
      }
      // reset
      seller = sale.seller
      vnTotalTaxes = vnTotalTaxableIncome = vnTotalSales = 0
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
    $clone

  // aux bucle  
  let i = 0,
    item = data[i],
    type = item.type
  do {
    vnValue = Math.round(parseFloat(item.value) * 100) / 100
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

async function updateDailyCashClosing() {
  const beforeKey = truncOperationDayString(addHours(operationDay, -24).getTime(), "date")
  const afterKey = truncOperationDayString(addHours(operationDay, 24).getTime(), "date")

  let beforeDay = await dailyClosingRef.child(beforeKey).get()
    .then((snapshot) => snapshot.exists() ? snapshot.val() : null)
    .catch((error) => ntf.tecnicalError(`Búsqueda de cierre diario del día ${beforeKey}`, error))
  let afterDay = await dailyClosingRef.child(afterKey).get()
    .then((snapshot) => snapshot.exists() ? snapshot.val() : null)
    .catch((error) => ntf.tecnicalError(`Búsqueda de cierre diario del día ${afterKey}`, error))

  renderDailyCashClosing(beforeDay, afterDay)
}

function renderDailyCashClosing(beforeDay, afterDay) {
  dailyClosing.initialBalance = beforeDay ? beforeDay.finalBalance : 0

  // Calcular saldo en caja
  dailyClosing.finalBalance = dailyClosing.initialBalance + dailyClosing.cashSales
    - dailyClosing.advances - dailyClosing.deposits - dailyClosing.shopping
    - dailyClosing.expenses - dailyClosing.commissions - dailyClosing.salaries - dailyClosing.tipsByBank
  if (dailyClosing.fit > 0) {
    dailyClosing.finalBalance += dailyClosing.fit
  } else {
    dailyClosing.finalBalance -= dailyClosing.fit
  }
  dailyClosing.finalBalance = Math.round(dailyClosing.finalBalance * 100) / 100
  //Asignar valores
  let $contenedor = d.getElementById("daily-closing")
  $contenedor.querySelector(".initial-balance").innerText = dailyClosing.initialBalance.toFixed(2)
  //$contenedor.querySelector(".initial-balance").value = dailyClosing.initialBalance.toFixed(2)
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
  $btnSave.dataset.existBefore = beforeDay ? true : false
  $btnSave.dataset.existAfter = afterDay ? true : false
  if (!beforeDay || afterDay) {
    $btnSave.setAttribute("disabled", true)
  } else {
    $btnSave.removeAttribute("disabled")
  }
}

// --------------------------
// Database operations
// --------------------------

function saveDailyClosing() {
  // Generar la clave de la nueva venta
  const dailyKey = truncOperationDayString(operationDay.getTime(), "date")
  console.log("dailyKey=", dailyKey)
  db.ref(sellerDB.dailyClosing + "/" + dailyKey).set(dailyClosing).then((snapshot) => {
    if (snapshot && snapshot.exists()) {
      console.log(snapshot.val());
    } else {
      console.log("No data available");
    }
    ntf.show("Cierre de caja diario", `Se guardó correctamente la información del cierre diario del día ${operationDay.toLocaleDateString()}`)
  }).catch((error) => {
    ntf.tecnicalError(`Registro de cierre diario del día ${operationDay.toLocaleDateString()}`, error)
  })
}