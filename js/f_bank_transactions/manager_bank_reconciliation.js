import { calculatePeriod, dateTimeToLocalString, hoyEC } from "../util/fecha-util.js";
import validAdminAccess from "../dom/manager_user.js";
import navbarBurgers from "../dom/navbar_burgers.js";
import NotificationBulma from '../dom/NotificacionBulma.js';
import { findBankTxs, updateBankTxVerified } from "./dao_banking_transactions.js";
import { roundFour, roundTwo } from "../util/numbers-util.js";
import convertFormToObject from "../util/form_util.js";
import { tmpDataCleaning } from "../util/daily-data-cache.js";
import { localdb } from "../repo-browser.js";
import { DateTime } from "../luxon.min.js";
import { insertMonthlyReconciliation } from "./dao_bank_reconciliation.js";

const d = document,
  w = window,
  ntf = new NotificationBulma(),
  $form = d.querySelector("#filters")

const unverifiableTypes = ["DEPOSITO", "TRANSFERENCIA", "DEBITO_TRANSFERENCIA"]

//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

// EVENTO=load RAIZ=window 
w.addEventListener("load", () => search())

// EVENTO=unload RAIZ=window 
w.addEventListener("unload", () => tmpDataCleaning())

// EVENTO=DOMContentLoaded RAIZ=document ACCION: Termina de cargar el DOM
d.addEventListener("DOMContentLoaded", () => navbarBurgers())

// EVENTO=change RAIZ=button<search> ACCION=Realizar busqueda
d.addEventListener("submit", e => {
  e.preventDefault()
  search()
})

// EVENTO=change RAIZ=section<section> ACCION=detectar cambios en inputs 
d.getElementById("filters").addEventListener("change", e => {
  let $input = e.target

  if ($input.name === "period") {
    d.getElementById("period-start").value = ""
    d.getElementById("period-end").value = ""
    d.getElementById("period-month").value = ""
  }

  if ($input.name === "periodMonth") {
    d.getElementsByName("period").forEach($el => $el.checked = false)
    d.getElementById("period-start").value = ""
    d.getElementById("period-end").value = ""
  }

  if ($input.name === "periodStart" || $input.name === "periodEnd") {
    d.getElementsByName("period").forEach($el => $el.checked = false)
    d.getElementById("period-month").value = ""
  }

  if ($input.name === "typePayment") {
    if ($input.value === "TODOS") {
      d.getElementsByName("typePayment").forEach($el => $el.checked = $el.value === "TODOS")
    } else {
      d.getElementById("type-payment-all").checked = false
    }
  }

  // Cuando cambia la busqueda por rango de fechas se espera el evento 'submit'
  if ($input.type === "date") return

  search()
})


// EVENTO=click RAIZ=button<search> ACCION: Buscar informacion
d.getElementById("bank-transactions").addEventListener("change", e => {
  let $el = e.target

  if ($el.type === "checkbox") {
    let txData = {
      uid: $el.dataset.tx,
      value: roundTwo(parseFloat($el.dataset.txValue)),
      verified: $el.checked,
      verifiedValue: null// Se requiere el valor null para eliminar el campo en Firebase cuando se desmarca
    }

    if (unverifiableTypes.includes($el.dataset.txType)) {
      txData.verifiedValue = txData.value
    } else if (txData.verified) {
      let $verifiedValue = d.getElementById(txData.uid).querySelector(".verified-value")
      txData.verifiedValue = $verifiedValue.valueAsNumber
      if (!txData.verifiedValue) {
        ntf.validation("El valor de verificacion es requerido y debe ser mayor a cero, intente nuevamente")
        $verifiedValue.valueAsNumber = txData.value
        $el.checked = false
        return
      }
    }

    // Actualizar la informacion de verificacion de la tx en la BD
    updateBankTxVerified(txData,
      uid => {
        search()
        ntf.okey(`La transaccion ${uid} fue actualizada correctamente`, 1500)
      },
      error => ntf.errorAndLog(`La transaccion ${uid} no se pudo actualizar.
        Intente consultar nuevamente la informacion y reintente 'verificar' el registro.`, error)
    )
  }

})

