import navbarBurgers from "../dom/navbar_burgers.js"
import NotificationBulma from "../dom/NotificacionBulma.js"
import { hoyEC } from "../util/fecha-util.js"
import convertFormToObject from "../util/form_util.js"
import { insertBankTransaction } from "./dao_bank_reconciliation.js"

const d = document,
  w = window,
  ntf = new NotificationBulma(),
  $container = d.getElementById("transactions")

//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------

/**
 * Reset el formulario.
 */
function reset() {
  // TODO: Descomentar cuando nuevamente se bloquea la fecha a la actual
  //d.getElementById("expense-date").value = expense.searchDate
  d.getElementById("transaction-date-input").valueAsDate = hoyEC().toJSDate()
  d.getElementsByName("responsable").forEach($el => $el.checked = false)
  d.getElementById("value").value = null
  d.getElementById("voucher").value = null
  d.getElementById("details").value = null
}

// ------------------------------------------------------------------------------------------------
// Delegation of events
// ------------------------------------------------------------------------------------------------
// EVENTO=DOMContentLoaded RAIZ=document ACCION: Termina de cargar el DOM
d.addEventListener("DOMContentLoaded", () => navbarBurgers())

// EVENTO=load RAIZ=window ACCION= Terminar de cargar la ventana
w.addEventListener("load", () => reset())

// EVENTO=submit RAIZ=section ACCION=registrar movimiento bancario
$container.addEventListener("reset", e => {
  e.preventDefault()
  reset()
})

// EVENTO=submit RAIZ=section ACCION=registrar movimiento bancario
$container.addEventListener("submit", e => {
  //Prevenir la accion predeterminada que procesa los datos del formulario
  e.preventDefault()

  let bankTx = convertFormToObject()

  // Validaciones
  if (!bankTx.responsable) {
    ntf.error("Información requerida", "Seleccione el responsable")
  } else if (!bankTx.type) {
    ntf.error("Información requerida", "Seleccione el tipo de movimiento.")
  } else if (!bankTx.value || bankTx.value <= 0) {
    ntf.error("Información requerida", "Ingrese un valor mayor a cero")
  } else if (!bankTx.voucher) {
    ntf.error("Información requerida", "Ingrese el número del comprobante")
  } else if (!bankTx.details && (bankTx.type === "TRANSFERENCIA" || bankTx.type === "TRANSFRETIRO")) {
    ntf.error("Información requerida", "En 'Detalles' describa brevemente el motivo de la transferencia.")
  }

  if (!ntf.enabled) {
    insertBankTransaction(bankTx, (bankTx) => {
      let idTx = (bankTx.voucher && !bankTx.voucher.startsWith("00")) ? bankTx.voucher : bankTx.date
      ntf.show(`Movimiento bancario registrado`, `Se guardó correctamente la información: ${bankTx.type} Nro.${idTx}`)
      reset()
    }, () => { ntf.tecnicalError(`Movimiento bancario no registrado`, error) })
  }

})
