import { changeProductsModalTypeSale, ntf } from "../app.js";
import { dbRef } from "./firebase_conexion.js";
import { nowEc, timestampEc, todayEc, todayEcToString, timestampInputDateToDateEc, timestampLocalTimezoneString, nowEcToString } from "./fecha-util.js";
import { sellerDB } from "./firebase_collections.js";
import { services } from "./catalog_services.js";
import { products } from "./catalog_products.js";


const d = document,
  $salesContainer = d.getElementById("sale-content"),
  $salesHeaderContainer = d.getElementById("sale"),
  $salesDetailsContainer = d.getElementById("sale-details")

const saleInit = {
  client: {
    uid: "",
    description: "DEBE BUSCAR Y SELECCIONAR UN CLIENTE",
    lastService: null,//TODO: Cuando se guarde la factura hay que actualizar esta fecha
    referrals: 0//TODO: Cuando se registra clientes, se debe actualizar el num referidos buscando por identificacion
  },
  seller: null,
  typePayment: "EFECTIVO",//[EFECTIVO,CREDITO,DEBITO]
  type: "CLIENTE",//[CLIENTE, PORMAYOR]
  items: [],
  taxableIncome: 0,
  discounts: 0,
  taxes: 0,
  totalSale: 0,
  valid: false
}

let sale = localStorage.getItem("SALE") ? JSON.parse(localStorage.getItem("SALE")) : JSON.parse(JSON.stringify(saleInit))
updateSale()

//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------

const resetSale = () => {
  localStorage.removeItem("SALE")
  sale = JSON.parse(JSON.stringify(saleInit))
  sale.date = timestampEc()
  updateSale()
}

export function changeSaleClient($client) {
  let discart = true
  if (sale.valid) {
    discart = confirm(`Existe una venta pendiente de registrar. Que desea hacer: 
      ACEPTAR: descartar la venta anterior y crear nueva venta; o, 
      CANCELAR: regresar a la venta anterior`)
  }
  if (discart) {
    localStorage.removeItem("SALE")
    sale = JSON.parse(JSON.stringify(saleInit))
    sale.client.uid = $client.dataset.uid
    sale.client.idNumber = $client.dataset.idnumber
    sale.client.description = `${$client.dataset.name} _ ${$client.dataset.idtype}: ${$client.dataset.idnumber}`
    sale.client.lastService = $client.dataset.lastserv
    sale.client.referrals = $client.dataset.referrals
    sale.date = timestampEc()
    sale.searchDate = todayEcToString()
    sale.searchDateTime = new Date(sale.date).toLocaleString()
    sale.valid = true
    updateSale()

    // Setear valores a consumidor final en el catalogo de productos
    changeProductsModalTypeSale(sale.type === "PORMAYOR")
  } else {
    ntf.show("Venta pendiente de guardar", `Recuerde registrar la venta con el botón "Guardar" o 
      descartarla definitivamente con el botón "Cancelar"`)
  }
}

// Agregar item a la venta
export function addToSale(vsCode, vsType) {
  console.log(`agregando a la venta=`, vsCode)

  // Verificar si el producto existe en la venta
  if (sale.items.some((item) => item.codigo === vsCode)) {
    changeItemNumberOfUnits(vsCode, "plus", 1)
  } else {
    const item = vsType === "SERVICE" ?
      services.find((s) => s.code === vsCode) :
      products.find((p) => p.code === vsCode)

    sale.items.push({
      ...item,
      numberOfUnits: 1,
    })
  }
  updateSaleDetails()
}

// Eliminar item de la venta
function removeFromSale(vsCode) {
  sale.items = sale.items.filter(item => item.codigo !== vsCode)
  updateSaleDetails()
}

// Actualizar la venta
function updateSale() {
  renderSaleHeader()
  updateSaleDetails()
}

// Actualizar el carrito de compras
function updateSaleDetails() {
  renderSaleItems()
  renderSaleSummary()
  // Almacenar la venta en el local storage
  localStorage.setItem("SALE", JSON.stringify(sale))
}

