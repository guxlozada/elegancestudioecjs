import { addHours, ahoraEC, dateIsValid, hoyEC, todayEc, truncOperationDayString } from "./fecha-util.js";
import { sellerDB } from "./firebase_collections.js";
import { db } from "./firebase_conexion.js";
import navbarBurgers from "./navbar_burgers.js";
import NotificationBulma from './NotificacionBulma.js';
import { DateTime } from "../luxon.min.js";

const d = document,
  w = window,
  ntf = new NotificationBulma(),
  salesRef = db.ref(sellerDB.sales),
  expensesRef = db.ref(sellerDB.expenses),
  dailyClosingRef = db.ref(sellerDB.dailyClosing)

const filters = {
  seller: null,
  periodoStart: null,
  periodoEnd: null,
  lastClosingDay: null,
  barberAdvancePayment: new Map(),
  barberDrinks: new Map(),
  barberPaidCommissions: new Map(),
  barberPaidTips: new Map(),
  barberSales: new Map()
}
//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

// EVENTO=DOMContentLoaded RAIZ=document 
d.addEventListener("DOMContentLoaded", e => {
  findLastClosingDay()

  let dateTime = DateTime.local();
  console.log("DateTime.now()", DateTime.now().toString());
  console.log("ahoraEC", ahoraEC.toString());
  console.log("hoyEC", hoyEC.toString());

  // console.log("DateTime.now()", DateTime.now().setZone('America/Guayaquil').toString())
  // console.log("DateTime.now().toUTC()", DateTime.utc().toString())
  // console.log("DateTime.utc().toISO()", DateTime.utc().toISO())
  findExpenses('20220905', '20220911')
})

// EVENTO=resize RAIZ=header ACCION=cambiar el menu hamburguesa
w.addEventListener("resize", e => {
  navbarBurgers()
})

//------------------------------------------------------------------------------------------------
// Funcionalidad
//------------------------------------------------------------------------------------------------


