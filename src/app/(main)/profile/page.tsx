import { NotBuiltYet, ScreenHeader } from "@/components/shared/screen";

export default function ProfilePage() {
  return (
    <>
      <ScreenHeader title="Profile" />
      <div className="space-y-3">
        <NotBuiltYet heading="Daily targets">Your calorie, protein, carb and fat targets.</NotBuiltYet>
        <NotBuiltYet heading="About you">Name, height, weight and activity level. All optional.</NotBuiltYet>
        <NotBuiltYet heading="Account">Sign in, sign out, and delete your account and data.</NotBuiltYet>
      </div>
    </>
  );
}
