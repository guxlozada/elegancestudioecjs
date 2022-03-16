import { changeCartClient, ntf } from "../app.js";
import { hoyString } from "./fecha-util.js";
import { db } from "./firebase_conexion.js";

const d = document,
  clientsColletion = 'clients-test',
  clientsRef = db.ref(clientsColletion),
  $container = d.querySelector(".clients-container")

const searchById = async (vsSearch) => {
  console.log("vsSearch", vsSearch)
  let txtSearch = vsSearch.trim()
  const clientsData = [];
  console.log("vsSearch por id")
  await clientsRef.orderByChild("idNumber").startAt(txtSearch).endAt(txtSearch + '\uf8ff')
    .limitToFirst(10)
    .once('value')
    .then((snap) => {
      snap.forEach((child) => {
        clientsData.push({
          uid: child.key,
          ...child.val()
        });
      })
    })
    .catch((error) => {

      ntf.showTecnicalError("Búsqueda de cliente",
        `Se produjo un error inesperado, consulte con el técnico. 
      A continuación el detalle del error: ${error}`)
      console.log("error finding clients", error);
    })

  if (clientsData.length == 0) {
    console.log("vsSearch por name")
    let txtSearch = vsSearch.toLowerCase().trim()
    await clientsRef
      .orderByChild("searchLastname")
      .startAt(txtSearch)
      .endAt(txtSearch + "\uf8ff")
      .limitToFirst(10)
      .once('value')
      .then((snap) => {
        snap.forEach((child) => {
          clientsData.push({
            uid: child.key,
            ...child.val()
          });
        })

      })
      .catch((error) => {
        ntf.showTecnicalError("Búsqueda de cliente",
          `Se produjo un error inesperado, consulte con el técnico. 
        A continuación el detalle del error: ${error}`)
        console.log("error finding clients", error);
      })
  }
  renderClientes(clientsData)
}

// TODO: Verificar si se utiliza
export const updateClientBySale = async (uid, clientData, callbackOk, callbackError) => {
  await db.ref(`${clientsColletion}/${uid}`)
    .set(clientData)
    .then(res => { if (callbackOk) callbackOk(res) })
    .catch(error => { if (callbackError) callbackError(error) });
}


// ------------------------------------------------------------------------------------------------
// Delegation of events
// ------------------------------------------------------------------------------------------------

export default function handlerClients() {

  // EVENTO=click RAIZ=section<clientes> ACCION=buscar, crear actualizar clientes 
  $container.addEventListener("click", e => {
    console.log(`clientes .addEventListener click elemento ${e.target}, el click se origino en ${e.target.className}`)
    // Cliente seleccionado 
    if (e.target.matches(".trigger-cart-client") || e.target.closest(".trigger-cart-client")) {
      const $clientItem = e.target.closest(".trigger-cart-client")
      changeCartClient($clientItem)// Cambiar de venta al seleccionar un cliente
    }
  })

  d.querySelector(".trigger-client-search").addEventListener("click", e => {
    let textSearch = d.querySelector(".client-search-text").value
    if (textSearch) {
      searchById(textSearch)
    } else {
      ntf.show("Información requerida", "Ingrese la identificación o el nombre apellido del cliente para realizar la búsqueda.", "danger")
    }

  })

}

// --------------------------
// Database operations
// --------------------------

function insertClientDB(clienteData) {
  const registerClient = clientsRef.push();
  registerClient.set(clienteData)
    .then(res => {
      clienteData = {
        ...clienteData,
        uid: registerClient.path.pieces_[1]
      }
      renderClientes([clienteData])
      ntf.show("Cliente registrado", `Se guardó correctamente la información del nuevo cliente: ${clienteData.nombres}`)
    })
    .catch(error => {
      ntf.showTecnicalError("Cliente no registrado",
        `No se pudo guardar la información del cliente: ${clienteData.nombres}. 
        A continuación el detalle del error: 
        ${error} `)
      console.log("Error en el registro de cliente=")
    })
}

//TODO: Validar si se usa
export function updateClientBySaleDB(uid, clientData, callbackOk, callbackError) {
  db.ref(`${clientsColletion}/${uid}`)
    .set(clientData)
    .then(res => { if (callbackOk) callbackOk(res) })
    .catch(error => { if (callbackError) callbackError(error) });
}

function renderClientes(clientsDB) {
  $container.innerHTML = "";
  d.querySelector(".client-search-zero ").classList.add("is-hidden")
  if (clientsDB && clientsDB.length > 0) {
    const $template = d.getElementById("cliente-template").content,
      $fragment = d.createDocumentFragment();
    clientsDB.forEach(c => {
      $template.querySelector(".trigger-client-edit").dataset.uid = c.uid || "NULO"
      let $trigger = $template.querySelector(".trigger-cart-client")
      $trigger.dataset.uid = c.uid || "NULO"
      $trigger.dataset.name = c.name || "NULO"
      $trigger.dataset.idtype = c.idType || "NULO"
      $trigger.dataset.idnumber = c.idNumber || "NULO"
      $trigger.dataset.lastserv = c.lastService || hoyString()
      $trigger.dataset.referrals = c.referrals || 0
      $template.querySelector(".client-description").textContent = `${c.name} _ ${c.idType}: ${c.idNumber}`

      let $clone = d.importNode($template, true)
      $fragment.appendChild($clone)
    })
    $container.appendChild($fragment)
  } else {
    d.querySelector(".client-search-zero ").classList.remove("is-hidden")
  }
}
