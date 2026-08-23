import Link from "next/link";
import { ArchitectureContent } from "@/components/ArchitectureContent";

export default function PublicArchitecturePage() {
  return (
    <main className="main">
      <p>
        <Link href="/">← StudioDesk</Link>
      </p>
      <ArchitectureContent />
    </main>
  );
}