// EVENTO=change RAIZ=section<section> ACCION=detectar cambios en inputs 
d.querySelector(".reconciliation-save").addEventListener("click", e => {
  e.preventDefault()
  let month = DateTime.fromMillis(reconciliation.date).setLocale('ec').toFormat('MMMM yyyy')

  if (confirm(`Al guardar la conciliacion mensual de ${month}, no podra realizar modificaciones posteriores. 
  Esta seguro que la informacion esta lista para continuar?`)) {
    insertMonthlyReconciliation(JSON.parse(localStorage.getItem(localdb.tmpBankReconciliation)),
      vdMonth => {
        let monthString = vdMonth.setLocale('ec').toFormat('MMMM yyyy')
        ntf.okey(`Conciliacion mensual de ${monthString} registrada`)
        search()
      },
      error => ntf.errorAndLog("Registro de conciliacion mensual con error", error))
  }
})

//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------

function search() {
  // Borrar la conciliacion mensual previamente generada
  localStorage.removeItem(localdb.tmpBankReconciliation)

  if (validAdminAccess()) {
    let filters = convertFormToObject($form)

    // Se ha seleccionado al menos una fecha
    if (filters.periodStart || filters.periodEnd) {
      if (!filters.periodEnd) {
        filters.periodEnd = filters.periodStart
      }
      if (!filters.periodStart) {
        filters.periodStart = filters.periodEnd
      }

      // Validar rango y fecha maxima de consulta
      let hoy = hoyEC()
      if (filters.periodStart > hoy || filters.periodEnd > hoy) {
        ntf.validation("No puede seleccionar una fecha mayor a la actual")
      } else if (filters.periodStart > filters.periodEnd) {
        ntf.validation("La fecha del primer campo no puede ser mayor a la fecha del segundo campo")
      }

    } else if (!filters.period && !filters.periodMonth) {
      ntf.validation("Seleccione un periodo, mes o un rango de fechas")
    }

    // Si hay msj de error finaliza
    if (ntf.enabled) return

    // Cuando se desmarcan todas las casillas de 'name=typePayment', se coloca la opcion 'TODOS'
    if (!filters.typePayment) {
      filters.typePayment = ["TODOS"]
      d.getElementById("type-payment-all").checked = true
    }

    // Ejecutar consulta de informacion
    filters = calculatePeriod(filters)
    findBankTxs(filters,
      (voFilters, vaTransactions, vaBalances) => {
        const [last, current] = vaBalances || [];
        renderBankTransactions(voFilters, vaTransactions, last, current)
      },
      error => ntf.errorAndLog("Busqueda de transacciones bancarias con error", error))
  }
}

