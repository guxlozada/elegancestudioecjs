import { db, dbRef } from "./js/persist/firebase_conexion.js";
import { collections } from "./js/persist/firebase_collections.js";
import { roundFour, truncFour } from "./js/util/numbers-util.js";

const d = document,
  w = window,
  periodStart = "20210801",
  periodEnd = "20211031",
  types = ["TRANSFERENCIA", "TCREDITO", "TDEBITO"]

//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

// EVENTO=load RAIZ=window 
w.addEventListener("load", () => {
  //migrarDepositos()
  //migrarVentas()


})

d.getElementById("migrar").addEventListener("click", () => migrar())

function migrar() {
  let origen = "prodseller-expenses",
    destino = "prod-cash-outflows"

  dbRef.child(origen).orderByKey().startAt(periodStart + "T").endAt(periodEnd + "\uf8ff")
    .once('value')
    .then(snap => {
      console.log(`Empezo`)
      snap.forEach(child => {
        let uid = child.key
        console.log(`${uid}`)
        dbRef.child(destino).child(uid)
          .set(child.val())
          .catch(error => console.log(`${uid}no migrado con error ${uid}`, error))
      })
    })
    .catch(error => console.error(`MIgracion con error`, error))
}

async function migrarVentas() {
  dbRef.child("prodseller-sales").orderByKey().startAt(periodStart + "T").endAt(periodEnd + "\uf8ff")
    .once('value')
    .then(snap => {
      snap.forEach((child) => {
        let sale = child.val(),
          uid = child.key
        /////console.log("sale:" + JSON.stringify(snap, undefined, 2))
        console.log(`sales ${uid}`)
        if (types.includes(sale.typePayment)) {
          consultarTx(uid, sale)
        } else {
          consultarDetails(uid, sale)
        }
      })
    })
    .catch(error => console.error(`Búsqueda de ventas con error`, error))
}

function consultarTx(uid, sale) {
  let txUid = uid + "-" + sale.typePayment.slice(0, 3)
  dbRef.child("prodadmin-bank-reconciliation").orderByKey().equalTo(txUid).once('value')
    .then(snap => {
      console.log(`sales ${uid}, tx exists=${snap.exists()}`)
      if (snap.exists()) {
        snap.forEach(child => {
          let tx = child.val()
          tx.tmpUid = child.key
          console.log(`sales ${uid}, tx ${tx.tmpUid}`)
          consultarDetails(uid, sale, tx)
        })
      } else {
        console.error(`Búsqueda de tx con error ${uid}, deberia existir para ${sale.typePayment}`)
        consultarDetails(uid, sale)
      }
    })
    .catch(error => console.error(`Búsqueda de tx con error ${uid}`, error))
}

function consultarDetails(uid, sale, tx) {
  dbRef.child("prodseller-sales-details").orderByKey().startAt(uid).endAt(uid + "\uf8ff")
    .once('value')
    .then(snap => {
      let details = []
      snap.forEach(child => {
        let detail = child.val()
        detail.tmpUid = child.key
        console.log(`sales ${uid}, detail : ${detail.tmpUid}`)
        details.push(detail)
      })
      guardarMigracion(uid, sale, details, tx)
    })
    .catch(error => console.error(`Búsqueda de detalles con error ${uid}`, error))
}

function guardarMigracion(uid, sale, details, tx) {
  let updates = {}
  if (tx) {
    sale.bankTxUid = tx.tmpUid
    // delete tx.tmpUid
    // // Migrar la tx
    // updates[`${collections.newTx}/${sale.tx}`] = tx
  }
  sale.tipByBank = sale.tipByBank || 0
  sale.paymentTip = tx && tx.tipByBank ? tx.tipByBank : sale.tipByBank
  sale.paymentTotalSale = tx ? tx.value : sale.totalSale
  sale.paymentEffectiveSale = roundFour(sale.paymentTotalSale - sale.paymentTip)
  // Migrar la venta
  updates[`${collections.sales}/${uid}`] = sale
  let effectiveSale = sale.totalSale - sale.tipByBank
  details.forEach(det => {
    let detUid = det.tmpUid
    let unop = parseFloat(det.total) / 112
    det.paymentTotal = roundFour(det.total * sale.paymentEffectiveSale / effectiveSale)
    det.taxes = roundFour(unop * 12)
    let taxableIncome = det.total - det.taxes
    det.taxableIncome = roundFour(taxableIncome)
    det.barberCommission = truncFour(truncFour(taxableIncome) * det.sellerCommission / 100)

    // Migrar el detalles
    delete det.tmpUid
    updates[`${collections.salesDetails}/${detUid}`] = det
  })

  // Registrar la venta en la BD
  dbRef.update(updates, (error) => {
    if (error) {
      console.error(`ERROR: Venta ${uid} no migrada`, error)
    } else {
      console.log(`OK: Venta ${uid} migrada`)
    }
  })
}

//////////////////////////////////////////////////////////////////////////////////////
// Manejo de propiedades INICIO

function addProperty() {
  const collection = "removed-from-sales-details"
  newProperties = { "provider": "ELEGANCE" }
  crudProperties(collection, newProperties)
}

/**
 * AGREGAR, ACTUALIZAR PROPIEDADES DE UNA COLLECCION, PARA ELIMINAR ENVIAR null en el valor de la propiedad
 * @param {string} vsCollection 
 * @param {Object} voProperties 
 * @returns 
 */
function crudProperties(vsCollection, voProperties) {
  if (!vsCollection || !voProperties) return

  dbRef.child(vsCollection).orderByKey().once('value')
    .then(snap => {
      console.log(`vsCollection ${vsCollection}, snap exists=${snap.exists()}`)
      if (snap.exists()) {
        snap.forEach(child => {
          let tmpUid = child.key
          console.log(` reg ${tmpUid}`)
          updatePropertiesBD(vsCollection, tmpUid, voProperties)
        })
      }
    })
    .catch(error => console.error(`Busqueda en ${vsCollection} con error`, error))
}

function updatePropertiesBD(vsCollection, uid, voProperties) {
  let updates = {}
  for (const key in voProperties) {
    updates[`${vsCollection}/${uid}/${key}`] = voProperties[key]
  }

  // Registrar cambios en la BD
  dbRef.update(updates, error => {
    if (error) {
      console.error(`ERROR: ${vsCollection}/${uid} `, error)
    } else {
      console.log(`OK: ${vsCollection}/${uid}`)
    }
  })
}

// Manejo de propiedades FIN
//////////////////////////////////////////////////////////////////////////////////////


