import { findProducts } from "../f_catalogs/dao_inv_products.js"

const d = document,
  w = window

//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

// EVENTO=load RAIZ=window 
w.addEventListener("load", () => search())

// EVENTO=DOMContentLoaded RAIZ=document ACCION: Termina de cargar el DOM
d.querySelector(".menu-container").addEventListener("mouseover", e => {
  const $img = e.target
  if ($img.dataset.hover) {
    $img.dataset.src = $img.src
    $img.src = $img.dataset.hover
  }
})

d.querySelector(".menu-container").addEventListener("mouseout", e => {
  const $img = e.target
  if ($img.dataset.src) {
    $img.src = $img.dataset.src
  }
})

function search() {
  let filters = {
    active: "true",
    category: "GAFAS"
  }//convertFormToObject($filtersForm)

  // Ejecutar consulta de informacion
  findProducts(filters,
    (vaRecords) => renderCatalog(vaRecords),
    error => console.error("Busqueda de productos con error", error))

}

function renderCatalog(vaRecords) {
  const $fragment = d.createDocumentFragment(),
    $container = d.querySelector(".menu-container")

  vaRecords.forEach(item => {
    let $prodItem = d.getElementById("product-item").content.cloneNode(true),
      $img = $prodItem.querySelector(".prod-img")

    $img.src = `/assets/menu_products/${item.code}.png`
    $img.dataset.hover = `/assets/menu_products/${item.code}-h.png`
    $img.alt = item.description
    $prodItem.querySelector(".description").innerText = item.description.replace("Gafas ", "")
    $prodItem.querySelector(".price").innerText = item.retailValue.toFixed(2)
    $fragment.appendChild($prodItem)
  })

  $container.innerHTML = "";
  $container.appendChild($fragment)
}
