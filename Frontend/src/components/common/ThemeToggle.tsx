import { useTheme } from "../../theme/ThemeContext";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const esOscuro = theme === "dark";

  return (
    <button
      type="button"
      className={"theme-toggle" + (className ? " " + className : "")}
      onClick={toggle}
      aria-label={esOscuro ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
    >
      <span aria-hidden="true">{esOscuro ? "☀️" : "🌙"}</span>
      <span className="theme-toggle-txt">{esOscuro ? "Tema claro" : "Tema oscuro"}</span>
    </button>
  );
}
