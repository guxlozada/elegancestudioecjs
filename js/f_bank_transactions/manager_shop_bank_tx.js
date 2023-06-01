import { addOperators } from "../dom/manager_operators.js"
import { isAdmin } from "../dom/manager_user.js"
import NotificationBulma from "../dom/NotificacionBulma.js"
import { addMinMaxPropsWithCashOutflowDates } from "../util/daily-data-cache.js"
import { hoyEC } from "../util/fecha-util.js"
import convertFormToObject, { resetForm } from "../util/form_util.js"
import { insertBankTx } from "./dao_banking_transactions.js"

const d = document,
  w = window,
  ntf = new NotificationBulma()

// ------------------------------------------------------------------------------------------------
// Delegation of events
// ------------------------------------------------------------------------------------------------
// EVENTO=DOMContentLoaded RAIZ=document 
d.addEventListener("DOMContentLoaded", e => {
  // Agregar responsables
  addOperators(".responsables-container", null,
    () => {
      addOperators(".beneficiaries-container", null,
        () => { },
        () => ntf.errorAndLog(`No se pudo obtener la informacion de los responsables, 
           por favor intente nuevamente ingresando al sistema;
           si el problema continua, comuniquelo a Carlos Quinteros`))

    },
    () => ntf.errorAndLog(`No se pudo obtener la informacion de los responsables, 
       por favor intente nuevamente ingresando al sistema;
       si el problema continua, comuniquelo a Carlos Quinteros`))

})

// EVENTO=load RAIZ=window ACCION= Terminar de cargar la ventana
w.addEventListener("load", () => {
  d.querySelectorAll(".transaction-date").forEach($el => {
    $el.valueAsDate = hoyEC().toJSDate()
  })

  if (!isAdmin()) {
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
  }

  if (ntf.enabled) return

  insertBankTx(bankTx,
    (bankTxData) => {
      ntf.okey(`Transaccion bancaria registrada: ${bankTxData.type} Nro.${bankTxData.voucher || bankTxData.date}`)
      $form.reset()
    },
    (error) => ntf.errorAndLog("Transaccion bancaria NO registrada", error),
    (msjError) => { ntf.error("Transaccion bancaria NO registrada", msjError, 10000) }
  )

})
