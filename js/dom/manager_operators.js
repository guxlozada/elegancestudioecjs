import { findOperatorsByShop } from "../f_are_you/dao_adm_operators.js"
import { localdb } from "../repo-browser.js"

const d = document,
  optionTodos = {
    code: "TODOS",
    alias: "Todos"
  }

export function addOperators(vsClassContainer, vsIdTemplate, callback, callbackError, vbTodos, vsClassCode, vsClassAlias) {

  const $container = d.querySelector(vsClassContainer),
    $template = d.getElementById(vsIdTemplate || "operator-template")

  if (!($container && $template)){
    return
  }

  findOperatorsByShop(
    () => {
      const $fragment = d.createDocumentFragment(),
        opers = JSON.parse(localStorage.getItem(localdb.catalogOperators))
      if (vbTodos) {
        opers.unshift(optionTodos)
      }
      opers.forEach(item => {
        let $optionTmp = $template.content.cloneNode(true),
          $radioTmp = $optionTmp.querySelector(vsClassCode || ".operator-code")
        $optionTmp.querySelector(vsClassAlias || ".operator-alias").innerText = item.alias
        $radioTmp.value = item.code
        if (vbTodos && item.code === "TODOS") {
          $radioTmp.checked = true
        }
        $fragment.appendChild($optionTmp)
      })
      $container.innerHTML = "";
      $container.appendChild($fragment)

      callback()
    },
    error => callbackError(error)
  )



}