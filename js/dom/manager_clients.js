import { db } from "../persist/firebase_conexion.js";
import { collections } from "../persist/firebase_collections.js";
import { changeSaleClient } from "../f_sales/manager_shop_sales.js";
import NotificationBulma from "./NotificacionBulma.js";

const d = document,
  ntf = new NotificationBulma(),
  clientsRef = db.ref(collections.customers),
  $container = d.querySelector(".clients-container")

//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------

export function renderClients(clientsDB) {
  $container.innerHTML = ""
  d.querySelector(".client-search-zero ").classList.add("is-hidden")
  if (clientsDB && clientsDB.length > 0) {
    const $fragment = d.createDocumentFragment()
    clientsDB.forEach(c => {
      let $template = d.getElementById("cliente-template").content.cloneNode(true)
      let $trigger = $template.querySelector(".trigger-sale")
      $trigger.dataset.uid = c.uid || "NULO"
      $trigger.dataset.name = c.name || "NULO"
      $trigger.dataset.idtype = c.idType || "NULO"
      $trigger.dataset.idnumber = c.idNumber || "NULO"
      $trigger.dataset.referrals = c.referrals || 0
      //TODO: Promocion del sexto corte gratis
      $trigger.dataset.stFreeSixthCut = c.stFreeSixthCut || 0
      $trigger.dataset.stTotalServices = c.stTotalServices || 0
      if (c.stLastService) $trigger.dataset.stLastService = c.stLastService
      $template.querySelector(".client-description").textContent = `${c.name} _ ${c.idType}: ${c.idNumber}`

      $fragment.appendChild($template)
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