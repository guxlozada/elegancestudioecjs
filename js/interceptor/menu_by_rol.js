export const NAV_BARBERSHOP = `
  <div class="nav-barbershop navbar-item has-dropdown is-hoverable">
    <a class="navbar-link is-size-7">BARBERIA </a>
    <div class="navbar-dropdown is-size-7">
      <a class="navbar-item" href="shop-sales.html?#clients"
        onblur="document.querySelector('.client-search-text').focus()">
        <span class="icon"><i class="fa-solid fa-user-friends"></i></span>&nbsp;Clientes
      </a>
      <a class="navbar-item" href="shop-sales.html">
        <span class="icon"><i class="fa-solid fa-cash-register"></i></span>&nbsp;Ventas
      </a>
      <a class="navbar-item" href="shop-expenses.html" title="Egresos de caja en la barberia">
        <span class="icon"><i class="fa-solid fa-money-bill-wave"></i></span>&nbsp;Egresos
      </a>
      <a class="navbar-item" href="shop-bank-tx-barber.html"
        title="Depositos y transferencias en la barberia">
        <span class="icon"><i class="fa-solid fa-building-columns"></i></span>&nbsp;Banco
      </a>
      <a class="navbar-item" href="shop-daily-closing.html#summary" title="Cierre diario de caja">
        <span class="icon"><i class="fa-solid fa-shop-lock"></i></span>&nbsp;Cierre diario
      </a>
    </div>
  </div>`
export const ASIDE_BARBERSHOP = `
  <p class="menu-label">Barberia</p>
  <ul class="menu-list is-size-7">
    <li>
      <a class="navbar-item" href="shop-sales.html?#clients"
        onblur="document.querySelector('.client-search-text').focus()">
        <span class="icon"><i class="fa-solid fa-user-friends"></i></span> Clientes
      </a>
    </li>
    <li>
      <a class="navbar-item " href="shop-sales.html">
        <span class="icon"><i class="fa-solid fa-cash-register"></i></span> Ventas
      </a>
    </li>
    <li><a class="navbar-item " href="shop-expenses.html" title="Egresos de caja en la barberia">
        <span class="icon"><i class="fa-solid fa-money-bill-wave"></i></span> Egresos
      </a></li>
    <li><a class="navbar-item " href="shop-bank-tx-barber.html"
        title="Depositos y transferencias en la barberia">
        <span class="icon"><i class="fa-solid fa-building-columns"></i></span> Banco
      </a></li>
    <li><a class="navbar-item " href="shop-daily-closing.html#summary" title="Cierre diario de caja">
        <span class="icon"><i class="fa-solid fa-shop-lock"></i></span> Cierre diario
      </a></li>
  </ul>`

export const NAV_OPERATIONS = `
  <div class="nav-operations navbar-item has-dropdown is-hoverable">
    <a class="navbar-link is-size-7">OPERACIONES</a>
    <div class="navbar-dropdown is-size-7">
      <a class="navbar-item" href="shop-commissions-payment.html" title="Reporte de comisiones por barbero">
        <span class="icon"><i class="fa-solid fa-hand-holding-dollar"></i></span> Pago comisiones
      </a>
      <a class="navbar-item" href="shop-bank-tx.html"
        title="Registro de transaccion bancaria fuera de la barberia">
        <span class="icon"><i class="fa-solid fa-money-bill-transfer"></i></span> Transaccion banco
      </a>
      <a class="navbar-item" href="bank-reconciliation.html" title="Conciliación bancaria">
        <span class="icon"><i class="fa-solid fa-landmark"></i></span> Conciliacion banco
      </a>
    </div>
  </div>`

export const ASIDE_OPERATIONS = `
  <p class="menu-label">Operaciones</p>
  <ul class="menu-list is-size-7">
    <li><a class="navbar-item" href="shop-commissions-payment.html" title="Reporte de comisiones por barbero">
        <span class="icon"><i class="fa-solid fa-hand-holding-dollar"></i></span> Pago comisiones
      </a>
    </li>
    <li><a class="navbar-item" href="shop-bank-tx.html"
        title="Registro de transaccion bancaria fuera de la barberia">
        <span class="icon"><i class="fa-solid fa-money-bill-transfer"></i></span> Transaccion banco
      </a>
    </li>
    <li><a class="navbar-item" href="bank-reconciliation.html" title="Conciliación bancaria">
        <span class="icon"><i class="fa-solid fa-landmark"></i></span> Conciliacion banco
      </a>
    </li>
  </ul>`

export const NAV_ADMINISTRATION = `
  <div class="nav-administration navbar-item has-dropdown is-hoverable">
    <a class="navbar-link is-size-7">ADMINISTRACION</a>
    <div class="navbar-dropdown is-size-7">
      <a class="navbar-item" href="sales-report.html" title="Consulta de ventas por periodo de tiempo">
        <span class="icon"><i class="fa-solid fa-money-bill-trend-up"></i></span> Ventas
      </a>
      <a class="navbar-item" href="shop-expenses-report.html" title="Consulta de egresos por periodo de tiempo">
        <span class="icon"><i class="fa-solid fa-money-bill-wave"></i></span> Egresos
      </a>
      <a class="navbar-item" href="customers.html" title="Administracion de clientes">
        <span class="icon"><i class="fa-solid fa-user-friends"></i></span> Clientes
      </a>
    </div>
  </div>`

export const ASIDE_ADMINISTRATION = `
  <p class="menu-label">Administracion</p>
  <ul class="menu-list is-size-7">
    <li><a class="navbar-item" href="sales-report.html" title="Consulta de ventas por periodo de tiempo">
        <span class="icon"><i class="fa-solid fa-money-bill-trend-up"></i></span> Ventas
      </a>
    </li>
    <li><a class="navbar-item" href="shop-expenses-report.html" title="Consulta de egresos por periodo de tiempo">
        <span class="icon"><i class="fa-solid fa-money-bill-wave"></i></span> Egresos
      </a>
    </li>
    <li><a class="navbar-item" href="customers.html" title="Administracion de clientes">
        <span class="icon"><i class="fa-solid fa-user-friends"></i></span> Clientes
      </a>
    </li>
  </ul>`


export const NAV_INVENTORY = `
  <div class="nav-inventory navbar-item has-dropdown is-hoverable">
    <a class="navbar-link is-size-7">INVENTARIO</a>
    <div class="navbar-dropdown is-size-7">
      <a class="navbar-item" href="catalog-products.html" title="Mantenimiento de productos">
        <span class="icon"><i class="fa-solid fa-dolly"></i></span>Productos
      </a>
      <a class="navbar-item" href="catalog-services.html" title="Mantenimiento de servicios">
        <span class="icon"><i class="fa-solid fa-scissors"></i></span>Servicios
      </a>
    </div>
  </div>`

export const ASIDE_INVENTORY = `
  <p class="menu-label">Inventario</p>
  <ul class="menu-list is-size-7">
    <li><a class="navbar-item" href="catalog-products.html" title="Mantenimiento de productos">
        <span class="icon"><i class="fa-solid fa-dolly"></i></span>Productos
      </a>
    </li>
    <li>
      <a class="navbar-item" href="catalog-services.html" title="Mantenimiento de servicios">
        <span class="icon"><i class="fa-solid fa-scissors"></i></span>Servicios
      </a>
    </li>
  </ul>`
