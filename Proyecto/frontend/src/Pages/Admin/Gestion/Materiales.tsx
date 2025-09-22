import React, { useEffect, useMemo, useState } from "react";
import styles from "./Materiales.module.css";

type Material = {
  titulo: string;
  materia: string;
  tipo: "PDF" | "Video" | "Imagen" | "PPT" | "Link";
  orientado: string;
  subidoPor: string;
  fecha: string;
  archivo?: string | null;
  enlace?: string;
};

type FormularioMaterial = {
  titulo: string;
  materia: string;
  tipo: Material["tipo"];
  orientado: string;
  subidoPor: string;
  enlace: string;
};

const materialesEjemplo: Material[] = [
  {
    titulo: "Guía Álgebra",
    materia: "Matemáticas",
    tipo: "PDF",
    orientado: "Tipo TDAH",
    subidoPor: "Admin",
    fecha: "01/09/25",
  },
  {
    titulo: "Video Independencia",
    materia: "Historia",
    tipo: "Video",
    orientado: "Tipo TDAH",
    subidoPor: "Admin",
    fecha: "30/06/25",
  },
  {
    titulo: "Experimentos básicos",
    materia: "Química",
    tipo: "Link",
    orientado: "Tipo TDAH",
    subidoPor: "Admin",
    fecha: "28/06/25",
    enlace: "https://recursos.ejemplo/quimica",
  },
];

