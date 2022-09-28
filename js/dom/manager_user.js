import { localdb } from "../repo-browser.js"
import { hoyEC } from "../util/fecha-util.js"

const ADMKEY = "0."
const FD = "MMdd20yyyy02ddMM"

export default function validAdminAccess() {

  if (isAdmin()) return true

  cleanAdminAccess()

  let ask = true,
    res = false,
    keyIn
  do {
    keyIn = prompt("Acceso para administrador, ingrese la clave:")
    res = keyIn && keyIn.startsWith(ADMKEY)
    if (res) {
      localStorage.setItem(localdb.accesskey, hoyEC().toFormat(FD))
      break
    } else {
      ask = confirm("Clave equivocada - Acceso denegado/nDesea intentar con otra clave")
    }
  } while (ask)

  return res
}

export const isAdmin = () => {
  return localStorage.getItem(localdb.accesskey) === hoyEC().toFormat(FD)
}

export const cleanAdminAccess = () => {
  localStorage.removeItem(localdb.accesskey)
}