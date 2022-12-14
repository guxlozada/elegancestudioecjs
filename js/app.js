import modalToggle from "./dom/modal_toggle.js";
import navbarBurgers from "./dom/navbar_burgers.js";
import NotificationBulma from './dom/NotificacionBulma.js';
import handlerClients from "./dom/manager_clients.js";
import handlerClientEdit from "./dom/manager_client_edit.js";
import handlerSales, { addToSale } from "./dom/manager_sales.js";
import { services } from "./dom/catalog_services.js";
import { servicesEneglimar } from "./dom/catalog_services_eneglimar.js";
import { products } from "./dom/catalog_products.js";
import { roundTwo } from "./util/numbers-util.js";

const d = document,
  w = window,
  $productsModalContainer = d.querySelector("#products-modal .items-container"),
  $servicesModalContainer = d.querySelector("#services-modal .items-container"),
  $servicesModalEneglimarContainer = d.querySelector("#services-modal-eneglimar .items-container")

export const ntf = new NotificationBulma()

//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------

const loadServices = () => {
  ////console.log($servicesModalContainer, $servicesModalContainer.childElementCount)
  if ($servicesModalContainer.childElementCount == 0) {
    ////console.log("Cargando servicios al modal")
    let $fragment = d.createDocumentFragment(),
      $template = d.getElementById("catalog-template").content

    services.forEach((s) => {
      let $catalogItem = $template.querySelector(".catalog-item")
      $catalogItem.dataset.key = s.code
      $catalogItem.dataset.type = "SERVICE"
      $template.querySelector(".catalog-item-details").textContent = `[$${roundTwo(s.baseValue).toFixed(2)}] ${s.description}`
      $template.querySelector(".wholesale-item-details").textContent = ""
      let $clone = d.importNode($template, true)
      $fragment.appendChild($clone)
    })
    $servicesModalContainer.appendChild($fragment)
  }
}

const loadServicesEneglimar = () => {
  ////console.log($servicesModalEneglimarContainer, $servicesModalEneglimarContainer.childElementCount)
  if ($servicesModalEneglimarContainer.childElementCount == 0) {
    ////console.log("Cargando servicios al modal eneglimar")
    let $fragment = d.createDocumentFragment(),
      $template = d.getElementById("catalog-template").content

    servicesEneglimar.forEach((s) => {
      let $catalogItem = $template.querySelector(".catalog-item")
      $catalogItem.dataset.key = s.code
      $catalogItem.dataset.type = "SERVICE"
      $template.querySelector(".catalog-item-details").textContent = `[$${roundTwo(s.baseValue).toFixed(2)}] ${s.description}`
      $template.querySelector(".wholesale-item-details").textContent = ""
      let $clone = d.importNode($template, true)
      $fragment.appendChild($clone)
    })
    $servicesModalEneglimarContainer.appendChild($fragment)
  }
}

const loadProducts = () => {
  //// console.log($productsModalContainer, $productsModalContainer.childElementCount)
  if ($productsModalContainer.childElementCount == 0) {
    ////console.log("Cargando productos al modal")
    let $fragment = d.createDocumentFragment(),
      $template = d.getElementById("catalog-template").content

    products
      .filter((p) => p.active)
      .forEach((p) => {
        let $catalogItem = $template.querySelector(".catalog-item")
        $catalogItem.dataset.key = p.code
        $catalogItem.dataset.type = "PRODUCT"
        $template.querySelector(".catalog-item-details").textContent = `[$${roundTwo(p.baseValue).toFixed(2)}] ${p.description}`
        $template.querySelector(".wholesale-item-details").textContent = `[$${roundTwo(p.wholesaleValue).toFixed(2)}] ${p.description}`
        let $clone = d.importNode($template, true)
        $fragment.appendChild($clone)
      })
    $productsModalContainer.appendChild($fragment)
  }
}

export function changeProductsModalTypeSale(vbWholesale) {
  $productsModalContainer.querySelectorAll(".catalog-item-details")
    .forEach(($el) => vbWholesale ? $el.classList.add("is-hidden") : $el.classList.remove("is-hidden"))
  $productsModalContainer.querySelectorAll(".wholesale-item-details")
    .forEach(($el) => vbWholesale ? $el.classList.remove("is-hidden") : $el.classList.add("is-hidden"))
}

//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

// EVENTO=DOMContentLoaded RAIZ=document 
d.addEventListener("DOMContentLoaded", e => {
  navbarBurgers()
  modalToggle(".trigger-services-modal", loadServices)
  modalToggle(".trigger-services-modal-eneglimar", loadServicesEneglimar)
  modalToggle(".trigger-products-modal", loadProducts)
  handlerClients()
  handlerClientEdit()
  handlerSales()
})

// EVENTO=click RAIZ=services-modal ACCION=cerrar modal y ejecutar callback
d.querySelector("#services-modal .items-container").addEventListener("click", e => {
  //console.log(`elemento ${this.className}, el click se origino en ${e.target.className}`)
  // Servicio seleccionado 
  if (e.target.matches(".catalog-item") || e.target.closest(".catalog-item")) {
    e.target.closest(".modal").classList.remove("is-active") // Cerrar modal
    const $item = e.target.closest(".catalog-item")
    addToSale($item.dataset.key, $item.dataset.type)// Ejecutar accion al seleccionar el servicio
  }
})

// EVENTO=click RAIZ=services-modal-eneglimar ACCION=cerrar modal y ejecutar callback
d.querySelector("#services-modal-eneglimar .items-container").addEventListener("click", e => {
  //console.log(`elemento ${this.className}, el click se origino en ${e.target.className}`)
  // Servicio seleccionado 
  if (e.target.matches(".catalog-item") || e.target.closest(".catalog-item")) {
    e.target.closest(".modal").classList.remove("is-active") // Cerrar modal
    const $item = e.target.closest(".catalog-item")
    addToSale($item.dataset.key, $item.dataset.type)// Ejecutar accion al seleccionar el servicio
  }
})

// EVENTO=click RAIZ=products-modal ACCION=cerrar modal y ejecutar callback
d.querySelector("#products-modal .items-container").addEventListener("click", e => {
  //console.log(`elemento ${this.className}, el click se origino en ${e.target.className}`)
  // Producto seleccionado 
  if (e.target.matches(".catalog-item") || e.target.closest(".catalog-item")) {
    e.target.closest(".modal").classList.remove("is-active")// Cerrar modal
    const $item = e.target.closest(".catalog-item")
    addToSale($item.dataset.key, $item.dataset.type)// Ejecutar accion al seleccionar el producto
  }
})



// https://github.com/CodeExplainedRepo/shopping-cart-javascript/blob/main/shopping%20cart/app.js
// https://github.com/CodeExplainedRepo/shopping-cart-javascript/blob/main/shopping%20cart/index.html
// https://www.youtube.com/watch?v=UcrypywtAm0

// https://bulma.io/documentation/elements/icon/
// https://fontawesome.com/icons/users?s=solid

//https://twitter.com/i/status/1497010335311613968