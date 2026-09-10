// Fija tema y acento antes del primer pintado para evitar el parpadeo.
// Se sirve como archivo aparte para no necesitar 'unsafe-inline' en la CSP.
(function () {
  try {
    var tema = {};
    try {
      tema = JSON.parse(localStorage.getItem("bb-tema") || "{}") || {};
    } catch (e) {}

    // Modo: override del dispositivo > modo del negocio > preferencia del SO.
    var dev = localStorage.getItem("bb-theme");
    var modo;
    if (dev === "light" || dev === "dark") modo = dev;
    else if (tema.modo === "claro") modo = "light";
    else if (tema.modo === "oscuro") modo = "dark";
    else modo = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = modo;

    // Bordes.
    var radios = { recto: ["3px", "4px", "5px"], suave: ["8px", "10px", "14px"], redondeado: ["12px", "16px", "22px"] };
    var r = radios[tema.radio] || radios.suave;
    var st = document.documentElement.style;
    st.setProperty("--radius-sm", r[0]);
    st.setProperty("--radius", r[1]);
    st.setProperty("--radius-lg", r[2]);

    // Acento: solo el color base; los derivados los calcula React al montar.
    if (tema.acento) st.setProperty("--accent", tema.acento);
  } catch (e) {}
})();
