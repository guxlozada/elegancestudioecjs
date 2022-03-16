import { ntf } from "../app.js";
import { ahoraTimestamp, hoyString, timestampLocalTimezoneString } from "./fecha-util.js";
import { db } from "./firebase_conexion.js";

const d = document,
  expensesColletion = 'expenses-test',
  depositsColletion = 'deposits-test',
  expensesRef = db.ref(expensesColletion),
  depositsRef = db.ref(depositsColletion),
  $container = d.getElementById("expenses")

const expenseIni = {
  date: null,
  responsable: null,
  type: "GASTO",
  value: null,
  voucher: null,
  details: null,
  valid: false
}

let expense = localStorage.getItem("EXPENSE") ? JSON.parse(localStorage.getItem("EXPENSE")) : JSON.parse(JSON.stringify(expenseIni))
changeExpense(false)

//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------

export function changeExpense(reset) {
  let discart = true
  if (!reset && expense.valid) {
    discart = confirm(`${expense.type} pendiente de registrar. Que desea hacer: 
    ACEPTAR: descartar la anterior y crear una nueva; o, 
    CANCELAR: regresar a la anterior`)
  }
  if (discart) {
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

// Actualizar el formulario de la compra/gasto
function updateExpense() {
  d.getElementById("expense-date").value = expense.searchDate
  d.getElementsByName("responsable").forEach($el => $el.checked = $el.value === expense.responsable)
  d.getElementsByName("expenseType").forEach($el => $el.checked = $el.value === expense.type)
  d.getElementById("expense-value").value = expense.value
  d.getElementById("expense-voucher").value = expense.voucher
  d.getElementById("expense-details").value = expense.details
  // Almacenar el gastoen el local storage
  localStorage.setItem("EXPENSE", JSON.stringify(expense))
}

// ------------------------------------------------------------------------------------------------
// Delegation of events
// ------------------------------------------------------------------------------------------------

export default function handlerExpenses() {

  // EVENTO=submit RAIZ=section<expenses> ACCION=crear compra/gasto 
  $container.addEventListener("submit", e => {
    //Prevenir la accion predeterminada que procesa los datos del formulario
    e.preventDefault()

    // Almacenar la compra/gasto en el local storage
    localStorage.setItem("EXPENSE", JSON.stringify(expense))

    // Obtiene los campos que contienen la informacion de la compra/gasto
    const $expenseInput = d.getElementsByClassName("expense-input")
    for (let i = 0, len = $expenseInput.length; i < len; i++) {
      let $input = $expenseInput[i]
      switch ($input.type) {
        case "radio":
          if (!$input.checked) break;
        default:
          if ($input.value) {
            let key = $input.getAttribute("data-key");
            let value = $input.value;
            expense[key] = value;
          }
      }
    }
    // Ya se realizo al menos primer volcado de data
    expense.valid = true
    if (!expense.responsable) {
      ntf.show("Información requerida", "Seleccione el responsable", "danger")
    } else if (!expense.type) {
      ntf.show("Información requerida", "Seleccione el tipo de documento", "danger")
    } else if (!expense.value || expense.value <= 0) {
      ntf.show("Información requerida", "Ingrese un valor mayor a cero", "danger")
    }
    if (!ntf.enabled) {
      switch (expense.type) {
        case "DEPOSITO":
          if (!expense.voucher) {
            ntf.show("Información requerida", "Ingrese el número del comprobante de depósito", "danger")
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
      let expenseData = JSON.parse(JSON.stringify(expense))
      if (expense.type === "DEPOSITO")
        insertDepositsDB(expenseData)
      else
        insertExpenseDB(expenseData)
    }
  })

  // EVENTO=reset RAIZ=section<expenses> ACCION=Reset form
  $container.addEventListener("reset", e => {
    //Prevenir la accion predeterminada que procesa los datos del formulario
    e.preventDefault()

    let eliminar = confirm(`Esta seguró que desea descartar la información del ${expense.type}?`)
    if (eliminar) {
      changeExpense(true)
    }
  })
}

// --------------------------
// Database operations
// --------------------------

function insertExpenseDB() {
  //Complementar informacion por omision
  delete expense.valid

  // insertar en la DB
  expensesRef.push(expense)
    .then(res => {
      let idExpense = expense.voucher ? expense.voucher : expense.date
      ntf.show(`Registro de ${expense.type}`, `Se guardó correctamente la información: ${expense.type} Nro.${idExpense}`)
      changeExpense(true)
    })
    .catch(error => {
      ntf.showTecnicalError(`${expense.type} no registrado`, error)
    })
}

function insertDepositsDB() {
  //Complementar informacion por omision
  delete expense.valid

  // insertar en la DB
  depositsRef.push(expense)
    .then(res => {
      ntf.show(`Registro de depósito`, `Se guardó correctamente la información del depósito Nro.${expense.voucher}`)
      changeExpense(true)
    })
    .catch(error => {
      ntf.showTecnicalError("Deposito no registrado", error)
    })
}

