import modalToggle from "../dom/modal_toggle.js";
import NotificationBulma from '../dom/NotificacionBulma.js';
import handlerClients from "../dom/manager_clients.js";
import handlerClientEdit from "../dom/manager_client_edit.js";
import { SHOPS, collections } from "../persist/firebase_collections.js";
import { dbRef } from "../persist/firebase_conexion.js";
import { addHours, dateIsValid, hoyEC, nowEc } from "../util/fecha-util.js";
import { roundFour, roundTwo, truncFour } from "../util/numbers-util.js";
import { zeroPad } from "../util/text-util.js";
import { addMinMaxPropsWithCashOutflowDates } from "../util/daily-data-cache.js";
import timestampToDatekey, { generateDateProperties } from "../persist/dao_generic.js";
import { BANCO_DATAFAST, BANCO_PRODUBANCO, DATAFAST_PAYMENTS, DEUNA_PICHINCHA, saleToBanktransaction } from "../f_bank_transactions/dao_banking_transactions.js";
import { FREE_CUT_COUNTER, localdb } from "../repo-browser.js";
import { findCatalog } from "../f_catalogs/dao_catalog.js";
import { addOperators } from "../dom/manager_operators.js";
import { getShop } from "../dom/manager_user.js";
import { IVA } from "../repo-browser.js";

const d = document,
  w = window,
  ntf = new NotificationBulma(),
  $productsModalContainer = d.querySelector("#products-modal .items-container"),
  $servicesModalContainer = d.querySelector("#services-modal .items-container"),
  $servicesModalEneglimarContainer = d.querySelector("#services-modal-eneglimar .items-container"),
  freeCutValueBase = getShop().freeCutBase,
  saleInit = {
    client: {
      uid: "",
      description: "",
      lastService: null,//TODO: Cuando se guarde la factura hay que actualizar esta fecha
      stFreeSixthCut: null
    },
    seller: null,
    typePayment: "EFECTIVO",//[EFECTIVO,TCREDITO,TDEBITO, TRANSFERENCIA]
    type: "CLIENTE",//[CLIENTE, PORMAYOR]
    ticket: null,
    notes: null,
    items: [],
    taxableIncome: 0,
    discounts: 0,
    taxes: 0,
    tipByBank: 0,
    totalSale: 0,
    barberCommission: 0,
    valid: false,
    shop: getShop().code
  }

// Variable global para manejo de la venta en proceso
let services, products, sale

//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------

const loadCatalog = ($container, vaItems) => {
  ////console.log($container, $container.childElementCount)
  if ($container.childElementCount == 0) {
    ////console.log("Cargando items al modal")
    const $fragment = d.createDocumentFragment()

    if (!vaItems) {
      $container.innerHTML = `<div class="has-text-danger">Ningun item disponible. Comunique este problema a Carlos Quinteros</div>`
      return
    }
    vaItems.forEach(item => {
      let $rowTmp = d.getElementById("catalog-template").content.cloneNode(true),
        $catalogItem = $rowTmp.querySelector(".catalog-item")
      $catalogItem.dataset.key = item.tmpUid
      $catalogItem.dataset.type = item.type
      $rowTmp.querySelector(".catalog-item-details").textContent = `[$${roundTwo(item.baseValue).toFixed(2)}] ${item.description}`
      if (item.type === "P")
        $rowTmp.querySelector(".wholesale-item-details").textContent = `[$${roundTwo(item.wholesaleValue).toFixed(2)}] ${item.description}`
      $fragment.appendChild($rowTmp)
    })
    $container.appendChild($fragment)
  }
}

function changeProductsModalTypeSale(vbWholesale) {
  $productsModalContainer.querySelectorAll(".catalog-item-details")
    .forEach($el => vbWholesale ? $el.classList.add("is-hidden") : $el.classList.remove("is-hidden"))
  $productsModalContainer.querySelectorAll(".wholesale-item-details")
    .forEach($el => vbWholesale ? $el.classList.remove("is-hidden") : $el.classList.add("is-hidden"))
}

