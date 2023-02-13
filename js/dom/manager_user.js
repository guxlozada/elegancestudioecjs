import { ADM_PW, FD, localdb } from "../repo-browser.js"
import { hoyEC } from "../util/fecha-util.js"

//////////////////////////////////////////////////////////////
// VERIFICAR USO Y REORGANIZAR CON ARCHIVOS QUE USAN
//////////////////////////////////////////////////////////////

export default function validAdminAccess() {

  if (isAdmin()) return true

  cleanAdminAccess()

  let ask = true,
    res = false,
    keyIn
  do {
    keyIn = prompt("Acceso restringido para administrador, ingrese la clave:")
    res = keyIn && keyIn.startsWith(ADM_PW)
    if (res) {
      localStorage.setItem(localdb.accesskey, hoyEC().toFormat(FD))
      break
    } else {
      ask = confirm(`Acceso denegado - la clave no es valida.
      ¿Desea intentar con otra clave?`)
    }
  } while (ask)

  return res
}

export const isAdmin = () => {
  return localStorage.getItem(localdb.accesskey) === hoyEC().toFormat(FD)
}

export const isBarber = () => {
  return localStorage.getItem(localdb.accessBarberkey) === hoyEC().toFormat(FD)
}

export const cleanAdminAccess = () => {
  localStorage.removeItem(localdb.accesskey)
}

export const cleanControlAccess = () => {
  localStorage.removeItem(localdb.accesskey)
  localStorage.removeItem(localdb.accessBarberkey)
}