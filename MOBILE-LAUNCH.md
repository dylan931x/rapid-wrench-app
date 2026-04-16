# Rapid Wrench mobile launch notes

## What is ready now
This project is already set up to be used on iPhone and Android as a Progressive Web App.

That is the recommended release path for the current codebase because it keeps:
- Next.js App Router
- server actions
- Supabase auth and storage
- the current live backend flow

## Fastest path to a phone app
1. Deploy the app to Vercel
2. Connect the production Supabase env vars
3. Open the production URL on iPhone or Android
4. Install it to the home screen

## Why this is the best path
The current app relies on the Next.js runtime and server actions.
That means it is not a simple static-export app that can just be dropped into a native shell as local files.

## Native store apps later
A native App Store / Play Store wrapper can be added later, but it requires:
- Apple Developer account
- Google Play Console account
- Xcode on macOS for iOS builds
- Android Studio for Android builds
- additional native packaging work

## Recommendation
Use the PWA as the first finished mobile release.
Then decide later whether you want store-listed native wrappers.
