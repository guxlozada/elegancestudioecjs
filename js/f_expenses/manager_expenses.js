import navbarBurgers from "../dom/navbar_burgers.js"
import NotificationBulma from '../dom/NotificacionBulma.js'
import { addMinMaxPropsWithCashOutflowDates } from "../util/daily-data-cache.js"
import { hoyEC } from "../util/fecha-util.js"
import convertFormToObject, { resetForm } from "../util/form_util.js"
import { insertExpenseDB } from "./dao_seller_expenses.js"

const d = document,
  w = window,
  ntf = new NotificationBulma()

//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------

/**
 * Inicializa el formulario.
 */
function reset($form) {
  resetForm($form)
  d.querySelector(".expense-date").valueAsDate = hoyEC().toJSDate()
  d.getElementsByName("type").forEach($el => $el.checked = $el.value === "GASTO")
}

// ------------------------------------------------------------------------------------------------
// Delegation of events
// ------------------------------------------------------------------------------------------------
// EVENTO=load RAIZ=window ACCION= Terminar de cargar la ventana
w.addEventListener("load", () => {
  reset()
  addMinMaxPropsWithCashOutflowDates(".expense-date")
})

// EVENTO=DOMContentLoaded RAIZ=document ACCION: Termina de cargar el DOM
d.addEventListener("DOMContentLoaded", () => { navbarBurgers() })

// EVENTO=reset RAIZ=document ACCION=inicializar formulario
d.addEventListener("reset", e => {
  e.preventDefault()
  reset(e.target)
  ntf.show("Información", "Egreso de caja descartado.", "info")
})

// EVENTO=submit RAIZ=document ACCION=registrar egreso 
d.addEventListener("submit", e => {
  e.preventDefault()
  let $form = e.target
  let expense = convertFormToObject($form)

  if (!expense.responsable) {
    ntf.error("Información requerida", "Seleccione el responsable o beneficiario")
  } else if (!expense.type) {
    ntf.error("Información requerida", "Seleccione el tipo de egreso sea para barberia o para un barbero.")
  } else if (expense.type !== "AJUSTE" && expense.value <= 0) {
    ntf.error("Información requerida", "Ingrese un valor mayor a cero")
  }
  const employeeExpenses = ["ADELANTO", "BEBIDA", "COMISION", "PROPINA", "SUELDO"];
  let isEmployeeExpense = employeeExpenses.includes(expense.type)
  if (isEmployeeExpense && expense.responsable === 'ADMIN') {
    ntf.error("Información requerida", "Para los egresos 'Para barbero' no es permitido 'Beneficiario=Admin'")
  }

  if (!ntf.enabled) {
    switch (expense.type) {
      case "COMPRA":
        if (!expense.details) {
          ntf.error("Información requerida", "En 'Detalles' describa brevemente lo que se compró")
        }
        break;
      case "GASTO":
        if (!expense.details) {
          ntf.error("Información requerida", "En 'Detalles' describa brevemente el gasto")
        }
        break;
      case "BEBIDA":
        if (!expense.details) {
          ntf.error("Información requerida", "En 'Detalles' describa el numero y tipo de bebida: 1 agua, 1 pepsi")
        }
        break;
      default:
        break;
    }
  }
  if (!ntf.enabled) {
    insertExpenseDB(expense, (snap) => {
      let id = (snap.voucher && !snap.voucher.startsWith("00")) ? snap.voucher : snap.date
      ntf.show(`Egreso de caja registrado`, `Se guardó correctamente la información: ${snap.type} Nro.${id}`)
      reset($form)
    }, (error) => { ntf.tecnicalError("Egreso de caja no registrado", error) })
  }
})
