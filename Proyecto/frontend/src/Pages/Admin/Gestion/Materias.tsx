// src/Pages/Admin/Gestion/Materias.tsx
// Gestión de Materias (Subjects) en el panel de Admin.
// — Lista en tabla con buscador y orden A/Z
// — Crear / Editar / Eliminar materias
// — Cargar / previsualizar / quitar banner por materia
// Fase 1 (mock): usa subjectsStore (Zustand) con persistencia localStorage.

import { useEffect, useMemo, useState } from "react";
import styles from "./Materias.module.css";

// Store (mock) y tipo Subject
import { useSubjectsStore, type Subject } from "../../../stores/subjectsStore";

// Estructura del formulario (no incluye id ni banner)
type Form = { name: string; description: string; slug?: string };

// Estado inicial del form
const EMPTY_FORM: Form = { name: "", description: "", slug: "" };

export default function MateriasPage() {
  /* =========================================================================
     1) STORE (Zustand): items + acciones CRUD mock
     ========================================================================= */
  const {
    items,        // lista de materias (persistida en localStorage en Fase 1)
    list,         // (mock) refresca; en backend real hará fetch GET /api/subjects
    create,       // crea materia
    update,       // actualiza materia (PATCH parcial)
    remove,       // elimina materia
    uploadBanner, // "sube" banner (mock: usa ObjectURL para preview)
    clearBanner,  // quita banner (pone null)
  } = useSubjectsStore();

  /* =========================================================================
     2) ESTADO DE UI
     ========================================================================= */
  const [query, setQuery] = useState("");                 // búsqueda por nombre/slug/descr.
  const [sortAsc, setSortAsc] = useState(true);           // orden A→Z o Z→A

  // Modal de Crear/Editar
  const [open, setOpen] = useState(false);                // visible/oculto
  const [editingId, setEditingId] = useState<string | null>(null); // si hay edición
  const [form, setForm] = useState<Form>(EMPTY_FORM);     // valores del formulario
  const [error, setError] = useState<string | null>(null);// mensaje de error

  // Banner elegido en el modal (solo UX). La persistencia real se hace con uploadBanner().
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  /* =========================================================================
     3) EFECTOS: listar al montar + limpiar ObjectURL del preview
     ========================================================================= */
  useEffect(() => { list(); }, [list]);

  useEffect(() => {
    // Limpia el ObjectURL anterior cuando cambie el preview o al desmontar
    return () => { if (bannerPreview) URL.revokeObjectURL(bannerPreview); };
  }, [bannerPreview]);

  /* =========================================================================
     4) DERIVADOS: filtrado + orden por nombre (A/Z)
     ========================================================================= */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const arr = !q
      ? items
      : items.filter(s =>
          s.name.toLowerCase().includes(q) ||
          (s.description ?? "").toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q)
        );

    return arr.slice().sort((a, b) =>
      sortAsc
        ? a.name.localeCompare(b.name, "es")
        : b.name.localeCompare(a.name, "es")
    );
  }, [items, query, sortAsc]);

  /* =========================================================================
     5) HELPERS DE UI
     ========================================================================= */
  // Abrir modal en modo "crear"
  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    // resetea banner del modal
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerFile(null);
    setBannerPreview(null);
    setOpen(true);
  }

  // Abrir modal en modo "editar" con datos cargados
  function openEdit(s: Subject) {
    setEditingId(s.id);
    setForm({ name: s.name, description: s.description ?? "", slug: s.slug });
    setError(null);
    // resetea banner del modal
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerFile(null);
    setBannerPreview(null);
    setOpen(true);
  }

  // Cuando el usuario elige un banner en el input file (maneja <input onChange>)
  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;

    // Limpia preview anterior si hubiera
    if (bannerPreview) {
      URL.revokeObjectURL(bannerPreview);
      setBannerPreview(null);
    }

    if (!file) {
      setBannerFile(null);
      return;
    }

    // Validaciones en front: tipo + peso (10 MB)
    const okType = /^image\/(png|jpe?g|webp|gif)$/.test(file.type);
    if (!okType) {
      alert("Formato no soportado (usa PNG, JPG, WEBP o GIF)");
      e.currentTarget.value = ""; // limpia el input file
      setBannerFile(null);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("La imagen excede 10 MB");
      e.currentTarget.value = "";
      setBannerFile(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setBannerFile(file);
    setBannerPreview(url);
  }

  /* =========================================================================
     6) HANDLERS DE CRUD
     ========================================================================= */
  // Crear/Editar (según si existe editingId)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validaciones mínimas de form
    if (!form.name.trim())        { setError("El nombre es obligatorio"); return; }
    if (form.name.length > 64)    { setError("Máximo 64 caracteres en nombre"); return; }
    if (form.description.length > 200) { setError("Máximo 200 caracteres en descripción"); return; }

    try {
      let s: Subject;

      if (editingId) {
        // EDITAR
        s = await update(editingId, {
          name: form.name.trim(),
          description: form.description.trim(),
          slug: form.slug?.trim() || undefined,
        });

        // Si eligió un nuevo banner, lo "subimos" (mock) ahora
        if (bannerFile) {
          await uploadBanner(s.id, bannerFile);
        }
      } else {
        // CREAR
        s = await create({
          name: form.name.trim(),
          description: form.description.trim(),
          slug: form.slug?.trim() || undefined,
        });

        // Si eligió banner al crear, súbelo también
        if (bannerFile) {
          await uploadBanner(s.id, bannerFile);
        }
      }

      // Cerrar modal y limpiar estados
      setOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);

      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
      setBannerFile(null);
      setBannerPreview(null);
    } catch (err: any) {
      setError(err?.message || "Error guardando la materia");
    }
  }

  // Eliminar con confirmación
  async function handleDelete(id: string) {
    const s = items.find(x => x.id === id);
    if (!s) return;
    if (!confirm(`¿Eliminar la materia "${s.name}"?`)) return;
    await remove(id);
  }

  // Quitar banner en una fila
  async function handleClearBanner(id: string) {
    await clearBanner(id);
  }

  /* =========================================================================
     7) RENDER
     ========================================================================= */
  return (
    <div className={styles.screen}>
      {/* Barra de acciones: crear / buscar / alternar orden */}
      <div className={styles.actions}>
        <button className={styles.primary} onClick={openCreate}>
          + Nueva materia
        </button>

        <div className={styles.right}>
          <input
            className={styles.search}
            placeholder="Buscar por nombre/descripción…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar materia"
          />
          <button
            className={styles.ghost}
            onClick={() => setSortAsc((s) => !s)}
            title="Cambiar orden alfabético"
          >
            Orden: {sortAsc ? "A → Z" : "Z → A"}
          </button>
        </div>
      </div>

      {/* Tabla de materias */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Materia</th>
              <th>Descripción</th>
              <th>Banner</th>
              <th className={styles.colAcciones}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {/* Estado vacío */}
            {filtered.length === 0 ? (
              <tr>
                <td className={styles.empty} colSpan={4}>
                  No hay materias que coincidan.
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id}>
                  <td className={styles.nombre}>{s.name}</td>
                  <td className={styles.descripcion}>
                    {s.description ?? "—"}
                  </td>

                  {/* Banner con miniatura + acción "quitar" */}
                  <td className={styles.bannerCell}>
                    {s.bannerUrl ? (
                      <div className={styles.bannerThumbWrap}>
                        <img
                          className={styles.bannerThumb}
                          src={s.bannerUrl}
                          alt={`Banner de ${s.name}`}
                        />
                        <button
                          className={styles.linkDanger}
                          onClick={() => handleClearBanner(s.id)}
                        >
                          quitar
                        </button>
                      </div>
                    ) : (
                      <span className={styles.noBanner}>—</span>
                    )}
                  </td>

                  {/* Acciones por fila */}
                  <td className={styles.actionsCell}>
                    <button
                      className={styles.link}
                      onClick={() => openEdit(s)}
                    >
                      Editar
                    </button>
                    <button
                      className={styles.linkDanger}
                      onClick={() => handleDelete(s.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Crear/Editar */}
      {open && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            {/* Header del modal */}
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {editingId ? "Editar materia" : "Nueva materia"}
              </h3>
              <button
                className={styles.close}
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className={styles.form}>
              <label className={styles.label}>
                Nombre
                <input
                  className={styles.input}
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  maxLength={64}
                  required
                />
              </label>

              <label className={styles.label}>
                Descripción
                <input
                  className={styles.input}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  maxLength={200}
                />
              </label>

              <label className={styles.label}>
                Slug (opcional)
                <input
                  className={styles.input}
                  value={form.slug ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, slug: e.target.value }))
                  }
                  placeholder="p. ej. matematicas"
                />
              </label>

              {/* Picker de banner + preview local (si eligió archivo) o banner actual si está editando */}
              <div className={styles.bannerPicker}>
                <label className={styles.labelInline}>
                  Banner (PNG, JPG, WEBP o GIF máx 10MB)
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleBannerChange}
                  />
                </label>

                {(bannerPreview ||
                  (editingId &&
                    items.find((x) => x.id === editingId)?.bannerUrl)) && (
                  <div className={styles.bannerPreviewWrap}>
                    <img
                      className={styles.bannerPreview}
                      src={
                        bannerPreview ||
                        items.find((x) => x.id === editingId)?.bannerUrl ||
                        undefined
                      }
                      alt="Vista previa del banner"
                    />
                  </div>
                )}
              </div>

              {/* Mensaje de error del form */}
              {error && (
                <div className={styles.error} role="alert">
                  {error}
                </div>
              )}

              {/* Footer del modal */}
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.ghost}
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.primary}>
                  {editingId ? "Guardar cambios" : "Crear materia"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
