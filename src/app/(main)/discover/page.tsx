import { Suspense } from "react";
import { DiscoverView } from "@/features/food-search/discover-view";

// useSearchParams needs a Suspense boundary in a static export: the meal in
// ?meal= is only known in the browser.
export default function DiscoverPage() {
  return (
    <Suspense>
      <DiscoverView />
    </Suspense>
  );
}
