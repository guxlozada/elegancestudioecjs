import { inputDateToDateTime } from "./fecha-util.js"

/**
 * Extrae el valor de los campos de un formulario a un objeto.
 * @param {node} $element Nodo que contiene o es en si el formulario
 * @param {string} vsClassInput Clase de los elementos que son parte del formulario
 * @returns 
 */
export default function convertFormToObject($element, vsClassInput) {
  if (!$element) {
    return
  }
  let obj = {}
  let classSelector = vsClassInput || "prop-input"
  // Obtiene los campos del formulario relacionados a la clase
  const $propertyInput = $element.getElementsByClassName(classSelector)
  for (let i = 0, len = $propertyInput.length; i < len; i++) {
    let $input = $propertyInput[i],
      value = $input.value,
      name = $input.name || $input.dataset.key
    if (!value || !name) {
      continue
    }
    switch ($input.type) {
      case "checkbox":
        if ($input.checked) {
          let arryTmp = obj[name] || []
          obj[name] = [value, ...arryTmp]
        }
        break
      case "date":
        let dateTime = inputDateToDateTime(value)
        switch ($input.dataset.type) {
          case "datetime":
            obj[name] = dateTime
            break;
          case "timestamp":
            obj[name] = dateTime.toMillis()
            break;
          default:
            obj[name] = dateTime.toLocaleString()
            break;
        }
        break
      case "number":
        obj[name] = $input.valueAsNumber
        break
      case "radio":
        if ($input.checked) obj[name] = value
        break
      default:
        obj[name] = value
    }
  }
  return obj
}

/**
 * Setea el valor de los campos de un formulario a vacio.
 * @param {node} $element Nodo que contiene o es en si el formulario
 * @param {string} vsClassInput Clase de los elementos que deben ser seteados
 * @returns 
 */
export function resetForm($element, vsClassInput) {
  if (!$element) {
    return
  }
  let classSelector = vsClassInput || "prop-input"
  // Obtiene los campos del formulario relacionados a la clase
  const $propertyInput = $element.getElementsByClassName(classSelector)
  for (let i = 0, len = $propertyInput.length; i < len; i++) {
    let $input = $propertyInput[i]
    switch ($input.type) {
      case "hidden":
        // omite resetear los valores de los campos type=hidden
        break
      case "radio":
        if ($input.checked) $input.checked = false
        break
      default:
        $input.value = ""
    }
  }

}