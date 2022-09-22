import { hoyEC } from "../util/fecha-util.js"

const itemkey = "ACCESSTOKEN"
const adminkey = "0."
const fd = "MMdd20yyyy02ddMM"

export default function validAdminAccess() {

  if (isAdmin()) return true

  cleanAdminAccess()

  let ask = true,
    res = false,
    keyIn
  do {
    keyIn = prompt("Acceso para administrador, ingrese la clave:")
    res = keyIn && keyIn.startsWith(adminkey)
    if (res) {
      localStorage.setItem(itemkey, hoyEC().toFormat(fd))
      break
    } else {
      ask = confirm("Clave equivocada - Acceso denegado/nDesea intentar con otra clave")
    }
  } while (ask)

  return res
}

export const isAdmin = () => {
  return localStorage.getItem(itemkey) === hoyEC().toFormat(fd)
}

export const cleanAdminAccess = () => {
  localStorage.removeItem(itemkey)
}