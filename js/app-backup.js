import modalToggle from "./dom/modal_toggle.js";
import navbarBurgers from "./dom/navbar_burgers.js";
import NotificationBulma from './dom/NotificacionBulma.js';
import { productos } from "./dom/catalogo_productos.js";
import { servicios } from "./dom/catalogo_servicios.js";
import { ahoraTimestamp, hoyString, timestampLocalTimezoneString } from "./dom/fecha-util.js";
import handlerClients from "./dom/manager_clients.js";
import { insertSalesDB } from "./dom/manager_sales.js";
import handlerExpenses from "./dom/manager_expenses.js";
import handlerClientEdit from "./dom/manager_client_edit.js";

const d = document,
  w = window

export const ntf = new NotificationBulma()

const resetCart = () => {
  localStorage.removeItem("CART")
  cart = JSON.parse(JSON.stringify(cartIni))
  cart.date = ahoraTimestamp()
  updateSale()
}

//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

// EVENTO=DOMContentLoaded RAIZ=document 
d.addEventListener("DOMContentLoaded", e => {
  navbarBurgers()
  modalToggle(".trigger-servicios-modal", loadServicios)
  modalToggle(".trigger-productos-modal", loadProductos)
  handlerClients()
  handlerClientEdit()
  handlerExpenses()
})

// EVENTO=click RAIZ=servicios-modal ACCION=cerrar modal y ejecutar callback
d.querySelector("#servicios-modal .items-container").addEventListener("click", e => {
  //console.log(`elemento ${this.className}, el click se origino en ${e.target.className}`)
  // Servicio seleccionado 
  if (e.target.matches(".servicio-selected") || e.target.closest(".servicio-selected")) {
    e.target.closest(".modal").classList.remove("is-active") // Cerrar modal
    const $item = e.target.closest(".servicio-selected")
    addToCart($item.dataset.key)// Ejecutar accion al seleccionar el servicio
  }
})

// EVENTO=click RAIZ=productos-modal ACCION=cerrar modal y ejecutar callback
d.querySelector("#productos-modal .items-container").addEventListener("click", e => {
  //console.log(`elemento ${this.className}, el click se origino en ${e.target.className}`)
  // Producto seleccionado 
  if (e.target.matches(".producto-selected") || e.target.closest(".producto-selected")) {
    e.target.closest(".modal").classList.remove("is-active")// Cerrar modal
    const $item = e.target.closest(".producto-selected")
    addToCart($item.dataset.key)// Ejecutar accion al seleccionar el producto
  }
})

// EVENTO=click RAIZ=section<servicios> ACCION=Eliminar detalles
d.getElementById("sales").addEventListener("click", e => {
  let $el = e.target
  console.log(`evento click target=${$el.classList}`, $el.value)
  // Elemento a eliminar 
  if ($el.matches(".cart-item-delete") || $el.closest(".cart-item-delete")) {

    const $cartItem = e.target.closest(".cart-item-delete")
    removeFromCart($cartItem.dataset.key)
  }

  if ($el.matches(".cart-save") || $el.closest(".cart-save")) {
    if (!cart.seller) {
      ntf.show("Información requerida", "Seleccione el vendedor", "danger")
    } else if (!cart.payment) {
      ntf.show("Información requerida", "Seleccione la forma de pago", "danger")
    } else if (cart.date > ahoraTimestamp()) {
      ntf.show("Información erronea", `La fecha no puede ser mayor a hoy: ${hoyString()} `, "danger")
    } else {
      // Insertar la venta en la base de datos
      insertSalesDB(cart, resetCart)
    }
  }

  if ($el.matches(".cart-cancel") || $el.closest(".cart-cancel")) {
    let eliminar = true
    if (cart.items.length > 0) {
      eliminar = confirm("Esta seguró que desea descartar la información de la venta? ")
    }
    if (eliminar) {
      resetCart()
      ntf.show("Venta descartada", `Se elimino la venta sin guardar.`)
    }
  }
})

