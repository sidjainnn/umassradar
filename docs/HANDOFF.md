# OneMass handoff

**For:** Shaurya (web frontend) and anyone running or testing the project
**Last updated:** Nov 15, 2026
**Who owns what:**
- `frontend/` (web app): Shaurya
- `backend/` (API) and `mobile/` (iOS and Android app): Sidharth
- Everything is on `main`.

The full API, with example requests and responses, is in [`docs/API.md`](API.md). This doc covers what's new, what the
web frontend still needs, and how to run and test everything.

---

## 1. Quick start

You need Python 3.11+, Node 20+ and Docker (for MongoDB).

```bash
git pull origin main

# database
docker compose up -d mongo

# backend (http://localhost:8000)
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env   # ask Sidharth for the values; never commit .env
.venv/bin/uvicorn app.main:app --reload --port 8000

# web app (http://localhost:3000), new terminal
cd frontend
npm install
npm run dev

# mobile app, new terminal (see section 5)
cd mobile
npm install
npx expo start
```

- The web app forwards `/api/*` to the backend (`frontend/next.config.ts`), so the browser calls `/api/...`.
- Click **Load demo inbox** (web) or **Try the demo** (mobile) to test without a Google account. The demo has a class
  schedule, job emails, two sample applications and housing posts.
- **Tests:** `cd backend && .venv/bin/pytest -q` (178 pass).

---

## 2. What's new in the backend

| Feature | What it does | Endpoints |
|---|---|---|
| Study / Work mode | Every item is tagged `study`, `work` or `both`. Work mode covers jobs, internships, applications and housing; study mode covers classes and coursework. The brief follows the mode. | `PUT /settings/mode`, `GET /items?mode=` |
| Onboarding and preferences | First-sign-in questions (served as data), saved preferences, and a log of everything learned that students can undo | `GET /preferences/questions`, `GET/PUT /preferences`, `GET /preferences/log`, `DELETE /preferences/log/{id}` |
| Applications from email | Workday, Greenhouse, Handshake and similar emails become an application tracker (applied, interview, offer, rejected). Only company, role and stage are kept. | `GET /applications`, `POST /applications`, `DELETE /applications/{id}` |
| Jobs for you | Jobs ranked 0–100 with plain reasons, filtered by preferences; save and hide update the ranking | `GET /jobs`, `POST /jobs/{id}/feedback` |
| To-do agent | Tasks for the current mode, plus suggested next steps (follow up on an application, prep for an interview, office hours before a deadline, study blocks) that can be accepted or dismissed | `GET /todo?mode=`, `POST /todo/suggestions/{id}` |
| Typed events | "Coffee with Priya tue 3pm at Roots" becomes an event; one week view with everything in it | `POST/PATCH/DELETE /events`, `GET /schedule/week` |
| Where are my classes | Each class with building, room, floor, side, door and walking time from the class before | `GET /schedule/where`; `your_section_where` on `GET /courses/{code}` |
| Indoor maps | All 244 registrar classrooms in 44 buildings. ILC floor 1 is traced from its posted plan; other floors are generated and marked `"source": "generated"`. | `GET /indoor/buildings`, `GET /indoor/{building}`, `GET /indoor/route?to=ILC S220&accessible=` |
| Room finder | Building and door for any SPIRE room code, walking time between buildings, students confirming where a room is | `GET /rooms/locate`, `GET /rooms/route`, `POST /rooms/confirm`, `GET /rooms/buildings` |
| Ask Sam | Answers questions from the student's own email, schedule and syllabi. It now also returns `navigate` buttons when asked where a class is. | `POST /ask` |
| Textbooks | Required books and access codes pulled from syllabi | `GET /textbooks`; `shared.materials` on course pages |
| Progress | Weekly completion, streak and exam countdowns | `GET /progress` |
| Mobile sign-in | `Authorization: Bearer <token>` accepted everywhere | `POST /auth/mobile/demo`, `GET /auth/mobile/start`, `POST /auth/mobile/exchange` |

---

## 3. Web frontend to-do (Shaurya)

