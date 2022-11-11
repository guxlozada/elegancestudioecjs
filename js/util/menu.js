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
      <a class="link-item" href="#">
        <span class="icon" style="color:indigo">
          <i class="fa-solid fa-gift"></i>
        </span>
        <span>Beneficios de clientes</span>
      </a>
      <a class="link-item" href="#">
        <span class="icon" style="color:goldenrod">
          <i class="fa-solid fa-scissors"></i>
        </span>
        <span>Soy barbero</span>
      </a>
      <a class="link-item" href="#">
        <span class="icon" style="color:crimson">
          <i class="fa-solid fa-screwdriver-wrench"></i>
        </span>
        <span>Soy administrador</span>
      </a>
    </div>
  `
}

function generateBar() {
}

function generateAdm() {
}