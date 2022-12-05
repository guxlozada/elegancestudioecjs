import { findClientByIdNumber } from "../f_customers/dao_prod_clients.js"

const d = document,
  w = window

//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

// EVENTO=load RAIZ=window 
w.addEventListener("load", () => console.log("Available Screen Width: " + screen.availWidth + ", Height: " + screen.availHeight))

// EVENTO=change RAIZ=button<search> ACCION=Realizar busqueda
d.addEventListener("submit", e => {
  e.preventDefault()
  const idClient = d.querySelector(".identification").value.trim()
  findClientByIdNumber(idClient,
    voCliente => renderExpense(voCliente || {}),
    error => {
      console.log("Errro en consulta de cupones", error)
      renderExpense()
    })
})


function renderExpense({ stFreeSixthCut: vnFreeSixthCut = -1 }) {
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