function renderBankTransactions(voFilters, vaTransactions, voLastBalance, voCurrentBalance) {
  const $fragment = d.createDocumentFragment(),
    $transactionsDetails = d.getElementById("bank-transactions")

  let vnTxValue,
    vnVerifiedTxValue,
    vnTotalTx = 0,
    vnVerifiedTotalTx = 0,
    vnSaleTotalTx = 0,
    vbAllVerified = true

  //Periodo de consulta
  d.querySelector(".search-period").innerText = dateTimeToLocalString(voFilters.periodStart)
    + " al " + dateTimeToLocalString(voFilters.periodEnd)

  // El saldo inicial solo se presenta cuando se despliega todas las formas de pago y el periodo es mensual
  // para la conciliacion mensual
  if (voFilters.periodMonth && voFilters.typePayment.includes("TODOS")) {
    const $initialRow = d.getElementById("bank-initial-balance").content.cloneNode(true)
    // Agregar saldo inicial cuando existe la reconcialiacion del mes anterior
    if (voLastBalance) {
      let accountStatus = voLastBalance[voFilters.bank]
      $initialRow.querySelector(".date").innerText = DateTime.fromMillis(voLastBalance.date).startOf('day').toLocaleString(DateTime.DATE_SHORT)
      $initialRow.querySelector(".bank").innerText = voFilters.bank
      $initialRow.querySelector(".type-payment").innerText = "Saldo inicial"

      let initialBalance = accountStatus.availableBalanceVerified
      vnTotalTx += initialBalance
      vnVerifiedTotalTx += initialBalance
      $initialRow.querySelector(".original-value").innerText = initialBalance.toFixed(2)
      $initialRow.querySelector(".verified-value").innerText = initialBalance.toFixed(2)
    } else {
      let $typePayment = $initialRow.querySelector(".type-payment")
      $typePayment.innerText = "No existe saldo inicial"
      $typePayment.classList.add("has-background-warning")
    }
    $fragment.appendChild($initialRow)
  }

  vaTransactions.forEach((tx, index) => {
    let $rowTmp = d.getElementById("bank-tx-row").content.cloneNode(true)
    // Total por Consulta
    vnTxValue = tx.value
    vnVerifiedTxValue = tx.verifiedValue || tx.value
    if (tx.type === "DEBITO_TRANSFERENCIA") {
      vnTxValue *= -1
      vnVerifiedTxValue *= -1
    }
    vnTotalTx += vnTxValue
    vnVerifiedTotalTx += vnVerifiedTxValue
    vnSaleTotalTx += tx.saleValue || 0

    $rowTmp.querySelector(".index").innerText = index + 1
    $rowTmp.querySelector(".date").innerText = tx.searchDateTime
    $rowTmp.querySelector(".bank").innerText = tx.bank
    let $typeAndVoucher = $rowTmp.querySelector(".type-payment"),
      docRelacionado = tx.saleUid ? "Vta:" + tx.saleUid : (tx.rubro ? "Rub:" + tx.rubro : (tx.voucher ? "Com:" + tx.voucher : ""))

    $typeAndVoucher.innerText = tx.type + (docRelacionado ? " [" + docRelacionado + "] " : " ") + tx.responsable
    $typeAndVoucher.title = tx.details || "Sin detalles"
    if (tx.saleUid && tx.saleValue) $rowTmp.querySelector(".sale-value").innerText = tx.saleValue.toFixed(2)
    if (tx.dfCommission) {
      $rowTmp.querySelector(".datafast-commission").innerText = tx.dfCommission.toFixed(4)
      $rowTmp.querySelector(".datafast-iva").innerText = tx.dfTaxWithholdingIVA.toFixed(4)
      $rowTmp.querySelector(".datafast-renta").innerText = tx.dfTaxWithholdingRENTA.toFixed(4)
    }
    let $originalValue = $rowTmp.querySelector(".original-value")

    $originalValue.id = tx.tmpUid + "-original"
    $originalValue.innerText = tx.value.toFixed(2)
    if (tx.verifiedValue && tx.value.toFixed(2) !== tx.verifiedValue.toFixed(2)) {
      $originalValue.classList.add("has-background-warning")
    }

    let verifiedValueDisplay = tx.verified === true ? tx.verifiedValue.toFixed(2) : tx.value.toFixed(2)
    if (tx.verifiedValue || voCurrentBalance || unverifiableTypes.includes(tx.type)) {
      // A los tipos de 'unverifiableTypes' no se permite modificar valor
      $rowTmp.querySelector(".verified-value-readonly").innerText = verifiedValueDisplay
    } else {
      let $verifiedValue = $rowTmp.querySelector(".verified-value")
      $verifiedValue.id = tx.tmpUid + "-value"
      $verifiedValue.classList.remove("is-hidden")
      $verifiedValue.value = verifiedValueDisplay
    }

    let $checkbox = $rowTmp.querySelector(".verified")
    if (voCurrentBalance) $checkbox.setAttribute("disabled", true)
    $checkbox.classList.remove("is-hidden")
    $checkbox.dataset.tx = tx.tmpUid
    $checkbox.dataset.txValue = tx.value
    $checkbox.dataset.txType = tx.type
    $checkbox.checked = tx.verified && tx.verified === true
    // Comprobar que todos los registros del mes se encuentren conciliados
    // para permitir guardar el saldo mensual de las cuentas
    vbAllVerified = vbAllVerified && tx.verified && tx.verified === true

    let $tr = $rowTmp.querySelector(".tx-row")
    $tr.id = tx.tmpUid
    if ($checkbox.checked) $tr.classList.add("has-background-primary-light")

    $fragment.appendChild($rowTmp)
  })

  // Agregar totales por consulta
  d.querySelector(".total-sale").innerText = vnSaleTotalTx.toFixed(2)
  d.querySelector(".total-value").innerText = vnTotalTx.toFixed(2)
  d.querySelector(".total-verified").innerText = vnVerifiedTotalTx.toFixed(2)

  $transactionsDetails.innerHTML = "";
  $transactionsDetails.appendChild($fragment)

  // Presentar mensajes de reconciliacion mensual bloqueada
  let $reconciliationSave = d.querySelector(".reconciliation-save"),
    $reconciliationBlockedMsj = d.querySelector(".reconciliation-blocked-msj"),
    $reconciliationBlockedError = d.querySelector(".reconciliation-blocked-error")

  // reset estado previo
  $reconciliationSave.setAttribute("disabled", true)
  $reconciliationBlockedMsj.classList.add("is-hidden")
  $reconciliationBlockedError.classList.add("is-hidden")

  if (voCurrentBalance) {
    // Cuando ya se a registrado la conciliacion del mes actual se despliega un mensaje 
    (vbAllVerified ? $reconciliationBlockedMsj : $reconciliationBlockedError).classList.remove("is-hidden")
  } else if (voLastBalance && voFilters.periodMonth && vbAllVerified && vaTransactions && vaTransactions.length > 0 &&
    voFilters.typePayment.includes("TODOS") && voFilters.bank === "TOTAL" && voFilters.verified === "TODOS") {
    // Debe estar registrado el balance del mes previo, seleccionar el filtro 'periodMonth', 
    // todas las casillas de verificacion marcadas y los filtros deben permitir presentar todos los registros
    $reconciliationSave.removeAttribute("disabled")
    // Generar la conciliacion mensual
    generateBankReconciliation(voFilters.periodStart, vaTransactions, voLastBalance)
  }

}

