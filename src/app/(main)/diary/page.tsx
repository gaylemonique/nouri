import { Suspense } from "react";
import { DiaryView } from "@/features/food-diary/diary-view";

// useSearchParams needs a Suspense boundary in a static export: the day in
// ?date= is only known in the browser.
export default function DiaryPage() {
  return (
    <Suspense>
      <DiaryView />
    </Suspense>
  );
}
