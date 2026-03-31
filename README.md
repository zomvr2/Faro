# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Appwrite setup

This project is initialized to work with Appwrite for:

- Storage uploads (report images)
- Database documents (reports)
- Realtime updates (new or updated reports)

Create a `.env` file in the project root with the following values:

```bash
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
EXPO_PUBLIC_APPWRITE_DATABASE_ID=your_database_id
EXPO_PUBLIC_APPWRITE_REPORTS_COLLECTION_ID=your_reports_collection_id
EXPO_PUBLIC_APPWRITE_REPORTS_BUCKET_ID=your_reports_bucket_id
```

Appwrite services are under `services/appwrite`.
The RSS tab now reads reports and subscribes to realtime changes using that service layer.

## EAS Update

This project is configured to use EAS Update with branch/channel mapping:

- `development` branch -> `development` channel
- `preview` branch -> `preview` channel
- `production` branch -> `production` channel

Build profiles are defined in `eas.json`:

- `dev` (internal distribution, Android APK)
- `preview` (internal distribution)
- `production` (store-ready profile)

### Typical flow

1. Build once per channel/profile and install that binary on target devices:

   ```bash
   npm run eas:build:dev
   npm run eas:build:preview
   npm run eas:build:production
   ```

2. Publish OTA updates to the matching branch:

   ```bash
   npm run eas:update:dev
   npm run eas:update:preview
   npm run eas:update:production
   ```

Only binaries built with a matching runtime version can receive those updates.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
