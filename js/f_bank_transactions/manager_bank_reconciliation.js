import { hoyEC, inputDateToDateTime } from "../util/fecha-util.js";
import validAdminAccess from "../dom/manager_user.js";
import navbarBurgers from "../dom/navbar_burgers.js";
import NotificationBulma from '../dom/NotificacionBulma.js';
import { findBankTxs, updateBankTxVerified } from "./dao_bank_reconciliation.js";
import { roundTwo, truncTwo } from "../util/numbers-util.js";

const d = document,
  w = window,
  ntf = new NotificationBulma()

const typePayments = ["DEPOSITO", "TRANSFERENCIA", "DEBITO_TRANSFERENCIA", "TCREDITO", "TDEBITO"]

const filters = {
  typePayments: [...typePayments],
  period: "CURRENTMONTH"
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
  filters.period = undefined
  filters.dateStart = dateTimeStart
  filters.dateEnd = dateTimeEnd
  search()
})

// EVENTO=change RAIZ=section<section> ACCION=detectar cambios en inputs 
d.getElementById("filters").addEventListener("change", e => {
  let $input = e.target
  if ($input.name === "bank") {
    filters.bank = $input.value === "TODOS" ? undefined : $input.value
    search()
  } else if ($input.name === "verified") {
    filters.verified = $input.value === "TODOS" ? undefined : $input.value === "true"
    search()
  } else if ($input.name === "typePayment") {
    let typePayment = $input.value,
      typesChecked = []
    if (typePayment === "TODOS") {
      typesChecked = [...typePayments]
      d.getElementsByName("typePayment").forEach($el => $el.checked = $el.value === "TODOS")
    } else {
      d.getElementsByName("typePayment").forEach($el => {
        if ($el.checked && $el.value !== "TODOS") typesChecked.push($el.value)
      })
      d.getElementById("type-payment-all").checked = false
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

// EVENTO=click RAIZ=button<search> ACCION: Buscar informacion
d.getElementById("bank-transactions").addEventListener("change", e => {
  let $el = e.target

  if ($el.type === "checkbox") {
    let txData = {
      uid: $el.dataset.tx,
      value: roundTwo(parseFloat($el.dataset.txValue)),
      verified: $el.checked,
      verifiedValue: null
    }

    if (!$el.dataset.txType === "DEPOSITO") {
      txData.verifiedValue = txData.value
    } else if (txData.verified) {
      txData.verifiedValue = d.getElementById(txData.uid).querySelector(".verified-value").valueAsNumber
    }

    // Actualizar la informacion de verificacion de la tx en la BD
    updateBankTxVerified(txData,
      (txData) => {
        let $tr = document.getElementById(txData.uid)

        if (txData.verified) {
          $tr.classList.add("has-background-primary-light")
        } else {
          let $verifiedValue = document.getElementById(txData.uid + "-value")
          if ($verifiedValue) $verifiedValue.value = txData.value.toFixed(2)
          $tr.classList.remove("has-background-primary-light")
        }
        ntf.ok(`Transaccion ${txData.uid} actualizada`, `Se actualizo correctamente la informacion`, 1500)
      },
      () => {
        ntf.error(`Transaccion ${txData.uid} no actualizada`, `No se pudo actualizar la informacion. Actualice el reporte e intente nuevamente.`)
      })

  }

})

//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------

function search() {
  if (validAdminAccess()) {
    calculatePeriod()
    findBankTxs(filters.typePayments, filters.bank, filters.verified, filters.dateStart, filters.dateEnd,
      (transactions) => { renderBankTransactions(transactions) },
      error => { ntf.tecnicalError(`Búsqueda de transacciones bancarias con error`, error) })
  }
}

function renderBankTransactions(transactions) {
  const $rowTmp = d.getElementById("bank-tx-row").content,
    $fragment = d.createDocumentFragment(),
    $transactionsDetails = d.getElementById("bank-transactions")

  let vnTotalTx = 0,
    vnVerifiedTotalTx = 0,
    $clone

  transactions.forEach((trans, index) => {
    // Total por Consulta
    vnTotalTx += trans.value
    vnVerifiedTotalTx += trans.verifiedValue || trans.value

    $rowTmp.querySelector(".index").innerText = index + 1
    $rowTmp.querySelector(".date").innerText = trans.searchDateTime
    let $bank = $rowTmp.querySelector(".bank")
    $bank.innerText = trans.bank
    $bank.title = "Responsable:" + trans.responsable
    let docRelacionado = trans.saleUid ? "Vta:" + trans.saleUid : (trans.rubro ? "Rub:" + trans.rubro : (trans.voucher ? "Com:" + trans.voucher : "")),
      $typeAndVoucher = $rowTmp.querySelector(".type-payment")
    $typeAndVoucher.innerText = trans.type + (docRelacionado ? " [" + docRelacionado + "]" : "")
    $typeAndVoucher.title = trans.details || "Sin detalles"
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
    let $verifiedValue = $rowTmp.querySelector(".verified-value"),
      $originalValue = $rowTmp.querySelector(".original-value")
    $originalValue.innerText = trans.value.toFixed(2)
    if (trans.verifiedValue && trans.value.toFixed(2) !== trans.verifiedValue.toFixed(2)) {
      $originalValue.classList.add("has-background-warning")
    } else {
      $originalValue.classList.remove("has-background-warning")
    }
    $verifiedValue.id = trans.tmpUid + "-value"
    if (trans.type === "DEPOSITO") {
      // depositos no se permite modificar valor
      $verifiedValue.classList.add("is-hidden")
      $verifiedValue.removeAttribute("value")
    } else {
      $verifiedValue.classList.remove("is-hidden")
      $verifiedValue.value = trans.verified === true ? trans.verifiedValue.toFixed(2) : trans.value.toFixed(2)
    }

    let $checkbox = $rowTmp.querySelector(".verified")
    $checkbox.dataset.tx = trans.tmpUid
    $checkbox.dataset.txValue = trans.value
    $checkbox.dataset.txType = trans.type
    $checkbox.checked = trans.verified && trans.verified === true
    let $tr = $rowTmp.querySelector(".tx-row")
    $tr.id = trans.tmpUid
    if ($checkbox.checked) {
      $tr.classList.add("has-background-primary-light")
    } else {
      $tr.classList.remove("has-background-primary-light")
    }

    $clone = d.importNode($rowTmp, true)
    $fragment.appendChild($clone)
  })

  $transactionsDetails.innerHTML = "";
  $transactionsDetails.appendChild($fragment)

  // Agregar totales por consulta
  d.querySelector(".search-period").innerText = filters.dateStart.toFormat('dd/MM/yyyy') + " al " + filters.dateEnd.toFormat('dd/MM/yyyy')
  d.querySelector(".total-value").innerText = vnTotalTx.toFixed(2)
  d.querySelector(".verified-total-value").innerText = vnVerifiedTotalTx.toFixed(2)

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
