import NotificationBulma from "../dom/NotificacionBulma.js";
import { findClientByIdNumber } from "./dao_prod_clients.js";
import { insertPollDB } from "./dao_statistics_qa_poll.js";
import convertFormToObject from "../util/form_util.js";
import { updatePollCupons } from "../f_customers/dao_tmp_raffle.js";
import { localdb } from "../repo-browser.js";

const d = document,
  ntf = new NotificationBulma(),
  $form = d.getElementById("formPoll"),
  $linkSorteoNavidad = d.querySelector(".christmas-coupons"),
  SEND = "send"

//------------------------------------------------------------------------------------------------
// Delegacion de eventos
//------------------------------------------------------------------------------------------------

// EVENTO=change RAIZ=button<search> ACCION=Realizar busqueda
d.addEventListener("submit", e => {
  e.preventDefault()
  if (localStorage.getItem(localdb.tmpPollQA) === SEND) {
    $form.reset()
    ntf.okey("Su encuesta ya fué enviada")
    return
  }

  let poll = convertFormToObject($form)

  if (Object.keys(poll).length === 0) {
    ntf.validation("Necesitamos tu ayuda respondiendo al menos las preguntas 1, 2 y 3. Gracias por tu comprensión.")

  }

  if (poll.barberoPresentacion && poll.barberoPresentacion === "si" && !poll.barberoNombre) {
    ntf.validation("Pregunta 1: Por favor ingrese el nombre del barbero o elija otra opción si no lo recuerda.")
  }

  if (ntf.enabled) return

  if (poll.identificacion) {
    findClientByIdNumber(poll.identificacion,
      voCliente => registerPoll(poll, voCliente),
      () => clientNotFound(poll))
  } else {
    registerPoll(poll)
  }

})

function clientNotFound(voPoll) {
  let res = confirm(`No tenemos registrada la identificación ${poll.identificacion}.
  Da clic en el botón "Cancelar" si consideras que hay un error en el número de identificación y deseas corregir.
  O da clic en el botón "Continuar" para finalizar el envío de la encuesta.`)
  if (!res) return

  registerPoll(voPoll)
}

function registerPoll(voPoll, voClient) {
  if (voClient) {
    voPoll.cliente = 'REGISTRADO'
  } else if (!voPoll.identificacion) {
    voPoll.cliente = 'ANONIMO'
  } else {
    voPoll.cliente = 'NO_REGISTRADO'
  }

  insertPollDB(voPoll,
    () => generateCupons(voPoll, voClient),
    error => {
      console.error("Error al guardar la encuesta", error)
      ntf.error("Houston, tenemos un problema😖", `Al momento no fue posible registrar la información de la encuesta, 
      te pedimos intentar una vez más dar clic en el botón 'Enviar'.`)
    }
  )

}

function generateCupons(voPoll, voClient) {
  if (voPoll.cliente !== 'REGISTRADO' || !voClient || voClient.stPollCupons) {
    $form.reset()
    $linkSorteoNavidad.classList.remove("is-hidden")
    localStorage.setItem(localdb.tmpPollQA, SEND)
    return
  }

  updatePollCupons(voClient,
    () => {
      $form.reset()
      ntf.okey(`Se han asignado dos cupones adicionales para el sorteo de navidad.Mucha suerte😉.`)
      localStorage.setItem(localdb.tmpPollQA, SEND)
      setTimeout(function () {
        $linkSorteoNavidad.classList.remove("is-hidden")
      }, 5000);
    },
    error => ntf.errorAndLog("Existe un problema al guardar los cupones adicionales para el sorteo de navidad.", error)
  )

}
