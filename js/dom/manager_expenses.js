import { changeCartClient, ntf } from "../app.js";
import { ahoraString, ahoraTimestamp, dateLocalTimezoneString, hoyString, timestampLocalTimezoneString } from "./fecha-util.js";
import { db, dbRef } from "./firebase_conexion.js";

const d = document,
  expensesColletion = 'gastos-test',
  depositsColletion = 'depositos-test',
  expensesRef = db.ref(expensesColletion),
  depositsRef = db.ref(depositsColletion)

const expenseIni = {
  date: null,
  responsable: null,
  type: null,
  amount: 0,
  voucher: null,
  details: null,
  valid: false
}

let expense = localStorage.getItem("EXPENSE") ? JSON.parse(localStorage.getItem("EXPENSE")) : JSON.parse(JSON.stringify(expenseIni))

export function changeExpense(reset) {
  let descartar = true
  if (!reset && expense.valid) {
    descartar = confirm(`Existe un(a) ${expense.type} pendiente de registrar. Que desea hacer: 
    ACEPTAR: descartar la anterior y crear una nueva; o, 
    CANCELAR: regresar a ${expense.type} anterior`)
  }
  if (descartar) {
    localStorage.removeItem("EXPENSE")
    expense = JSON.parse(JSON.stringify(expenseIni))
    expense.date = ahoraTimestamp()
    expense.searchDate = hoyString()
    expense.searchDateTime = timestampLocalTimezoneString(expense.date)
    updateExpense()
  } else {
    ntf.show(`${expense.type} pendiente de guardar`, `Recuerde registrar con el botón "Guardar" o 
    descartarla definitivamente con el botón "Cancelar"`)
  }
}

// Actualizar la compra/gasto
function updateExpense() {
  d.getElementById("expense-date").innerText = expense.searchDate
  d.getElementsByName("responsable").forEach($el => $el.checked = $el.value === expense.responsable)
  d.getElementsByName("expenseType").forEach($el => $el.checked = $el.value === expense.type)
  d.getElementById("expense-amount").value = expense.amount
  d.getElementById("expense-voucher").value = expense.voucher
  d.getElementById("expense-details").value = expense.details
}

// ------------------------------------------------------------------------------------------------
// Delegation of events
// ------------------------------------------------------------------------------------------------

const $expenseContainer = d.getElementById("expenses")

export default function handlerExpenses() {

  // EVENTO=click RAIZ=section<expenses> ACCION=Eliminar detalles
  $expenseContainer.addEventListener("click", e => {
    let $el = e.target
    console.log(`evento click target=${$el.classList}`, $el.value)

    if ($el.matches(".expense-save") || $el.closest(".expense-save")) {
      let error = false
      if (!expense.responsable) {
        ntf.show("Información requerida", "Seleccione el responsable", "danger")
      } else if (!expense.type) {
        ntf.show("Información requerida", "Seleccione el tipo", "danger")
      } else if (!expense.amount || expense.amount <= 0) {
        ntf.show("Información requerida", "Ingrese un valor mayor a cero", "danger")
      }
      if (!ntf.enabled) {
        switch (expense.type) {
          case "DEPOSITO":
            if (!expense.voucher) {
              ntf.show("Información requerida", "Ingrese el número del comprobante de depósito", "danger")
            } else if (!expense.details) {
              ntf.show("Información requerida", "Ingrese en detalles solo el nombre del banco", "danger")
            }
            break;
          case "COMPRA":
            if (!expense.details) {
              ntf.show("Información requerida", "Detalle brevemente lo que se compró", "danger")
            }
            break;
          case "GASTO":
            if (!expense.details) {
              ntf.show("Información requerida", "Detalle brevemente el gasto", "danger")
            }
            break;
          default:
            break;
        }
      }

      if (!ntf.enabled) {
        // Insertar la venta en la base de datos
        insertExpenseDB()
      }
    }

    if ($el.matches(".expense-cancel") || $el.closest(".expense-cancel")) {
      let eliminar = confirm(`Esta seguró que desea descartar la información de esta(e) ${expense.type}?`)
      if (eliminar) {
        ntf.show(`${expense.type} descartada`, `Se elimino la/el ${expense.type} sin guardar.`)
        changeExpense(true)
      }
    }
  })

  // EVENTO=change RAIZ=section<expenses> ACCION=detectar cambios en inputs 
  $expenseContainer.addEventListener("change", e => {
    let $input = e.target
    console.log(`evento change target = ${$input.classList} `, $input.value)
    if ($input.name === "responsable") {
      expense.responsable = $input.value
    } else if ($input.name === "expenseType") {
      expense.type = $input.value
    } else if ($input.name === "expenseAmount") {
      expense.amount = parseFloat($input.value)
    } else if ($input.name === "expenseVoucher") {
      expense.voucher = $input.value
    } else if ($input.name === "expenseDetails") {
      expense.details = $input.value
      // } else if ($input.name === "expenseDate") {
      //   // console.log("cart.fecha=", new Date(cart.fecha))
      //   expense.date = timestampInputDateToDateEc($input.value)
      //   console.log("despues expense.date=", new Date(expense.date))
    }
    localStorage.setItem("EXPENSE", JSON.stringify(expense))
  })

  // EVENTO=focusout RAIZ=section<servicios> ACCION=detectar cambios en inputs que deben refrescarv la pagina
  /**$expenseContainer.addEventListener("focusout", e => {
     // Si existe cambios en cantidad o descuento de items, se actualiza el carrito 
     if (expense.update) {
       expense.update = false
       updateExpense()
     }
   }) */

  changeExpense(false)
}

// --------------------------
// Database operations
// --------------------------

function insertExpenseDB() {
  expensesRef.push(expense)
    .then(res => {
      ntf.show(`${expense.type} registrado`, `Se guardó correctamente la información: ${expense.type} Nro.${expense.date}`)
      changeExpense(true)
    })
    .catch(error => {
      ntf.show("${expense.type} no registrado",
        `No se pudo guardar la información. A continuación el detalle del error: 
        ${error} `,
        "danger")
      console.log(`Error en el registro de: ${expense.type} Nro.${expense.date}`)
    })
}

