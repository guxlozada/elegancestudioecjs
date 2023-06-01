import { SHOPS } from "../persist/firebase_collections.js"
import { FD, localdb } from "../repo-browser.js"
import { hoyEC } from "../util/fecha-util.js"

export const isAdmin = () => {
  return localStorage.getItem(localdb.accesskey) === hoyEC().toFormat(FD)
}

export const isBarber = () => {
  return localStorage.getItem(localdb.accessBarberkey) === hoyEC().toFormat(FD)
}

export const getShop = () => {
  let res = null
  switch (localStorage.getItem(localdb.accessShopkey)) {
    case SHOPS.mmp.code:
      res = SHOPS.mmp;
      break;
    case SHOPS.qgr.code:
      res = SHOPS.qgr;
      break;
    case SHOPS.qpa.code:
      res = SHOPS.qpa;
      break;
    default:
      break;
  }
  return res
}

//////////////////////////////////////////////////////////////
// VERIFICAR USO Y REORGANIZAR CON ARCHIVOS QUE USAN
//////////////////////////////////////////////////////////////

export const cleanControlAccess = () => {
  localStorage.removeItem(localdb.accesskey)
  localStorage.removeItem(localdb.accessBarberkey)
  localStorage.removeItem(localdb.catalogBankAccounts)
  localStorage.removeItem(localdb.catalogOperators)
}