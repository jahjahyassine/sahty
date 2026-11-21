import { redirect } from 'next/navigation';

/** Ancien parcours d'édition : l'espace de travail est maintenant la page de détail. */
export default function LegacyConsultationEditRedirect({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  redirect(`/${locale}/doctor/consultations/${id}`);
}