In priority order. Each item names the endpoint to call; `docs/API.md` has the response shapes.

### 3.1 Ask Sam (missing in your version)
Ask Sam is already on `main`: `frontend/components/AskSam.tsx`, mounted at the bottom of
`frontend/components/AppShell.tsx` (`<AskSam />`). If your branch doesn't have it, run `git pull origin main` and keep
both files when you resolve conflicts. Then:
- Show `navigate` from `POST /ask` as **Take me there** buttons that open the map with directions to `navigate[i].to`.
- In work mode Sam leads with jobs automatically; nothing to change.

### 3.2 Map
- Replace the emoji pins with plain dots and one accent color: maroon in study mode, forest in work mode. Keep it
  calm and simple.
- **Find a room:** call `GET /indoor/route?to=<query>`.
  - Draw the floor from `GET /indoor/{building}`: room shapes labeled with `room`, plus a floor picker.
  - Highlight `room_polygon`, draw the `legs[]` line for the selected floor, and list `steps`.
  - Add a step-free switch that sends `accessible=true`.
  - On generated floors (`source == "generated"`), show a small "approximate layout" note.
- **My classes:** add a chip per class from `GET /schedule/where`; tapping one routes to `location.navigate.to`.
- **Credit:** show "© OpenStreetMap contributors" on the map.

### 3.3 Courses
- On each course page, show `your_section_where.summary` (e.g. "ILC S120, 1st floor, south side") with a
  **Directions** button to the map.
- Add a **Where are my classes** list on the Courses page from `GET /schedule/where`, including `walk_from_previous`
  ("7 min walk from COMPSCI 311", flagged when `tight`).

### 3.4 Study / Work mode
- Pass `mode` to `GET /items` and `GET /todo` instead of filtering in the browser.
- **To do:** show `suggestions[]` from `GET /todo` as cards with the `why` text and the `action.label` button.
  - Accepting a `block_time` suggestion adds an event.
  - `copy_text` copies `action.text`.
  - Dismissed suggestions don't come back.

### 3.5 Onboarding and jobs
- When `GET /me` has `needs_onboarding: true`, show the questions from `GET /preferences/questions`. Save with
  `PUT /preferences`. Never show onboarding in demo mode.
- **Jobs page:** use `GET /jobs`.
  - Show `match` and `reasons` under each job.
  - Add a collapsed "Hidden by your preferences (n)" from `filtered_out`.
  - Save, hide and not-interested buttons call `POST /jobs/{id}/feedback`.
- **Applications tracker:** `GET /applications`, with stage, company, role and days since the last reply.
- **"What we learned":** in Profile, show `GET /preferences/log`, each entry with a remove button.

### 3.6 Schedule
`GET /schedule/week` entries have a `mode` field, so the other mode's entries can be dimmed rather than hidden. The
existing type-to-add bar keeps working as is.

---

## 4. The demo, step by step (for judges)

1. Web: **Load demo inbox** → Home shows the brief, "Your week", exam countdowns and the next class.
2. Switch to **Work** → the app turns forest green, Jobs moves up, and the to-do suggests prepping for the Wayfair
   interview and following up with HubSpot.
3. **Ask Sam** "Where is my ECE 122 class?" → "Marcus Hall, room 131, 1st floor", with a directions button.
4. **Map**: search `ILC S220` → the building, the door, floor 2's rooms and step-by-step directions. Switch on
   step-free and the route uses the elevator.
5. On a phone, the same thing in the mobile app (section 5).

**What to say about the floor plans:** the ILC's first floor is traced from the floor plan posted in the building.
Other buildings are laid out from the registrar's official room list until UMass Facilities shares real plans. A
request to Facilities is drafted in [`docs/floorplan-request.md`](floorplan-request.md). The app labels generated
floors as approximate.

---

## 5. Mobile app (`mobile/`)

An Expo (React Native) app: one codebase for iOS and Android. It uses the same backend.

**Tabs:**
- **Home:** greeting with Sam, the brief, the next class with a **Navigate** button, progress, and where all your
  classes are.
