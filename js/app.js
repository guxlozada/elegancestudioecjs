import modalToggle from "./dom/modal_toggle.js";
import navbarBurgers from "./dom/navbar_burgers.js";
import NotificationBulma from './dom/NotificacionBulma.js';
import { productos } from "./dom/catalogo_productos.js";
import { servicios } from "./dom/catalogo_servicios.js";
import handlerClients from "./dom/manager_clients.js";
import handlerExpenses from "./dom/manager_expenses.js";
import handlerClientEdit from "./dom/manager_client_edit.js";
import handlerSales, { addToCart } from "./dom/manager_sales.js";

const d = document,
  w = window

export const ntf = new NotificationBulma()

Date.prototype.addHours = function (h) {
  this.setTime(this.getTime() + (h * 60 * 60 * 1000));
  return this;
}

//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------

const loadServices = () => {
  let $container = d.querySelector("#services-modal .items-container")
  // console.log($container, $container.childElementCount)
  if ($container.childElementCount == 0) {
    console.log("Cargando servicios al modal")
    let $fragment = d.createDocumentFragment(),
      $template = d.getElementById("servicio-template").content

    servicios.forEach((s) => {
      $template.querySelector(".servicio-selected").dataset.key = s.codigo
      $template.querySelector(".item-details").textContent = `[$${(Math.round(s.valor * 100) / 100).toFixed(2)}] ${s.descripcion}`
      let $clone = d.importNode($template, true)
      $fragment.appendChild($clone)
    })
    $container.appendChild($fragment)
  }
}

const loadProducts = () => {
  let $container = d.querySelector("#products-modal .items-container")
  // console.log($container, $container.childElementCount)
  if ($container.childElementCount == 0) {
    console.log("Cargando productos al modal")
    let $fragment = d.createDocumentFragment(),
      $template = d.getElementById("producto-template").content

    productos.forEach((s) => {
      $template.querySelector(".producto-selected").dataset.key = s.codigo
      $template.querySelector(".item-details").textContent = `[$${(Math.round(s.valor * 100) / 100).toFixed(2)}] ${s.descripcion}`
      let $clone = d.importNode($template, true)
      $fragment.appendChild($clone)
    })
    $container.appendChild($fragment)
  }
}

//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

// EVENTO=DOMContentLoaded RAIZ=document 
d.addEventListener("DOMContentLoaded", e => {
  navbarBurgers()
  modalToggle(".trigger-services-modal", loadServices)
  modalToggle(".trigger-products-modal", loadProducts)
  handlerClients()
  handlerClientEdit()
  handlerSales()
  handlerExpenses()
})

// EVENTO=click RAIZ=services-modal ACCION=cerrar modal y ejecutar callback
d.querySelector("#services-modal .items-container").addEventListener("click", e => {
  //console.log(`elemento ${this.className}, el click se origino en ${e.target.className}`)
  // Servicio seleccionado 
  if (e.target.matches(".servicio-selected") || e.target.closest(".servicio-selected")) {
    e.target.closest(".modal").classList.remove("is-active") // Cerrar modal
    const $item = e.target.closest(".servicio-selected")
    addToCart($item.dataset.key)// Ejecutar accion al seleccionar el servicio
  }
})

// EVENTO=click RAIZ=products-modal ACCION=cerrar modal y ejecutar callback
d.querySelector("#products-modal .items-container").addEventListener("click", e => {
  //console.log(`elemento ${this.className}, el click se origino en ${e.target.className}`)
  // Producto seleccionado 
  if (e.target.matches(".producto-selected") || e.target.closest(".producto-selected")) {
    e.target.closest(".modal").classList.remove("is-active")// Cerrar modal
    const $item = e.target.closest(".producto-selected")
    addToCart($item.dataset.key)// Ejecutar accion al seleccionar el producto
  }
})

// EVENTO=resize RAIZ=header ACCION=cambiar el menu hamburguesa
w.addEventListener("resize", e => {
  navbarBurgers()
})

// TODO: Validar campos requeridos de cliente al actualizaciones
// TODO: Asignar/sumar referido al momento del registro del cliente
// TODO: Agregar el searchNames al momento del registro del cliente en minusculas y sin espacios en blanco
//       y cambiar la busqueda por nombres
// TODO: Agregar un formulario de gastos/ajustes con los campos responsable/fecha/valor/detalles
// TODO: Controlar el descuento hasta maximo la base imponible



// https://github.com/CodeExplainedRepo/shopping-cart-javascript/blob/main/shopping%20cart/app.js
// https://github.com/CodeExplainedRepo/shopping-cart-javascript/blob/main/shopping%20cart/index.html
// https://www.youtube.com/watch?v=UcrypywtAm0

// https://bulma.io/documentation/elements/icon/
// https://fontawesome.com/icons/users?s=solid

//https://twitter.com/i/status/1497010335311613968