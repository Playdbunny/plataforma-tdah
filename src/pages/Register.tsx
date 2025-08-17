import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../stores/appStore";
import styles from "./Register.module.css";

type FormData = {
  fullName: string;
  email: string;
  password: string;
  confirm: string;
  course: string;
  tdahType: string;
};

export default function Register() {
  const navigate = useNavigate();
  const tdahType = useAppStore((s) => s.tdahType);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  // Si el usuario no eligió TDAH en Home, vuelve a inicio
  useEffect(() => {
    if (!tdahType) navigate("/");
  }, [tdahType, navigate]);

  if (!tdahType) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries()) as unknown as FormData;

    // Validaciones mínimas sin librerías
    const newErrors: Partial<FormData> = {};
    if (!data.fullName.trim()) newErrors.fullName = "Ingresa tu nombre completo.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) newErrors.email = "Correo inválido.";
    if (data.password.length < 6) newErrors.password = "Mínimo 6 caracteres.";
    if (data.password !== data.confirm) newErrors.confirm = "Las contraseñas no coinciden.";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    // Aquí iría tu fetch/axios al backend:
    // await api.post("/auth/register", data)
    console.log("Registro:", data);

    // Redirigir a donde quieras tras crear cuenta:
    // navigate("/dashboard");
    alert("¡Cuenta creada! (simulado)");
  };

  return (
    <main className={styles.screen}>
      <section className={styles.card}>
        {/* Columna izquierda */}
        <div className={styles.left}>
          <h2 className={styles.title}>Únete!</h2>
          <p className={styles.text}>
            Crea tu cuenta para comenzar con tu plan adaptado a tu tipo de TDAH.
          </p>
          <div className={styles.avatarHole} />
        </div>

        {/* Columna derecha (formulario) */}
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div>
            <input className={styles.input} name="fullName" placeholder="Nombre Apellido" />
            {errors.fullName && <span className={styles.error}>{errors.fullName}</span>}
          </div>

          <div>
            <input className={styles.input} type="email" name="email" placeholder="Correo" />
            {errors.email && <span className={styles.error}>{errors.email}</span>}
          </div>

          <div>
            <input className={styles.input} type="password" name="password" placeholder="Contraseña" />
            {errors.password && <span className={styles.error}>{errors.password}</span>}
          </div>

          <div>
            <input className={styles.input} type="password" name="confirm" placeholder="Confirmar contraseña" />
            {errors.confirm && <span className={styles.error}>{errors.confirm}</span>}
          </div>

          <input className={styles.input} name="course" placeholder="Curso" />

          {/* TDAH seleccionado (bloqueado) */}
          <input className={styles.input} value={tdahType} readOnly />
          <small className={styles.hint}>Tipo TDAH (definido desde la pantalla anterior)</small>
          <input type="hidden" name="tdahType" value={tdahType} />

          <button className={styles.submit} type="submit">Crear cuenta</button>
        </form>
      </section>
    </main>
  );
}