- **To do:** the Study/Work switch, suggested next steps (accept or dismiss) and tasks you can check off.
- **Map**: a plain campus map, your class buildings highlighted, room search, indoor floors, floor
  picker, route line, numbered steps, and a step-free switch.

**Files:**
- `App.tsx`: tabs and the sign-in gate
- `src/screens/`: `MapScreen`, `Home`, `Todo` and `SignIn`
- `src/api.ts`: backend URL and the bearer token, stored in the phone's secure storage
- `src/theme.ts`: maroon for study, forest for work
- `src/session.tsx`: signed-in user, mode, and the room the Map should open to

### Run it on your phone (easiest)
1. Install **Expo Go** from the App Store or Google Play.
2. Make the backend reachable from the phone. Start the web app and its ngrok tunnel (see "Sharing a live demo
   with ngrok" in the README); the app talks to the backend through the web app's `/api`.
3. In `mobile/`, create `.env` with:
   ```
   EXPO_PUBLIC_API_URL=https://<your-ngrok-domain>/api
   ```
4. Run `npx expo start` and scan the QR code with the camera (iOS) or Expo Go (Android).
5. Tap **Try the demo**.

### Run it on a simulator
- **iOS Simulator** (needs Xcode): `npx expo start`, then press `i`. It uses `http://localhost:8000` with no `.env`.
- **Android emulator:** press `a`. It uses `http://10.0.2.2:8000`.

### Test checklist
- [ ] **Try the demo** signs in and lands on Home.
- [ ] Map: tap a class chip (e.g. "ECE 122 · 131") → it zooms to Marcus Hall with the room and steps.
- [ ] Search `ILC S220` → floor 2 is shown with S220 highlighted. Switch floors with the picker; the route line shows
      on floor 1 (door to elevator) and floor 2.
- [ ] Turn on **Step-free** → the steps say "elevator", not "stairs".
- [ ] Search `MOR1 N375` and `LGRT 1234` (12th floor → it uses the elevator).
- [ ] Search a building name like `Morrill` → it shows the building and how to get in.
- [ ] Generated floors show "Approximate layout…"; ILC floor 1 doesn't.
- [ ] Locate button → asks for location once, then shows your position.
- [ ] Home: **Navigate** on the next class opens the Map with directions.
- [ ] To do: switch Study/Work (the colors change), accept "Prep for your Wayfair interview" (it gets added), and
      dismiss a suggestion (it stays gone after pull-to-refresh).
- [ ] Check off a task → it disappears.

**Known gaps:**
- Not yet run on a real device or simulator: it compiles cleanly for iOS and Android (`npx tsc --noEmit`,
  `npx expo export`), but this Mac has no Xcode.
- Google sign-in on mobile needs the backend's public URL to be the OAuth redirect.
- Building a standalone app (App Store or Play Store) needs an EAS build; not set up.

---

## 6. Data and where it comes from

| Data | Source | File |
|---|---|---|
| Classroom list (244 rooms) | University Registrar's public classroom list | `backend/seed/classrooms.json` (rebuild: `python -m app.registrar_rooms`) |
| Building outlines and doors | OpenStreetMap contributors (ODbL), credit required | `backend/seed/buildings.json` (rebuild: `python -m app.buildings_osm`) |
| ILC floor 1 | Traced from the posted fire-evacuation plan | `backend/seed/indoor/ilc_floor1_trace.json`; overlay check image: [`docs/ilc-floor1-trace.png`](ilc-floor1-trace.png) |
| Other floors | Generated from the room list (approximate) | computed in `backend/app/indoor.py` |
| Room codes → buildings | SPIRE, catalog and registrar abbreviations | `ALIASES` in `backend/app/buildings.py` |

Adding a real floor plan later: trace it the same way as `ilc_floor1_trace.json` (rooms, hallways, stairs, elevators,
exits in image pixels). `backend/app/indoor.py` fits it to the building outline automatically.

---

## 7. Ground rules for the repo
- Pull before you push: `git pull --rebase origin main`. Both of us push to `main`.
- Never commit `.env`, keys, tokens or `credentials.json`.
- Keep commit messages short and lowercase.
