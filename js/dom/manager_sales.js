import { ntf } from "../app.js";
import { dbRef } from "./firebase_conexion.js";
import { productos } from "./catalogo_productos.js";
import { servicios } from "./catalogo_servicios.js";
import { ahoraTimestamp, hoyString, timestampLocalTimezoneString } from "./fecha-util.js";


const d = document,
  collectionSales = 'sales-test',
  collectionSalesDetails = 'sales-details-test',
  collectionClients = 'clients-test',
  $salesContainer = d.getElementById("sale-content"),
  $salesHeaderContainer = d.getElementById("sale-header"),
  $salesDetailsContainer = d.getElementById("sale-details")

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

let cart = localStorage.getItem("CART") ? JSON.parse(localStorage.getItem("CART")) : JSON.parse(JSON.stringify(cartIni))
updateSale()

//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------

const resetCart = () => {
  localStorage.removeItem("CART")
  cart = JSON.parse(JSON.stringify(cartIni))
  cart.date = ahoraTimestamp()
  updateSale()
}

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
export function addToCart(vsCode) {
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
  d.getElementById("cart-header-cli-lastserv").innerText = cli.lastService
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
    $btnServicios = d.querySelector(".trigger-services-modal"),
    $btnProductos = d.querySelector(".trigger-products-modal"),
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

//------------------------------------------------------------------------------------------------
// Delegation of events
//------------------------------------------------------------------------------------------------

export default function handlerSales() {

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
}
// --------------------------
// Database operations
// --------------------------

function insertSalesDB(cart, callback) {
  // Cabecera de la venta
  let salesHeader = {
    ...JSON.parse(JSON.stringify(cart)),
    clientId: cart.client.idNumber,
    clientUid: cart.client.uid
  }
  let items = salesHeader.items
  delete salesHeader.items
  delete salesHeader.client
  delete salesHeader.valid
  delete salesHeader.update

  // Obtener la clave de la nueva venta
  const newSaleKey = dbRef.child(collectionSales).push().key;
  let i = 1
  // Detalles de la venta
  items = items.map((item) => {
    delete item.descripcion
    /**salesHeader.fecha,*/
    return {
      ...item,
      category: item.codigo.startsWith("SERV") ? "S" : "P",
      clientId: salesHeader.clientId,
      order: i++,
      saleUid: newSaleKey
    }
  })

  // Generar bloque de transaccion
  let updates = {}
  updates[`${collectionSales}/${newSaleKey}`] = salesHeader
  let existService
  // Registrar Detalles
  items.forEach(item => {
    let newDetailKey = dbRef.child(collectionSalesDetails).push().key;
    updates[`${collectionSalesDetails}/${newDetailKey}`] = item
  })
  // Actualizar datos del cliente
  updates[`${collectionClients}/${salesHeader.clientUid}/lastService`] = salesHeader.searchDate

  // Registrar la venta en la BD
  dbRef.update(updates, (error) => {
    if (error) {
      ntf.showTecnicalError("Venta no registrada", error)
    } else {
      ntf.show("Venta registrada", `Se guardó correctamente la información de la venta Nro. ${cart.date}`)
      callback()
    }
  })
}