const resetSale = () => {
  localStorage.removeItem(localdb.sale)
  sale = JSON.parse(JSON.stringify(saleInit))
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
    localStorage.removeItem(localdb.sale)
    sale = JSON.parse(JSON.stringify(saleInit))
    sale.client.uid = $client.dataset.uid
    sale.client.idNumber = $client.dataset.idnumber
    sale.client.description = `${$client.dataset.name} _ ${$client.dataset.idtype}: ${$client.dataset.idnumber}`
    sale.client.stLastService = $client.dataset.stLastService || null
    sale.client.stTotalServices = parseFloat($client.dataset.stTotalServices || 0)
    //TODO: Promocion corte gratis
    sale.client.stFreeSixthCut = parseFloat($client.dataset.stFreeSixthCut || 0)
    sale.valid = true
    updateSale()
    ////////////////////////////////////////////////////////////////////////////////////////////////
    ///TODO: Verificar xq no se puede colocar la llmada en updateSale()
    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Setear valores a consumidor final en el catalogo de productos
    changeProductsModalTypeSale(sale.type === "PORMAYOR")
  } else {
    ntf.show("Venta pendiente de guardar", `Recuerde registrar la venta con el botón "Guardar" o 
      descartarla definitivamente con el botón "Cancelar"`)
  }
}

// Agregar item a la venta
export function addToSale(vsCode, vsType) {
  ////console.log(`agregando a la venta=`, vsCode)

  // Verificar si el producto existe en la venta
  if (sale.items.some(item => item.tmpUid === vsCode)) {
    changeItemNumberOfUnits(vsCode, "plus", 1)
  } else {
    let catalog = vsType === "S" ? services : products,
      item = catalog.find(i => i.tmpUid === vsCode)

    sale.items.push({
      ...item,
      numberOfUnits: 1,
    })
  }
  updateSaleDetails()
}

// Eliminar item de la venta
function removeFromSale(vsCode) {
  sale.items = sale.items.filter(item => item.tmpUid !== vsCode)
  updateSaleDetails()
}

// Actualizar la venta
function updateSale() {
  renderSaleHeader()
  updateSaleDetails()
}

// Actualizar el carrito de compras
function updateSaleDetails(changeTypePayment) {
  renderSaleItems(changeTypePayment)
  renderSaleSummary()
  // Almacenar la venta en el local storage
  localStorage.setItem(localdb.sale, JSON.stringify(sale))
}

function validateBarberTipActive() {
  let $tip = d.querySelector(".sale-summary-tip")
  if (sale.typePayment === "EFECTIVO" || sale.typePayment === "CORTESIA") {
    sale.tipByBank = 0
    $tip.setAttribute("disabled", false)
  } else {
    $tip.removeAttribute("disabled")
  }
}

function validateDiscountActive() {
  // Control de descuentos a Consumidor final en Servicios
  if (sale.client.idNumber == "9999999999999") {
    d.querySelectorAll(".sale-item-unit-discount-service").forEach($el => $el.setAttribute("disabled", false))
  }
}

// Actualizar cabecera de la venta
function renderSaleHeader() {
  const cli = sale.client
  if (cli.uid) {
    d.querySelectorAll(".sale-client-empty").forEach($el => $el.classList.add("is-hidden"))
  } else {
    d.querySelectorAll(".sale-client-empty").forEach($el => $el.classList.remove("is-hidden"))
  }

  d.getElementById("sale-client").innerText = cli.description
  let $numberCuts = d.querySelector(".sale-client-cuts"),
    $freeCutMessage = d.querySelector(".free-cut-message")
  //// 20240429 DESHABILITADO PROMO NEW CUSTOMER/PRIMER SERVICIO
  // ,$newCustomerMessage = d.querySelector(".new-customer-message")

  $numberCuts.innerText = cli.stFreeSixthCut
  if (cli.stFreeSixthCut > FREE_CUT_COUNTER) {
    sale.stPromoFreeCut = true
    $numberCuts.classList.add("has-background-primary")
    $numberCuts.classList.add("has-text-white")
    $freeCutMessage.classList.remove("is-hidden")
  } else {
    $numberCuts.classList.remove("has-background-primary")
    $numberCuts.classList.remove("has-text-white")
    $freeCutMessage.classList.add("is-hidden")
  }
  //// 20240429 DESHABILITADO PROMO NEW CUSTOMER/PRIMER SERVICIO
  /*if (cli.stTotalServices == 0 && cli.stLastService === null && cli.idNumber !== "9999999999999") {
    sale.stPromoNewCustomer = false
    $numberCuts.innerText = "NUEVO CLIENTE"
    $newCustomerMessage.classList.remove("is-hidden")
  } else {
    $newCustomerMessage.classList.add("is-hidden")
  }*/
  d.querySelector(".sale-date-input").valueAsDate = hoyEC().toJSDate()
  ///////d.querySelector(".ticket-input").value = sale.ticket
  // Control de fechas minimo y maximo para ing/egr caja
  addMinMaxPropsWithCashOutflowDates(".sale-date-input")
  d.getElementsByName("seller").forEach($el => $el.checked = $el.value === sale.seller)
  d.getElementsByName("typePayment").forEach($el => $el.checked = $el.value === sale.typePayment)
  d.getElementsByName("typeSale").forEach($el => $el.checked = $el.value === sale.type)
}

