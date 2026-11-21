import { NotBuiltYet, ScreenHeader } from "@/components/shared/screen";

export default function DiscoverPage() {
  return (
    <>
      <ScreenHeader title="Discover" />
      <div className="space-y-3">
        <NotBuiltYet heading="Search foods">
          Find foods by English or Tagalog name, from kanin and saging to sinigang, kare-kare and pandesal.
        </NotBuiltYet>
        <NotBuiltYet heading="Recent and saved">Foods you logged lately and the ones you saved.</NotBuiltYet>
      </div>
    </>
  );
}
