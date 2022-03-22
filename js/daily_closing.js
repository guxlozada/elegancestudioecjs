import { nowEc, todayEc, truncOperationDayString } from "./dom/fecha-util.js";
import { sellerDB } from "./dom/firebase_collections.js";
import { db } from "./dom/firebase_conexion.js";
import navbarBurgers from "./dom/navbar_burgers.js";
import NotificationBulma from './dom/NotificacionBulma.js';

const d = document,
  w = window,
  ntf = new NotificationBulma(),
  salesRef = db.ref(sellerDB.sales),
  salesDetailsRef = db.ref(sellerDB.salesDetails),
  $summaryBody = d.getElementById("summary-body"),
  $summaryFooter = d.getElementById("summary-footer")

let operationDay = todayEc(),
  filterDayString

// --------------------------
// Database operations
// --------------------------

const searchByDay = async (vsSearch) => {
  let txtSearch = filterDayString
  console.log("txtSearch", txtSearch)
  const salesData = []
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
      ntf.tecnicalError("Búsqueda de ventas", error)
    })

  renderSections(salesData)
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
  filterDayString = truncOperationDayString(operationDay.getTime(), "day")
  console.log("operationDay=", operationDay, "filterDayString=", filterDayString,)
  d.querySelectorAll(".summary-day").forEach(($el) => $el.valueAsDate = operationDay)
  searchByDay()
}

function renderSections(salesDB) {
  renderSummary(salesDB)
}

function renderSummary(salesDB) {
  $summaryBody.innerHTML = ""
  const $template = d.getElementById("summary-row").content,
    $fragment = d.createDocumentFragment();
  let vnDiscounts = 0,
    vnTaxes = 0,
    vnTaxableIncome = 0,
    vnTotalCash = 0,
    vnTotalCard = 0,
    vnTotalSales = 0,
    discounts,
    taxes,
    taxableIncome,
    totalSale

  salesDB.forEach((sale, index) => {
    discounts = Math.round(parseFloat(sale.discounts) * 100) / 100
    taxableIncome = Math.round(parseFloat(sale.taxableIncome) * 100) / 100
    taxes = Math.round(parseFloat(sale.taxes) * 100) / 100
    totalSale = Math.round(parseFloat(sale.totalSale) * 100) / 100
    vnDiscounts += discounts
    vnTaxableIncome += taxableIncome
    vnTaxes += taxes
    vnTotalSales += totalSale
    $template.querySelector(".summary-index").innerText = index + 1
    $template.querySelector(".summary-time").innerText = sale.searchDateTime.slice(-8)
    $template.querySelector(".summary-seller").innerText = sale.seller
    $template.querySelector(".summary-payment").innerText = sale.typePayment.toLowerCase()
    $template.querySelector(".summary-discounts").innerText = parseFloat(discounts).toFixed(2)
    $template.querySelector(".summary-taxable-income").innerText = parseFloat(taxableIncome).toFixed(2)
    $template.querySelector(".summary-taxes").innerText = parseFloat(taxes).toFixed(2)
    $template.querySelector(".summary-value").innerText = parseFloat(totalSale).toFixed(2)

    if (sale.typePayment === "EFECTIVO") {
      vnTotalCash += totalSale
    } else {
      vnTotalCard += totalSale
    }
    let $clone = d.importNode($template, true)
    $fragment.appendChild($clone)
  })
  $summaryBody.appendChild($fragment)

  $summaryFooter.querySelector(".summary-f-discounts").innerText = vnDiscounts.toFixed(2)
  $summaryFooter.querySelector(".summary-f-taxable-income").innerText = vnTaxableIncome.toFixed(2)
  $summaryFooter.querySelector(".summary-f-taxes").innerText = vnTaxes.toFixed(2)
  $summaryFooter.querySelector(".summary-f-value").innerText = vnTotalSales.toFixed(2)
  $summaryFooter.querySelector(".summary-f-cash").innerText = vnTotalCash.toFixed(2)
  $summaryFooter.querySelector(".summary-f-card").innerText = vnTotalCard.toFixed(2)
}