function generateBankReconciliation(vdPeriodStart, vaTransactions, voLastBalance) {
  // Almacenar la reonciliacion mensual verificada, para generar el saldo mensual
  const reconciliation = new Map()

  let vnTxValue,
    vnTxValueVerified,
    accountStatus = {
      availableBalance: 0,
      availableBalanceVerified: 0,
      credits: 0,
      debits: 0,
      previousBalance: 0
    },
    overallStatus = { ...accountStatus }

  for (const prop in voLastBalance) {
    let bankAccount = { ...accountStatus }
    let previousStatus = voLastBalance[prop]
    switch (prop) {
      // Incluir todas las propiedades que no sean cuentas bancarias
      case "date":
      case "tmpUid":
        break
      case "TOTAL":
        overallStatus.availableBalance = previousStatus.availableBalanceVerified
        overallStatus.availableBalanceVerified = previousStatus.availableBalanceVerified
        overallStatus.previousBalance = previousStatus.availableBalanceVerified
        break
      default:
        bankAccount.availableBalance = previousStatus.availableBalanceVerified
        bankAccount.availableBalanceVerified = previousStatus.availableBalanceVerified
        bankAccount.previousBalance = previousStatus.availableBalanceVerified
        reconciliation.set(prop, bankAccount)
        break
    }
  }

  vaTransactions.forEach(tx => {
    if (!tx.verifiedValue || tx.verifiedValue <= 0) {
      ntf.errors("No se puede generar la reconciliacion mensual debido a que existe transacciones pendientes de verificar")
      return
    }
    let bankAccount = reconciliation.get(tx.bank) || { ...accountStatus }
    vnTxValue = tx.value
    vnTxValueVerified = tx.verifiedValue

    if (tx.type === "DEBITO_TRANSFERENCIA") {
      // Primero se suma para evitar valores negativos
      bankAccount.debits += vnTxValueVerified
      overallStatus.debits += vnTxValueVerified
      vnTxValue = -(vnTxValue)
      vnTxValueVerified = -(vnTxValueVerified)
    } else {
      // Todas las otras formas de pago son creditos: DEPOSITOS, TRANSFERENCIA, TCREDITO, TDEBITO
      bankAccount.credits += vnTxValueVerified
      overallStatus.credits += vnTxValueVerified
    }

    bankAccount.availableBalance += vnTxValue
    overallStatus.availableBalance += vnTxValue
    bankAccount.availableBalanceVerified += vnTxValueVerified
    overallStatus.availableBalanceVerified += vnTxValueVerified
    reconciliation.set(tx.bank, bankAccount)
  })

  reconciliation.set("TOTAL", overallStatus)
  // Convertir a object para almacenar en la BD
  let voReconciliation = Object.fromEntries(reconciliation)
  // Redondear saldos a cuatro cifras
  for (const prop in voReconciliation) {
    let cta = voReconciliation[prop]
    cta.availableBalance = roundFour(cta.availableBalance)
    cta.availableBalanceVerified = roundFour(cta.availableBalanceVerified)
    cta.credits = roundFour(cta.credits)
    cta.debits = roundFour(cta.debits)
  }

  voReconciliation.date = vdPeriodStart.toMillis()
  localStorage.setItem(localdb.tmpBankReconciliation, JSON.stringify(voReconciliation))
}
