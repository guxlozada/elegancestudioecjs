import { findClientByIdNumber } from "../f_clients/dao_prod_clients.js"

const d = document,
  w = window

//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

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


function renderExpense({ stRaffleCupons: vsRaffleCupons }) {
  let $raffleCupons = d.querySelector(".raffle-cupons"),
    vaCupons = vsRaffleCupons && vsRaffleCupons.length > 1 ? vsRaffleCupons.split(" ") : []

  if (vaCupons.length > 0) {
    const $fragment = d.createDocumentFragment()
    vaCupons.forEach(numberCupon => {
      let $cupon = d.getElementById("cupon").content.cloneNode(true)
      $cupon.querySelector(".cupon-number").innerText = numberCupon
      $fragment.appendChild($cupon)
    })
    $raffleCupons.innerHTML = ""
    $raffleCupons.appendChild($fragment)
    d.querySelector(".congratulations").classList.remove("is-hidden")
  } else {
    d.querySelector(".congratulations").classList.add("is-hidden")
    $raffleCupons.innerHTML = `<div class="column has-text-white is-size-5-desktop is-size-6-touch m-0 p-0">
    <p>
      <span style="display: inline-block;">Aún no tienes cupones😔, </span>
      <span style="display: inline-block;">pero te </span>
      <span style="display: inline-block;">esperamos en </span>
      <span style="display: inline-block;"><b>ELEGANCE</b> STUDIO </span>
      <span style="display: inline-block;">para cambiar tu suerte😉</span>
    </p>
  </div>`
  }

}