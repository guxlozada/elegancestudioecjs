import { ntf } from "../app.js";
import { hoyString } from "./fecha-util.js";
import { db } from "./firebase_conexion.js";
import { changeCartClient } from "./manager_sales.js";

const d = document,
  clientsColletion = 'clients-test',
  clientsRef = db.ref(clientsColletion),
  $container = d.querySelector(".clients-container")

//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------

export function renderClients(clientsDB) {
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
      $trigger.dataset.lastserv = c.lastService || "Ninguno"
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

// ------------------------------------------------------------------------------------------------
// Delegation of events
// ------------------------------------------------------------------------------------------------

export default function handlerClients() {

  // EVENTO=click RAIZ=button<trigger-client-search> ACCION=buscar clientes 
  d.querySelector(".trigger-client-search").addEventListener("click", e => {
    let textSearch = d.querySelector(".client-search-text").value
    if (textSearch) {
      searchById(textSearch)
    } else {
      ntf.show("Información requerida", "Ingrese la identificación o el nombre apellido del cliente para realizar la búsqueda.", "danger")
    }
  })

  // EVENTO=click RAIZ=section<clientes> ACCION=crear venta con el cliente seleccionado 
  $container.addEventListener("click", e => {
    ////console.log(`clientes .addEventListener click elemento ${e.target}, el click se origino en ${e.target.className}`)
    // Cliente seleccionado 
    if (e.target.matches(".trigger-cart-client") || e.target.closest(".trigger-cart-client")) {
      const $clientItem = e.target.closest(".trigger-cart-client")
      changeCartClient($clientItem)// Cambiar de venta al seleccionar un cliente
    }
  })
}

// --------------------------
// Database operations
// --------------------------

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
      ntf.showTecnicalError("Búsqueda de cliente", error)
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
        ntf.showTecnicalError("Búsqueda de cliente", error)
      })
  }
  renderClients(clientsData)
}