const d = document

export default function modalToggle(triggerSelector, loadItems) {

  function openModal($el) {
    $el.classList.add('is-active')
  }

  function closeModal($el) {
    $el.classList.remove('is-active')
  }

  function closeAllModals() {
    (d.querySelectorAll('.modal') || []).forEach(($modal) => {
      closeModal($modal)
    });
  }

  let $target;
  // Add a click event on buttons to open a specific modal, obteniendo el id del modal del data-target atributte
  (d.querySelectorAll(triggerSelector) || []).forEach(($triggerEl) => {
    const modal = $triggerEl.dataset.target
    $target = d.getElementById(modal)
    // console.log($target);

    $triggerEl.addEventListener('click', () => {
      //console.log("cargando items")
      if (typeof loadItems !== 'undefined') loadItems() //cargando items, cuando aplica
      //console.log("abriendo modal")
      openModal($target) // desplegar modal
    })
  });
  // console.log("target=", $target);
  // Add a click event on various child elements to close the parent modal
  ($target.querySelectorAll('.modal-background, .modal-close, .modal-card-head .delete, .modal-card-foot .button') || []).forEach(($close) => {
    const $target = $close.closest('.modal')
    $close.addEventListener('click', () => {
      closeModal($target) // cerra modal
    })
  });

  // Add a keyboard event to close all modals
  d.addEventListener('keydown', (event) => {
    const e = event || window.event

    if (e.keyCode === 27) { // Escape key
      closeAllModals()
    }
  });
}