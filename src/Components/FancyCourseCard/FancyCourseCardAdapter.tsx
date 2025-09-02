// Adapta un Subject del store a las props REALES de FancyCourseCard.
// Props reales de tu card: { to, eyebrow?, title, description?, bannerSrc, footer?, ariaLabel? }

import FancyCourseCard from "./FancyCourseCard";
import { type Subject } from "../../stores/subjectsStore";

const DEFAULT_HERO_BY_SLUG: Record<string, string> = {
  historia: "/Gifs/3banner.gif",
  quimica: "/Gifs/6banner.gif",
  matematicas: "/Gifs/8banner.gif",
};

type Props = { subject: Subject };

export default function FancyCourseCardAdapter({ subject }: Props) {
  const hero =
    subject.bannerUrl ||
    DEFAULT_HERO_BY_SLUG[subject.slug] ||
    "/Gifs/8banner.gif";

  return (
    <FancyCourseCard
      to={`/subjects/${subject.slug}`}
      eyebrow="MATERIA"
      title={subject.name}
      description={subject.description ?? "Lorem ipsum dolor sit amet."}
      bannerSrc={hero}
      ariaLabel={`Abrir curso ${subject.name}`}
    />
  );
}
