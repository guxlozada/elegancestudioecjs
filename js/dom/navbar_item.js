const d = document

export default function navbarItems() {
  // Get all "navbar-burger" elements
  const $navbarBurgers = Array.prototype.slice.call(d.querySelectorAll('.navbar-burger'), 0)
  console.log($navbarBurgers)
  // Check if there are any nav burgers
  if ($navbarBurgers.length > 0) {

    // Add a click event on each of them
    $navbarBurgers.forEach(function ($el) {
      console.log($navbarBurgers)
      $el.addEventListener('click', function () {

        // Get the target from the "data-target" attribute
        let target = $el.dataset.target;
        let $target = d.getElementById(target);

        // Toggle the class on both the "navbar-burger" and the "navbar-menu"
        $el.classList.toggle('is-active');
        $target.classList.toggle('is-active');

      })
    })
  }



}
