import { NotBuiltYet, ScreenHeader } from "@/components/shared/screen";

export default function DiaryPage() {
  return (
    <>
      <ScreenHeader title="Diary" />
      <div className="space-y-3">
        <NotBuiltYet heading="Pick a day">Move between days to review or fix past meals.</NotBuiltYet>
        <NotBuiltYet heading="Meals">
          Every food logged for the day, grouped by meal. Change the serving, edit the amount or remove an entry.
        </NotBuiltYet>
      </div>
    </>
  );
}
