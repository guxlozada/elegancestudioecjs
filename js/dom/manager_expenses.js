import { ntf } from "../app.js";
import { addHours, dateIsValid, dateToStringEc, formatToOperationDayStringEc, nowEc, timestampEc, todayEc, todayEcToString } from "./fecha-util.js";
import { sellerDB } from "./firebase_collections.js";
import { dbRef } from "./firebase_conexion.js";

const d = document,
  $container = d.getElementById("expenses")

const expenseIni = {
  date: null,
  responsable: null,
  type: "GASTO",//[ADELANTO,AJUSTE,COMPRA,DEPOSITO,GASTO]
  value: null,
  voucher: null,
  details: null,
  valid: false
}

let expense = JSON.parse(JSON.stringify(expenseIni))
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
    expense = JSON.parse(JSON.stringify(expenseIni))
    expense.date = timestampEc()
    expense.searchDate = todayEcToString()
    expense.searchDateTime = new Date(expense.date).toLocaleString()
    updateExpense()
  } else {
    ntf.show(`${expense.type} pendiente de guardar`, `Recuerde registrar con el botón "Guardar" o 
    descartarla definitivamente con el botón "Cancelar"`)
  }
}

// Actualizar el formulario de la compra/gasto
function updateExpense() {
  // TODO: Descomentar cuando nuevamente se bloquea la fecha a la actual
  //d.getElementById("expense-date").value = expense.searchDate
  d.getElementById("expense-date-input").valueAsDate = todayEc()
  d.getElementsByName("responsable").forEach($el => $el.checked = $el.value === expense.responsable)
  d.getElementsByName("expenseType").forEach($el => $el.checked = $el.value === expense.type)
  d.getElementById("expense-value").value = expense.value
  d.getElementById("expense-voucher").value = expense.voucher
  d.getElementById("expense-details").value = expense.details
}

// ------------------------------------------------------------------------------------------------
// Delegation of events
// ------------------------------------------------------------------------------------------------

export default function handlerExpenses() {
  // TODO: Eliminar cuando nuevamente se bloquea la fecha a la actual
  // EVENTO=change RAIZ=section<servicios> ACCION=detectar cambios en inputs 
  d.getElementById("expenses").addEventListener("change", e => {
    let $input = e.target
    if ($input.name === "expenseDate" && dateIsValid($input.value)) {
      console.log("expense.date=", new Date(expense.date))
      let vdOther = addHours(new Date($input.value), 5)
      // Agregar la hora y minuto actual de datos
      let now = nowEc()
      vdOther.setHours(now.getHours(), now.getMinutes(), now.getSeconds())
      expense.date = vdOther.getTime()
      expense.searchDate = dateToStringEc(vdOther)
      expense.searchDateTime = vdOther.toLocaleString()
      console.log("despues expense.date=", new Date(expense.date))
    }
  })

  // EVENTO=submit RAIZ=section<expenses> ACCION=crear compra/gasto 
  $container.addEventListener("submit", e => {
    //Prevenir la accion predeterminada que procesa los datos del formulario
    e.preventDefault()

    // Obtiene los campos que contienen la informacion de la compra/gasto
    const $expenseInput = d.getElementsByClassName("expense-input")
    for (let i = 0, len = $expenseInput.length; i < len; i++) {
      let $input = $expenseInput[i]
      switch ($input.type) {
        case "radio":
          if (!$input.checked) break
        default:
          if ($input.value) {
            let key = $input.getAttribute("data-key")
            let value = $input.value
            if ($input.name === "expenseValue") {
              expense[key] = parseFloat(value)
            } else {
              expense[key] = value
            }

          }
      }
    }
    // Ya se realizo al menos primer volcado de data
    expense.valid = true
    if (!expense.responsable) {
      ntf.error("Información requerida", "Seleccione el responsable")
    } else if (!expense.type) {
      ntf.error("Información requerida", "Seleccione el tipo de documento")
    } else if (!expense.value) {
      ntf.error("Información requerida", "Ingrese un valor")
    } else if (expense.type !== "AJUSTE" && expense.value <= 0) {
      ntf.error("Información requerida", "Ingrese un valor mayor a cero")
    }
    if (!ntf.enabled) {
      switch (expense.type) {
        case "DEPOSITO":
          if (!expense.voucher) {
            ntf.error("Información requerida", "Ingrese el número del comprobante de depósito")
          }
          break;
        case "COMPRA":
          if (!expense.details) {
            ntf.error("Información requerida", "Detalle brevemente lo que se compró")
          }
          break;
        case "GASTO":
          if (!expense.details) {
            ntf.error("Información requerida", "Detalle brevemente el gasto")
          }
          break;
        default:
          break;
      }
    }
    if (!ntf.enabled) {
      let expenseData = JSON.parse(JSON.stringify(expense))
      insertExpenseDB(expenseData, expense.type === "DEPOSITO")
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

function insertExpenseDB(expenseData, vbDeposit) {
  //Complementar informacion por omision
  delete expenseData.valid

  // Registrar la compra/gasto en la BD TODO: CAMBIAR POR SET
  let updates = {}
  // depositos se registra en una collecion diferente
  let collection = sellerDB.deposits,
    key = formatToOperationDayStringEc(expenseData.date)// Generar la clave del compra/gasto
  if (!vbDeposit) {
    collection = sellerDB.expenses
    if (expenseData.type === "COMISION") {
      key += "-CMI"
    } else {
      key += "-" + expenseData.type.slice(0, 3)
    }
  }
  updates[`${collection}/${key}`] = expenseData

  dbRef.update(updates, (error) => {
    if (error) {
      ntf.tecnicalError(`${expenseData.type} no registrado`, error)
    } else {
      let idExpense = expenseData.voucher ? expenseData.voucher : expenseData.date
      ntf.show(`${expenseData.type} registrado`, `Se guardó correctamente la información: ${expenseData.type} Nro.${idExpense}`)
      changeExpense(true)
    }
  })

}
