const d = document,
  w = window,
  $mainLogo = d.querySelector(".main-logo"),
  $buttonMenu = d.querySelector(".button-menu"),
  $mainNav = d.getElementById("nav")

// EVENTO=load RAIZ=window 
w.addEventListener("load", () => generate())

$buttonMenu.addEventListener("click", () => {
  $buttonMenu.classList.toggle("close")
  $mainNav.classList.toggle("show")
})

$mainNav.addEventListener("click", e => {
  if (e.target.id === "nav") {
    $mainNav.classList.remove("show")
    $buttonMenu.classList.remove("close")
  }
})

function generate() {
  //$mainLogo.innerHTML = `<img src="/assets/logo-rectangulo.png" alt="Elegance Studio EC" width="160">`
  $buttonMenu.innerHTML = `<span></span><span></span><span></span>`
  let role = localStorage.getItem("ROLE") || "CLI"
  switch (role) {
    case "BAR":
      generateBar()
      break;
    case "ADM":
      generateAdm()
      break;
    default:
      generateCli()
      break;
  }
}

function generateCli() {
  $mainNav.innerHTML = `
    <div class="nav-links">
      <div class="is-size-4 pt-0" style="font-family: 'Roboto Condensed', sans-serif;font-weight:700;color:black">
      <span>MENU</span>
      <span class="icon">
      <i class="fa-solid fa-layer-group"></i>
      </span>
      </div>
      <a class="link-item" href="main.html">
        <span class="icon">
          <i class="fa-solid fa-home"></i>
        </span>
        <span>Inicio</span>
      </a>
      <a class="link-item" href="customer-promotions.html">
        <span class="icon">
        <i class="fa-solid fa-wine-bottle"></i>
        </span>
        <span>Catálogo de productos</span>
      </a>
      <a class="link-item" href="customer-promotions.html">
        <span class="icon" style="color:goldenrod">
          <i class="fa-solid fa-star"></i>
        </span>
        <span>Promociones</span>
      </a>
      <a class="link-item" href="customer-christmas.html" style="color:#f14668">
        <span class="icon" style="color:#2cccc4">
        <i class="fa-solid fa-gift"></i>
        </span>
        <span>Sorteo <span style="color:#2cccc4">Navidad</span> 2022</span>
      </a>
    </div>
  `
}

function generateBar() {
}

function generateAdm() {
}