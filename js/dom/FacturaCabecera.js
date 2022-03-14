import { ahoraString } from "./fecha-util";

export default class FacturaCabecera {
  constructor(cliUid, cliIdTipo, cliIdNumero) {
    // Crea la cabecera
    this.init(uid, idTipo, idNumero);
  }

  init(uid, idTipo, idNumero) {
    this.cliente = {
      uid,
      idTipo,
      idNumero
    }
    this.fecha = hoyString()
    this.auditoria = {
      fecha: ahoraString()
    }

    // Forma de pago = EFECTIVO/CREDITO/DEBITO
    this.formaPago = "EFECTIVO"
    // Vendedor = ESTIBERSON/OSCAR/LOCAL
    this.vendedor = "nn"
    this.servicios = []
    this.productos = []
    this.subtotal = 0
    this.descuento = 0
    this.impuestos = 0
  }

  // Visualiza las notificaciones al usuario
  agregarServicio(codigo, descripcion, valorUnidad, impuestoPorcentaje) {
    clearTimeout(this.timeoutOcultar);
    this.nodoContenedor.classList.add("note-visible");

    // Asignar un titulo a la notificacion
    if (titulo != undefined)
      this.nodoTitulo.textContent = titulo;
    else
      this.nodoTitulo.textContent = "ATENCION!"

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
      duracion = context === 'danger' ? 15000 : 5000
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
