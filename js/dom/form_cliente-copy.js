/* ********** 101, 102, 103 Validacion de Formularios en HTML5 ********** */

const d = document,
  w = window,
  n = navigator

/* No requiere parametros porque se utiliza selectores con el atributo personalizado data-scroll-spy */
export default function formEdicionCliente($ntf) {
  const $formCliente = d.getElementById("form-cliente-editar")
  //  $inputs = d.querySelectorAll(".contact-form [required]")
  // console.log($inputs)

  /**
    $inputs.forEach(input => {
      const $span = d.createElement("span")
      $span.id = input.name
      $span.textContent = input.title
      $span.classList.add("contact-form-error", "none")
      input.insertAdjacentElement("afterend", $span)
    })

    d.addEventListener("keyup", e => {
      // La delegacion de eventos se ejecuta cuando un elemento con el selector y atributo 'required' genere dicho evento dentro del formulario 
      if (e.target.matches(".contact-form [required]")) {
        let $input = e.target,
          pattern = $input.pattern || $input.dataset.pattern /* Utilizando operador de cortocircuito obtiene el atributo 'pattern' incluso del textarea 

        // Se realiza la validacion en if separado (evita if-else) para poder agregar una condicion para que se despliegue el mensaje cuando
        //   al menos se ingrese un caracter. Asi evita que al colocar el foco en el campo empieze aparecer el mensaje de validacion 
        if (pattern && $input.value !== "") {
          let regex = new RegExp(pattern)
          // La sentencia 'd.getElementById($input.name)' obtiene el spam generado dinamicamente con el id=$input.name 
          return !regex.exec($input.value) ? d.getElementById($input.name).classList.add("is-active") : d.getElementById($input.name).classList.remove("is-active")
        }

        if (!pattern) {
          return $input.value === "" ? d.getElementById($input.name).classList.add("is-active") : d.getElementById($input.name).classList.remove("is-active")
        }
      }
    }) 
  */


  /** Utilizar una herramienta para enviar los datos del formulario a un correo electronico */
  d.addEventListener("submit", e => {
    /*Prevenir la accion predeterminada que procesa los datos del formulario*/
    e.preventDefault()

    // Disparar comp espera hasta finalizar procesamiento
    ////const $loader = d.querySelector(".contact-form-loader"),
    ////  $response = d.querySelector(".notification .note")
    ////$loader.classList.remove("none")

    const idTipo = $formCliente['idTipo'].value,
      idNumero = $formCliente['idNumero'].value,
      nombres = $formCliente['nombres'].value,
      ciudad = $formCliente['ciudad'].value,
      edad = $formCliente['edad'].value,
      fechaNacimiento = $formCliente['fechaNacimiento'].value,
      telefono = $formCliente['telefono'].value,
      correo = $formCliente['correo'].value,
      anioNacimiento = new Date().getFullYear() - edad
    let uid = $formCliente['uid'].value

    let clienteData = {
      idTipo,
      idNumero,
      nombres,
      ciudad,
      edad,
      fechaNacimiento,
      telefono,
      correo,
      anioNacimiento
    }

    const clienteKey = database.ref().child('clientes').push().key

    var updates = {}
    updates['/clientes/' + clienteKey] = clienteData

    const clienteDB = database.ref().update(updates);
    console.log('clienteDB', clienteDB)

    $ntf.show("Clientes", `Se ha registrado correctamente el nuevo cliente: ${clienteKey} / ${clienteDB.nombres}`, "success")
    /* EJEMPLO VALIDO ANTERIOR
    

    const dbRowCliente = dbClientes.push()
    console.log("dbRowCliente:", dbRowCliente)

    console.log('uid guardar=', uid)
    if (uid) {
      console.log('modificar cliente')
      firebase.database().ref(`clientes/${uid}`).update({
        idTipo,
        idNumero,
        nombres,
        ciudad,
        anioNacimiento,
        fechaNacimiento,
        telefono,
        correo
      })
    } else {
      console.log('nuevo cliente')
      const registerCLiente = dbClientes.push()
      uid = registerCLiente.path.pieces_[1]
      registerCLiente.set({
        Uid: uid,
        idTipo,
        idNumero,
        nombres,
        ciudad,
        anioNacimiento,
        fechaNacimiento,
        telefono,
        correo
      })
      $ntf.show("Clientes", `Se ha registrado correctamente el nuevo cliente: ${idNumero} / ${nombres}`, "success")
    }
    d.getElementById('factura-uid').value = uid
    */

    /* Tmp simula la peticion, y lo que se debe procesar a la respuesta */
    ////setTimeout(() => {
    ////$loader.classList.add("none")
    ////$response.classList.remove("none")

    $formCliente.reset()
    ////}, 3000);
  })
}