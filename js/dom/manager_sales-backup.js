import { ntf } from "../app.js";
import { dbRef } from "./firebase_conexion.js";

const d = document
/* collectionSales = 'sales-test',
collectionSalesDetails = 'sales-details-test',
collectionClients = 'clients-test' */

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
    clientId: cart.client.idNumber,
    clientUid: cart.client.uid
  }
  let items = salesHeader.items
  delete salesHeader.items
  delete salesHeader.client
  delete salesHeader.valid
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
      category: item.codigo.startsWith("S") ? "S" : "P",// TODO: Cambiar con el codigo a una categoria en los catalogos
      clientId: salesHeader.clientId,
      order: i++,
      saleUid: newSaleKey
    }
  })

  // Registrar venta
  updates[`${collectionSales}/${newSaleKey}`] = salesHeader
  let existService
  // Registrar Detalles
  items.forEach(item => {
    let newDetailKey = dbRef.child(collectionSalesDetails).push().key;
    updates[`${collectionSalesDetails}/${newDetailKey}`] = item
  })
  // Actualizar datos del cliente
  updates[`${collectionClients}/${salesHeader.clientUid}/lastService`] = salesHeader.searchDate


  // Registrar la venta en la BD
  dbRef.update(updates, (error) => {
    if (error) {
      ntf.show("Venta no registrada",
        `No se pudo guardar la información de la venta al cliente: ${salesHeader.client.descripcion}. 
        A continuación el detalle del error: 
        ${error} `
        , "danger")
      // TODO: Guardar error en tabla con fecha, cart y error 
      console.log(`Error en el registro de la venta al cliente: ${salesHeader.client.description}, error: ${error}`)
    } else {
      ntf.show("Venta registrada", `Se guardó correctamente la información de la venta Nro. ${cart.date}`)
      callback()
    }
  })

}