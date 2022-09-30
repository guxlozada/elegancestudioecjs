import validAdminAccess from "../dom/manager_user.js"
import navbarBurgers from "../dom/navbar_burgers.js"
import NotificationBulma from "../dom/NotificacionBulma.js"
import { addMinMaxPropsWithCashOutflowDates } from "../util/daily-data-cache.js"
import { hoyEC } from "../util/fecha-util.js"
import convertFormToObject, { resetForm } from "../util/form_util.js"
import { insertBankTx } from "./dao_bank_reconciliation.js"

const d = document,
  w = window,
  ntf = new NotificationBulma()

// ------------------------------------------------------------------------------------------------
// Delegation of events
// ------------------------------------------------------------------------------------------------
// EVENTO=DOMContentLoaded RAIZ=document ACCION: Termina de cargar el DOM
d.addEventListener("DOMContentLoaded", () => navbarBurgers())

// EVENTO=load RAIZ=window ACCION= Terminar de cargar la ventana
w.addEventListener("load", () => {
  d.querySelectorAll(".transaction-date").forEach($el => {
    $el.valueAsDate = hoyEC().toJSDate()
  })

  if (d.getElementById("form-bank-tx") && validAdminAccess()) {
    d.querySelector(".save-bank-tx").removeAttribute("disabled")
  } else {
    addMinMaxPropsWithCashOutflowDates(".transaction-date")
  }

})

// EVENTO=submit RAIZ=section ACCION=inicializar el formulario
d.addEventListener("reset", e => {
  e.preventDefault()
  let $form = e.target
  resetForm($form)
  $form.querySelector(".transaction-date").valueAsDate = hoyEC().toJSDate()
})

// EVENTO=submit RAIZ=document=registrar movimiento bancario
d.addEventListener("submit", e => {
  e.preventDefault()
  let $form = e.target
  let bankTx = convertFormToObject($form)
  // Validaciones comunes que 
  if (!bankTx.type) {
    ntf.error("Informacion requerida", "Seleccione el tipo de transaccion bancaria.")
  } else if (!bankTx.bank) {
    ntf.error("Informacion requerida", "Seleccione el banco")
  } else if (!bankTx.value || bankTx.value <= 0) {
    ntf.error("Informacion requerida", "Ingrese un valor mayor a cero")
  }

  switch ($form.id) {
    case "form-deposit":
      if (!bankTx.responsable) {
        ntf.error("Informacion requerida", "Seleccione el responsable")
      }
      break
    case "form-transfer":
      if (!bankTx.responsable) {
        ntf.error("Informacion requerida", "Seleccione el beneficiario")
      } else if (!bankTx.details && !bankTx.saleUid) {
        ntf.error("Informacion requerida", "Ingrese el numero de venta relacionado o describa brevemente el motivo de la transferencia en el campo detalles")
      }
      break
    case "form-bank-tx":
      if (!bankTx.responsable) {
        ntf.error("Informacion requerida", "Seleccione el responsable")
      } else if (!bankTx.details && !bankTx.voucher) {
        ntf.error("Informacion requerida", "Ingrese el numero de comprobante o describa brevemente el motivo de la transaccion bancaria en el campo detalles")
      }
      break
  }

  if (!ntf.enabled) {
    insertBankTx(bankTx,
      (bankTxData) => {
        ntf.ok("Transaccion bancaria registrada",
          `Se guardo correctamente la informacion: ${bankTxData.type} Nro.${bankTxData.voucher || bankTxData.date}`)
        $form.reset()
      },
      (error) => { ntf.tecnicalError("Transaccion bancaria no registrada", error) },
      (msjError) => { ntf.error("Transaccion bancaria no registrada", msjError, 10000) }
    )
  }

})
