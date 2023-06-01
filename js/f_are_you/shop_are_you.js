import NotificationBulma from '../dom/NotificacionBulma.js';
import { ADM_PW, ATTEMPTS, FD, localdb } from "../repo-browser.js";
import { inyectDailyData } from '../util/daily-data-cache.js';
import { hoyEC } from '../util/fecha-util.js';
import convertFormToObject from "../util/form_util.js";
import { cleanControlAccess } from '../dom/manager_user.js';
import { findOperator } from './dao_adm_operators.js';

const d = document,
  w = window,
  ntf = new NotificationBulma(),
  $areyouForm = d.querySelector(".areyou"),
  $user = d.getElementById("user")
//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

// EVENTO=load RAIZ=window 
w.addEventListener("load", () => {
  // Siempre debe ir despues de la validacion de dia de operacion xq se borra todos los auxiliares
  cleanControlAccess()
  localStorage.setItem(localdb.attemps, ATTEMPTS)
  $user.focus()
})

// EVENTO=unload RAIZ=window 
w.addEventListener("unload", () => localStorage.removeItem(localdb.attemps))

// EVENTO=submit RAIZ=form ACCION=Validar
d.addEventListener("submit", e => {
  e.preventDefault()
  let auth = convertFormToObject($areyouForm)

  if (!auth.shop || !auth.user || !auth.password) {
    ntf.validation("Seleccione la sucursal e ingrese su usuario y clave.")
  }

  if (!ntf.enabled) {
    // Almacena id de sucursal
    localStorage.setItem(localdb.accessShopkey, auth.shop)

    findOperator(auth,
      (voOpr, voAuth) => validAccess(voOpr, voAuth),
      () => validAccess())
  }

})

function validAccess(voOpr, auth) {
  if (!voOpr) {
    ntf.validation("El usuario no es valido.")
  } else if (voOpr.rol !== "ADMIN" && !voOpr.location.includes(auth.shop)) {
    ntf.validation(`No tiene acceso a la sucursal seleccionada.`)
  }

  // Si hay msj de error finaliza
  if (ntf.enabled) return

  let valid = false
  switch (voOpr.rol) {
    case "ADMIN":
      valid = auth.password && auth.password.startsWith(ADM_PW)
      if (valid) {
        localStorage.setItem(localdb.accesskey, hoyEC().toFormat(FD))
      }
      break;
    case "SUPERVISOR":
      valid = auth.password && auth.password === voOpr.pwd
      if (valid) {
        localStorage.setItem(localdb.accesskey, hoyEC().toFormat(FD))
      }
      break;
    case "BARBER":
      valid = auth.password && auth.password === voOpr.pwd
      if (valid) {
        localStorage.setItem(localdb.accessBarberkey, hoyEC().toFormat(FD))
      }
      break;
    default:
      ntf.validation(`Existe un problema de asignacion de permisos de acceso a su usuario. Por favor comuniquese con Carlos Quinteros.`)
  }

  if (!valid) {
    let attempts = localStorage.getItem(localdb.attemps) - 1
    localStorage.setItem(localdb.attemps, attempts)
    $areyouForm.reset()
    if (attempts < 1) {
      ntf.validation(`Ha ingresado una clave incorrecta el maximo de intentos permitidos, 
      de click en "Cancelar" e intente nuevamente despues de 5 minutos.`)
      $user.setAttribute("disabled", true)
    } else {
      ntf.validation(`Clave incorrecta, tiene ${attempts} intentos antes que se bloquee su acceso.`)
      $user.focus()
    }
  }

  // Si hay msj de error finaliza
  if (ntf.enabled) return
  
  //findBankAccounts(res => localStorage.setItem(localdb.catalogBankAccounts, JSON.stringify([...res])),
  // error => ntf.errorAndLog("Cache de catalogo de cuentas bancarias con error", error))
  
  inyectDailyData(()=> window.location.replace("/dashboard.html"))
}

// https://codepen.io/stevehalford/pen/YeYEOR html
// https://dev.to/thedevdrawer/login-validation-authentication-using-vanilla-javascript-4i45 js example