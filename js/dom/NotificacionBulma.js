export default class NotificationBulma {
  constructor() {
    // Crea la estructura de la notificaicon en el DOM cuando se instancia
    this.init();
  }

  init() {
    this.timeoutOcultar = null;

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

  // Visualiza las notificaciones al usuario
  show(titulo, mensaje, context, duracion) {
    clearTimeout(this.timeoutOcultar);
    this.nodoContenedor.classList.add("note-visible");

    // Asignar un titulo a la notificacion
    if (titulo != undefined)
      this.nodoTitulo.textContent = titulo;
    else
      this.nodoTitulo.textContent = "MENSAJE"

    // Agregar el mensaje a la notificacion
    if (mensaje != undefined)
      this.nodoMensaje.textContent = mensaje;

    // Aplica los estilos/tema de Bulma
    if (context) {
      this.nodoContenedor.classList.add(`is-${context}`);
    } else {
      this.nodoContenedor.classList.add('is-info');
    }

    // tiempo de visualizacion de la notificacion antes de ocultarlo automaticamente
    if (duracion == undefined || duracion <= 1000)
      duracion = context === 'danger' ? 15000 : 10000
    // Tiempo de espera para cerrar automaticamente la notificacion
    this.timeoutOcultar = setTimeout(() => {
      this.close();
    }, duracion);

  }

  // Ocultar notificacion
  close() {
    this.nodoContenedor.classList.remove("note-visible");
  }
}
