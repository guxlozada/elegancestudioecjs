import { ntf } from "../app.js";
import { sellerDB } from "./firebase_collections.js";
import { db } from "./firebase_conexion.js";
import { changeSaleClient } from "./manager_sales.js";

const d = document,
  clientsRef = db.ref(sellerDB.clients),
  $container = d.querySelector(".clients-container")

//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------

export function renderClients(clientsDB) {
  $container.innerHTML = ""
  d.querySelector(".client-search-zero ").classList.add("is-hidden")
  if (clientsDB && clientsDB.length > 0) {
    const $template = d.getElementById("cliente-template").content,
      $fragment = d.createDocumentFragment();
    clientsDB.forEach(c => {
      $template.querySelector(".trigger-client-edit").dataset.uid = c.uid || "NULO"
      let $trigger = $template.querySelector(".trigger-sale")
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
      dbClientesByIdNumber(textSearch)
    } else {
      $container.innerHTML = ""
      ntf.error("Información requerida", "Ingrese la identificación o el nombre apellido del cliente para realizar la búsqueda.")
      d.querySelector(".client-search-text").focus()
    }
  })

  // EVENTO=click RAIZ=section<clientes> ACCION=crear venta con el cliente seleccionado 
  $container.addEventListener("click", e => {
    // Cliente seleccionado 
    if (e.target.matches(".trigger-sale") || e.target.closest(".trigger-sale")) {
      const $clientItem = e.target.closest(".trigger-sale")
      changeSaleClient($clientItem)// Cambiar de venta al seleccionar un cliente

      // Setear la busqueda
      $container.innerHTML = ""
      d.querySelector(".client-search-text").value = ""
    }
  })
}

// --------------------------
// Database operations
// --------------------------

const dbClientesByIdNumber = async (vsSearch) => {
  ////console.log("vsSearch", vsSearch || "vacio")

  const clientsData = [];
  ////console.log("vsSearch por id")
  if (vsSearch) {
    let txtSearch = vsSearch.trim()
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
        ntf.tecnicalError("Búsqueda de cliente", error)
      })

    if (clientsData.length == 0) {
      ////console.log("vsSearch por name")
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
          ntf.tecnicalError("Búsqueda de cliente", error)
        })
    }
  }
  renderClients(clientsData)
}