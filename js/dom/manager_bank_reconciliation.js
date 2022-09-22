import { dateTimeToKeyDateString, hoyEC, inputDateToDateTime } from "../util/fecha-util.js";
import { db } from "../persist/firebase_conexion.js";
import { collections } from "../persist/firebase_collections.js";
import validAdminAccess from "./manager_user.js";
import navbarBurgers from "./navbar_burgers.js";
import NotificationBulma from './NotificacionBulma.js';

const d = document,
  w = window,
  ntf = new NotificationBulma(),
  bankRef = db.ref(collections.bankReconciliation)

const typePayments = ["DEPOSITO", "TRANSFERENCIA", "DEBITO_TRANSFERENCIA", "TCREDITO", "TDEBITO"]

const filters = {
  typePayments: [...typePayments],
  period: "TODAY"
}
//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

// EVENTO=load RAIZ=window 
w.addEventListener("load", () => { search() })

// EVENTO=DOMContentLoaded RAIZ=document ACCION: Termina de cargar el DOM
d.addEventListener("DOMContentLoaded", () => { navbarBurgers() })

// EVENTO=click RAIZ=button<search> ACCION: Buscar informacion
d.getElementById("search").addEventListener("click", () => {
  let dateStart = d.getElementById("date-start").value,
    dateEnd = d.getElementById("date-end").value

  // NO se ha seleccionado al menos una fecha
  if (!dateStart && !dateEnd) {
    ntf.error("Información con errores", "Seleccione una fecha o un rango de fechas")
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
  filters.period = undefined
  filters.dateStart = dateTimeStart
  filters.dateEnd = dateTimeEnd
  search()
})

// EVENTO=change RAIZ=section<section> ACCION=detectar cambios en inputs 
d.getElementById("filters").addEventListener("change", e => {
  let $input = e.target
  if ($input.name === "typePayment") {
    let typePayment = $input.value,
      typesChecked = []
    if (typePayment === "TODOS") {
      typesChecked = [...typePayments]
      d.getElementsByName("typePayment").forEach($el => $el.checked = $el.value === "TODOS")
    } else {
      d.getElementsByName("typePayment").forEach($el => {
        if ($el.checked && $el.value !== "TODOS") typesChecked.push($el.value)
      })
      d.getElementById("type-payment-todos").checked = false
    }
    filters.typePayments = typesChecked
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
    findBankTransactions()
  }
}

function renderBankTransactions(transactions) {
  const $rowTmp = d.getElementById("bank-tx-row").content,
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

    if (trans.saleUid && trans.saleValue) {
      $rowTmp.querySelector(".sale-value").innerText = trans.saleValue.toFixed(2)
      $rowTmp.querySelector(".sale-value").title = "Id Venta:" + trans.saleUid
    } else {
      $rowTmp.querySelector(".sale-value").innerText = ""
      $rowTmp.querySelector(".sale-value").title = ""
    }
    $rowTmp.querySelector(".datafast-commission").innerText = trans.dfCommission ? trans.dfCommission.toFixed(4) : ""
    $rowTmp.querySelector(".datafast-iva").innerText = trans.dfTaxWithholdingIVA ? trans.dfTaxWithholdingIVA.toFixed(4) : ""
    $rowTmp.querySelector(".datafast-renta").innerText = trans.dfTaxWithholdingRENTA ? trans.dfTaxWithholdingRENTA.toFixed(4) : ""
    $rowTmp.querySelector(".value").innerText = trans.value.toFixed(2)
    $rowTmp.querySelector(".voucher").innerText = trans.voucher ? trans.voucher : ""
    $clone = d.importNode($rowTmp, true)
    $fragment.appendChild($clone)
  })

  $transactionsDetails.innerHTML = "";
  $transactionsDetails.appendChild($fragment)

  // Agregar totales por consulta
  d.querySelector(".search-period").innerText = filters.dateStart.toFormat('dd/MM/yyyy') + " al " + filters.dateEnd.toFormat('dd/MM/yyyy')
  d.querySelector(".search-total-value").innerText = vnTotalTx.toFixed(2)

}

function calculatePeriod() {
  if (!filters.period) return

  let baseDate = hoyEC()
  switch (filters.period) {
    case "TODAY":
      filters.dateStart = baseDate.startOf('day')
      filters.dateEnd = baseDate.endOf('day')
      break
    case "CURRENTWEEK":
      filters.dateStart = baseDate.startOf('week')
      filters.dateEnd = baseDate.endOf('week')
      break
    case "LASTWEEK":
      baseDate = baseDate.minus({ weeks: 1 })
      filters.dateStart = baseDate.startOf('week')
      filters.dateEnd = baseDate.endOf('week')
      break
    case "CURRENTMONTH":
      filters.dateStart = baseDate.startOf('month')
      filters.dateEnd = baseDate.endOf('month')
      break
    case "LASTMONTH":
      baseDate = baseDate.minus({ months: 1 })
      filters.dateStart = baseDate.startOf('month')
      filters.dateEnd = baseDate.endOf('month')
      break
  }
}

// --------------------------
// Database operations
// --------------------------

async function findBankTransactions() {
  let rangeStart = dateTimeToKeyDateString(filters.dateStart),
    rangeEnd = dateTimeToKeyDateString(filters.dateEnd)

  await bankRef.orderByKey().startAt(rangeStart + "T").endAt(rangeEnd + "\uf8ff")
    .once('value')
    .then((snap) => {
      let transactions = []
      snap.forEach((child) => {
        let tx = child.val()
        if (filters.typePayments.includes(tx.type)) transactions.push(tx)
      })

      renderBankTransactions(transactions)
    })
    .catch((error) => {
      ntf.tecnicalError(`Búsqueda de movimientos bancarios con error`, error)
    })

}

