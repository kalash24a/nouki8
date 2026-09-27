import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="rec text-foreground-muted">404</p>
      <h1 className="mt-2 text-4xl">That page isn&apos;t here</h1>
      <p className="mt-3 text-foreground-muted">It may be a candidate ID that doesn&apos;t exist in the sample data.</p>
      <ButtonLink href="/" className="mt-6">Back to the start</ButtonLink>
    </div>
  );
}
