import { findClientByIdNumber } from "../f_clients/dao_prod_clients.js"

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
  const idClient = d.querySelector(".identification").value
  findClientByIdNumber(idClient,
    (idClient, vsRaffleCupons) => renderExpense(idClient, vsRaffleCupons),
    (idClient, error) => {
      console.log("Errro en consulta de cupones", error)
      renderExpense(idClient)
    })
})


function renderExpense(vsIdClient, vsRaffleCupons) {

  let $raffleCupons = d.querySelector(".raffle-cupons")
  let vaCupons = vsRaffleCupons && vsRaffleCupons.length > 1 ? vsRaffleCupons.split(" ") : []

  $raffleCupons.classList.remove("is-hidden")

  if (vaCupons.length > 0) {
    const $fragment = d.createDocumentFragment()
    vaCupons.forEach(numberCupon => {
      let $cupon = d.getElementById("cupon").content.cloneNode(true)
      $cupon.querySelector(".cupon-number").innerText = numberCupon
      $fragment.appendChild($cupon)
    })
    $raffleCupons.innerHTML = ""
    $raffleCupons.appendChild($fragment)
  } else {
    $raffleCupons.innerHTML = `<div class="column is-expanded">
    <p class="has-text-white is-size-5">
      Aún no tienes cupones😔, pero te esperamos en <b>ELEGANCE</b> STUDIO para cambiar tu suerte😉
    </p>
  </div>`
  }

}