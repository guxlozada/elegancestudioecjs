/* ********** 101, 102, 103 Validacion de Formularios en HTML5 ********** */
const d = document,
  w = window,
  n = navigator

/* No requiere parametros porque se utiliza selectores con el atributo personalizado data-scroll-spy */
export default function formValidations() {
  const $form = d.querySelector(".contact-form"),
    $inputs = d.querySelectorAll(".contact-form [required]")
  // console.log($inputs)

  $inputs.forEach(input => {
    const $span = d.createElement("span")
    $span.id = input.name
    $span.textContent = input.title
    $span.classList.add("contact-form-error", "none")
    input.insertAdjacentElement("afterend", $span)
  })

  d.addEventListener("keyup", e => {
    /* La delegacion de eventos se ejecuta cuando un elemento con el selector y atributo 'required' genere dicho evento dentro del formulario */
    if (e.target.matches(".contact-form [required]")) {
      let $input = e.target,
        pattern = $input.pattern || $input.dataset.pattern /* Utilizando operador de cortocircuito obtiene el atributo 'pattern' incluso del textarea */

      /* Se realiza la validacion en if separado (evita if-else) para poder agregar una condicion para que se despliegue el mensaje cuando
         al menos se ingrese un caracter. Asi evita que al colocar el foco en el campo empieze aparecer el mensaje de validacion */
      if (pattern && $input.value !== "") {
        let regex = new RegExp(pattern)
        /* La sentencia 'd.getElementById($input.name)' obtiene el spam generado dinamicamente con el id=$input.name */
        return !regex.exec($input.value) ? d.getElementById($input.name).classList.add("is-active") : d.getElementById($input.name).classList.remove("is-active")
      }

      if (!pattern) {
        return $input.value === "" ? d.getElementById($input.name).classList.add("is-active") : d.getElementById($input.name).classList.remove("is-active")
      }
    }
  })

  /** Utilizar una herramienta para enviar los datos del formulario a un correo electronico */
  d.addEventListener("submit", e => {
    /*Prevenir la accion predeterminada que procesa los datos del formulario*/
    //e.preventDefault() 
    const $loader = d.querySelector(".contact-form-loader"),
      $response = d.querySelector(".contact-form-response")
    $loader.classList.remove("none")
    /* Tmp simula la peticion, y lo que se debe procesar a la respuesta */
    setTimeout(() => {
      $loader.classList.add("none")
      $response.classList.remove("none")
      $form.reset()
      setTimeout(() => $response.classList.add("none"), 4000);
    }, 3000);
  })
}