export default class NotificationBulma {
  constructor() {
    // Crea la estructura de la notificaicon en el DOM cuando se instancia
    this.init();
  }

  init() {
    this.timeoutOcultar = null;
    this.enabled = false;

    // Creacion del contenedor de la notificacion div
    this.nodoContenedor = document.createElement("div");
    this.nodoContenedor.className = "notification note";

    // Agregar a la notificacion un nodo para el titulo
    this.nodoTitulo = document.createElement('span');
    this.nodoTitulo.className = "note-title";

    // Agregar a la notificacion un nodo para el contenido del mensaje
    this.nodoMensaje = document.createElement('span');
    this.nodoMensaje.className = "note-content";

    // Agregar el boton para cerrar la notificacionn
    this.nodoBotonCerrar = document.createElement('button');
    this.nodoBotonCerrar.className = "delete";
    this.nodoBotonCerrar.addEventListener('click', () => {
      this.close();
    });

    // Agregar al contenedor de la notificaion los elementos
    this.nodoContenedor.appendChild(this.nodoBotonCerrar);
    this.nodoContenedor.appendChild(this.nodoTitulo);
    this.nodoContenedor.appendChild(this.nodoMensaje);

    // insertar el nodo del anotificaicon en el body de la pagina
    document.body.appendChild(this.nodoContenedor);
  }

  showTecnicalError(titulo, mensaje) {
    this.show(titulo, mensaje, "danger", 20000)
  }

  // Visualiza las notificaciones al usuario
  show(titulo, mensaje, context, duracion) {
    this.enabled = true;
    clearTimeout(this.timeoutOcultar);

    // Asignar un titulo a la notificacion
    if (titulo != undefined)
      this.nodoTitulo.textContent = titulo;
    else
      this.nodoTitulo.textContent = "MENSAJE"

    // Agregar el mensaje a la notificacion
    if (mensaje != undefined)
      this.nodoMensaje.textContent = mensaje;

    // Aplica los estilos/tema de Bulma
    if (!context)
      context = "info"

    // Visualizar el mensaje
    this.nodoContenedor.classList.add(`is-${context}`);
    this.nodoContenedor.classList.add("note-visible");

    // tiempo de visualizacion de la notificacion antes de ocultarlo automaticamente
    if (duracion == undefined || duracion <= 1000)
      duracion = 5000
    // Tiempo de espera para cerrar automaticamente la notificacion
    this.timeoutOcultar = setTimeout(() => {
      this.close();
    }, duracion);

  }

  // Ocultar notificacion
  close() {
    this.enabled = false;
    this.nodoContenedor.classList.remove("note-visible");
    this.nodoContenedor.classList.remove("is-primary");
    this.nodoContenedor.classList.remove("is-link");
    this.nodoContenedor.classList.remove("is-danger");
    this.nodoContenedor.classList.remove("is-warning");
    this.nodoContenedor.classList.add("is-info");
  }
}
