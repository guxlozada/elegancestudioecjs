export default class FacturaDetalle {
  constructor(tipo, codigo, descripcion, valorUnidad, impuestoPorcentaje) {
    // Crea el detalle
    this.init(tipo, codigo, descripcion, valorUnidad, impuestoPorcentaje);
  }

  init(tipo, codigo, descripcion, valorUnidad, impuestoPorcentaje) {
    // Tipo = SERVICIO / PRODUCTO
    this.tipo = tipo
    this.codigo = codigo
    this.descripcion = descripcion
    this.valorUnidad = valorUnidad || 0
    this.cantidad = 1
    this.descuento = 0
    this.impuestoPorcentaje = impuestoPorcentaje || 12
    let valUnidCalc = this.valorUnidad / (100 + this.impuestoPorcentaje)
    this.impuestoPorUnidad = valUnidCalc * this.impuestoPorcentaje
  }

  get getTipo() {
    return this.tipo || 'nn'
  }

  get getCodigo() {
    return this.codigo || 'nn'
  }

  get getDescripcion() {
    return this.descripcion || 'nn'
  }

  get getValorUnidad() {
    return this.valorUnidad || 0
  }

  get getValorUnidadSinImpuestos() {
    return this.valorUnidad - this.impuestoPorUnidad
  }

  get getCantidad() {
    return this.cantidad || 1
  }

  set setCantidad(cant) {
    this.cantidad = cant || 1
  }

  get getDescuento() {
    return this.descuento || 0
  }

  set setDescuento(desc) {
    this.descuento = desc || 0
  }

  codigoNombre() {
    return `[${codigo}] ${descripcion.substring(0, 40)}`
  }

  subtotal() {
    return this.cantidad * getValorUnidadSinIVA()
  }

  iva() {
    return this.cantidad * this.impuestoPorUnidad
  }

}
