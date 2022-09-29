import { hoyEC, inputDateToDateTime } from "../util/fecha-util.js";
import validAdminAccess from "./manager_user.js";
import navbarBurgers from "./navbar_burgers.js";
import NotificationBulma from './NotificacionBulma.js';
import { findBankTxs, updateBankTxVerified } from "../f_bank_transactions/dao_bank_reconciliation.js";
import { roundTwo } from "../util/numbers-util.js";

const d = document,
  w = window,
  ntf = new NotificationBulma()

const typePayments = ["DEPOSITO", "TRANSFERENCIA", "DEBITO_TRANSFERENCIA", "TCREDITO", "TDEBITO"],
  banks = ["PICH", "PROD"]

const filters = {
  typePayments: [...typePayments],
  banks: [...banks],
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
    let bank = $input.value,
      banksChecked = []
    if (bank === "TODOS") {
      banksChecked = [...banks]
      d.getElementsByName("bank").forEach($el => $el.checked = $el.value === "TODOS")
    } else {
      d.getElementsByName("bank").forEach($el => {
        if ($el.checked && $el.value !== "TODOS") banksChecked.push($el.value)
      })
      d.getElementById("bank-all").checked = false
    }
    filters.banks = banksChecked
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

    if (txData.verified) {
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
        ntf.show(`Transaccion ${txData.uid} actualizada`, `Se actualizo correctamente la informacion`, "info", 1200)
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
    findBankTxs(filters.typePayments, filters.banks, filters.dateStart, filters.dateEnd,
      (transactions) => { renderBankTransactions(transactions) },
      error => { ntf.tecnicalError(`Búsqueda de transacciones bancarias con error`, error) })
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
    let docRelacionado = trans.saleUid ? "Vta:" + trans.saleUid : (trans.voucher ? "Com:" + trans.voucher : "")
    $rowTmp.querySelector(".type-payment").innerText = trans.type + (docRelacionado ? " [" + docRelacionado + "]" : "")
    $rowTmp.querySelector(".bank").innerText = trans.bank
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
    let $input = $rowTmp.querySelector(".verified-value"),
      $div = $rowTmp.querySelector(".verified-value-readonly")

    $input.id = trans.tmpUid + "-value"
    if (trans.type === "DEPOSITO") {
      // depositos no se permite modificar valor
      $input.classList.add("is-hidden")
      $div.classList.remove("is-hidden")
      $div.innerText = trans.value.toFixed(2)
      $div.title = "valor original: " + trans.value.toFixed(2)
    } else {
      $div.classList.add("is-hidden")
      $input.classList.remove("is-hidden")
      $input.value = trans.verified === true ? trans.verifiedValue.toFixed(2) : trans.value.toFixed(2)
      $input.title = "valor original: " + trans.value.toFixed(2)
    }

    let $checkbox = $rowTmp.querySelector(".verified")
    $checkbox.dataset.tx = trans.tmpUid
    $checkbox.dataset.txValue = trans.value
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
