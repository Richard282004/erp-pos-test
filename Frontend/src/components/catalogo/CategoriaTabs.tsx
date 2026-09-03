export function CategoriaTabs({
  categorias,
  categoriaActiva,
  onSelect,
}: {
  categorias: string[];
  categoriaActiva: string;
  onSelect: (c: string) => void;
}) {
  return (
    <div className="categorias">
      {categorias.map((item) => (
        <button
          key={item}
          className={categoriaActiva === item ? "activo" : ""}
          onClick={() => onSelect(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
