import NotificationBulma from '../dom/NotificacionBulma.js';
import { ADM_PW, ATTEMPTS, BARBER_PW, FD, localdb } from '../repo-browser.js';
import { inyectDailyData } from '../util/daily-data-cache.js';
import { hoyEC } from '../util/fecha-util.js';
import convertFormToObject from "../util/form_util.js";
import { cleanControlAccess } from './manager_user.js';

const d = document,
  w = window,
  ntf = new NotificationBulma(),
  $areyouForm = d.querySelector(".areyou"),
  $passwd = d.getElementById("password")
//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

// EVENTO=load RAIZ=window 
w.addEventListener("load", () => {
  inyectDailyData()
  // Siempre debe ir despues de la validacion de dia de operacion xq se borra todos los auxiliares
  cleanControlAccess()
  localStorage.setItem(localdb.attemps, ATTEMPTS)
  $passwd.focus()
})

// EVENTO=unload RAIZ=window 
w.addEventListener("unload", () => localStorage.removeItem(localdb.attemps))

// EVENTO=submit RAIZ=form ACCION=Validar
d.addEventListener("submit", e => {
  e.preventDefault()
  let auth = convertFormToObject($areyouForm),
    valid

  if (!auth.rol || !auth.password) {
    ntf.validation("Seleccione el tipo de acceso y la clave.")
  }

  // Si hay msj de error finaliza
  if (ntf.enabled) return

  switch (auth.rol) {
    case "barber":
      valid = auth.password && auth.password === BARBER_PW
      if (valid) {
        localStorage.setItem(localdb.accessBarberkey, hoyEC().toFormat(FD))
      }
      break;
    case "admin":
      valid = auth.password && auth.password.startsWith(ADM_PW)
      if (valid) {
        localStorage.setItem(localdb.accesskey, hoyEC().toFormat(FD))
      }
      break;
    default:
      ntf.validation(`Debe seleccionar el tipo de acceso: Barberia o Administracion.`)
  }

  if (!valid) {
    let attempts = localStorage.getItem(localdb.attemps) - 1
    localStorage.setItem(localdb.attemps, attempts)
    $areyouForm.reset()
    if (attempts < 1) {
      ntf.validation(`Ha ingresado una clave invalida el maximo de intentos permitidos, 
      de click en "Cancelar" e intente nuevamente despues de 5 minutos.`)
      $passwd.setAttribute("disabled", true)
    } else {
      ntf.validation(`Clave incorrecta, tiene ${attempts} intentos antes que se bloquee su acceso.`)
      $passwd.focus()
    }
  }

  // Si hay msj de error finaliza
  if (ntf.enabled) return
  window.location.replace("/dashboard.html")
})


// https://codepen.io/stevehalford/pen/YeYEOR html
// https://dev.to/thedevdrawer/login-validation-authentication-using-vanilla-javascript-4i45 js example