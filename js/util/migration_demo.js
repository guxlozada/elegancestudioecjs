import { db } from "../persist/firebase_conexion.js";
import { collections } from "../persist/firebase_collections.js";
import { saleToBanktransaction } from "../f_bank_transactions/dao_bank_reconciliation.js";

const d = document,
  w = window,
  depositsRef = db.ref("prodseller-deposits"),
  salesRef = db.ref(collections.sales),
  periodStart = "20220801",
  periodEnd = "20220921"


//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

// EVENTO=load RAIZ=window 
w.addEventListener("load", e => {
  //migrarDepositos()
  //migrarVentas()
})

// --------------------------
// Database operations
// --------------------------

async function migrarDepositos() {
  let depositos = []
  await depositsRef.orderByKey().startAt(periodStart + "T").endAt(periodEnd + "\uf8ff")
    .once('value')
    .then((snap) => {
      ////console.log(snap.toJSON())
      snap.forEach((child) => {
        console.log(child.key)
        depositos.push(child.val())
      })
    })
    .catch((error) => {
      console.log(`Búsqueda de depositos con error`, error)
    })

  depositos.forEach(d => {
    console.log(d.searchDate)
    saveDeposito(d)
  })
}

async function migrarVentas() {
  const bankPayments = ["TRANSFERENCIA", "TCREDITO", "TDEBITO"]
  let ventas = []
  await salesRef.orderByKey().startAt(periodStart + "T").endAt(periodEnd + "\uf8ff")
    .once('value')
    .then((snap) => {
      ////console.log(snap.toJSON())
      snap.forEach((child) => {
        let sale = child.val()
        if (bankPayments.includes(sale.typePayment)) {
          console.log(child.key)
          ventas.push(sale)
        }
      })
    })
    .catch((error) => {
      console.log(`Búsqueda de depositos con error`, error)
    })

  ventas.forEach(v => {
    console.log(v.searchDate)
    saveVenta(v)
  })
}

function saveDeposito(deposito) {
  // Generar la clave de la nueva venta
  let key = formatToOperationDayStringEc(deposito.date) + "-DEP"// Generar la clave del deposito
  console.log("deposito key=", key)
  db.ref(collections.bankReconciliation + "/" + key).set(deposito)
    .catch((error) => {
      console.log(`Deposito migrado con error ${key}`, error)
    })
}

function saveVenta(sale) {
  let tx = saleToBanktransaction(sale)
  console.log("tx=", tx)
  if (tx) {
    let key = tx.saleUid + "-" + tx.type.slice(0, 3)
    // Generar la clave de la nueva venta
    console.log("tx key=", key)

    db.ref(collections.bankReconciliation + "/" + key).set(tx)
      .catch((error) => {
        console.log(`Transaccion migrada con error ${key}`, error)
      })
  }
}

/**
 * Format date to string 'yyyyMMddThhmmss'
 * @param { number} timestampUTC ONLY UTC Date in millisegundos
 */
function formatToOperationDayStringEc(timestampUTC) {
  return new Date(timestampUTC - tzoffset).toISOString().replace(/[^0-9T]/g, "").replace(/ +/, " ").slice(0, -3)
}