// EVENTO=change RAIZ=section<servicios> ACCION=detectar cambios en inputs 
d.getElementById("sales").addEventListener("change", e => {
  let $input = e.target
  console.log(`evento change target = ${$input.classList} `, $input.value)
  if ($input.matches(".cart-item-amount")) {
    changeItemNumberOfUnits($input.dataset.key, "replace", parseInt($input.value));
    cart.update = true
  } else if ($input.matches(".cart-item-discount")) {
    changeItemDiscount($input.dataset.key, $input.value)
    cart.update = true
  } else if ($input.name === "payment") {
    cart.payment = $input.value
  } else if ($input.name === "seller") {
    cart.seller = $input.value

    //TODO Agregar validacion de al menos un servicio o producto

    //} else if ($input.name === "cartHeaderDate") {
    // console.log("cart.date=", new Date(cart.date))
    //   cart.date = timestampInputDateToDateEc($input.value)
    //   console.log("despues cart.date=", new Date(cart.date))
  }
  localStorage.setItem("CART", JSON.stringify(cart))
})

// EVENTO=focusout RAIZ=section<servicios> ACCION=detectar cambios en inputs que deben refrescarv la pagina
d.getElementById("sales").addEventListener("focusout", e => {
  // Si existe cambios en cantidad o descuento de items, se actualiza el carrito 
  if (cart.update) {
    cart.update = false
    updateSaleCart()
  }
})

// EVENTO=resize RAIZ=header ACCION=cambiar el menu hamburguesa
w.addEventListener("resize", e => {
  navbarBurgers()
})

//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------

