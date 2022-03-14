import { changeCartClient, ntf } from "../app.js";
import { ahoraTimestamp } from "./fecha-util.js";
import { db } from "./firebase_conexion.js";

const d = document,
  w = window,
  n = navigator

const searchById = async (vsSearch) => {
  console.log("vsSearch", vsSearch)
  let txtSearch = vsSearch.trim()
  const clientsData = [];
  console.log("vsSearch por id")
  await clientesRef.orderByChild("idNumero").startAt(txtSearch).endAt(txtSearch + '\uf8ff')
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
      console.log("error finding clients", error);
      ntf.show("Búsqueda de cliente",
        `Se produjo un error inesperado, consulte con el técnico. 
      A continuación el detalle del error: ${error}`, "danger", 30000)
    })

  if (clientsData.length == 0) {
    console.log("vsSearch por name")
    await clientesRef
      .orderByChild("nombres")
      .startAt(txtSearch).endAt(txtSearch + '\uf8ff')
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
        console.log("error finding clients", error);
        ntf.show("Búsqueda de cliente",
          `Se produjo un error inesperado, consulte con el técnico. 
        A continuación el detalle del error: ${error}`, "danger", 30000)
      })
  }

  renderClientes(clientsData)
}


//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

const clientesRef = db.ref('clientes'),
  $clientsContainer = d.querySelector(".clients-container")

export default function handlerClients() {

  // EVENTO=click RAIZ=section<clientes> ACCION=buscar, crear actualizar clientes 
  $clientsContainer.addEventListener("click", e => {
    console.log(`clientes .addEventListener click elemento ${e.target}, el click se origino en ${e.target.className}`)
    // Cliente seleccionado 
    if (e.target.matches(".cliente-selected") || e.target.closest(".cliente-selected")) {
      const $clienteItem = e.target.closest(".cliente-selected")
      changeCartClient($clienteItem)// Cambiar de venta al seleccionar un cliente
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

  // EVENTO=click RAIZ=div<client-edit> ACCION=buscar, crear actualizar clientes 
  d.getElementById("client-edit").addEventListener("submit", e => {
    //Prevenir la accion predeterminada que procesa los datos del formulario
    e.preventDefault()

    // Obtiene los campos que contienen la informacion del cliente
    const $clientesInput = document.getElementsByClassName("cliente-input")
    let clienteData = {}

    for (let i = 0, len = $clientesInput.length; i < len; i++) {
      let $input = $clientesInput[i]
      switch ($input.type) {
        case "radio":
          if (!$input.checked) break;
        default:
          if ($input.value) {
            let key = $input.getAttribute("data-key");
            let value = $input.value;
            clienteData[key] = value;
          }
      }
    }
    clienteData = {
      ...clienteData,
      estado: "A",
      ultimoServicio: ahoraTimestamp(),
      referidos: 0,
      aud: [{
        fecha: firebase.database.ServerValue.TIMESTAMP,
        usuario: localStorage.getItem("USER") || "LOCAL"
      }]
    }
    insertarClienteDB(clienteData)
    d.getElementById("client-edit-form").reset()
  })
}

// --------------------------
// Agregar
// --------------------------

function insertarClienteDB(clienteData) {
  /*  const newClient = clientesRef.push()
    clienteData = {
      ...clienteData,
      uid: newClient.path.pieces_[1]
    }
    newClient.set(clienteData) */
  clientesRef.push(clienteData)
    .then(res => {
      renderClientes([clienteData])
      ntf.show("Cliente registrado", `Se guardó correctamente la información del nuevo cliente: ${clienteData.nombres}`, "info")
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

function renderClientes(clientsDB) {
  $clientsContainer.innerHTML = "";
  d.querySelector(".client-search-zero ").classList.add("is-hidden")
  if (clientsDB && clientsDB.length > 0) {
    const $template = d.getElementById("cliente-template").content,
      $fragment = d.createDocumentFragment();
    clientsDB.forEach(c => {
      let $clienteSelected = $template.querySelector(".cliente-selected")
      $clienteSelected.dataset.uid = c.uid || "NULO"
      $clienteSelected.dataset.idtipo = c.idTipo || "NULO"
      $clienteSelected.dataset.idnumero = c.idNumero || "NULO"
      $clienteSelected.dataset.ultimo = c.ultimoServicio || ahoraTimestamp()
      $clienteSelected.dataset.refer = c.referidos || 0
      $template.querySelector(".item-details").textContent = `${c.nombres} [${c.idTipo} Nro.${c.idNumero}]`
      $template.querySelector(".trigger-client-edit").dataset.uid = c.uid || "NULO"

      let $clone = d.importNode($template, true)
      $fragment.appendChild($clone)
    })
    $clientsContainer.appendChild($fragment)
  } else {
    d.querySelector(".client-search-zero ").classList.remove("is-hidden")
  }
}
