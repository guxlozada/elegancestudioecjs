/* ********** 81 Menú de Hamburguesa ********** */
const d = document

/* Los parametros son selectores validos */
export default function hamburgerMenu(panelBtn, panel, menuLink) {
  d.addEventListener("click", e => {
    /* Indica que se hace click en el boton o los elementos anidados dentro de la etiqueta 'button' */
    if (e.target.matches(panelBtn) || e.target.matches(`${panelBtn} *`)) {
      d.querySelector(panel).classList.toggle("is-active")
      /* Requerido por el componente de menu hamburguesa en su documentacion */
      d.querySelector(panelBtn).classList.toggle("is-active")
    }
    if (e.target.matches(menuLink)) {
      /* Se debe eliminar no usa 'toggle' xq el link solamente debe eliminar el estilo al panel y boton */
      d.querySelector(panel).classList.remove("is-active")
      d.querySelector(panelBtn).classList.remove("is-active")
    }
  })
}