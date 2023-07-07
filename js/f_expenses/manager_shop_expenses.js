import { addOperators } from '../dom/manager_operators.js'
import { isAdmin } from '../dom/manager_user.js'
import NotificationBulma from '../dom/NotificacionBulma.js'
import { addMinMaxPropsWithCashOutflowDates } from "../util/daily-data-cache.js"
import { hoyEC } from "../util/fecha-util.js"
import convertFormToObject, { resetForm } from "../util/form_util.js"
import { insertExpenseDB } from "./dao_cash_outflows.js"

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
    () => { },
    () => ntf.errorAndLog(`No se pudo obtener la informacion de los responsables, 
     por favor intente nuevamente ingresando al sistema;
     si el problema continua, comuniquelo a Carlos Quinteros`))
})

// EVENTO=load RAIZ=window ACCION= Terminar de cargar la ventana
w.addEventListener("load", () => {
  d.querySelector(".expense-date").valueAsDate = hoyEC().toJSDate()

  if (!isAdmin()) {
    addMinMaxPropsWithCashOutflowDates(".expense-date")
  }
})

// EVENTO=reset RAIZ=document ACCION=inicializar formulario
d.addEventListener("reset", e => {
  e.preventDefault()
  resetForm(e.target)
  d.querySelector(".expense-date").valueAsDate = hoyEC().toJSDate()
  d.getElementsByName("type").forEach($el => $el.checked = $el.value === "GASTO")
})

// EVENTO=submit RAIZ=document ACCION=registrar egreso de caja
d.addEventListener("submit", e => {
  e.preventDefault()
  let $form = e.target
  let expense = convertFormToObject($form)

  if (!expense.responsable) {
    ntf.error("Informacion requerida", "Seleccione el responsable o beneficiario")
  } else if (!expense.type) {
    ntf.error("Informacion requerida", "Seleccione el tipo de egreso sea para barberia o para un barbero.")
  } else if (expense.type !== "AJUSTE" && expense.value <= 0) {
    ntf.error("Informacion requerida", "Ingrese un valor mayor a cero")
  }
  const employeeExpenses = ["ADELANTO", "BEBIDA", "COMISION", "PROPINA", "SUELDO"];
  let isEmployeeExpense = employeeExpenses.includes(expense.type)
  if (isEmployeeExpense && expense.responsable.startsWith('ADM')) {
    ntf.error("Informacion requerida", "Para los egresos 'Para barbero' debe seleccionar el nombre de un barbero")
  }

  if (ntf.enabled) return

  switch (expense.type) {
    case "COMPRA":
      if (!expense.details) {
        ntf.error("Informacion requerida", "En 'Detalles' describa brevemente lo que se compro")
      }
      break;
    case "GASTO":
      if (!expense.details) {
        ntf.error("Informacion requerida", "En 'Detalles' describa brevemente el gasto")
      }
      break;
    case "BEBIDA":
      if (!expense.details) {
        ntf.error("Informacion requerida", "En 'Detalles' describa el numero y tipo de bebida: 1 agua, 1 pepsi")
      }
      break;
    default:
      break;
  }

  if (ntf.enabled) return

  insertExpenseDB(expense,
    (expenseData) => {
      ntf.okey(`Egreso de caja registrado: ${expenseData.type} Nro.${expenseData.voucher || expenseData.date}`)
      $form.reset()
    },
    error => ntf.errorAndLog("Egreso de caja NO registrado", error))

})