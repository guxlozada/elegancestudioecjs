import { inputDateToDateTime } from "./fecha-util.js"

export default function convertFormToObject(vsClassInput) {

  let obj = {}
  // Obtiene los campos del formulario relacionados a la clase
  const $propertyInput = document.getElementsByClassName(vsClassInput ? vsClassInput : "prop-input")
  for (let i = 0, len = $propertyInput.length; i < len; i++) {
    let $input = $propertyInput[i],
      key = $input.getAttribute("data-key"),
      value = $input.value
    if (!value || !key) {
      continue
    }
    switch ($input.type) {
      case "radio":
        if ($input.checked) obj[key] = value
        break
      case "number":
        obj[key] = parseFloat(value)
        break
      case "date":
        let dateTime = inputDateToDateTime(value)
        let dateType = $input.getAttribute("data-type")
        if (dateType === "timestamp") {
          obj[key] = dateTime.toMillis()
        } else {
          obj[key] = dateTime.toLocaleString()
        }
        break
      default:
        obj[key] = value
    }
  }
  return obj
}