import { nowEc, todayEc, truncOperationDayString } from "./dom/fecha-util.js";
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
  totalSales: 0,
  shopping: 0,
  expenses: 0,
  advances: 0,
  deposits: 0,
  fit: 0,
  finalBalance: 0
}
let operationDay = todayEc(),
  dailyClosing = JSON.parse(JSON.stringify(dailyClosingInit))

// --------------------------
// Database operations
// --------------------------

const dbSalesByDay = async (filterDayString) => {
  let txtSearch = filterDayString
  const salesData = [],
    expensesData = [],
    depositsData = []

  await salesRef.orderByKey().startAt(txtSearch + "T").endAt(txtSearch + "\uf8ff")
    /////.orderByChild("searchDate").equalTo(txtSearch)
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

  await expensesRef.orderByKey().startAt(txtSearch + "T").endAt(txtSearch + "\uf8ff")
    .once('value')
    .then((snap) => {
      console.log(snap.toJSON())
      snap.forEach((child) => {
        expensesData.push(child.val())
      })
    })
    .catch((error) => {
      ntf.tecnicalError(`Búsqueda de compras/gastos del día ${operationDay.toLocaleDateString()}`, error)
    })
  await depositsRef.orderByKey().startAt(txtSearch + "T").endAt(txtSearch + "\uf8ff")
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



//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

// EVENTO=DOMContentLoaded RAIZ=document 
d.addEventListener("DOMContentLoaded", e => {
  navbarBurgers()
  changeDailyClosing()
})

// EVENTO=change RAIZ=document ACCION=cambio de fecha de operacion
d.addEventListener("change", e => {
  if (e.target.matches(".summary-day")) {
    operationDay = new Date(e.target.value)
    changeDailyClosing()
  }
})

// EVENTO=resize RAIZ=header ACCION=cambiar el menu hamburguesa
w.addEventListener("resize", e => {
  navbarBurgers()
})


//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------

function changeDailyClosing() {
  let filterDayString = truncOperationDayString(operationDay.getTime(), "day")
  console.log("operationDay=", operationDay, "filterDayString=", filterDayString,)
  d.querySelectorAll(".summary-day").forEach(($el) => $el.valueAsDate = operationDay)
  dailyClosing = JSON.parse(JSON.stringify(dailyClosingInit))
  dbSalesByDay(filterDayString)
}

function renderSections(salesData, expensesData, depositsData) {
  renderSummary(salesData)
  renderSummaryBySeller(salesData)
  renderExpenses(expensesData, depositsData)
  dailyCashClosing()
}

function renderSummary(salesData) {
  const $template = d.getElementById("sale-row").content,
    $fragment = d.createDocumentFragment(),
    $body = d.getElementById("summary-body"),
    $footer = d.getElementById("summary-footer")

  if (salesData.length == 0) {
    $body.innerHTML = `<tr><td class="is-size-6" colspan="8">No existen ventas para la fecha seleccionada</td></tr>`
    return
  }

  let vnTotalDiscounts = 0,
    vnTotalTaxes = 0,
    vnTotalTaxableIncome = 0,
    vnTotalCash = 0,
    vnTotalCard = 0,
    vnTotalSales = 0,
    vnDiscounts,
    vnTaxes,
    vnTaxableIncome,
    vnValueSale

  $body.innerHTML = ""

  salesData.forEach((sale, index) => {
    vnDiscounts = Math.round(parseFloat(sale.discounts) * 100) / 100
    vnTaxableIncome = Math.round(parseFloat(sale.taxableIncome) * 100) / 100
    vnTaxes = Math.round(parseFloat(sale.taxes) * 100) / 100
    vnValueSale = Math.round(parseFloat(sale.totalSale) * 100) / 100
    vnTotalDiscounts += vnDiscounts
    vnTotalTaxableIncome += vnTaxableIncome
    vnTotalTaxes += vnTaxes
    vnTotalSales += vnValueSale
    $template.querySelector(".index").innerText = index + 1
    $template.querySelector(".time").innerText = sale.searchDateTime.slice(-8)
    $template.querySelector(".seller").innerText = sale.seller
    $template.querySelector(".payment").innerText = sale.typePayment.toLowerCase()
    $template.querySelector(".discounts").innerText = parseFloat(vnDiscounts).toFixed(2)
    $template.querySelector(".taxable-income").innerText = parseFloat(vnTaxableIncome).toFixed(2)
    $template.querySelector(".taxes").innerText = parseFloat(vnTaxes).toFixed(2)
    $template.querySelector(".value").innerText = parseFloat(vnValueSale).toFixed(2)
    if (sale.typePayment === "EFECTIVO") {
      vnTotalCash += vnValueSale
    } else {
      vnTotalCard += vnValueSale
    }
    let $clone = d.importNode($template, true)
    $fragment.appendChild($clone)
  })
  $body.appendChild($fragment)
  $footer.querySelector(".total-discounts").innerText = vnTotalDiscounts.toFixed(2)
  $footer.querySelector(".total-taxable-income").innerText = vnTotalTaxableIncome.toFixed(2)
  $footer.querySelector(".total-taxes").innerText = vnTotalTaxes.toFixed(2)
  $footer.querySelector(".total-value").innerText = vnTotalSales.toFixed(2)
  $footer.querySelector(".total-cash").innerText = vnTotalCash.toFixed(2)
  $footer.querySelector(".total-card").innerText = vnTotalCard.toFixed(2)

  // Asignar valores al cierre diario
  dailyClosing.cardSales = vnTotalCard
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
    index = 1,
    vnTaxes,
    vnTaxableIncome,
    vnValueSale,
    $clone

  // aux bucle  
  let i = 0,
    sale = salesData[i],
    seller = sale.seller
  do {
    vnTaxableIncome = Math.round(parseFloat(sale.taxableIncome) * 100) / 100
    vnTaxes = Math.round(parseFloat(sale.taxes) * 100) / 100
    vnValueSale = Math.round(parseFloat(sale.totalSale) * 100) / 100
    vnTotalTaxableIncome += vnTaxableIncome
    vnTotalTaxes += vnTaxes
    vnTotalSales += vnValueSale
    $rowTmp.querySelector(".index").innerText = index
    $rowTmp.querySelector(".time").innerText = sale.searchDateTime.slice(-8)
    $rowTmp.querySelector(".taxable-income").innerText = vnTaxableIncome.toFixed(2)
    $rowTmp.querySelector(".taxes").innerText = vnTaxes.toFixed(2)
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

    // vrificar si cambia de vendedor o ya no existen registros
    item = data[++i]
    index++

    if (!item || type !== item.type) {// Cambio de vendedor
      $totalsTmp.querySelector(".type").innerText = `Total ${type.toLowerCase()}s`
      $totalsTmp.querySelector(".total").innerText = vnTotal.toFixed(2)
      $clone = d.importNode($totalsTmp, true)
      $fragment.appendChild($clone)
      switch (type) {//ADELANTO,AJUSTE,COMPRA,DEPOSITO,GASTO
        case "ADELANTO":
          dailyClosing.advances = vnTotal
          break;
        case "AJUSTE":
          dailyClosing.fit = vnTotal
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

function dailyCashClosing() {
  // Calcular saldo en caja
  dailyClosing.finalBalance = dailyClosing.initialBalance + dailyClosing.cashSales
    - dailyClosing.advances - dailyClosing.deposits - dailyClosing.shopping
    - dailyClosing.expenses
  if (dailyClosing.fit > 0) {
    dailyClosing.finalBalance += dailyClosing.fit
  } else {
    dailyClosing.finalBalance -= dailyClosing.fit
  }
  //Asignar valores
  let $contenedor = d.getElementById("daily-closing")
  $contenedor.querySelector(".initial-balance").innerText = dailyClosing.initialBalance.toFixed(2)
  $contenedor.querySelector(".cash-sales").innerText = dailyClosing.cashSales.toFixed(2)
  $contenedor.querySelector(".advances").innerText = dailyClosing.advances.toFixed(2)
  $contenedor.querySelector(".deposits").innerText = dailyClosing.deposits.toFixed(2)
  $contenedor.querySelector(".shopping").innerText = dailyClosing.shopping.toFixed(2)
  $contenedor.querySelector(".expenses").innerText = dailyClosing.expenses.toFixed(2)
  $contenedor.querySelector(".fit").innerText = dailyClosing.fit.toFixed(2)
  $contenedor.querySelector(".total-sales").innerText = dailyClosing.finalBalance.toFixed(2)
  $contenedor.querySelector(".card-sales").innerText = dailyClosing.cardSales.toFixed(2)

}