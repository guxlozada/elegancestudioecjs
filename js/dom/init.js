import { ASIDE_ADMINISTRATION, ASIDE_BARBERSHOP, ASIDE_INVENTORY, ASIDE_OPERATIONS, NAV_ADMINISTRATION, NAV_BARBERSHOP, NAV_INVENTORY, NAV_OPERATIONS } from "../interceptor/menu_by_rol.js";
import { inyectDailyData } from "../util/daily-data-cache.js";
import { cleanControlAccess, getShop, isAdmin, isBarber } from "./manager_user.js";
import navbarBurgers from "./navbar_burgers.js";

const d = document,
  w = window,
  $navMenu = d.querySelector(".horizontal-menu"),
  $asideMenu = d.querySelector(".vertical-menu")

// EVENTO=load RAIZ=window 
w.addEventListener("load", () => {
  inyectDailyData()
  validateAuth()
})

// EVENTO=DOMContentLoaded RAIZ=document 
d.addEventListener("DOMContentLoaded", () => {
  (d.querySelectorAll(".logout") || []).forEach(($el) => $el.addEventListener("click", () => logOut()))
  navbarBurgers()
})

// verificar autenticacion
function validateAuth() {
  d.querySelector("body").style.display = "none"

  let admin = isAdmin() || false,
    barber = isBarber() || false,
    shop = getShop()

  if (shop === null || !(admin || barber)) {
    logOut()
    return
  }

  d.querySelector("body").style.display = "block"

  if ($navMenu || $asideMenu) generateMenu()

  // Colocar nombre de la sucursal
  d.getElementById("shop-location").innerText = shop.name
}

// Cerrar sesion autenticada
export function logOut() {
  cleanControlAccess()
  w.location.replace("/shop-areyou.html")
}

function generateMenu() {
  let navHTML = NAV_BARBERSHOP,
    asideHTML = ASIDE_BARBERSHOP
  if (isAdmin()) {
    navHTML += NAV_OPERATIONS + NAV_ADMINISTRATION + NAV_INVENTORY
    asideHTML += ASIDE_OPERATIONS + ASIDE_ADMINISTRATION + ASIDE_INVENTORY
  }
  if ($navMenu) $navMenu.insertAdjacentHTML("afterbegin", navHTML)
  if ($asideMenu) $asideMenu.insertAdjacentHTML("afterbegin", asideHTML)
}
