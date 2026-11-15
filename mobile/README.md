# OneMass mobile

One app for iOS and Android with three tabs: **Home**, **To do** and **Map**. The Map is the main feature. Search a room
like `ILC S220`, or tap one of your classes, and it shows the building, the door to use, the floor plan and
step-by-step directions to the room, with a step-free (elevator) option.

## Run it

```bash
cd mobile
npm install
npx expo start
```

- **Phone:** install Expo Go, scan the QR code, and set `EXPO_PUBLIC_API_URL` (see `.env.example`) to a backend URL the
  phone can reach. The web app's public URL plus `/api` works, because the web app forwards `/api` to the backend.
- **iOS Simulator** (needs Xcode): press `i`. It uses `http://localhost:8000` by default.
- **Android emulator:** press `a`. It uses `http://10.0.2.2:8000` by default.

Use **Try the demo** to sign in without a UMass account.

## Data

- Building outlines and doors: © OpenStreetMap contributors (ODbL).
- Classroom list: the University Registrar's public classroom list.
- Floor layouts: the ILC's first floor is traced from its posted floor plan. Other floors are laid out from the official
  room list, and the app labels them "approximate layout".
