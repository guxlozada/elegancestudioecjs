import { addHours, dateIsValid, hoyEC, nowEc } from "../util/fecha-util.js";
import { roundFour, roundTwo, truncTwo } from "../util/numbers-util.js";
import { zeroPad } from "../util/text-util.js";
import { addMinMaxPropsWithCashOutflowDates } from "../util/daily-data-cache.js";
import { dbRef } from "../persist/firebase_conexion.js";
import timestampToDatekey, { generateDateProperties } from "../persist/dao_generic.js";
import { collections } from "../persist/firebase_collections.js";
import NotificationBulma from "./NotificacionBulma.js";
import { services } from "./catalog_services.js";
import { servicesEneglimar } from "./catalog_services_eneglimar.js";
import { products } from "./catalog_products.js";
import { changeProductsModalTypeSale } from "../app.js";
import { BANCO_PICHINCHA, BANCO_PRODUBANCO, saleToBanktransaction } from "../f_bank_transactions/dao_bank_reconciliation.js";
import { localdb } from "../repo-browser.js";

const d = document,
  ntf = new NotificationBulma()

const saleInit = {
  client: {
    uid: "",
    description: "",
    lastService: null,//TODO: Cuando se guarde la factura hay que actualizar esta fecha
    referrals: null//TODO: Cuando se registra clientes, se debe actualizar el num referidos buscando por identificacion
  },
  seller: null,
  typePayment: "EFECTIVO",//[EFECTIVO,TCREDITO,TDEBITO, TRANSFERENCIA]
  type: "CLIENTE",//[CLIENTE, PORMAYOR]
  items: [],
  taxableIncome: 0,
  discounts: 0,
  taxes: 0,
  tipByBank: 0,
  totalSale: 0,
  barberCommission: 0,
  valid: false
}

// Variable global para manejo de la venta en proceso
let sale

//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------

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
    sale.client.lastService = $client.dataset.lastserv
    sale.client.referrals = $client.dataset.referrals
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
  if (sale.items.some((item) => item.code === vsCode)) {
    changeItemNumberOfUnits(vsCode, "plus", 1)
  } else {
    let item
    if (vsType === "SERVICE") {
      if (sale.seller === "ENEGLIMAR") {
        item = servicesEneglimar.find((s) => s.code === vsCode)
      } else {
        item = services.find((s) => s.code === vsCode)
      }
    } else {
      item = products.find((p) => p.code === vsCode)
    }

    sale.items.push({
      ...item,
      numberOfUnits: 1,
    })
  }
  updateSaleDetails()
}

