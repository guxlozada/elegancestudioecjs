import { dateIsValid, dateTimeToKeyDateString, hoyEC, inputDateToDateTime } from "./fecha-util.js";
import { sellerDB } from "./firebase_collections.js";
import { db } from "./firebase_conexion.js";
import validAdminAccess, { cleanAdminAccess } from "./manager_user.js";
import navbarBurgers from "./navbar_burgers.js";
import NotificationBulma from './NotificacionBulma.js';

const d = document,
  w = window,
  ntf = new NotificationBulma(),
  bankRef = db.ref(sellerDB.bankReconciliation)

const filters = {
  typePayment: "TODOS",
  period: "LASTWEEK",
  periodStart: null,
  periodEnd: null,
  dateStart: null,
  dateEnd: null
}
//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

// EVENTO=load RAIZ=window 
w.addEventListener("load", e => {
  search()
})

// EVENTO=unload RAIZ=window 
w.addEventListener("unload", e => {
  cleanAdminAccess()
})

// EVENTO=DOMContentLoaded RAIZ=document ACCION: Termina de cargar el DOM
d.addEventListener("DOMContentLoaded", e => {
  navbarBurgers()
})

// EVENTO=change RAIZ=section<section> ACCION=detectar cambios en inputs 
d.getElementById("filters").addEventListener("change", e => {
  let $input = e.target
  if ($input.name === "typePayment") {
    filters.typePayment = $input.value
    search()
  } else if ($input.name === "period") {
    filters.period = $input.value
    filters.dateStart = null
    filters.dateEnd = null
    search()
  } else if ($input.name === "dateStart" && dateIsValid($input.value)) {
    filters.dateStart = inputDateToDateTime($input.value)
  } else if ($input.name === "dateEnd" && dateIsValid($input.value)) {
    filters.dateEnd = inputDateToDateTime($input.value)
  }
})

d.getElementById("search").addEventListener("click", e => {
  search()
})

//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------

function search() {
  if (validAdminAccess()) {
    calculatePeriod()
    findBankTransactions()
  }
}

function renderBankTransactions(transactions) {
  const $rowTmp = d.getElementById("bank-tx-row").content,
    $totalsTmp = d.getElementById("bank-tx-totals").content,
    $fragment = d.createDocumentFragment(),
    $transactionsDetails = d.getElementById("bank-transactions")

  let vnTotalTx = 0,
    $clone

  transactions.forEach((trans, index) => {
    // Total por Consulta
    vnTotalTx += trans.value
    $rowTmp.querySelector(".index").innerText = index + 1
    $rowTmp.querySelector(".date").innerText = trans.searchDateTime
    $rowTmp.querySelector(".responsable").innerText = trans.responsable
    $rowTmp.querySelector(".type-payment").innerText = trans.type

    if (trans.saleUid) {
      $rowTmp.querySelector(".sale-value").innerText = trans.saleValue ? trans.saleValue.toFixed(2) : trans.value.toFixed(2)
      $rowTmp.querySelector(".sale-value").title = "Id Venta:" + (trans.saleUid ? trans.saleUid : "")
    } else {
      $rowTmp.querySelector(".sale-value").innerText = ""
    }
    $rowTmp.querySelector(".datafast-commission").innerText = trans.dfCommission ? trans.dfCommission.toFixed(4) : ""
    $rowTmp.querySelector(".datafast-iva").innerText = trans.dfTaxWithholdingIVA ? trans.dfTaxWithholdingIVA.toFixed(4) : ""
    $rowTmp.querySelector(".datafast-renta").innerText = trans.dfTaxWithholdingRENTA ? trans.dfTaxWithholdingRENTA.toFixed(4) : ""
    $rowTmp.querySelector(".value").innerText = trans.value.toFixed(2)
    $rowTmp.querySelector(".voucher").innerText = trans.voucher ? trans.voucher : ""
    $clone = d.importNode($rowTmp, true)
    $fragment.appendChild($clone)
  })

  $totalsTmp.querySelector(".total-value").innerText = vnTotalTx.toFixed(2)
  $clone = d.importNode($totalsTmp, true)
  $fragment.appendChild($clone)

  $transactionsDetails.innerHTML = "";
  $transactionsDetails.appendChild($fragment)

  // Agregar totales por consulta
  // d.querySelector(".search-period").innerText = filters.periodStart.toFormat('dd/MM/yyyy') + "-" + filters.periodEnd.toFormat('dd/MM/yyyy')
  // d.querySelector(".search-sales").innerText = vnSearchSales.toFixed(2)
  // ////d.querySelector(".search-barber-commissions").innerText = vnSearchBarberCommissions.toFixed(2)
  // d.querySelector(".search-barber-commissions-tmp").innerText = vnSearchBarberCommissionsTmp.toFixed(2)
  // d.querySelector(".search-sales-result").innerText = "= " + (vnSearchSales - vnSearchBarberCommissionsTmp).toFixed(2)
}

function calculatePeriod() {
  let baseDate = hoyEC
  //const currentWeek = baseDate.weekNumber
  switch (filters.period) {
    case "CURRENTWEEK":
      filters.periodStart = baseDate.startOf('week')
      filters.periodEnd = baseDate.endOf('week')
      break
    case "LASTWEEK":
      baseDate = baseDate.minus({ weeks: 1 })
      filters.periodStart = baseDate.startOf('week')
      filters.periodEnd = baseDate.endOf('week')
      break
    case "CURRENTMONTH":
      filters.periodStart = baseDate.startOf('month')
      filters.periodEnd = baseDate.endOf('month')
      break
    case "LASTMONTH":
      baseDate = baseDate.minus({ months: 1 })
      filters.periodStart = baseDate.startOf('month')
      filters.periodEnd = baseDate.endOf('month')
      break
  }

  ////console.log(filters.periodStart.toISO())
  ////console.log(filters.periodEnd.toISO())
}


// --------------------------
// Database operations
// --------------------------

async function findBankTransactions() {
  let rangeStart,
    rangeEnd

  if (filters.dateStart && filters.dateEnd) {
    rangeStart = dateTimeToKeyDateString(filters.dateStart)
    rangeEnd = dateTimeToKeyDateString(filters.dateEnd)
  } else {
    rangeStart = dateTimeToKeyDateString(filters.periodStart)
    rangeEnd = dateTimeToKeyDateString(filters.periodEnd)
  }
  let transactions = []
  await bankRef.orderByKey().startAt(rangeStart + "T").endAt(rangeEnd + "\uf8ff")
    .once('value')
    .then((snap) => {
      ////console.log(snap.toJSON())=
      snap.forEach((child) => {
        transactions.push(child.val())
      })
    })
    .catch((error) => {
      ntf.tecnicalError(`Búsqueda de movimientos bancarios con error`, error)
    })

  renderBankTransactions(transactions)
}

