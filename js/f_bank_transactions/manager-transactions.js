import navbarBurgers from "../dom/navbar_burgers.js"
import NotificationBulma from "../dom/NotificacionBulma.js"
import { hoyEC } from "../util/fecha-util.js"
import convertFormToObject, { resetForm } from "../util/form_util.js"
import { insertBankTransaction } from "./dao_bank_reconciliation.js"

const d = document,
  w = window,
  ntf = new NotificationBulma()

//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------

/**
 * Reset el formulario.
 */
function reset($form) {
  resetForm($form)
  $form.querySelector(".transaction-date").valueAsDate = hoyEC().toJSDate()
}

// ------------------------------------------------------------------------------------------------
// Delegation of events
// ------------------------------------------------------------------------------------------------
// EVENTO=DOMContentLoaded RAIZ=document ACCION: Termina de cargar el DOM
d.addEventListener("DOMContentLoaded", () => navbarBurgers())

// EVENTO=load RAIZ=window ACCION= Terminar de cargar la ventana
w.addEventListener("load", () => d.querySelectorAll(".transaction-date").forEach($el => $el.valueAsDate = hoyEC().toJSDate()))

// EVENTO=submit RAIZ=section ACCION=inicializar el formulario
d.addEventListener("reset", e => {
  e.preventDefault()
  reset(e.target)
  ntf.show("Información", "Movimiento bancario descartado.", "info")
})


// EVENTO=submit RAIZ=document=registrar movimiento bancario
d.addEventListener("submit", e => {
  //Prevenir la accion predeterminada que procesa los datos del formulario
  e.preventDefault()
  let $form = e.target
  let bankTx = convertFormToObject($form)
  // Validaciones comunes que 
  if (!bankTx.type) {
    ntf.error("Información requerida", "Seleccione el tipo de transaccion bancaria.")
  } else if (!bankTx.bank) {
    ntf.error("Información requerida", "Seleccione el banco")
  } else if (!bankTx.value || bankTx.value <= 0) {
    ntf.error("Información requerida", "Ingrese un valor mayor a cero")
  }

  switch ($form.id) {
    case "form-deposit":
      if (!bankTx.responsable) {
        ntf.error("Información requerida", "Seleccione el responsable")
      }
      break
    case "form-transfer":
      if (!bankTx.responsable) {
        ntf.error("Información requerida", "Seleccione el beneficiario")
      } else if (!bankTx.details && !bankTx.saleUid) {
        ntf.error("Información requerida", "Ingrese el numero de venta relacionado o describa brevemente el motivo de la transferencia en el campo detalles")
      }
      break
    case "form-bank-tx":
      if (!bankTx.responsable) {
        ntf.error("Información requerida", "Seleccione el responsable")
      } else if (!bankTx.details && !bankTx.voucher) {
        ntf.error("Información requerida", "Ingrese el numero de comprobante o describa brevemente el motivo de la transaccion bancaria en el campo detalles")
      }
      break
  }

  if (!ntf.enabled) {
    insertBankTransaction(bankTx,
      (bankTx) => {
        let idTx = (bankTx.voucher && !bankTx.voucher.startsWith("00")) ? bankTx.voucher : bankTx.date
        ntf.show(`Transaccion bancaria registrado`, `Se guardó correctamente la información: ${bankTx.type} Nro.${idTx}`)
        reset($form)
      },
      () => { ntf.tecnicalError(`Transaccion bancaria no registrada`, error) },
      (msjError) => { ntf.error("Información con error", msjError, 10000) }
    )
  }

})
