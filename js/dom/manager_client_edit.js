import { hoyEC } from "../util/fecha-util.js";
import { dbRef } from "../persist/firebase_conexion.js";
import { collections } from "../persist/firebase_collections.js";
import { renderClients } from "./manager_clients.js";
import { localdb } from "../repo-browser.js";
import NotificationBulma from "./NotificacionBulma.js";

const d = document,
  ntf = new NotificationBulma()

const clientInit = {
  name: null,
  idType: "CEDULA",// [CEDULA,PASAPORTE,RUC,OTRO]
  idNumber: null,
  email: null,
  city: "Manta",
  birthdate: null,
  cellphone: null,
  referred: null,
  registeredBy: "ADMIN",
  valid: false
}

// Variable global para manejo del cliente que se registra/edita
let client

/* 
  Esto es como los metodos son definido en el prototipo 
  de cualquier Objecto incorporado 
*/
Object.defineProperty(String.prototype, 'capitalizarPrimeraLetra', {
  value: function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
  },
  writable: true, // Asi, puede sobreescribirse más tarde
  configurable: true // Asi, puede borrarse más tarde
});

export function changeClient(reset) {
  let discard = true
  if (!reset && client.valid) {
    discard = confirm(`Existe la información de un cliente pendiente de registrar. Que desea hacer: 
    ACEPTAR: descartar la anterior y crear un nuevo cliente; o, 
    CANCELAR: regresar al cliente anterior`)
  }
  if (discard) {
    localStorage.removeItem(localdb.client)
    client = JSON.parse(JSON.stringify(clientInit))
    updateClient()
  } else {
    ntf.show("Cliente pendiente de guardar", `Recuerde registrar con el botón "Guardar" o 
    descartarla definitivamente con el botón "Cancelar"`)
  }
}

// Actualizar el formulario del cliente
function updateClient() {
  d.getElementById("client-name").value = client.name
  d.getElementsByName("idType").forEach($el => $el.checked = $el.value === client.idType)
  d.getElementById("client-idnumber").value = client.idNumber
  d.getElementById("client-email").value = client.email
  d.getElementById("client-city").value = client.city
  // No se implementa el cumpleanios debido a la conversion de fecha
  d.getElementById("client-cellphone").value = client.cellphone
  d.getElementById("client-referred").value = client.referred
  d.getElementsByName("registeredBy").forEach($el => $el.checked = $el.value === client.registeredBy)
  // Almacenar el gastoen el local storage
  localStorage.setItem(localdb.client, JSON.stringify(client))
}

// ------------------------------------------------------------------------------------------------
// Delegation of events
// ------------------------------------------------------------------------------------------------

export default function handlerClientEdit() {
  // Verificar si se debe cargar un cliente almacenado o inicializar
  client = JSON.parse(localStorage.getItem(localdb.client) ? localStorage.getItem(localdb.client) : JSON.stringify(clientInit))
  changeClient(false)

  // EVENTO=click RAIZ=button<client-save> ACCION=crear y actualizar clientes 
  d.querySelector(".client-save").addEventListener("click", e => {
    ////console.log(`client-save click target=${e.target.classList}`, e.target.value)

    // Almacenar el cliente en el local storage
    localStorage.setItem(localdb.client, JSON.stringify(client))

    // Obtiene los campos que contienen la informacion del cliente
    const $clientInput = d.getElementsByClassName("client-input")
    for (let i = 0, len = $clientInput.length; i < len; i++) {
      let $input = $clientInput[i]
      switch ($input.type) {
        case "radio":
          if (!$input.checked) break;
        default:
          if ($input.value) {
            let key = $input.getAttribute("data-key");
            let value = $input.value;
            client[key] = value;
          }
      }
    }
    // Ya se realizo al menos primer volcado de data
    client.valid = true
    if (!client.name) {
      ntf.error("Información requerida", "Ingrese el nombre y apellido del cliente")
    } else if (!client.idNumber) {
      ntf.error("Información requerida", "Ingrese la identificación del cliente")
    } else if (!client.registeredBy) {
      ntf.error("Información requerida", "Seleccione quien registra al cliente")
    }
    if (ntf.enabled) return

    let clientData = JSON.parse(JSON.stringify(client))
    insertClientDB(clientData)
  })

  // EVENTO=click RAIZ=button<client-cancel> ACCION=Reset form
  d.querySelector(".client-cancel").addEventListener("click", e => {
    ////console.log(`client-cancel click target=${e.target.classList}`, e.target.value)

    let eliminar = confirm("Esta seguró que desea descartar la información de este cliente?")
    if (eliminar) {
      changeClient(true)
      d.querySelector(".client-search-text").focus()
    }
  })
}

// --------------------------
// Database operations
// --------------------------

function insertClientDB(clientData) {
  let names = clientData.name.toLowerCase().split(/\s+/)

  //Complementar informacion por omision
  clientData = {
    ...clientData,
    searchLastname: names.length > 1 ? names[1] : names[0],
    name: names.map((el) => el.capitalizarPrimeraLetra()).join(" "),
    active: true,
    referrals: 0,
    aud: [{
      date: firebase.database.ServerValue.TIMESTAMP,
      registeredBy: client.registeredBy || "LOCAL"
    }]
  }
  delete clientData.valid
  delete clientData.registeredBy

  // Obtener la clave del cliente
  const key = clientData.idNumber + '-' + (clientData.searchLastname.toUpperCase() || hoyEC().toUnixInteger())
  clientData.uid = key

  let updates = {}
  // Registrar datos del cliente
  updates[`${collections.clients}/${key}`] = clientData
  // TODO  Actualizar referido si aplica

  // Registrar el cliente en la BD
  dbRef.update(updates, (error) => {
    if (error) {
      ntf.tecnicalError("Cliente no registrado", error)
    } else {
      d.getElementById("client-edit-form").reset()
      changeClient(true)
      renderClients([clientData])
      ntf.show("Registro de cliente", `Se guardó correctamente la información del cliente: ${clientData.name}`)
      d.querySelector('.client-search-text').focus()
    }
  })
}

