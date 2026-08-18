import { getIdentity } from "@/lib/data/queries";
import IdentityEditor from "@/components/admin/IdentityEditor";

export const dynamic = "force-dynamic";

export default async function IdentityPage() {
  const identity = await getIdentity();
  return <IdentityEditor initial={identity} />;
}
