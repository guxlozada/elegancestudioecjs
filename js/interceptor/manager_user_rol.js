import navbarBurgers from "../dom/navbar_burgers.js"

const d = document

// EVENTO=load RAIZ=window 
// AGREGAR CONTROL DE USUARIO AUTENTICADO Y FECHAS DE OPERACION EN localstore
//w.addEventListener("load", () => filtersInit())

// EVENTO=DOMContentLoaded RAIZ=document ACCION: Termina de cargar el DOM
d.addEventListener("DOMContentLoaded", () => navbarBurgers())