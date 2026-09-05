// Fija el tema (claro/oscuro) antes del primer pintado para evitar el
// parpadeo. Se sirve como archivo aparte para no necesitar 'unsafe-inline'
// en la CSP.
(function () {
  try {
    var t = localStorage.getItem("bb-theme");
    if (t !== "light" && t !== "dark") {
      t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.dataset.theme = t;
  } catch (e) {}
})();
