import { isAdmin } from "../dom/manager_user.js"
import navbarBurgers from "../dom/navbar_burgers.js"
import { ASIDE_ADMINISTRATION, ASIDE_BARBERSHOP, ASIDE_INVENTORY, ASIDE_OPERATIONS, NAV_ADMINISTRATION, NAV_BARBERSHOP, NAV_INVENTORY, NAV_OPERATIONS } from "./menu_by_rol.js"

const d = document,
  w = window,
  $navMenu = d.querySelector(".horizontal-menu"),
  $asideMenu = d.querySelector(".vertical-menu")


// EVENTO=load RAIZ=window 
// AGREGAR CONTROL DE USUARIO AUTENTICADO Y FECHAS DE OPERACION EN localstore
w.addEventListener("load", () => generateMenu())

// EVENTO=DOMContentLoaded RAIZ=document ACCION: Termina de cargar el DOM
d.addEventListener("DOMContentLoaded", () => navbarBurgers())


function generateMenu() {
  let navHTML = NAV_BARBERSHOP,
  asideHTML = ASIDE_BARBERSHOP
  if (isAdmin()) {
    navHTML += NAV_OPERATIONS + NAV_ADMINISTRATION + NAV_INVENTORY
    asideHTML += ASIDE_OPERATIONS + ASIDE_ADMINISTRATION + ASIDE_INVENTORY
  }
  $navMenu.innerHTML = navHTML
  $asideMenu.innerHTML = asideHTML
}