export default function MaterialesPage() {
  const [materiales, setMateriales] = useState<Material[]>(materialesEjemplo);
  const [busqueda, setBusqueda] = useState("");
  const [materiaFiltro, setMateriaFiltro] = useState("");
  const [pagina, setPagina] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalBusqueda, setModalBusqueda] = useState("");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormularioMaterial>({
    titulo: "",
    materia: "",
    tipo: "PDF",
    orientado: "Tipo TDAH",
    subidoPor: "Admin",
    enlace: "",
  });

  const ITEMS_POR_PAGINA = 5;

  // Filtrado simple
  const materialesFiltrados = useMemo(
    () =>
      materiales.filter(
        (m) =>
          m.titulo.toLowerCase().includes(busqueda.toLowerCase()) &&
          (materiaFiltro ? m.materia === materiaFiltro : true)
      ),
    [materiales, busqueda, materiaFiltro]
  );

  const totalPaginas = useMemo(
    () => Math.max(1, Math.ceil(materialesFiltrados.length / ITEMS_POR_PAGINA)),
    [materialesFiltrados]
  );

  const puedeGuardarMaterial = useMemo(() => {
    if (!formData.titulo.trim() || !formData.materia.trim()) {
      return false;
    }
    if (formData.tipo === "Link") {
      return !!formData.enlace.trim();
    }
    return true;
  }, [formData]);

  useEffect(() => {
    if (pagina > totalPaginas) {
      setPagina(totalPaginas);
    }
  }, [pagina, totalPaginas]);

  const materialesPaginados = useMemo(
    () =>
      materialesFiltrados.slice(
        (pagina - 1) * ITEMS_POR_PAGINA,
        pagina * ITEMS_POR_PAGINA
      ),
    [materialesFiltrados, pagina]
  );

  const materiasDisponibles = useMemo(
    () =>
      Array.from(new Set(materiales.map((m) => m.materia))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [materiales]
  );

  const materiasModalFiltradas = useMemo(() => {
    const termino = modalBusqueda.trim().toLowerCase();
    if (!termino) {
      return materiasDisponibles;
    }
    return materiasDisponibles.filter((materia) =>
      materia.toLowerCase().includes(termino)
    );
  }, [materiasDisponibles, modalBusqueda]);

  const puedeCrearMateriaNueva = useMemo(() => {
    const termino = modalBusqueda.trim();
    if (!termino) {
      return false;
    }
    return !materiasDisponibles.some(
      (materia) => materia.toLowerCase() === termino.toLowerCase()
    );
  }, [materiasDisponibles, modalBusqueda]);

  const cerrarModal = () => {
    setIsModalOpen(false);
    setFormData({
      titulo: "",
      materia: "",
      tipo: "PDF",
      orientado: "Tipo TDAH",
      subidoPor: "Admin",
      enlace: "",
    });
    setModalBusqueda("");
    setSelectedFileName(null);
  };

  const manejarCambio = (
    campo: keyof FormularioMaterial,
    valor: string
  ) => {
    setFormData((prev) => ({ ...prev, [campo]: valor }));
  };

  const manejarArchivo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0];
    setSelectedFileName(archivo ? archivo.name : null);
  };

  const manejarCrearMaterial = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!puedeGuardarMaterial) {
      return;
    }

    const fechaActual = new Date().toLocaleDateString("es-ES");

    const nuevoMaterial: Material = {
      titulo: formData.titulo.trim(),
      materia: formData.materia.trim(),
      tipo: formData.tipo,
      orientado: formData.orientado,
      subidoPor: formData.subidoPor.trim() || "Admin",
      fecha: fechaActual,
      archivo: formData.tipo === "Link" ? null : selectedFileName,
      enlace: formData.tipo === "Link" ? formData.enlace.trim() : undefined,
    };

    setMateriales((prev) => [nuevoMaterial, ...prev]);
    setPagina(1);
    cerrarModal();
  };

  const manejarSeleccionMateria = (materia: string) => {
    manejarCambio("materia", materia);
    setModalBusqueda("");
  };

  const manejarVerMaterial = (material: Material) => {
    const mensaje = material.enlace
      ? `Abrir enlace de "${material.titulo}": ${material.enlace}`
      : material.archivo
      ? `Visualizar "${material.titulo}" (${material.archivo}).`
      : `Visualizar "${material.titulo}".`;
    alert(mensaje);
  };

  const manejarEliminarMaterial = (indice: number) => {
    setMateriales((prev) => prev.filter((_, i) => i !== indice));
  };

  return (
    <div className={styles.materialesContainer}>
      <h1 className={styles.titulo}>Materiales📂</h1>
      <div className={styles.filtros}>
        <input
          type="text"
          placeholder="Buscar materiales…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className={styles.busqueda}
          
        />
        <select
          id="materia-select"
          aria-label="Filtrar por materia"
          value={materiaFiltro}
          onChange={(e) => setMateriaFiltro(e.target.value)}
          className={styles.filtroMateria}
        >
          <option value="">Filtrar por materia</option>
          {materiasDisponibles.map((materia) => (
            <option key={materia} value={materia}>
              {materia}
            </option>
          ))}
        </select>
        <button
          className={styles.nuevoBtn}
          type="button"
          onClick={() => setIsModalOpen(true)}
        >
          + Nuevo material
        </button>
      </div>
      <table className={styles.tabla}>
        <thead>
          <tr>
            <th>Título</th>
            <th>Materia</th>
            <th>Tipo</th>
            <th>Orientado</th>
            <th>Subido por</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {materialesPaginados.map((m, i) => {
            const indiceReal = (pagina - 1) * ITEMS_POR_PAGINA + i;
            return (
              <tr key={`${m.titulo}-${indiceReal}`}>
                <td>{m.titulo}</td>
                <td>{m.materia}</td>
                <td>{m.tipo}</td>
                <td>{m.orientado}</td>
                <td>{m.subidoPor}</td>
                <td>{m.fecha}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => manejarVerMaterial(m)}
                    title="Ver material"
                    className={styles.accionBtn}
                  >
                    👁️
                  </button>
                  <button
                    type="button"
                    onClick={() => manejarEliminarMaterial(indiceReal)}
                    title="Eliminar material"
                    className={styles.accionBtn}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className={styles.paginacion}>
        <button
          onClick={() => setPagina((p) => Math.max(1, p - 1))}
          disabled={pagina === 1}
        >
          Anterior
        </button>
        <span>
          Página <b>{pagina}</b> de <b>{totalPaginas}</b>
        </span>
        <button
          onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
          disabled={pagina === totalPaginas}
        >
          Siguiente
        </button>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <header className={styles.modalHeader}>
              <h2>Nuevo material</h2>
              <button
                type="button"
                onClick={cerrarModal}
                aria-label="Cerrar"
                className={styles.cerrarModalBtn}
              >
                ✕
              </button>
            </header>
            <form className={styles.modalContenido} onSubmit={manejarCrearMaterial}>
              <div className={styles.buscadorMaterias}>
                <label htmlFor="buscar-materia">Buscar materia</label>
                <input
                  id="buscar-materia"
                  type="search"
                  placeholder="Escribe para buscar o crear una materia"
                  value={modalBusqueda}
                  onChange={(event) => setModalBusqueda(event.target.value)}
                />
                {materiasModalFiltradas.length > 0 && (
                  <ul className={styles.resultadosMaterias}>
                    {materiasModalFiltradas.map((materia) => (
                      <li key={materia}>
                        <button
                          type="button"
                          onClick={() => manejarSeleccionMateria(materia)}
                        >
                          {materia}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {puedeCrearMateriaNueva && (
                  <button
                    type="button"
                    className={styles.crearNuevaMateriaBtn}
                    onClick={() => manejarSeleccionMateria(modalBusqueda.trim())}
                  >
                    Usar "{modalBusqueda.trim()}"
                  </button>
                )}
                {formData.materia && (
                  <p className={styles.materiaSeleccionada}>
                    Materia seleccionada: <strong>{formData.materia}</strong>
                  </p>
                )}
              </div>

              <label className={styles.campoFormulario}>
                <span>Título</span>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(event) => manejarCambio("titulo", event.target.value)}
                  placeholder="Nombre del material"
                  required
                />
              </label>

              <label className={styles.campoFormulario}>
                <span>Tipo de material</span>
                <select
                  value={formData.tipo}
                  onChange={(event) => {
                    const nuevoTipo = event.target.value as FormularioMaterial["tipo"];
                    manejarCambio("tipo", nuevoTipo);
                    if (nuevoTipo === "Link") {
                      setSelectedFileName(null);
                    } else {
                      manejarCambio("enlace", "");
                    }
                  }}
                >
                  <option value="PDF">PDF</option>
                  <option value="Video">Video</option>
                  <option value="Imagen">Imagen</option>
                  <option value="PPT">PPT</option>
                  <option value="Link">Link</option>
                </select>
              </label>

              <label className={styles.campoFormulario}>
                <span>Orientado a</span>
                <select
                  value={formData.orientado}
                  onChange={(event) => manejarCambio("orientado", event.target.value)}
                >
                  <option value="Tipo TDAH">Tipo TDAH</option>
                  <option value="Neurodivergente">Neurodivergente</option>
                  <option value="General">General</option>
                </select>
              </label>

              <label className={styles.campoFormulario}>
                <span>Subido por</span>
                <input
                  type="text"
                  value={formData.subidoPor}
                  onChange={(event) => manejarCambio("subidoPor", event.target.value)}
                  placeholder="Nombre de quien sube"
                />
              </label>

              <label className={styles.campoFormulario}>
                <span>Archivo o enlace</span>
                {formData.tipo === "Link" ? (
                  <>
                    <input
                      type="url"
                      value={formData.enlace}
                      onChange={(event) => manejarCambio("enlace", event.target.value)}
                      placeholder="https://..."
                      required
                    />
                    <p className={styles.ayudaCampo}>
                      Comparte el enlace del recurso en línea.
                    </p>
                  </>
                ) : (
                  <>
                    <input
                      type="file"
                      accept=".pdf,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.mp4,.mov,.avi"
                      onChange={manejarArchivo}
                    />
                    {selectedFileName && (
                      <p className={styles.archivoSeleccionado}>
                        Archivo seleccionado: {selectedFileName}
                      </p>
                    )}
                  </>
                )}
              </label>

              <div className={styles.modalAcciones}>
                <button type="button" onClick={cerrarModal}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.guardarBtn}
                  disabled={!puedeGuardarMaterial}
                >
                  Guardar material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
