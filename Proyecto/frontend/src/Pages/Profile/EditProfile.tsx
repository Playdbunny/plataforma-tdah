import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./EditProfile.module.css";
import cardStyles from "../../Components/CharacterCard/CharacterCard.module.css";
import Navbar from "../../Components/Navbar/Navbar";
import { useAppStore } from "../../stores/appStore";
import { useAuthStore } from "../../stores/authStore";
import { updateProfile, type UpdateProfilePayload, uploadAvatar } from "../../api/users";

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

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

export default function EditProfile() {
  const navigate = useNavigate();

  // Store
  const user        = useAppStore((s: any) => s.user);
  const update      = useAppStore((s: any) => s.updateUser);
  const setAppUser  = useAppStore((s: any) => s.setUser);
  const setAuthUser = useAuthStore((s) => s.setUser);

  // Defaults seguros
  const coins            = user?.coins ?? 0;
  const ownedCharacters  = (user?.ownedCharacters as string[] | undefined) ?? ["boy","girl","foxboy","foxgirl","robot"];

  // Form controlado
  const [name, setName]         = useState(user?.name ?? "");
  const [email, setEmail]       = useState(user?.email ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [education, setEducation] = useState(user?.education ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string>(user?.avatarUrl ?? "/Images/default-profile.jpg");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [selectedChar, setSelectedChar]   = useState<string>(user?.character?.id ?? CHARACTERS[0].id);
  const [saving, setSaving]               = useState(false);
  const [errorMsg, setErrorMsg]           = useState<string | null>(null);

  // Habilitar guardar solo si username >= 3
  const canSave = useMemo(() => {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedEducation = education.trim();
    return (
      trimmedUsername.length >= 3 &&
      trimmedEducation.length >= 2 &&
      /\S+@\S+\.\S+/.test(trimmedEmail)
    );
  }, [username, email, education]);

  // Previsualizar avatar (frontend)
  const onPickAvatar = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > MAX_AVATAR_SIZE) {
      setErrorMsg("La imagen debe pesar menos de 5MB.");
      input.value = "";
      return;
    }

    try {
      setErrorMsg(null);
      if (avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
      const objectUrl = URL.createObjectURL(file);
      setAvatarPreview(objectUrl);
      setAvatarFile(file);
    } catch (_err) {
      setErrorMsg("No se pudo leer la imagen seleccionada. Intenta con otro archivo.");
    } finally {
      input.value = "";
    }
  };

  useEffect(() => {
    if (!avatarPreview.startsWith("blob:")) return;
    return () => {
      URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

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
    setAuthUser({
      coins: coins - price,
      ownedCharacters: nextOwned,
      character: { id: c.id, name: c.name, sprite: c.sprite },
    });
    setSelectedChar(id);
  };

  const onSave = async () => {
    if (!canSave || saving) return;

    const c = CHARACTERS.find(x => x.id === selectedChar) ?? CHARACTERS[0];
    setSaving(true);
    setErrorMsg(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();
    const trimmedEducation = education.trim();

    const payload: UpdateProfilePayload = {
      name: trimmedName,
      email: trimmedEmail,
      username: trimmedUsername,
      education: trimmedEducation,
      character: { id: c.id, name: c.name, sprite: c.sprite },
      ownedCharacters,
      coins: coins,
    };

    try {
      if (avatarFile) {
        payload.avatarUrl = await uploadAvatar(avatarFile);
      }
      const updatedUser = await updateProfile(payload);
      setAppUser(updatedUser as any);
      setAuthUser(updatedUser);
      navigate("/profile");
    } catch (err: any) {
      const message =
        err?.response?.data?.error ??
        err?.message ??
        "No se pudo guardar los cambios. Intenta nuevamente.";
      setErrorMsg(typeof message === "string" ? message : "No se pudo guardar los cambios.");
    } finally {
      setSaving(false);
    }
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

            <label className={styles.label}>Correo
              <input
                className={styles.input}
                type="email"
                value={email}
                onChange={e=>setEmail(e.target.value)}
                placeholder="tu@correo.com"
              />
            </label>

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
                <div
                  key={c.id}
                  className={[
                    cardStyles.card,                                 // base visual de card
                    isActive ? cardStyles.selected : "",
                    cardStyles[c.rarity],                             // color por rareza
                  ].join(" ")}
                  role="button"
                  tabIndex={locked ? -1 : 0}
                  aria-disabled={locked}
                  aria-pressed={isActive}
                  onClick={() => (locked ? undefined : handleSelect(c.id))}
                  onKeyDown={(e) => {
                    if (locked) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelect(c.id);
                    }
                  }}
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
                </div>
              );
            })}
          </div>

          {/* Mensaje de error */}
          {errorMsg && <p className={styles.error}>{errorMsg}</p>}

          {/* Acciones */}
          <div className={styles.actions}>
            <button className={styles.btnGhost} onClick={()=>navigate("/profile")}>Cancelar</button>
            <button className={styles.btnPrimary} onClick={onSave} disabled={!canSave || saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </main>
      </div>
    </>
  );
}

