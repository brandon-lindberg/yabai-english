import { Link } from "@/i18n/navigation";
import { actionLinkClass } from "@/components/ui/inline-link";

export function AdminParticipantLink({ participant }: { participant: { id: string; name: string | null; email: string | null } }) {
  return <Link className={`${actionLinkClass} break-words`} href={`/admin/users/${participant.id}`}>
    {participant.name || participant.email || participant.id}
  </Link>;
}
