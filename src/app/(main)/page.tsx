import { NotBuiltYet, ScreenHeader } from "@/components/shared/screen";
import { TodayLabel } from "@/components/shared/today-label";

export default function HomePage() {
  return (
    <>
      <ScreenHeader title="Today" kicker={<TodayLabel />} />
      <div className="space-y-3">
        <NotBuiltYet heading="Calories">
          What you have eaten today against your calorie target, and how much is left.
        </NotBuiltYet>
        <NotBuiltYet heading="Protein, carbs and fat">Each macro against its daily target.</NotBuiltYet>
        <NotBuiltYet heading="Meals">
          Breakfast, lunch, dinner and snacks, with a quick way to add food to each.
        </NotBuiltYet>
      </div>
    </>
  );
}
