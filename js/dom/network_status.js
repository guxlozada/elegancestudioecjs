const d = document,
  w = window,
  n = navigator

export default function networkStatus() {
  const isOnline = () => {
    const $div = d.createElement("div")
    if (n.onLine) {
      $div.textContent = "Conexión Reestablecida"
      $div.classList.add("online")
      $div.classList.remove("offline")
    } else {
      $div.textContent = "Conexión Perdida"
      $div.classList.add("offline")
      $div.classList.remove("online")
    }
    d.body.insertAdjacentElement("afterbegin", $div)
    /* Agregar y quitar el mensaje */
    setTimeout(() => d.body.removeChild($div), 3000)
  }

  w.addEventListener("offline", (e) => isOnline())
  w.addEventListener("online", (e) => isOnline())
}