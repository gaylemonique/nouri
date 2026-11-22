# Releasing to Google Play

What it takes to put Nouri on Google Play, what is already done in the repo, and what still needs a person. iOS needs a Mac with Xcode and is not covered here yet.

## Status

| Item | State |
| --- | --- |
| App ID `com.nouri.app` | Final. Cannot change after the first upload |
| Target SDK 36, min SDK 24 | Done (`android/variables.gradle`) |
| Version | `versionName "0.1.0"`, `versionCode 1` in `android/app/build.gradle` |
| Release signing | Reads `android/keystore.properties` if present; the key itself is never committed |
| In-app account deletion | Done: Profile → Delete account (`delete_my_account`) |
| Backups | Off. Sessions, cache and the write queue never go to cloud backup or device transfer |
| App icon and splash | **Blocked:** waiting for a designer; Capacitor defaults still in place |
| Privacy policy URL | **Blocked:** needs writing by the owner and a public URL |
| Account deletion web URL | **Blocked:** Play also asks for a page outside the app; needs hosting |
| Email sender (SMTP) | **Blocked:** without it there is no password reset and no email confirmation (see README, Sign-in) |
| Release build and device test | **Not done:** this machine has no Android SDK. First build and a test on a real phone are still to do |
| Play developer account | **Needs the account owner:** registration has a fee |

## One-time setup

1. Install Android Studio (it bundles a JDK 21 and the Android SDK).
2. Create the upload key. Keep the file and both passwords somewhere safe; losing them means asking Google to reset the upload key.

   ```bash
   keytool -genkeypair -v -keystore nouri-upload.jks -alias nouri-upload \
     -keyalg RSA -keysize 2048 -validity 10000
   ```

3. Put the key next to the Android project and describe it in `android/keystore.properties` (git-ignored):

   ```properties
   storeFile=../nouri-upload.jks
   storePassword=...
   keyAlias=nouri-upload
   keyPassword=...
   ```

   `storeFile` is resolved from `android/app/`.

4. In Play Console, turn on Play App Signing for the app. Google keeps the app signing key; the key above only signs uploads.

## Every release

1. Raise `versionCode` by 1 in `android/app/build.gradle`. Set `versionName` and `version` in `package.json` to the same value.
2. Run the app checks from `AGENTS.md` (lint, typecheck, tests, build).
3. Build the bundle:

   ```bash
   npm run cap:sync
   cd android
   ./gradlew bundleRelease
   ```

   The file is `android/app/build/outputs/bundle/release/app-release.aab`.
4. Install a release build on a real phone and check sign-in, adding, editing and removing an entry, airplane mode and back (queued changes sync), Progress, sign-out and account deletion.
5. Upload the `.aab` to a testing track first.

New personal developer accounts must run a closed test with at least 12 testers for 14 days before they can publish to production. Plan for that on the first release.

## Play Console forms

### App content

- **Privacy policy:** a public URL. It must describe the data listed below, who runs the app and how to contact them.
- **Account deletion:** the in-app path (Profile → Delete account) and a web page where someone without the app can ask for deletion.
- **Data safety:** facts below.
- **Health apps declaration:** Play asks every app to fill it in. Nouri is a food and nutrition diary; it gives no medical advice and the app says so on Profile and the sign-in screen.
- **Content rating, target audience, ads:** no ads, not aimed at children.

### Data safety facts

What the app collects and why, as built today. The owner decides how to map these onto Play's categories.

| Data | Required? | Why | Where it goes |
| --- | --- | --- | --- |
| Email address | Yes | Account and sign-in | Supabase (auth) |
| Password | Yes | Sign-in; stored hashed by Supabase Auth | Supabase (auth) |
| Display name | Optional | Shown on Profile | Supabase (database) |
| Calorie and macro targets | Yes (calories) | Compare each day with the target | Supabase (database) |
| Food diary: foods, amounts, meals, dates, nutrients | Yes, to use the app | The diary itself | Supabase (database) |
| Height, weight, date of birth, activity, goal, dietary preference | Optional; columns exist, no screen collects them yet | Future target suggestions | Supabase (database) |

- No ads, no analytics or crash-reporting SDKs, no location, contacts, photos or device identifiers.
- Not sold or shared with third parties. Supabase hosts the database and auth as a service provider.
- Encrypted in transit (HTTPS). Row-level security limits each user to their own rows.
- Users can delete their account and all of this data in the app; deletion is immediate and cascades to every row.
- On the phone: the login session, a cache of recent data and unsynced changes, all removed on sign-out or account deletion and excluded from backups.

## Store listing draft

Short description (80 characters max):

> A food diary with Filipino dishes and the serving sizes you actually use.

Full description:

> Nouri is a food diary. Log what you eat and see calories, protein, carbs and fat for the day against targets you set.
>
> The catalog includes Filipino dishes such as sinigang, adobo, kare-kare, pancit, silog plates and pandesal, with servings like a cup of rice, a piece of pandesal or a bowl of sinigang. Search works in English or Tagalog: "saging" finds banana, "kanin" finds rice.
>
> Plain foods use USDA FoodData Central values. Filipino dishes are worked out from home recipes and marked Estimated, because the same dish differs between kitchens.
>
> Log without signal: entries are kept on your phone and sync when you are back online.
>
> Progress shows the last 7 days against your calorie target and which of the last 30 days you stayed within it.
>
> Nouri shows estimates. It is not medical or dietary advice.

Screenshots: take them from a release build on a phone with a real account, not from sample data.