function renderCommissionsPayment() {
  const $rowTmp = d.getElementById("sale-row").content,
    $rowBarber = d.getElementById("sale-row-header").content,
    $totalsTmp = d.getElementById("sale-row-summary").content,
    $fragment = d.createDocumentFragment(),
    $body = d.getElementById("summary")

  let vnTotalBarberTips,
    vnTotalTaxes,
    vnTotalTaxableIncome,
    vnTotalSales,
    vnTotalBarberAdvancePayment,
    vnTotalBarberCommissions,
    vnTotalBarberCommissionsTmp,
    vnTotalBarberDrinks,
    vnTotalBarberPaidCommissions,
    vnTotalBarberPaidTips,
    vnTotalBarberDiscounts,
    vnValueSale,
    vnTaxes,
    vnTaxableIncome,
    vnBarberTip,
    vnBarberCommission,
    vnBarberCommissionTmp,
    $clone

  d.getElementsByName("seller").forEach($el => {
    const barber = $el.value
    vnTotalTaxes = vnTotalTaxableIncome = vnTotalSales = vnTotalBarberCommissions = vnTotalBarberCommissionsTmp = vnTotalBarberTips = 0
    vnTotalBarberAdvancePayment = vnTotalBarberPaidCommissions = vnTotalBarberPaidTips = vnTotalBarberDrinks = vnTotalBarberDiscounts = 0
    ////console.log("barbero:", barber)
    if (barber !== "TODOS") {
      // Encabezado con barbero de
      $rowBarber.querySelector(".barber").innerText = barber
      $clone = d.importNode($rowBarber, true)
      $fragment.appendChild($clone)

      // GRUPO 1: Agregar detalles de servicios y venta de productos
      const salesByBarber = filters.barberSales.get(barber)
      if (salesByBarber) {
        salesByBarber.forEach((sale, index) => {
          vnValueSale = Math.round(sale.totalSale * 100) / 100
          vnTaxes = Math.round(sale.taxes * 100) / 100
          vnTaxableIncome = Math.round(sale.taxableIncome * 100) / 100
          vnBarberCommission = Math.round(sale.barberCommission * 100) / 100
          // Temporalmente a los pagos con tarjeta de credito o debito la comision al valor final es igual a la de base imponib
          if (sale.typePayment === 'TCREDITO' || sale.typePayment === 'TDEBITO') {
            vnBarberCommissionTmp = vnBarberCommission
          } else {
            vnBarberCommissionTmp = Math.round(sale.barberCommission * 11200) / 10000
          }
          vnBarberTip = Math.round(parseFloat(sale.tipByBank || 0) * 100) / 100
          vnTotalSales += vnValueSale
          vnTotalTaxes += vnTaxes
          vnTotalTaxableIncome += vnTaxableIncome
          vnTotalBarberCommissions += vnBarberCommission
          vnTotalBarberCommissionsTmp += vnBarberCommissionTmp
          vnTotalBarberTips += vnBarberTip
          $rowTmp.querySelector(".index").innerText = index + 1
          $rowTmp.querySelector(".date").innerText = sale.searchDateTime
          $rowTmp.querySelector(".payment").innerText = sale.typePayment
          $rowTmp.querySelector(".value").innerText = vnValueSale.toFixed(2)
          $rowTmp.querySelector(".taxes").innerText = sale.taxes.toFixed(2)
          $rowTmp.querySelector(".taxable-income").innerText = sale.taxableIncome.toFixed(2)
          $rowTmp.querySelector(".barber-commission").innerText = vnBarberCommission.toFixed(2)
          $rowTmp.querySelector(".barber-commission-tmp").innerText = vnBarberCommissionTmp.toFixed(2)
          $rowTmp.querySelector(".barber-tip").innerText = vnBarberTip > 0 ? vnBarberTip.toFixed(2) : ''
          $clone = d.importNode($rowTmp, true)
          $fragment.appendChild($clone)
        })
      }
      // Agregar totales
      $totalsTmp.querySelector(".total-value").innerText = vnTotalSales.toFixed(2)
      $totalsTmp.querySelector(".total-taxes").innerText = vnTotalTaxes.toFixed(2)
      $totalsTmp.querySelector(".total-taxable-income").innerText = vnTotalTaxableIncome.toFixed(2)
      $totalsTmp.querySelector(".total-barber-commissions").innerText = vnTotalBarberCommissions.toFixed(2)
      $totalsTmp.querySelector(".total-barber-commissions-tmp").innerText = vnTotalBarberCommissionsTmp.toFixed(2)
      $totalsTmp.querySelector(".total-barber-tips").innerText = vnTotalBarberTips.toFixed(2)


      // GRUPO 2: Totalizar comisiones adelantadas y pagadas 
      let discounts = filters.barberPaidCommissions.get(barber)
      if (discounts) {
        vnTotalBarberPaidCommissions = Math.round(discounts.reduce((acc, el) => acc + el.value, 0) * 100) / 100
        vnTotalBarberDiscounts += vnTotalBarberPaidCommissions
      }

      // GRUPO 3: Totalizar adelantos
      discounts = filters.barberAdvancePayment.get(barber)
      if (discounts) {
        vnTotalBarberAdvancePayment = Math.round(discounts.reduce((acc, el) => acc + el.value, 0) * 100) / 100
        vnTotalBarberDiscounts += vnTotalBarberAdvancePayment
      }

      // GRUPO 4: Totalizar propinas pagadas
      discounts = filters.barberPaidTips.get(barber)
      if (discounts) {
        vnTotalBarberPaidTips = Math.round(discounts.reduce((acc, el) => acc + el.value, 0) * 100) / 100
      }

      // GRUPO 5: Totalizar bebidas consumidas
      discounts = filters.barberDrinks.get(barber)
      if (discounts) {
        vnTotalBarberDrinks = Math.round(discounts.reduce((acc, el) => acc + el.value, 0) * 100) / 100
        vnTotalBarberDiscounts += vnTotalBarberDrinks

      }

      $totalsTmp.querySelector(".barber-paid-commissions").innerText = vnTotalBarberPaidCommissions.toFixed(2)
      $totalsTmp.querySelector(".barber-paid-commissions-tmp").innerText = vnTotalBarberPaidCommissions.toFixed(2)
      $totalsTmp.querySelector(".barber-advance-payments").innerText = vnTotalBarberAdvancePayment.toFixed(2)
      $totalsTmp.querySelector(".barber-advance-payments-tmp").innerText = vnTotalBarberAdvancePayment.toFixed(2)
      $totalsTmp.querySelector(".barber-drinks").innerText = vnTotalBarberDrinks.toFixed(2)
      $totalsTmp.querySelector(".barber-drinks-tmp").innerText = vnTotalBarberDrinks.toFixed(2)
      $totalsTmp.querySelector(".barber-paid-tips").innerText = vnTotalBarberPaidTips.toFixed(2)
      $totalsTmp.querySelector(".barber-pending-payment").innerText = (vnTotalBarberCommissions - vnTotalBarberDiscounts).toFixed(2)
      $totalsTmp.querySelector(".barber-pending-payment-tmp").innerText = (vnTotalBarberCommissionsTmp - vnTotalBarberDiscounts).toFixed(2)
      $totalsTmp.querySelector(".barber-pending-tips").innerText = (vnTotalBarberTips - vnTotalBarberPaidTips).toFixed(2)
      $clone = d.importNode($totalsTmp, true)
      $fragment.appendChild($clone)

    }
  })

  $body.appendChild($fragment)
}


