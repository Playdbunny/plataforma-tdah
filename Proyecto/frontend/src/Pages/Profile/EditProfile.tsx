import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./EditProfile.module.css";
import cardStyles from "../../Components/CharacterCard/CharacterCard.module.css"; // 👈 NUEVO
import Navbar from "../../Components/Navbar/Navbar";
import { useAppStore } from "../../stores/appStore";

// Catálogo con rareza y precio (solo pagan los no-comunes)
const CHARACTERS = [
  // comunes (gratis)
  { id: "boy",     name: "boy",     sprite: "/Characters/boy.gif",     rarity: "common" as const },
  { id: "girl",    name: "girl",    sprite: "/Characters/girl.gif",    rarity: "common" as const },
  { id: "foxboy",  name: "foxboy",  sprite: "/Characters/foxboy.gif",  rarity: "common" as const },
  { id: "foxgirl", name: "foxgirl", sprite: "/Characters/foxgirl.gif", rarity: "common" as const },
  { id: "robot",   name: "robot",   sprite: "/Characters/robot.gif",   rarity: "common" as const },

  // nuevos
  { id: "alien",   name: "alien",   sprite: "/Characters/alien.gif",   rarity: "rare" as const,       price: 100 },
  { id: "dragon",  name: "dragon",  sprite: "/Characters/dragon.gif",  rarity: "epic" as const,       price: 200 },
  { id: "unicorn", name: "unicorn", sprite: "/Characters/unicorn.gif", rarity: "legendary" as const,  price: 400 },
];

type Rarity = "common" | "rare" | "epic" | "legendary";

const RARITY_LABEL: Record<Rarity,string> = {
  common: "Común",
  rare: "Raro",
  epic: "Épico",
  legendary: "Legendario",
};

export default function EditProfile() {
  const navigate = useNavigate();

  // Store
  const user   = useAppStore((s: any) => s.user);
  const update = useAppStore((s: any) => s.updateUser);

  // Defaults seguros
  const coins            = user?.coins ?? 0;
  const ownedCharacters  = (user?.ownedCharacters as string[] | undefined) ?? ["boy","girl","foxboy","foxgirl","robot"];

  // Form controlado
  const [name, setName]         = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [education, setEducation] = useState(user?.education ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string>(user?.avatarUrl ?? "/Images/default-profile.jpg");
  const [selectedChar, setSelectedChar]   = useState<string>(user?.character?.id ?? CHARACTERS[0].id);

  // Habilitar guardar solo si username >= 3
  const canSave = useMemo(() => username.trim().length >= 3, [username]);

  // Previsualizar avatar (frontend)
  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  };

  const handleSelect = (id: string) => {
    const c = CHARACTERS.find(x => x.id === id) ?? CHARACTERS[0];
    // Solo permitir seleccionar si es owned
    const isOwned = ownedCharacters.includes(id) || c.rarity === "common";
    if (!isOwned) return;
    setSelectedChar(id);
  };

  const handleUnlock = (id: string) => {
    const c = CHARACTERS.find(x => x.id === id);
    if (!c) return;

    const price = c.price ?? 0;
    if (coins < price) {
      alert(`Te faltan monedas. Necesitas ${price} y tienes ${coins}.`);
      return;
    }

    // Descontar, agregar a owned y seleccionar
    const nextOwned = Array.from(new Set([...ownedCharacters, id]));
    update({
      coins: coins - price,
      ownedCharacters: nextOwned,
      character: { id: c.id, name: c.name, sprite: c.sprite },
    });
    setSelectedChar(id);
  };

  const onSave = () => {
    const c = CHARACTERS.find(x => x.id === selectedChar) ?? CHARACTERS[0];
    update({
      name: name.trim(),
      username: username.trim(),
      education: education.trim(),
      avatarUrl: avatarPreview, // en prod: URL devuelta por tu API
      character: { id: c.id, name: c.name, sprite: c.sprite },
    });
    navigate("/profile");
  };

  return (
    <>
      <Navbar items={[{ label: "Materias", to: "/subjects" }]} />

      <div className={styles.wrap}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}>Cuenta</div>
          <button className={`${styles.sideItem} ${styles.active}`} type="button">
            Editar perfil
          </button>
        </aside>

        {/* Card principal */}
        <main className={styles.card}>
          <div className={styles.header}>
            <span>Información Personal</span>
          </div>

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
            {CHARACTERS.map(c => {
              const isOwned   = ownedCharacters.includes(c.id) || c.rarity === "common";
              const locked    = !isOwned && !!c.price;
              const isActive  = selectedChar === c.id;

              return (
                <button
                  key={c.id}
                  type="button"
                  className={[
                    cardStyles.card,                                 // base visual de card
                    isActive ? cardStyles.selected : "",
                    cardStyles[c.rarity],                             // color por rareza
                  ].join(" ")}
                  onClick={() => (locked ? undefined : handleSelect(c.id))}
                  title={c.name}
                >
                  {/* Badge rareza (arriba izq) */}
                  <span className={cardStyles.rarityBadge}>{RARITY_LABEL[c.rarity]}</span>

                  {/* Chip de precio (arriba der) sólo si está bloqueado */}
                  {locked && <span className={cardStyles.priceChip}>🪙 {c.price}</span>}

                  <img
                    className={cardStyles.sprite}
                    src={c.sprite}
                    alt={c.name}
                    onError={(e)=>{ (e.currentTarget as HTMLImageElement).src="/Characters/boy.gif"; }}
                  />
                  <span className={cardStyles.name}>{c.name}</span>

                  {/* Overlay de bloqueo */}
                  {locked && (
                    <div className={cardStyles.lockOverlay} aria-hidden>
                      <button
                        className={[
                          cardStyles.unlockBtn,
                          cardStyles[`btn_${c.rarity}`],             // color del botón según rareza
                        ].join(" ")}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleUnlock(c.id); }}
                      >
                        🔒 Desbloquear — {c.price} 🪙
                      </button>
                    </div>
                  )}
                </button>
              );
            })}
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

