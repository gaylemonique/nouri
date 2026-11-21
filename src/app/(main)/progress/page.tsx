import { NotBuiltYet, ScreenHeader } from "@/components/shared/screen";

export default function ProgressPage() {
  return (
    <>
      <ScreenHeader title="Progress" />
      <div className="space-y-3">
        <NotBuiltYet heading="This week">Calories per day for the last 7 days, next to your target.</NotBuiltYet>
        <NotBuiltYet heading="This month">How often you stayed within your targets, and your macro split.</NotBuiltYet>
      </div>
    </>
  );
}