// Actualizar cabecera de la venta
function renderSaleHeader() {
  const cli = sale.client
  d.getElementById("sale-client").innerText = cli.description
  d.getElementById("sale-client-lastserv").innerText = cli.lastService
  d.getElementById("sale-client-referrals").innerText = cli.referrals
  d.getElementById("sale-date").value = sale.searchDate
  d.getElementsByName("seller").forEach($el => $el.checked = $el.value === sale.seller)
  d.getElementsByName("typePayment").forEach($el => $el.checked = $el.value === sale.typePayment)
  d.getElementsByName("typeSale").forEach($el => $el.checked = $el.value === sale.type)
}
////////////////////////////////////////////////
// CONTINUAR AQUI
///////////////////////////////////////////////
// Actualizar los productso/servicios de la venta
function renderSaleItems() {
  const $productsContainer = d.getElementById("sale-details-products"),
    $servicesContainer = d.getElementById("sale-details-services"),
    $productsFragment = d.createDocumentFragment(),
    $servicesFragment = d.createDocumentFragment(),
    $btnServicios = d.querySelector(".trigger-services-modal"),
    $btnProductos = d.querySelector(".trigger-products-modal"),
    $btnCancel = d.querySelector(".sale-cancel")

  let vnCountProducts = 0,
    vnCountServices = 0

  // setear valores del carrito
  sale.taxableIncome = 0
  sale.discounts = 0
  sale.taxes = 0
  sale.totalSale = 0

  if (sale.valid) {
    const $template = d.getElementById("sale-item-template").content,
      $desc = $template.querySelector(".sale-item-description"),
      $amount = $template.querySelector(".sale-item-amount"),
      $unitValue = $template.querySelector(".sale-item-unit-value"),
      $unitDiscount = $template.querySelector(".sale-item-unit-discount"),
      $value = $template.querySelector(".sale-item-value"),
      $delete = $template.querySelector(".sale-item-delete")

    let vnUnitDiscount,
      vnBaseDiscount,
      vnTaxDiscount,
      vnDiscounts,
      vnTaxes,
      vnTaxableIncome = 0

    sale.items.forEach(item => {
      console.log("Agregando item a la venta=", item.codigo)

      // Calculos para totalizadores
      vnBaseDiscount = 0
      vnTaxDiscount = 0
      // El descuento puede haberse igresado/modificado manualmente al registro, null la primera vez
      vnUnitDiscount = item.unitDiscount

      // SOLO para servicios, se aplica los descuentos automaticos la primera vez
      if (!item.unitDiscount) {
        if (item.type === "S") {
          vnUnitDiscount = 0
          if (item.promo.cash && sale.typePayment === "EFECTIVO")// IVA solo pagos en efectivo
            vnUnitDiscount += item.promo.cash * item.finalValue / 112 // debe ser igual a item.taxIVA
          ////////////////////////////////////////////////////
          // TODO: TEMPORALMENTE JUEVES (4) CAMBIAR a MARTES (2)
          ////////////////////////////////////////////////////
          console.log("todayEc()", todayEc(), todayEcToString(), nowEcToString(), nowEc().to)
          if (item.promo.discountDay && todayEc().getDay() === 4)// Dia de descuento martes
            vnUnitDiscount += item.promo.discountDay * item.baseValue / 100
        } else {
          vnUnitDiscount = 0
        }
      }

      // Recalculo de impuestos por descuentos
      if (vnUnitDiscount > 0) {////ANTESif (item.unitDiscount && vnUnitDiscount > 0) {
        // Se considera que todos los servicios y productos  estan gravados solo con IVA
        vnBaseDiscount = Math.round(vnUnitDiscount / 1.12 * 100) / 100 // 2.85// tecnica para utilizar solo dos decimales del calculo sin redondeo
        vnTaxDiscount = vnUnitDiscount - vnBaseDiscount //0.35
      }
      let baseValue = item.baseValue,
        finalValue = item.finalValue,
        taxIVA = item.taxIVA
      // Cambio de valores para productos al por mayor
      if (item.type === "P" && sale.type === "PORMAYOR") {
        baseValue = item.wholesaleValue
        finalValue = item.wholesaleFinalValue
        taxIVA = item.wholesaleTaxIVA
      }

      vnTaxableIncome = (baseValue - vnBaseDiscount) * item.numberOfUnits //7.15
      vnTaxes = ((taxIVA || 0) - vnTaxDiscount) * item.numberOfUnits //1.20
      vnDiscounts = vnUnitDiscount * item.numberOfUnits //3.20

      item.taxableIncome = Math.round(vnTaxableIncome * 100) / 100 // 7.15
      item.taxes = Math.round(vnTaxes * 100) / 100 // 0.85
      item.total = item.taxableIncome + item.taxes // 8
      item.discounts = vnDiscounts // 3.20

      sale.taxableIncome += item.taxableIncome
      sale.taxes += item.taxes
      sale.totalSale += item.total
      sale.discounts += item.discounts

      // crear detalle de carrito (fila de tabla)
      $desc.innerText = item.description
      $amount.value = item.numberOfUnits
      $amount.dataset.key = item.code
      $unitValue.innerText = finalValue.toFixed(2)
      $unitDiscount.value = vnUnitDiscount.toFixed(2)
      $unitDiscount.dataset.key = item.code
      $value.innerText = ((finalValue - vnUnitDiscount) * item.numberOfUnits).toFixed(2)
      $delete.dataset.key = item.code
      let $clone = d.importNode($template, true)
      if (item.type === "S") {
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
function renderSaleSummary() {
  d.querySelector(".sale-summary-totalsale").innerText = sale.totalSale.toFixed(2)
  d.querySelector(".sale-summary-taxableincome").innerText = sale.taxableIncome.toFixed(2)
  d.querySelector(".sale-summary-taxes").innerText = sale.taxes.toFixed(2)
  //d.querySelector(".sale-summary-discounts").innerText = sale.discounts.toFixed(2)

  // Deshabilitar el boton Guardar cuando la venta es cero
  if (sale.valid && sale.items.length > 0) {
    d.querySelector(".sale-save").removeAttribute("disabled")
  } else {
    d.querySelector(".sale-save").setAttribute("disabled", false)
  }
}

// Cambiar la cantidad de un producto/servicio
function changeItemNumberOfUnits(vsCode, vsAction, vnValue) {
  sale.items = sale.items.map((item) => {
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
  sale.items = sale.items.map((item) => {
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
    if ($el.matches(".sale-item-delete") || $el.closest(".sale-item-delete")) {
      const $saleItem = e.target.closest(".sale-item-delete")
      removeFromSale($saleItem.dataset.key)
    }

    if ($el.matches(".sale-save") || $el.closest(".sale-save")) {
      if (!sale.seller) {
        ntf.show("Información requerida", "Seleccione el vendedor", "danger")
      } else if (!sale.typePayment) {
        ntf.show("Información requerida", "Seleccione la forma de pago", "danger")
      } else if (sale.date > timestampEc()) {
        ntf.show("Información erronea", `La fecha no puede ser mayor a hoy: ${todayEcToString()} `, "danger")
      } else {
        // Insertar la venta en la base de datos
        insertSalesDB(resetSale)
      }
    }

    if ($el.matches(".sale-cancel") || $el.closest(".sale-cancel")) {
      let eliminar = true
      if (sale.items.length > 0) {
        eliminar = confirm("Esta seguró que desea descartar la información de la venta? ")
      }
      if (eliminar) {
        resetSale()
        ntf.show("Venta descartada", `Se elimino la venta sin guardar.`)
      }
    }
  })

  // EVENTO=change RAIZ=section<servicios> ACCION=detectar cambios en inputs 
  d.getElementById("sales").addEventListener("change", e => {
    let $input = e.target
    console.log(`evento change target = ${$input.classList} `, $input.value)
    if ($input.matches(".sale-item-amount")) {
      changeItemNumberOfUnits($input.dataset.key, "replace", parseInt($input.value));
      sale.update = true
    } else if ($input.matches(".sale-item-discount")) {
      changeItemDiscount($input.dataset.key, $input.value)
      sale.update = true
    } else if ($input.name === "typePayment") {
      sale.typePayment = $input.value
    } else if ($input.name === "seller") {
      sale.seller = $input.value
    } else if ($input.name === "typeSale") {
      sale.type = $input.value
      // Setear valores a consumidor final en el catalogo de productos
      changeProductsModalTypeSale(sale.type === "PORMAYOR")
      //TODO Agregar validacion de al menos un servicio o producto

      //} else if ($input.name === "saleHeaderDate") {
      // console.log("sale.date=", new Date(sale.date))
      //   sale.date = timestampInputDateToDateEc($input.value)
      //   console.log("despues sale.date=", new Date(sale.date))
    }
    localStorage.setItem("SALE", JSON.stringify(sale))
  })

  // EVENTO=focusout RAIZ=section<servicios> ACCION=detectar cambios en inputs que deben refrescarv la pagina
  d.getElementById("sales").addEventListener("focusout", e => {
    // Si existe cambios en cantidad o descuento de items, se actualiza el carrito 
    if (sale.update) {
      sale.update = false
      updateSaleDetails()
    }
  })
}
// --------------------------
// Database operations
// --------------------------

function insertSalesDB(callback) {
  // Cabecera de la venta
  let salesHeader = {
    ...JSON.parse(JSON.stringify(sale)),
    clientId: sale.client.idNumber,
    clientUid: sale.client.uid
  }
  let items = salesHeader.items
  delete salesHeader.items
  delete salesHeader.client
  delete salesHeader.valid
  delete salesHeader.update

  // Obtener la clave de la nueva venta
  const newSaleKey = dbRef.child(sellerDB.sales).push().key;
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
  updates[`${sellerDB.sales}/${newSaleKey}`] = salesHeader
  let existService
  // Registrar Detalles
  items.forEach(item => {
    let newDetailKey = dbRef.child(sellerDB.salesDetails).push().key;
    updates[`${sellerDB.salesDetails}/${newDetailKey}`] = item
  })
  // Actualizar datos del cliente
  updates[`${sellerDB.clients}/${salesHeader.clientUid}/lastService`] = salesHeader.searchDate

  // Registrar la venta en la BD
  dbRef.update(updates, (error) => {
    if (error) {
      ntf.showTecnicalError("Venta no registrada", error)
    } else {
      ntf.show("Venta registrada", `Se guardó correctamente la información de la venta Nro. ${sale.date}`)
      callback()
    }
  })
}