const loadServicios = () => {
  let $container = d.querySelector("#servicios-modal .items-container")
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

const loadProductos = () => {
  let $container = d.querySelector("#productos-modal .items-container")
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

const cartIni = {
  client: {
    uid: "",
    description: "DEBE BUSCAR Y SELECCIONAR UN CLIENTE",
    lastService: null,//TODO: Cuando se guarde la factura hay que actualizar esta fecha
    referrals: 0//TODO: Cuando se registra clientes, se debe actualizar el num referidos buscando por identificacion
  },
  seller: null,
  payment: null,
  items: [],
  taxableIncome: 0,
  discounts: 0,
  taxes: 0,
  totalSale: 0,
  valid: false
}

Date.prototype.addHours = function (h) {
  this.setTime(this.getTime() + (h * 60 * 60 * 1000));
  return this;
}
let cart = localStorage.getItem("CART") ? JSON.parse(localStorage.getItem("CART")) : JSON.parse(JSON.stringify(cartIni))
updateSale()

export function changeCartClient($clienteItem) {
  let discart = true
  if (cart.valid) {
    discart = confirm(`Existe una venta pendiente de registrar. Que desea hacer: 
    ACEPTAR: descartar la venta anterior y crear nueva venta; o, 
    CANCELAR: regresar a la venta anterior`)
  }
  if (discart) {
    localStorage.removeItem("CART")
    cart = JSON.parse(JSON.stringify(cartIni))
    cart.client.uid = $clienteItem.dataset.uid
    cart.client.idNumber = $clienteItem.dataset.idnumber
    cart.client.description = `${$clienteItem.dataset.name} _ ${$clienteItem.dataset.idtype}: ${$clienteItem.dataset.idnumber}`
    cart.client.lastService = $clienteItem.dataset.lastserv
    cart.client.referrals = $clienteItem.dataset.referrals
    cart.date = ahoraTimestamp()
    cart.searchDate = hoyString()
    cart.searchDateTime = timestampLocalTimezoneString(cart.date)
    cart.valid = true
    updateSale()
  } else {
    ntf.show("Venta pendiente de guardar", `Recuerde registrar la venta con el botón "Guardar" o 
    descartarla definitivamente con el botón "Cancelar"`)
  }
}

// Agregar item a la venta
function addToCart(vsCode) {
  //console.log(`agregando carrito=`, vsCode)

  // Verificar si el producto existe en la venta
  if (cart.items.some((item) => item.codigo === vsCode)) {
    changeItemNumberOfUnits(vsCode, "plus", 1);
  } else {
    const item = vsCode.startsWith("S") ?
      servicios.find((s) => s.codigo === vsCode) :
      productos.find((p) => p.codigo === vsCode)

    cart.items.push({
      ...item,
      numberOfUnits: 1,
    })
  }
  updateSaleCart()
}

// Eliminar item de la venta
function removeFromCart(vsCode) {
  cart.items = cart.items.filter(item => item.codigo !== vsCode)
  updateSaleCart()
}

// Actualizar la venta
function updateSale() {
  renderSaleHeader()
  updateSaleCart()
}

// Actualizar el carrito de compras
function updateSaleCart() {
  renderCartItems()
  renderCartSummary()
  // Almacenar la venta en el local storage
  localStorage.setItem("CART", JSON.stringify(cart))
}

// Actualizar cabecera de la venta
function renderSaleHeader() {
  const cli = cart.client
  d.getElementById("cart-header-client").innerText = cli.description
  d.getElementById("cart-header-cli-lastserv").innerText = cli.lastService ? cli.lastService : "No existe"
  d.getElementById("cart-header-cli-referrals").innerText = cli.referrals
  d.getElementById("cart-header-date").value = cart.searchDate
  d.getElementsByName("seller").forEach($el => $el.checked = $el.value === cart.seller)
  d.getElementsByName("payment").forEach($el => $el.checked = $el.value === cart.payment)
}

// Actualizar los productso/servicios de la venta
function renderCartItems() {
  const $productsContainer = d.getElementById("cart-details-products"),
    $servicesContainer = d.getElementById("cart-details-services"),
    $productsFragment = d.createDocumentFragment(),
    $servicesFragment = d.createDocumentFragment(),
    $btnServicios = d.querySelector(".trigger-servicios-modal"),
    $btnProductos = d.querySelector(".trigger-productos-modal"),
    $btnCancel = d.querySelector(".cart-cancel")

  let vnCountProducts = 0,
    vnCountServices = 0

  // setear valores del carrito
  cart.taxableIncome = 0
  cart.discounts = 0
  cart.taxes = 0
  cart.totalSale = 0

  if (cart.valid) {
    const $template = d.getElementById("cart-item-template").content,
      $desc = $template.querySelector(".cart-item-description"),
      $amount = $template.querySelector(".cart-item-amount"),
      $unitValue = $template.querySelector(".cart-item-unit-value"),
      $discount = $template.querySelector(".cart-item-discount"),
      $value = $template.querySelector(".cart-item-value"),
      $delete = $template.querySelector(".cart-item-delete")

    let vnUnitDiscount,
      vnBaseDiscount,
      vnTaxDiscount,
      vnDiscounts,
      vnTaxes,
      vnTaxableIncome = 0

    cart.items.forEach(item => {
      console.log("Agregando servicio=", item.codigo)

      // Calculos para totalizadores
      vnBaseDiscount = 0
      vnTaxDiscount = 0
      vnUnitDiscount = item.unitDiscount || 0
      if (item.unitDiscount && vnUnitDiscount > 0) {
        // Se considera que todos los servicios y productos estan gravados solo con IVA
        vnBaseDiscount = Math.round(vnUnitDiscount / 112 * 100 * 100) / 100
        vnTaxDiscount = vnUnitDiscount - vnBaseDiscount
      }
      vnTaxableIncome = (item.unitValue - vnBaseDiscount) * item.numberOfUnits
      vnTaxes = ((item.impuestoIVA || 0) - vnTaxDiscount) * item.numberOfUnits
      vnDiscounts = vnUnitDiscount * item.numberOfUnits

      item.taxableIncome = Math.round(vnTaxableIncome * 100) / 100
      item.taxes = Math.round(vnTaxes * 100) / 100
      item.total = item.taxableIncome + item.taxes
      item.discounts = vnDiscounts

      cart.taxableIncome += item.taxableIncome
      cart.taxes += item.taxes
      cart.totalSale += item.total
      cart.discounts += item.discounts

      // crear detalle de carrito (fila de tabla)
      $desc.innerText = item.descripcion
      $amount.value = item.numberOfUnits
      $amount.dataset.key = item.codigo
      $unitValue.innerText = item.valor.toFixed(2)
      $discount.value = vnUnitDiscount.toFixed(2)
      $discount.dataset.key = item.codigo
      $value.innerText = ((item.valor - vnUnitDiscount) * item.numberOfUnits).toFixed(2)
      $delete.dataset.key = item.codigo
      let $clone = d.importNode($template, true)
      if (item.codigo.startsWith("S")) {
        $servicesFragment.appendChild($clone)
        vnCountServices++
      } else {
        $productsFragment.appendChild($clone)
        vnCountProducts++
      }
    })

    // Habilitar los botones de catalogos
    $btnServicios.removeAttribute("disabled")
    $btnProductos.removeAttribute("disabled")
    $btnCancel.removeAttribute("disabled")
  } else {
    // Deshabilitar los botones de catalogos
    $btnServicios.setAttribute("disabled", true)
    $btnProductos.setAttribute("disabled", true)
    $btnCancel.setAttribute("disabled", true)
  }

  $servicesContainer.innerHTML = "";
  if (vnCountServices > 0) {
    $servicesContainer.appendChild($servicesFragment)
  } else {
    $servicesContainer.innerHTML = `<tr><td colspan="6">Ningún servicio</td><tr>`;
  }

  $productsContainer.innerHTML = "";
  if (vnCountProducts > 0) {
    $productsContainer.appendChild($productsFragment)
  } else {
    $productsContainer.innerHTML = `<tr><td colspan="6">Ningún producto</td><tr>`;
  }
}

// Calcular descuentos, impuestos y total de venta
function renderCartSummary() {
  d.querySelector(".cart-summary-totalsale").innerText = cart.totalSale.toFixed(2)
  d.querySelector(".cart-summary-taxableincome").innerText = cart.taxableIncome.toFixed(2)
  d.querySelector(".cart-summary-taxes").innerText = cart.taxes.toFixed(2)
  //d.querySelector(".cart-summary-discounts").innerText = cart.discounts.toFixed(2)

  // Deshabilitar el boton Guardar cuando la venta es cero
  if (cart.valid && cart.items.length > 0) {
    d.querySelector(".cart-save").removeAttribute("disabled")
  } else {
    d.querySelector(".cart-save").setAttribute("disabled", false)
  }

}

// Cambiar la cantidad de un producto/servicio
function changeItemNumberOfUnits(vsCode, vsAction, vnValue) {
  cart.items = cart.items.map((item) => {
    let numberOfUnits = item.numberOfUnits;

    if (item.codigo === vsCode) {
      switch (vsAction) {
        case "plus":
          numberOfUnits += vnValue || 0
          break;
        case "minus":
          numberOfUnits -= vnValue || 0
          break;
        default:
          // Replace
          numberOfUnits = vnValue
      }
    }

    return {
      ...item,
      numberOfUnits,
    }
  })
}

// Cambiar el descuento de un producto/servicio
function changeItemDiscount(vsCode, vnUnitDiscount) {
  cart.items = cart.items.map((item) => {
    let unitDiscount = item.unitDiscount
    if (item.codigo === vsCode) {
      unitDiscount = parseFloat(vnUnitDiscount)
    }
    return {
      ...item,
      unitDiscount
    }
  })
}

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