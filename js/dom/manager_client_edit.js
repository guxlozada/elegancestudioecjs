import { ntf } from "../app.js";
import { hoyString } from "./fecha-util.js";
import { db } from "./firebase_conexion.js";
import { renderClients } from "./manager_clients.js";

const d = document,
  clientsColletion = 'clients-test',
  clientsRef = db.ref(clientsColletion),
  $container = d.getElementById("client-edit")

const clientIni = {
  name: null,
  idType: "CEDULA",
  idNumber: null,
  email: null,
  city: "Manta",
  birthdate: null,
  cellphone: null,
  referred: null,
  valid: false
}

let client = localStorage.getItem("CLIENT") ? JSON.parse(localStorage.getItem("CLIENT")) : JSON.parse(JSON.stringify(clientIni))
changeClient(false)

export function changeClient(reset) {
  let discard = true
  if (!reset && client.valid) {
    discard = confirm(`Existe la información de un cliente pendiente de registrar. Que desea hacer: 
    ACEPTAR: descartar la anterior y crear un nuevo cliente; o, 
    CANCELAR: regresar al cliente anterior`)
  }
  if (discard) {
    localStorage.removeItem("CLIENT")
    client = JSON.parse(JSON.stringify(clientIni))
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
  localStorage.setItem("CLIENT", JSON.stringify(client))
}

// ------------------------------------------------------------------------------------------------
// Delegation of events
// ------------------------------------------------------------------------------------------------

export default function handlerClientEdit() {

  // EVENTO=submit RAIZ=section<client-edit> ACCION=crear y actualizar clientes 
  d.querySelector(".client-save").addEventListener("click", e => {
    ////console.log(`client-save click target=${e.target.classList}`, e.target.value)

    // Almacenar el cliente en el local storage
    localStorage.setItem("CLIENT", JSON.stringify(client))

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
      ntf.show("Información requerida", "Ingrese el nombre y apellido del cliente", "danger")
    } else if (!client.idNumber) {
      ntf.show("Información requerida", "Ingrese la identificación del cliente", "danger")
    } else if (!client.registeredBy) {
      ntf.show("Información requerida", "Seleccione quien registra al cliente", "danger")
    }
    if (!ntf.enabled) {
      insertClientDB(JSON.parse(JSON.stringify(client)))
    }
  })

  // EVENTO=reset RAIZ=section<client-edit> ACCION=Reset form
  d.querySelector(".client-cancel").addEventListener("click", e => {
    ////console.log(`client-cancel click target=${e.target.classList}`, e.target.value)

    let eliminar = confirm("Esta seguró que desea descartar la información de este cliente?")
    if (eliminar) {
      changeClient(true)
    }
  })
}

// --------------------------
// Database operations
// --------------------------

function insertClientDB(clientData) {
  let names = clientData.name.toLowerCase().split(/\s+/)
  if (names.length > 1) {
    clientData.searchLastname = names[1]
  }

  //Complementar informacion por omision
  clientData = {
    ...clientData,
    active: true,
    referrals: 0,
    aud: [{
      date: firebase.database.ServerValue.TIMESTAMP,
      registeredBy: client.registeredBy || "LOCAL"
    }]
  }
  delete clientData.valid
  delete clientData.uid
  delete clientData.registeredBy

  // insertar en la DB
  clientsRef.push(clientData)
    .then(res => {
      ntf.show("Registro de cliente", `Se guardó correctamente la información del cliente: ${client.name}`)
      console.log("new cli", res, res.key)
      changeClient(true)
      clientData.uid = res.key
      renderClients([clientData])
    })
    .catch(error => {
      ntf.showTecnicalError("Cliente no registrado", error)
    })
}

