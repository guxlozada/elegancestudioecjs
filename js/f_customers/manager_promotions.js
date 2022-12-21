import { findClientByIdNumber } from "../f_customers/dao_prod_clients.js"
import { localdb } from "../repo-browser.js"

const d = document

//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

// EVENTO=DOMContentLoaded RAIZ=document ACCION: Termina de cargar el DOM
d.addEventListener("DOMContentLoaded", () => {
  let idClient = localStorage.getItem(localdb.tmpCustomerId)
  if (idClient) {
    d.querySelector(".identification").value = idClient
    findClientByIdNumber(idClient,
      voCliente => renderSearch(voCliente || {}),
      error => {
        console.log("Error en consulta de cupones", error)
      })
  }
})

// EVENTO=change RAIZ=button<search> ACCION=Realizar busqueda
d.addEventListener("submit", e => {
  e.preventDefault()
  const idClient = d.querySelector(".identification").value.trim()
  localStorage.setItem(localdb.tmpCustomerId, idClient)
  findClientByIdNumber(idClient,
    voCliente => renderSearch(voCliente || {}),
    error => {
      console.log("Error en consulta de cupones", error)
      renderSearch()
    })
})


function renderSearch({ stFreeSixthCut: vnFreeSixthCut = -1 }) {
  let $cuts = d.querySelector(".cuts"),
    $notRegistered = d.querySelector(".not-registered")

  if (vnFreeSixthCut === -1) {
    $notRegistered.classList.remove("is-hidden")
    $cuts.classList.add("is-hidden")
  } else {
    $notRegistered.classList.add("is-hidden")
    $cuts.classList.remove("is-hidden")
    for (let i = 1; i <= 6; i++) {
      let $cut = $cuts.querySelector(`.cut-${i}`)
      if (vnFreeSixthCut >= i) {
        $cut.classList.add("has-text-primary")
        $cut.classList.remove("has-text-grey-light")
      } else {
        $cut.classList.remove("has-text-primary")
        $cut.classList.add("has-text-grey-light")
      }
    }
    let msg
    switch (vnFreeSixthCut) {
      case 0:
        msg = "Empezamos👍"
        break;
      case 1:
      case 2:
      case 3:
        msg = "Avanzamos🙂"
        break;
      case 4:
      case 5:
        msg = "Estamos cerca🤯"
        break;
      default:
        msg = "🥳Servicio de cortesía disponible👏"
    }
    d.querySelector(".cut-msg").innerText = msg
  }

}