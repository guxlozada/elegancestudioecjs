import modalToggle from "./dom/modal_toggle.js";
import navbarBurgers from "./dom/navbar_burgers.js";
import NotificationBulma from './dom/NotificacionBulma.js';
import formEdicionCliente from "./dom/form_cliente.js";
import { ahoraString, hoyString } from "./dom/fecha-util.js";

const d = document,
  w = window,
  ntf = new NotificationBulma()

// EJEMPLO DE DISPARO DE NOTIFICACION
/*w.addEventListener("load", e => {
  console.log(ahoraString())
  console.log(hoyString())

})*/

d.addEventListener("DOMContentLoaded", e => {
  navbarBurgers()
  modalToggle(".trigger-modal-servicios")
  modalToggle(".trigger-modal-productos")
  modalToggle(".trigger-modal-cliente")
  formEdicionCliente(ntf)

})

// Editar registro de cliente
d.addEventListener("click", e => {

  // Link de la lista de clientes de busqueda
  if (e.target.matches(".cliente-item")) {
    $title.textContent = "Editar Santo";
    $form.nombre.value = e.target.dataset.name;
    $form.constelacion.value = e.target.dataset.constellation;
    $form.id.value = e.target.dataset.id;
  }

  /* if (e.target.matches(".delete")) {
     let isDelete = confirm(`¿Estás seguro de eliminar el id ${e.target.dataset.id}?`);
 
     if (isDelete) {
       //Delete - DELETE
       ajax({
         url: `http://localhost:5555/santos/${e.target.dataset.id}`,
         method: "DELETE",
         success: (res) => location.reload(),
         error: (err) => alert(err)
       });
     }
   }*/
})

w.addEventListener("resize", e => {
  navbarBurgers()
})

/* No necesita ejecutarse a la carga, se va ejecutar cuando el navegador detecte que se ha perdido la navegación */
// networkStatus()

