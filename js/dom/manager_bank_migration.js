import { generarTxBySale } from "../util/bank_tx_generator.js";
import { dateIsValid, dateTimeToKeyDateString, formatToOperationDayStringEc, hoyEC, inputDateToDateTime } from "./fecha-util.js";
import { sellerDB } from "./firebase_collections.js";
import { db } from "./firebase_conexion.js";
import validAdminAccess, { cleanAdminAccess } from "./manager_user.js";
import navbarBurgers from "./navbar_burgers.js";
import NotificationBulma from './NotificacionBulma.js';

const d = document,
  w = window,
  ntf = new NotificationBulma(),
  depositsRef = db.ref(sellerDB.deposits),
  salesRef = db.ref(sellerDB.sales),
  bankRef = db.ref(sellerDB.bankReconciliation)

const filters = {
  periodStart: "20220801",
  periodEnd: "20220831"
}

//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

// EVENTO=load RAIZ=window 
w.addEventListener("load", e => {
  migrarDepositos()
  ////migrarVentas()
})


// --------------------------
// Database operations
// --------------------------

async function migrarDepositos() {
  let depositos = []
  await depositsRef.orderByKey()
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
  let ventas = [],
    vsDate = "20220801",
    vsDateEnd = "20220915"
  await salesRef.orderByKey().startAt(vsDate + "T").endAt(vsDateEnd + "\uf8ff")
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
  let key = formatToOperationDayStringEc(deposito.date)// Generar la clave del deposito
  console.log("deposito key=", key)
  db.ref(sellerDB.bankReconciliation + "/" + key).set(deposito)
    .catch((error) => {
      console.log(`Deposito migrado con error ${key}`, error)
    })
}

function saveVenta(sale) {
  let tx = generarTxBySale(sale)
  console.log("tx=", tx)
  // Generar la clave de la nueva venta
  console.log("tx key=", tx.saleUid)
  db.ref(sellerDB.bankReconciliation + "/" + tx.saleUid).set(tx)
    .catch((error) => {
      console.log(`Transaccion migrada con error ${tx.saleUid}`, error)
    })
}