// Actualizar los productso/servicios de la venta
function renderSaleItems(changeTypePayment) {
  const $productsContainer = d.getElementById("sale-details-products"),
    $servicesContainer = d.getElementById("sale-details-services"),
    $productsFragment = d.createDocumentFragment(),
    $servicesFragment = d.createDocumentFragment(),
    $btnServicios = d.querySelector(sale.seller === "ENEGLIMAR" ? ".trigger-services-modal-eneglimar" : ".trigger-services-modal"),
    $btnProductos = d.querySelector(".trigger-products-modal"),
    $btnCancel = d.querySelector(".sale-cancel")

  // Deshabilitar los botones de catalogos
  d.querySelector(".trigger-services-modal").classList.add("is-hidden")
  d.querySelector(".trigger-services-modal-eneglimar").classList.add("is-hidden")
  $btnProductos.classList.add("is-hidden")
  $btnCancel.setAttribute("disabled", true)

  let vnCountProducts = 0,
    vnCountServices = 0

  // setear valores del carrito
  sale.taxableIncome = 0
  sale.discounts = 0
  sale.taxes = 0
  sale.totalSale = 0
  sale.barberCommission = 0

  if (sale.valid) {
    const $template = d.getElementById("sale-item-template").content,
      $descMobile = $template.querySelector(".sale-item-description-mobile"),
      $desc = $template.querySelector(".sale-item-description"),
      $amount = $template.querySelector(".sale-item-amount"),
      $unitValue = $template.querySelector(".sale-item-unit-value"),
      $unitDiscount = $template.querySelector(".sale-item-unit-discount"),
      $value = $template.querySelector(".sale-item-value"),
      $delete = $template.querySelector(".sale-item-delete")

    let vnUnitDiscount,
      vnBaseDiscount,
      vnTaxDiscount,
      vnUniqueServiceDiscount = 0

    sale.items.forEach(item => {
      ////console.log("Agregando item a la venta=", item.tmpUid)
      let baseValue = item.baseValue,
        finalValue = item.finalValue,
        taxIVA = item.taxIVA

      // Cambio de valores para productos al por mayor
      //if (item.type === "P" && sale.type === "PORMAYOR") {
      //  baseValue = item.wholesaleValue
      //  finalValue = item.wholesaleFinalValue
      //  taxIVA = item.wholesaleTaxIVA
      //}

      // Calculos para totalizadores
      vnBaseDiscount = 0
      vnTaxDiscount = 0
      // El descuento puede haberse igresado/modificado manualmente al registro, null la primera vez
      vnUnitDiscount = item.unitDiscount

      // SOLO para servicios, se aplica los descuentos automaticos la primera vez o cuando cambia el metodo de pago
      if (!item.unitDiscount || changeTypePayment || sale.stPromoFreeCut === true) {
        vnUnitDiscount = 0
        // descuento IVA solo pagos en efectivo, transferencias y cortesia
        if (sale.typePayment === "EFECTIVO" || sale.typePayment === "TRANSFERENCIA" || sale.typePayment === "TRANSFDEUNA" || sale.typePayment === "CORTESIA") {
          vnUnitDiscount += taxIVA
        } else if (sale.shop !== SHOPS.mmp.code && DATAFAST_PAYMENTS.includes(sale.typePayment)) {
          // 20240426 PARA LAS BARBERIAS A EXCEPCION DE MANTA se descuenta el IVA para tarjetas 
          vnUnitDiscount += taxIVA
        }

        if (item.type === "S") {
          // PROMO SEXTO CORTE aplica para el primer servicio registrado
          if (vnUniqueServiceDiscount === 0 && (sale.stPromoFreeCut === true || sale.typePayment === "CORTESIA")) {
            if (baseValue > freeCutValueBase) {
              vnUnitDiscount += freeCutValueBase
            } else {
              vnUnitDiscount += baseValue
            }
            vnUniqueServiceDiscount++
          }
        }
        item.unitDiscount = vnUnitDiscount
      }

      // Recalculo de impuestos por descuentos
      if (vnUnitDiscount > 0) {
        // Se considera que todos los servicios y productos estan gravados solo con MANEJO IVA
        vnBaseDiscount = roundFour(vnUnitDiscount / (1 + IVA))
        vnTaxDiscount = vnUnitDiscount - vnBaseDiscount
      }

      item.taxableIncome = roundFour((baseValue - vnBaseDiscount) * item.numberOfUnits)
      item.taxes = roundFour(((taxIVA || 0) - vnTaxDiscount) * item.numberOfUnits)
      item.total = roundFour(item.taxableIncome + item.taxes)
      item.discounts = roundFour(vnUnitDiscount * item.numberOfUnits)
      item.barberCommission = truncFour(item.taxableIncome * item.sellerCommission / 100)

      sale.taxableIncome += item.taxableIncome
      sale.taxes += item.taxes
      sale.discounts += item.discounts
      sale.barberCommission += item.barberCommission

      // crear detalle de carrito (fila de tabla)
      $descMobile.innerText = item.description
      $desc.innerText = item.description
      $amount.value = item.numberOfUnits
      $amount.dataset.key = item.tmpUid
      $unitValue.innerText = finalValue.toFixed(2)
      $unitDiscount.value = vnUnitDiscount.toFixed(2)
      $unitDiscount.max = finalValue.toFixed(2)
      $unitDiscount.dataset.key = item.tmpUid
      if (item.type === "S") {
        $unitDiscount.classList.add("sale-item-unit-discount-service")// Control de descuentos en servicios Consumidor final
      } else {
        $unitDiscount.classList.remove("sale-item-unit-discount-service")
      }
      $value.innerText = ((finalValue - vnUnitDiscount) * item.numberOfUnits).toFixed(2)
      $delete.dataset.key = item.tmpUid
      let $clone = d.importNode($template, true)
      if (item.type === "S") {
        $servicesFragment.appendChild($clone)
        vnCountServices++
      } else {
        $productsFragment.appendChild($clone)
        vnCountProducts++
      }

    })

    // Redonder a dos decimales los totales
    sale.taxableIncome = roundTwo(sale.taxableIncome)
    sale.taxes = roundTwo(sale.taxes)
    sale.totalSale = roundTwo(sale.taxableIncome + sale.taxes)
    sale.discounts = roundTwo(sale.discounts)
    sale.barberCommission = roundFour(sale.barberCommission)

    // Habilitar los botones de catalogos
    $btnServicios.classList.remove("is-hidden")
    $btnProductos.classList.remove("is-hidden")
    $btnCancel.removeAttribute("disabled")
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
  // Activar/inactivar propina por pago bancario, debe colocarse primero para validar si 
  // setea el valor de efectivo=0
  validateBarberTipActive()
  // Activar/inactivar descuentos para 'Consumidor final'
  validateDiscountActive()
  // Agregar la propina a la venta
  if (sale.tipByBank && sale.tipByBank > 0) {
    switch (sale.typePayment) {
      case "TRANSFERENCIA":
      case "TRANSFDEUNA":
        sale.totalSale = roundTwo(sale.totalSale + sale.tipByBank)
        break;
      case "TCREDITO":
      case "TDEBITO":
        sale.taxableIncome = roundTwo(sale.taxableIncome + sale.tipByBank)
        // MANEJO IVA 20240426 ELIMINO IVA PROPINA
        sale.taxes = roundTwo(sale.taxes)
        sale.totalSale = roundTwo(sale.taxableIncome + sale.taxes)
        break;
    }
  }

  d.querySelector(".sale-summary-tip").value = sale.tipByBank.toFixed(2)
  ////d.querySelector(".sale-summary-taxableincome").innerText = sale.taxableIncome.toFixed(2)
  ////d.querySelector(".sale-summary-taxes").innerText = sale.taxes.toFixed(2)
  d.querySelector(".sale-summary-totalsale").innerText = sale.totalSale.toFixed(2)
  //d.querySelector(".sale-summary-discounts").innerText = sale.discounts.toFixed(2)

  // 20240426 PARA LAS BARBERIAS A EXCEPCION DE MANTA se cambia valores a presentar 
  if (sale.shop === SHOPS.mmp.code && DATAFAST_PAYMENTS.includes(sale.typePayment)) {
    d.querySelector(".sale-summary-taxableincome").innerText = sale.taxableIncome.toFixed(2)
    d.querySelector(".sale-summary-taxes").innerText = sale.taxes.toFixed(2)
  } else {
    d.querySelector(".sale-summary-taxableincome").innerText = sale.totalSale.toFixed(2)
    d.querySelector(".sale-summary-taxes").innerText = roundTwo(0.0)
  }

  // Deshabilitar el boton Guardar cuando la venta es cero
  if (sale.valid && sale.items.length > 0) {
    d.querySelector(".sale-save").removeAttribute("disabled")
  } else {
    d.querySelector(".sale-save").setAttribute("disabled", false)
  }
}

// Cambiar la cantidad de un producto/servicio
function changeItemNumberOfUnits(vsCode, vsAction, vnValue) {
  sale.items = sale.items.map(item => {
    let numberOfUnits = item.numberOfUnits;

    if (item.tmpUid === vsCode) {
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
  sale.items = sale.items.map(item => {
    let unitDiscount = item.unitDiscount
    if (item.tmpUid === vsCode) {
      unitDiscount = parseFloat(vnUnitDiscount)
    }
    return {
      ...item,
      unitDiscount
    }
  })
}

//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------
// EVENTO=load RAIZ=window ACCION= Terminar de cargar la ventana
w.addEventListener("unload", () => {
  localStorage.removeItem(localdb.sale)
  localStorage.removeItem(localdb.client)
})

// EVENTO=DOMContentLoaded RAIZ=document 
d.addEventListener("DOMContentLoaded", e => {

  // Carga de catalogos
  products = JSON.parse(localStorage.getItem(localdb.catalogProducts))
  services = JSON.parse(localStorage.getItem(localdb.catalogServices))
  if (products === null) {
    findCatalog(collections.catalogProducts, "baseValue",
      res => {
        products = res
        localStorage.setItem(localdb.catalogProducts, JSON.stringify(products))

      },
      error => ntf.errorAndLog("Cache de catalogo de productos con error", error))
  }
  if (services === null) {
    findCatalog(collections.catalogServices, "baseValue",
      res => {
        services = res
        localStorage.setItem(localdb.catalogServices, JSON.stringify(services))
      },
      error => ntf.errorAndLog("Cache de catalogo de servicios con error", error))
  }

  /////////////////////////////////////////////
  //TODO: Eliminar diferenciacion de Eneglimar
  /////////////////////////////////////////////
  modalToggle(".trigger-services-modal", () => loadCatalog($servicesModalContainer,
    services.filter(s => s.active && s.barber !== "ENEGLIMAR")))
  modalToggle(".trigger-services-modal-eneglimar", () => loadCatalog($servicesModalEneglimarContainer,
    services.filter(s => s.active && s.barber === "ENEGLIMAR")))
  modalToggle(".trigger-products-modal", () => loadCatalog($productsModalContainer,
    products.filter(p => p.active)))
  handlerClients()
  handlerClientEdit()


  // Verificar si se debe cargar una venta almacenada o una nueva venta
  sale = JSON.parse(localStorage.getItem(localdb.sale) ? localStorage.getItem(localdb.sale) : JSON.stringify(saleInit))
  updateSale()

  // Agregar vendedores
  addOperators(".seller-container", "seller-template",
    () => {
      //agregar responsables del registro de cliente
      addOperators(".registered-container", "registered-template",
        () => { },
        () => ntf.errorAndLog(`No se pudo obtener la informacion de quien registra los clientes, 
      por favor intente nuevamente ingresando al sistema;
      si el problema continua, comuniquelo a Carlos Quinteros`))
    },
    () => ntf.errorAndLog(`No se pudo obtener la informacion de vendedores, 
      por favor intente nuevamente ingresando al sistema;
      si el problema continua, comuniquelo a Carlos Quinteros`))

})

// EVENTO=click RAIZ=services-modal ACCION=cerrar modal y ejecutar callback
d.querySelector("#services-modal .items-container").addEventListener("click", e => {
  //console.log(`elemento ${this.className}, el click se origino en ${e.target.className}`)
  // Servicio seleccionado 
  if (e.target.matches(".catalog-item") || e.target.closest(".catalog-item")) {
    e.target.closest(".modal").classList.remove("is-active") // Cerrar modal
    if (!sale.seller) {
      ntf.validation("Seleccione un vendedor")
      return
    }
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
    if (!sale.seller) {
      ntf.validation("Seleccione un vendedor")
      return
    }
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


// EVENTO=click RAIZ=section<servicios> ACCION=Eliminar detalles
d.getElementById("sales").addEventListener("click", e => {
  let $el = e.target
  ////console.log(`evento click target=${$el.classList}`, $el.value)

  // Venta a consumidor final
  if ($el.matches(".trigger-sale")) {
    changeSaleClient($el)// Cambiar de venta al seleccionar consumidor final
  }

  // Elemento a eliminar 
  if ($el.matches(".sale-item-delete") || $el.closest(".sale-item-delete")) {
    const $saleItem = e.target.closest(".sale-item-delete")
    removeFromSale($saleItem.dataset.key)
  }
  // Guardar la venta
  if ($el.matches(".sale-save") || $el.closest(".sale-save")) {
    if (!sale.seller) {
      ntf.validation("Seleccione el vendedor")
    } else if (!sale.typePayment) {
      ntf.validation("Seleccione la forma de pago")
    } else if (sale.items.length === 0) {
      ntf.validation("No ha registrado ningún producto o servicio")
    } else {
      localStorage.setItem(localdb.tmpCustomerId, sale.client.idNumber)
      insertSalesDB(resetSale)
    }
  }
  // Cancelar la venta
  if ($el.matches(".sale-cancel") || $el.closest(".sale-cancel")) {
    let eliminar = true
    if (sale.items.length > 0) {
      eliminar = confirm("Esta seguró que desea descartar la información de la venta? ")
    }
    if (eliminar) {
      resetSale()
      ntf.okey("Venta descartada")
    }
  }
})

// EVENTO=change RAIZ=section<servicios> ACCION=detectar cambios en inputs 
d.getElementById("sales").addEventListener("change", e => {
  let $input = e.target
  ////console.log(`evento change target = ${$input.classList} `, $input.value)
  if ($input.matches(".sale-item-amount")) {
    let newValue = parseInt($input.value)
    if (isNaN(newValue) || newValue < 1) {
      ntf.validation("La cantidad no puede ser menor a uno")
      newValue = 1
      $input.value = newValue
    }
    changeItemNumberOfUnits($input.dataset.key, "replace", newValue);
    sale.update = true
  } else if ($input.matches(".sale-item-unit-discount")) {
    let newValue = parseFloat($input.value),
      max = parseFloat($input.max)
    if (isNaN(newValue) || newValue < 0) {
      ntf.validation("El descuento por unidad no puede ser menor a cero")
      newValue = 0
      $input.value = newValue
    } else if (newValue > max) {
      ntf.validation("El descuento por unidad no puede ser mayor al valor de la unidad.")
      newValue = max
      $input.value = newValue
    }
    changeItemDiscount($input.dataset.key, newValue)
    sale.update = true
  } else if ($input.name === "promoFreeCut") {
    sale.stPromoFreeCut = $input.checked ? true : null
    updateSaleDetails(true)
    //// 20240429 DESHABILITADO PROMO NEW CUSTOMER/PRIMER SERVICIO
    //} else if ($input.name === "promoNewCustomer") {
    //  sale.stPromoNewCustomer = $input.checked
  } else if ($input.name === "seller") {
    sale.seller = $input.value
    updateSaleDetails()
  } else if ($input.name === "typePayment") {
    sale.typePayment = $input.value
    // Recalcula por el descuento por pago en efectivo de servicios, 
    // true forza a recalcular descuentos automaticos
    updateSaleDetails(true)
  } else if ($input.name === "typeSale") {
    sale.type = $input.value
    // Setear valores a consumidor final en el catalogo de productos
    changeProductsModalTypeSale(sale.type === "PORMAYOR")
    // Recalcular precios de productos con precio CLIENTE o PORMAYOR
    updateSaleDetails()
    //TODO Agregar validacion de al menos un servicio o producto

  } else if ($input.name === "saleDate" && dateIsValid($input.value)) {
    ////console.log("sale.date=", new Date(sale.date))
    let vdOther = addHours(new Date($input.value), 5)
    // Agregar la hora y minuto actual de datos
    let now = nowEc()
    vdOther.setHours(now.getHours(), now.getMinutes(), now.getSeconds())
    sale.date = vdOther.getTime()
    //// console.log("despues sale.date=", new Date(sale.date))
  } else if ($input.name === "tipValue") {
    ////console.log("sale.tipByBank=", $input.value)
    // Cambio valor de propina bancaria
    sale.tipByBank = $input.valueAsNumber || 0
    sale.update = true
  } else if ($input.name === "ticket") {
    sale.ticket = $input.value
  } else if ($input.name === "notes") {
    sale.notes = $input.value
  }
  localStorage.setItem(localdb.sale, JSON.stringify(sale))
})

// EVENTO=focusout RAIZ=section<servicios> ACCION=detectar cambios en inputs que deben refrescarv la pagina
d.getElementById("sales").addEventListener("focusout", e => {
  // Si existe cambios en cantidad o descuento de items, se actualiza el carrito 
  if (sale.update) {
    sale.update = false
    updateSaleDetails()
  }
})

// --------------------------
// Database operations
// --------------------------

function insertSalesDB(callback) {

  // Cabecera de la venta MANEJO IVA
  let saleHeader = {
    ...JSON.parse(JSON.stringify(sale)),
    clientId: sale.client.idNumber,
    clientUid: sale.client.uid,
    iva: IVA
  }

  // Agregar las propiedades de fechas
  saleHeader = generateDateProperties(saleHeader)
  // Generar la clave de la nueva venta
  const saleKey = timestampToDatekey(saleHeader.date)

  // TODO: Agregar en la venta el banco para la transferencia
  // SOLO MANTA: Si forma pago=TCREDITO/TDEBITO o TRANSFERENCIA se genera una transaccion bancaria a PRODUBANCO
  let bancoTmp
  if (saleHeader.shop === SHOPS.mmp.code && DATAFAST_PAYMENTS.includes(saleHeader.typePayment)) {
    bancoTmp = BANCO_PRODUBANCO
  }
  if (saleHeader.shop !== SHOPS.mmp.code && DATAFAST_PAYMENTS.includes(saleHeader.typePayment)) {
    bancoTmp = BANCO_DATAFAST
  }
  if (saleHeader.typePayment === "TRANSFDEUNA") {
    saleHeader.typePayment = "TRANSFERENCIA"
    bancoTmp = DEUNA_PICHINCHA
  }

  let tx = saleToBanktransaction(saleHeader, bancoTmp),
    txKey = undefined
  if (tx) {
    txKey = saleKey + "-" + tx.type.slice(0, 3)
    saleHeader.bankTxUid = txKey
  }
  saleHeader.paymentTip = tx && tx.tipByBank ? tx.tipByBank : (saleHeader.tipByBank || 0)
  saleHeader.paymentTotalSale = tx ? tx.value : saleHeader.totalSale
  saleHeader.paymentEffectiveSale = roundFour(saleHeader.paymentTotalSale - saleHeader.paymentTip)

  let i = 1,
    effectiveSale = saleHeader.totalSale - saleHeader.tipByBank
  // Complementar detalles de la venta
  let saleDetails = saleHeader.items.map((item) => {
    /////////////////////////////////////////////////////////////////////////////////////////////////
    // TODO: Cambiar propiedades con el prefijo tmpXYZ para eliminar propiedades temporales
    /////////////////////////////////////////////////////////////////////////////////////////////////
    delete item.active
    delete item.description
    delete item.promo
    delete item.retentionIVA
    delete item.taxIVA
    return {
      ...item,
      clientId: saleHeader.clientId,
      order: i++,
      saleUid: saleKey,
      shop: saleHeader.shop,
      paymentTotal: item.total === 0 ? 0 : roundFour(item.total * saleHeader.paymentEffectiveSale / effectiveSale)
    }
  })

  // Generar bloque de transaccion
  let updates = {}

  // Registrar los detalles de la venta
  //TODO: Promocion corte gratis
  let totalServices = 0,
    totalFreeCut = 0,
    totalServicesTaxableIncome = 0

  saleDetails.forEach(item => {
    // Los servicios gratuitos son con valor 0
    if (item.type === "S") {
      totalServices += item.numberOfUnits
      totalServicesTaxableIncome += item.total
      totalFreeCut += Math.trunc(item.total / freeCutValueBase)
    }
    let detailKey = saleKey + '-' + zeroPad(item.order, 2);
    updates[`${collections.salesDetails}/${detailKey}`] = item
  })
  //TODO: Promo corte gratis
  if (totalFreeCut === 0 && totalServices > 1) {
    totalFreeCut += Math.trunc(totalServicesTaxableIncome / freeCutValueBase)
  }

  // Para Granados los pagos con tarjetas de credito y debito no contabilizan para cortes gratis
  if (saleHeader.shop === SHOPS.qgr.code && DATAFAST_PAYMENTS.includes(saleHeader.typePayment)) {
    totalFreeCut = 0
  }

  // Actualizar datos del cliente
  if (saleHeader.clientId !== "9999999999999") {
    updates[`${collections.customers}/${saleHeader.clientUid}/aud/${saleKey}/shop`] = saleHeader.shop
    updates[`${collections.customers}/${saleHeader.clientUid}/aud/${saleKey}/seller`] = saleHeader.seller
    updates[`${collections.customers}/${saleHeader.clientUid}/aud/${saleKey}/totalSale`] = saleHeader.totalSale

    // Se almacena  los valores previos de las promociones para restablecer cuando se elimina la venta
    let stFreeSixthCut = saleHeader.client.stFreeSixthCut || 0,
      stTotalServices = saleHeader.client.stTotalServices || 0,
      stLastService = saleHeader.client.stLastService || 1641013200000

    saleHeader.stLastFreeSixthCut = stFreeSixthCut
    saleHeader.stLastTotalServices = stTotalServices
    saleHeader.stLastServices = stLastService

    if (totalServices > 0) {
      //// 20240429 DESHABILITADO PROMO NEW CUSTOMER/PRIMER SERVICIO
      //Promo cuando se ha entregado el beneficio de nuevo cliente, no contabiliza para promocion de sexto corte
      //if (saleHeader.stPromoNewCustomer === true) {
      //  totalFreeCut--
      //}

      // Verifica si se aplica la promocion del corte gratis
      if (saleHeader.stPromoFreeCut === true && stFreeSixthCut > FREE_CUT_COUNTER) {
        stFreeSixthCut = stFreeSixthCut - (FREE_CUT_COUNTER + 1) // Se descuenta los 6 cortes + el corte gratis de la venta actual
      }
      // Al saldo de cortes agrega el total de servicios de la venta
      stFreeSixthCut += totalFreeCut
      updates[`${collections.customers}/${saleHeader.clientUid}/stFreeSixthCut`] = stFreeSixthCut < 1 ? 1 : stFreeSixthCut
      updates[`${collections.customers}/${saleHeader.clientUid}/stTotalServices`] = stTotalServices + totalServices
      updates[`${collections.customers}/${saleHeader.clientUid}/stLastService`] = saleHeader.date

      //// 20240429 DESHABILITADO PROMO NEW CUSTOMER/PRIMER SERVICIO
      //// registra si se ha entregado el beneficio para nuevos clientes
      //if (saleHeader.stPromoNewCustomer) {
      //  updates[`${collections.customers}/${saleHeader.clientUid}/stPromoNewCustomer`] = saleKey
      //}
    }

  }

  // Registrar si existe la transaccion bancaria
  if (tx) {
    updates[`${collections.bankingTransactions}/${txKey}`] = tx
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////
  // TODO: Cambiar propiedades con el prefijo tmpXYZ para eliminar propiedades temporales
  /////////////////////////////////////////////////////////////////////////////////////////////////
  delete saleHeader.items
  delete saleHeader.client
  delete saleHeader.valid
  delete saleHeader.update

  // Registrar la venta
  updates[`${collections.sales}/${saleKey}`] = saleHeader

  // Registrar la venta en la BD
  dbRef.update(updates, (error) => {
    if (error) {
      ntf.errorAndLog("Venta no registrada", error)
      localStorage.removeItem(localdb.tmpCustomerId)
    } else {
      ntf.okey(`Se guardó correctamente la información de la venta Nro. ${saleHeader.date}.`)
      callback(saleHeader.idNumber)
    }
  })
}