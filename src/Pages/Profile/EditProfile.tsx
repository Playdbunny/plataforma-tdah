import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./EditProfile.module.css";
import Navbar from "../../Components/Navbar/Navbar";
import { useAppStore } from "../../stores/appStore";

// Catálogo básico de personajes (usa tus assets reales)
const CHARACTERS = [
  { id: "boy",     name: "boy",     sprite: "/Characters/boy.gif" },
  { id: "girl",    name: "girl",    sprite: "/Characters/girl.gif" },
  { id: "foxboy",  name: "foxboy",  sprite: "/Characters/foxboy.gif"},
  { id: "foxgirl", name: "foxgirl", sprite: "/Characters/foxgirl.gif"},
  { id: "robot",   name: "robot",   sprite: "/Characters/robot.gif"},
];

export default function EditProfile() {
  const navigate = useNavigate();

  // Store (fuente de verdad única)
  const user    = useAppStore((s: any) => s.user);
  const update  = useAppStore((s: any) => s.updateUser);

  // Form controlado
  const [name, setName]             = useState(user?.name ?? "");
  const [username, setUsername]     = useState(user?.username ?? "");
  const [education, setEducation]   = useState(user?.education ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string>(
    user?.avatarUrl ?? "/Images/default-profile.jpg"
  );
  const [selectedChar, setSelectedChar] = useState<string>(
    user?.character?.id ?? CHARACTERS[0].id
  );

  // Habilitar guardar solo si username >= 3
  const canSave = useMemo(() => username.trim().length >= 3, [username]);

  // Solo previsualiza (no persiste hasta "Save")
  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file); // mock frontend; en backend subes y usas la URL devuelta
    setAvatarPreview(url);
  };

  const onSave = () => {
    const char = CHARACTERS.find(c => c.id === selectedChar) ?? CHARACTERS[0];

    update({
      name: name.trim(),
      username: username.trim(),
      education: education.trim(),
      avatarUrl: avatarPreview, // en prod: URL de tu API de upload
      character: char,
    });

    navigate("/profile");
  };

  return (
    <>
        <Navbar items={[{ label: "Materias", to: "/subjects" }]} />

      <div className={styles.wrap}>
        {/* Sidebar simple */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}>Cuenta </div>
          <button className={`${styles.sideItem} ${styles.active}`} type="button">
            Editar perfil
          </button>
          {/* Si más secciones van a existir, las puedes habilitar luego */}
          {/* <button className={styles.sideItem} disabled>Billing</button> */}
          {/* <button className={styles.sideItem} disabled>Settings</button> */}
        </aside>

        {/* Card principal */}
        <main className={styles.card}>
          <div className={styles.header}>Personal Information</div>

          {/* Form grid */}
          <div className={styles.formGrid}>
            <label className={styles.label}>Name
              <input
                className={styles.input}
                value={name}
                onChange={e=>setName(e.target.value)}
                placeholder="Your name"
              />
            </label>

            <div className={styles.avatarBox}>
              <img
                className={styles.avatar}
                src={avatarPreview}
                alt="Avatar"
                onError={(e)=>{ (e.currentTarget as HTMLImageElement).src="/Images/default-profile.jpg"; }}
              />
              <label className={styles.editAvatar}>
                <input type="file" accept="image/*" hidden onChange={onPickAvatar} />
                Change photo
              </label>
              <small className={styles.hint}>PNG/JPG &lt; 5MB — relación 1:1</small>
            </div>

            <label className={styles.label}>Nombre de usuario
              <input
                className={styles.input}
                value={username}
                onChange={e=>setUsername(e.target.value)}
                placeholder="Pick a username"
              />
            </label>

            <label className={styles.label}>Institución
              <input
                className={styles.input}
                value={education}
                onChange={e=>setEducation(e.target.value)}
                placeholder="Colegio / Universidad"
              />
            </label>
          </div>

          {/* Selector de personaje */}
          <div className={styles.subheader}>Escoge tu personaje</div>
          <div className={styles.gridChars}>
            {CHARACTERS.map(c => (
              <button
                key={c.id}
                type="button"
                className={`${styles.charCard} ${selectedChar === c.id ? styles.active : ""}`}
                onClick={()=>setSelectedChar(c.id)}
                title={c.name}
              >
                <img
                  src={c.sprite}
                  alt={c.name}
                  onError={(e)=>{ (e.currentTarget as HTMLImageElement).src="/Characters/boy.gif"; }}
                />
                <span>{c.name}</span>
              </button>
            ))}
          </div>

          {/* Acciones */}
          <div className={styles.actions}>
            <button className={styles.btnGhost} onClick={()=>navigate("/profile")}>Cancelar</button>
            <button className={styles.btnPrimary} onClick={onSave} disabled={!canSave}>
              Guardar cambios
            </button>
          </div>
        </main>
      </div>
    </>
  );
}
