const itemkey = "publictoken."
const adminkey = "0."

export default function validAdminAccess() {
  if (true || isAdmin()) return true
  let ask = true, res = false
  do {
    if (adminkey === prompt("Acceso para administrador, ingrese la clave:")) {
      localStorage.setItem(itemkey, adminkey)
      res = true
      break
    } else {
      ask = confirm("Clave equivocada - Acceso denegado/nDesea intentar con otra clave")
    }
  } while (ask)
  return res
}

export const isAdmin = () => { return adminkey === localStorage.getItem(itemkey) }

export const cleanAdminAccess = () => { localStorage.removeItem(itemkey) }