function searchSalesAndPayments(vsStartDate, vsEndDate) {

  findSales(vsStartDate, vsEndDate)
  findPayments(vsStartDate, vsEndDate)
}


// --------------------------
// Database operations
// --------------------------
async function findLastClosingDay() {
  await dailyClosingRef.orderByKey().limitToLast(1).once('value')
    .then((snap) => {
      console.log(snap.toJSON())
      snap.forEach((child) => {
        filters.lastClosingDay = new Date(child.val().date)
      })
    })
}

async function findExpenses(vsStartDate, vsEndDate) {
  let arryTmp

  await expensesRef.orderByKey().startAt(vsStartDate + "T").endAt(vsEndDate + "\uf8ff")
    .once('value')
    .then((snap) => {
      ////console.log(snap.toJSON())
      snap.forEach((child) => {
        const dta = child.val()
        switch (dta.type) {
          case 'ADELANTO':
            arryTmp = filters.barberAdvancePayment.get(dta.responsable) || []
            arryTmp.push(dta)
            filters.barberAdvancePayment.set(dta.responsable, arryTmp)
            break
          case 'BEBIDA':
            arryTmp = filters.barberDrinks.get(dta.responsable) || []
            arryTmp.push(dta)
            filters.barberDrinks.set(dta.responsable, arryTmp)
            break
          case 'COMISION':
            arryTmp = filters.barberPaidCommissions.get(dta.responsable) || []
            arryTmp.push(dta)
            filters.barberPaidCommissions.set(dta.responsable, arryTmp)
            break
          case 'PROPINA':
            arryTmp = filters.barberPaidTips.get(dta.responsable) || []
            arryTmp.push(dta)
            filters.barberPaidTips.set(dta.responsable, arryTmp)
            break
        }
      })
    })
    .catch((error) => {
      ntf.tecnicalError(`Búsqueda de adelantos y comisiones pagadas con error`, error)
    })

  await salesRef.orderByKey().startAt(vsStartDate + "T").endAt(vsEndDate + "\uf8ff")
    .once('value')
    .then((snap) => {
      ////console.log(snap.toJSON())
      snap.forEach((child) => {
        arryTmp = filters.barberSales.get(child.val().seller) || []
        arryTmp.push(child.val())
        filters.barberSales.set(child.val().seller, arryTmp)
      })
    })
    .catch((error) => {
      ntf.tecnicalError(`Búsqueda de ventas con error`, error)
    })

  renderCommissionsPayment()
}

