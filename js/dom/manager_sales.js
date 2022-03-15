import { ntf } from "../app.js";
import { dbRef } from "./firebase_conexion.js";

const d = document,
  collectionSales = 'ventas-test',
  collectionSalesDetails = 'ventas-detalles-test',
  collectionClients = 'clientes-test'


//------------------------------------------------------------------------------------------------
// Delegation of events
//------------------------------------------------------------------------------------------------



// --------------------------
// Database operations
// --------------------------

export function insertSalesDB(cart, callback) {
  let updates = {}

  // Cabecera de la venta
  let salesHeader = {
    ...JSON.parse(JSON.stringify(cart)),
    clienteId: cart.cliente.identificacion,
    clienteUid: cart.cliente.uid
  }
  let items = salesHeader.items
  delete salesHeader.items
  delete salesHeader.cliente
  delete salesHeader.valido
  delete salesHeader.update

  // Obtener la clave de la nueva venta
  const newSaleKey = dbRef.child(collectionSales).push().key;
  let i = 1
  // Detalles de la venta
  items = items.map((item) => {
    delete item.descripcion
    /**salesHeader.fecha,*/
    return {
      ...item,
      categoria: item.codigo.startsWith("S") ? "S" : "P",
      clienteId: salesHeader.clienteId,
      orden: i++,
      ventaUid: newSaleKey
    }
  })

  // Registrar venta
  updates[`${collectionSales}/${newSaleKey}`] = salesHeader
  // Registrar Detalles
  items.forEach(item => {
    let newDetailKey = dbRef.child(collectionSalesDetails).push().key;
    updates[`${collectionSalesDetails}/${newDetailKey}`] = item
  })
  // Actualizar datos del cliente
  updates[`${collectionClients}/${salesHeader.clienteUid}/ultimoServicio`] = salesHeader.searchDate
  //updates[`${collectionClients}/${salesHeader.cliente.uid}/referidos`] = firebase.database.ServerValue.increment(1)


  // Registrar la venta en la BD
  dbRef.update(updates, (error) => {
    if (error) {
      ntf.show("Venta no registrada",
        `No se pudo guardar la información de la venta al cliente: ${salesHeader.cliente.descripcion}. 
        A continuación el detalle del error: 
        ${error} `
        , "danger")
      // TODO: Guardar error en tabla con fecha, cart y error 
      console.log(`Error en el registro de la venta al cliente: ${salesHeader.cliente.descripcion}, error: ${error}`)
    } else {
      ntf.show("Venta registrada", `Se guardó correctamente la información de la venta Nro. ${cart.fecha}`)
      callback()
    }
  })

}

function saveSalesHeaderDB(cart) {
  let salesHeader = JSON.parse(JSON.stringify(cart))
  const cartItems = salesHeader.items
  delete salesHeader.items
  delete salesHeader.cliente.descripcion
  delete salesHeader.cliente.ultimoServicio
  delete salesHeader.cliente.referidos
  delete salesHeader.valido
  salesHeaderRef.push(salesHeader)
    .then(res => {
      saveSalesDetailsDB(salesHeader, cartItems)

    })
    .catch(error => {
      ntf.show("Cliente no registrado",
        `No se pudo guardar la información del cliente: ${clienteData.nombres}. 
        A continuación el detalle del error: 
        ${error} `,
        "danger")
      console.log(`Error en el registro de venta Nro.${salesHeader.fecha}, cliente: ${salesHeader.cliente.identificacion}`)
    })
}

function saveSalesDetailsDB(salesHeader, cartItems) {
  let i = 1
  cartItems.forEach(item => {
    delete item.descripcion
    item = {
      ...item,
      categoria: item.codigo.startsWith("S") ? "S" : "P",
      cliente: salesHeader.cliente.identificacion,
      orden: i++,
      venta: salesHeader.fecha,
    }
    if (item.codigo.startsWith("S")) {
      salesServicesRef.push(item)
    } else {
      salesProductsRef.push(item)
    }
  })
}

function updateClientDB(cart) {
  salesHeaderRef.push(salesHeader)
    .then(res => {
      renderClientes([clienteData])
      ntf.show("Cliente registrado", `Se guardó correctamente la información del nuevo cliente: ${clienteData.nombres}`)
    })
    .catch(error => {
      ntf.show("Cliente no registrado",
        `No se pudo guardar la información del cliente: ${clienteData.nombres}. 
        A continuación el detalle del error: 
        ${error} `,
        "danger")
      console.log("Error en el registro de cliente=")
    })
}