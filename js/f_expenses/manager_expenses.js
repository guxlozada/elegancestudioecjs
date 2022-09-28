import navbarBurgers from "../dom/navbar_burgers.js"
import NotificationBulma from '../dom/NotificacionBulma.js'
import { hoyEC } from "../util/fecha-util.js"
import convertFormToObject from "../util/form_util.js"
import { insertExpenseDB } from "./dao_seller_expenses.js"

const d = document,
  w = window,
  ntf = new NotificationBulma(),
  $container = d.getElementById("expenses")

//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------

/**
 * Inicializa el formulario.
 */
function reset() {
  // TODO: Descomentar cuando nuevamente se bloquea la fecha a la actual
  //d.getElementById("expense-date").value = expense.searchDate
  d.getElementById("expense-date-input").valueAsDate = hoyEC().toJSDate()
  d.getElementsByName("responsable").forEach($el => $el.checked = $el.checked = false)
  d.getElementsByName("type").forEach($el => $el.checked = $el.value === "GASTO")
  d.getElementById("value").value = ""
  d.getElementById("voucher").value = ""
  d.getElementById("details").value = ""
}

// ------------------------------------------------------------------------------------------------
// Delegation of events
// ------------------------------------------------------------------------------------------------
// EVENTO=load RAIZ=window ACCION= Terminar de cargar la ventana
w.addEventListener("load", () => { reset() })

// EVENTO=DOMContentLoaded RAIZ=document ACCION: Termina de cargar el DOM
d.addEventListener("DOMContentLoaded", () => { navbarBurgers() })

// EVENTO=reset RAIZ=section<expenses> ACCION=inicializar formulario
$container.addEventListener("reset", e => {
  e.preventDefault()
  reset()
})

// EVENTO=submit RAIZ=section<expenses> ACCION=registrar egreso 
$container.addEventListener("submit", e => {
  e.preventDefault()

  let expense = convertFormToObject($container)

  if (!expense.responsable) {
    ntf.error("Información requerida", "Seleccione el responsable o beneficiario")
  } else if (!expense.type) {
    ntf.error("Información requerida", "Seleccione el tipo de egreso sea para barberia o para un barbero.")
  } else if (!expense.value) {
    ntf.error("Información requerida", "Ingrese un valor")
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
      ntf.show(`${snap.type} registrado`, `Se guardó correctamente la información: ${snap.type} Nro.${id}`)
      reset()
    }, () => { ntf.tecnicalError("Egreso no registrado", error) })
  }
})