// Eliminar item de la venta
function removeFromSale(vsCode) {
  sale.items = sale.items.filter(item => item.code !== vsCode)
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
  if (sale.typePayment === "EFECTIVO") {
    sale.tipByBank = 0
    $tip.setAttribute("disabled", false)
  } else {
    $tip.removeAttribute("disabled")
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
  d.getElementById("sale-client-lastserv").innerText = cli.lastService
  d.getElementById("sale-client-referrals").innerText = cli.referrals
  d.querySelector(".sale-date-input").valueAsDate = hoyEC().toJSDate()
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
    $btnServicios = d.querySelector(".trigger-services-modal"),
    $btnServiciosEneglimar = d.querySelector(".trigger-services-modal-eneglimar"),
    $btnProductos = d.querySelector(".trigger-products-modal"),
    $btnCancel = d.querySelector(".sale-cancel")

  // Manejo de catalogo de servicios diferenciado para ENEGLIMAR
  if (sale.seller === "ENEGLIMAR") {
    $btnServicios.classList.add("is-hidden")
    $btnServiciosEneglimar.classList.remove("is-hidden")
  } else {
    $btnServicios.classList.remove("is-hidden")
    $btnServiciosEneglimar.classList.add("is-hidden")
  }

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
      $desc = $template.querySelector(".sale-item-description"),
      $amount = $template.querySelector(".sale-item-amount"),
      $unitValue = $template.querySelector(".sale-item-unit-value"),
      $unitDiscount = $template.querySelector(".sale-item-unit-discount"),
      $value = $template.querySelector(".sale-item-value"),
      $delete = $template.querySelector(".sale-item-delete")

    let vnUnitDiscount,
      vnBaseDiscount,
      vnTaxDiscount

    sale.items.forEach(item => {
      ////console.log("Agregando item a la venta=", item.code)
      let baseValue = item.baseValue,
        finalValue = item.finalValue,
        taxIVA = item.taxIVA
      // Cambio de valores para productos al por mayor
      if (item.type === "P" && sale.type === "PORMAYOR") {
        baseValue = item.wholesaleValue
        finalValue = item.wholesaleFinalValue
        taxIVA = item.wholesaleTaxIVA
      }

      // Calculos para totalizadores
      vnBaseDiscount = 0
      vnTaxDiscount = 0
      // El descuento puede haberse igresado/modificado manualmente al registro, null la primera vez
      vnUnitDiscount = item.unitDiscount

      // SOLO para servicios, se aplica los descuentos automaticos la primera vez o cuando cambia el metodo de pago
      if (!item.unitDiscount || changeTypePayment) {
        vnUnitDiscount = 0
        // descuento IVA solo pagos en efectivo y transferencias
        if (sale.typePayment === "EFECTIVO" || sale.typePayment === "TRANSFERENCIA") {
          vnUnitDiscount += taxIVA
        }

        if (item.type === "S") {
          // ELIMINADO DESCUENTO DE MARTES
          ////if (item.promo.discountDay && todayEc().getDay() === 2)// Dia de descuento MARTES (2)
          ////  vnUnitDiscount += roundFour(item.promo.discountDay * baseValue / 100)
        }
        item.unitDiscount = vnUnitDiscount
      }

      // Recalculo de impuestos por descuentos
      if (vnUnitDiscount > 0) {
        // Se considera que todos los servicios y productos estan gravados solo con IVA
        vnBaseDiscount = roundFour(vnUnitDiscount / 1.12)
        vnTaxDiscount = vnUnitDiscount - vnBaseDiscount
      }

      let taxableIncome = (baseValue - vnBaseDiscount) * item.numberOfUnits
      item.taxableIncome = roundFour(taxableIncome)
      item.taxes = roundFour(((taxIVA || 0) - vnTaxDiscount) * item.numberOfUnits)
      item.total = roundFour(item.taxableIncome + item.taxes)
      item.discounts = roundFour(vnUnitDiscount * item.numberOfUnits)
      item.barberCommission = truncTwo(truncTwo(taxableIncome) * item.sellerCommission / 100)

      sale.taxableIncome += item.taxableIncome
      sale.taxes += item.taxes
      sale.discounts += item.discounts
      sale.barberCommission += item.barberCommission

      // crear detalle de carrito (fila de tabla)
      $desc.innerText = item.description
      $amount.value = item.numberOfUnits
      $amount.dataset.key = item.code
      $unitValue.innerText = finalValue.toFixed(2)
      $unitDiscount.value = vnUnitDiscount.toFixed(2)
      $unitDiscount.max = finalValue.toFixed(2)
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

    // Redonder a dos decimales los totales
    sale.taxableIncome = roundTwo(sale.taxableIncome)
    sale.taxes = roundTwo(sale.taxes)
    sale.totalSale = roundTwo(sale.taxableIncome + sale.taxes)
    sale.discounts = roundTwo(sale.discounts)
    sale.barberCommission = roundFour(sale.barberCommission)

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
  // Activar/inactivar propina por pago bancario, debe colocarse primero para validar si 
  // setea el valor de efectivo=0
  validateBarberTipActive()
  // Agregar la propina a la venta
  if (sale.tipByBank && sale.tipByBank > 0) {
    switch (sale.typePayment) {
      case "TRANSFERENCIA":
        sale.totalSale = roundTwo(sale.totalSale + sale.tipByBank)
        break;
      case "TCREDITO":
      case "TDEBITO":
        sale.taxableIncome = roundTwo(sale.taxableIncome + sale.tipByBank)
        sale.taxes = roundTwo(sale.taxes + (sale.tipByBank * 0.12))
        sale.totalSale = roundTwo(sale.taxableIncome + sale.taxes)
        break;
    }
  }

  d.querySelector(".sale-summary-tip").value = sale.tipByBank.toFixed(2)
  d.querySelector(".sale-summary-taxableincome").innerText = sale.taxableIncome.toFixed(2)
  d.querySelector(".sale-summary-taxes").innerText = sale.taxes.toFixed(2)
  d.querySelector(".sale-summary-totalsale").innerText = sale.totalSale.toFixed(2)
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

    if (item.code === vsCode) {
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
    if (item.code === vsCode) {
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
  // Verificar si se debe cargar una venta almacenada o una nueva
  sale = JSON.parse(localStorage.getItem(localdb.sale) ? localStorage.getItem(localdb.sale) : JSON.stringify(saleInit))
  updateSale()

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
        ntf.error("Información requerida", "Seleccione el vendedor", 3000)
      } else if (!sale.typePayment) {
        ntf.error("Información requerida", "Seleccione la forma de pago", 3000)
      } else if (sale.items.length === 0) {
        ntf.error("Información erronea", `No ha registrado ningún producto o servicio`, 3000)
      } else {
        // Insertar la venta en la base de datos
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
        ntf.show("Venta descartada", `Se elimino la venta sin guardar.`)
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
        ntf.error("Validación valor mínimo", "La cantidad no puede ser menor a uno")
        newValue = 1
        $input.value = newValue
      }
      changeItemNumberOfUnits($input.dataset.key, "replace", newValue);
      sale.update = true
    } else if ($input.matches(".sale-item-unit-discount")) {
      let newValue = parseFloat($input.value),
        max = parseFloat($input.max)
      if (isNaN(newValue) || newValue < 0) {
        ntf.error("Validación valor mínimo", "El descuento por unidad no puede ser menor a cero")
        newValue = 0
        $input.value = newValue
      } else if (newValue > max) {
        ntf.error("Validación valor mínimo", "El descuento por unidad no puede ser mayor al valor de la unidad.")
        newValue = max
        $input.value = newValue
      }
      changeItemDiscount($input.dataset.key, newValue)
      sale.update = true
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
      console.log("sale.tipByBank=", $input.value)
      // Cambio valor de propina bancaria
      sale.tipByBank = $input.valueAsNumber || 0
      sale.update = true
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
}

// --------------------------
// Database operations
// --------------------------

function insertSalesDB(callback) {

  // Cabecera de la venta
  let saleHeader = {
    ...JSON.parse(JSON.stringify(sale)),
    clientId: sale.client.idNumber,
    clientUid: sale.client.uid
  }

  // Agregar las propiedades de fechas
  saleHeader = generateDateProperties(saleHeader)
  // Generar la clave de la nueva venta
  const saleKey = timestampToDatekey(saleHeader.date)

  // TODO: Agregar en la venta el banco para la transferencia
  // Si forma pago=TCREDITO/TDEBITO o TRANSFERENCIA se genera una transaccion bancaria a PRODUBANCO
  let bancoTmp = saleHeader.typePayment === "TRANSFERENCIA" ? BANCO_PICHINCHA : BANCO_PRODUBANCO
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
      paymentTotal: roundFour(item.total * saleHeader.paymentEffectiveSale / effectiveSale)
    }
  })

  /////////////////////////////////////////////////////////////////////////////////////////////////
  // TODO: Cambiar propiedades con el prefijo tmpXYZ para eliminar propiedades temporales
  /////////////////////////////////////////////////////////////////////////////////////////////////
  delete saleHeader.items
  delete saleHeader.client
  delete saleHeader.valid
  delete saleHeader.update

  // Generar bloque de transaccion
  let updates = {}
  // Registrar la venta
  updates[`${collections.sales}/${saleKey}`] = saleHeader
  // Registrar los detalles de la venta
  saleDetails.forEach(item => {
    let detailKey = saleKey + '-' + zeroPad(item.order, 2);
    updates[`${collections.salesDetails}/${detailKey}`] = item
  })
  // Actualizar datos del cliente
  if (saleHeader.clientId !== "9999999999999") {
    updates[`${collections.clients}/${saleHeader.clientUid}/lastService`] = saleHeader.searchDate
  }

  // Registrar si existe la transaccion bancaria
  if (tx) {
    updates[`${collections.bankingTransactions}/${txKey}`] = tx
  }

  // Registrar la venta en la BD
  dbRef.update(updates, (error) => {
    if (error) {
      ntf.tecnicalError("Venta no registrada", error)
    } else {
      ntf.show("Venta registrada", `Se guardó correctamente la información de la venta Nro. ${saleHeader.date}`)
      callback()
    }
  })
}