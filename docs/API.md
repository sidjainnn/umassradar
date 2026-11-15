# UMass Radar API: modes, personalization, the to-do agent and the room finder

This covers the endpoints added for Study/Work mode, jobs, applications, suggestions and finding rooms.
The frontend calls them through `/api/*`, which proxies to the backend. All of them need a signed-in
session (the demo account works too). Times are ISO 8601 with a time zone offset.

## Modes

- `GET /me` → includes `"mode": "study" | "work"` and `"needs_onboarding": true|false`.
- `PUT /settings/mode` `{"mode": "work"}` → `{"mode": "work"}`.
- Study mode covers classes, coursework, schedule and to-do. Work mode covers jobs, internships, applications and housing.
- Every item now has `"mode": "study" | "work" | "both"`. "both" (e.g. a Dean of Students notice) shows in both modes.
- `GET /items?mode=study|work` filters to that mode. Leave `mode` off to get everything.
- `GET /brief` is written from the current mode's items.
- `GET /schedule/week` entries carry `mode`, so the other mode can be dimmed rather than hidden.

## Onboarding and preferences

`GET /preferences/questions` returns the onboarding form as data. Render it in order:

```json
[
  {"id": "interests", "type": "tags", "label": "What kinds of work interest you?", "suggestions": ["Software engineering", "Data science", "..."], "max": 20},
  {"id": "job_types", "type": "multi", "label": "What are you looking for?", "options": [{"value": "on_campus", "label": "On-campus job"}, {"value": "internship", "label": "Internship"}]},
  {"id": "hours_per_week", "type": "number", "min": 0, "max": 40},
  {"id": "min_pay", "type": "number", "unit": "$/hour"},
  {"id": "places", "type": "multi", "options": [{"value": "on_campus"}, {"value": "amherst_area"}, {"value": "remote"}, {"value": "anywhere"}]},
  {"id": "work_study", "type": "boolean"},
  {"id": "grad_term", "type": "text"},
  {"id": "skills", "type": "tags"},
  {"id": "avoid", "type": "tags"},
  {"id": "learn_from_email", "type": "boolean", "default": true}
]
```

`types`: `tags` (chips plus free text), `multi` (pick several), `number`, `boolean`, `text`.

`PUT /preferences` with the answers:

```json
{"interests": ["software engineering", "machine learning"], "job_types": ["internship", "research"],
 "hours_per_week": 12, "min_pay": null, "places": ["anywhere"], "work_study": false,
 "grad_term": "Spring 2028", "skills": ["Python"], "avoid": ["sales"], "learn_from_email": true}
```

→ `{"prefs": {...}, "top_interests": ["software engineering", "machine learning", ...]}`. The first save sets
`onboarded_at`. Show onboarding when `/me` has `needs_onboarding: true`. It's never shown in demo mode.

`GET /preferences` → `{"prefs": {...}, "onboarded_at": "...", "needs_onboarding": false, "top_interests": [...]}`.

### What it learned (the log)

`GET /preferences/log`: newest first, so students can see and undo what shaped their matches.

```json
[{"id": "9f…", "kind": "hidden", "label": "Hid", "title": "Kronos is hiring: Software Engineering Intern", "source": "you", "at": "…", "terms": ["kronos", "software engineering"]},
 {"id": "1c…", "kind": "interview", "label": "Interview", "title": "Data Science Intern at Wayfair", "source": "email", "at": "…"}]
```

`DELETE /preferences/log/{id}` forgets one entry, and the matches update.

## Applications (found in email)

While syncing Gmail, confirmations from Workday, Greenhouse, Lever, Handshake and similar senders are
recognized as applied, interview, offer or rejected. Only company, role and stage are kept. Students
turn this off with `learn_from_email: false`.

`GET /applications`:

```json
[{"id": "…", "company": "Wayfair", "role": "Data Science Intern", "stage": "interview", "first_at": "…", "last_at": "…",
  "days_quiet": 1, "history": [{"stage": "interview", "at": "…"}]}]
```

`stage`: `applied` → `interview` → `offer`, or `rejected`.
- `POST /applications` `{"company": "Kronos", "role": "SWE Intern", "stage": "applied"}` adds one by hand.
- `DELETE /applications/{id}` removes one.

## Jobs for you

`GET /jobs?sort=match|deadline&include_hidden=false`

```json
{"jobs": [{"id": "34981a…", "title": "Kronos is hiring: Software Engineering Intern (Summer 2027)", "match": 82,
           "reasons": ["matches “software engineering” from your interests", "internship, like you asked"],
           "types": ["internship"], "place": null, "saved": false, "hidden": false,
           "due_at": "…", "sender": "Handshake", "evidence": "…", "url": "…"}],
 "filtered_out": [{"id": "…", "title": "Now hiring: Resident Assistants…", "reason": "not a kind of job you're looking for"}],
 "hidden": 1, "personalized": true, "needs_onboarding": false}
```

- `match` is 0–100. Show `reasons` under each job: they say why it ranks where it does.
- `filtered_out` lists what the student's preferences hid. A collapsed "Hidden by your preferences (n)" works well.

`POST /jobs/{id}/feedback` `{"action": "saved" | "hidden" | "opened" | "applied" | "not_interested" | "unsave" | "unhide", "reason": "optional"}`:
- the ranking updates immediately
- `applied` also adds the job to `/applications`
- send `opened` when the student opens the job link

## To-do agent

`GET /todo?mode=study|work` (defaults to the student's mode):

```json
{"mode": "work",
 "tasks": [ /* items for this mode, most urgent first, same shape as /items */ ],
 "suggestions": [
   {"id": "interview_prep:u1:wayfair:data-science-intern", "kind": "interview_prep",
    "title": "Prep for your Wayfair interview",
    "why": "Wayfair moved you to interviews for Data Science Intern. An hour to review the role and practice your stories helps.",
    "due": "2026-11-16T09:00:00-05:00", "item_ids": [],
    "action": {"type": "block_time", "title": "Prep for your Wayfair interview", "starts_at": "…", "ends_at": "…", "label": "Block Mon Nov 16, 9 AM"}},
   {"id": "follow_up:…", "kind": "follow_up", "title": "Follow up with HubSpot", "why": "No reply about Product Design Intern in 12 days…",
    "action": {"type": "copy_text", "label": "Copy a follow-up note", "text": "Hi HubSpot team, I applied for…"}}
 ]}
```

Suggestion kinds:
- **Work mode:** `follow_up`, `interview_prep`, `apply`, `reply`, `housing`
- **Study mode:** `office_hours`, `start_work`, `study_block`, `reply`

Action types:
- `block_time` → show `label` as the button
- `copy_text` → copy `text` to the clipboard
- `open_job` → open `/jobs` at `item_id`
- `open_item` → open the item

`POST /todo/suggestions/{id}` `{"decision": "accept" | "dismiss"}`:
- accepting a `block_time` suggestion adds the event to the schedule and returns `event_ids`
- dismissed suggestions don't come back

## Finding a room

Building outlines and doors come from OpenStreetMap (attribution required: "© OpenStreetMap contributors").
UMass doesn't publish classroom floor plans, so the floor comes from the room number unless students confirm it.

`GET /rooms/locate?q=MOR1 N375&accessible=false` accepts SPIRE or catalog codes ("MOR1N375", "LGRT 0143",
"ILCS120", "CSL E302", "Mach W-26") or names ("Morrill 1 N375", "Hasbrouck 20").

```json
{"building": {"id": "w123", "name": "Morrill I", "center": [42.3912, -72.5243], "outline": [[42.39, -72.52], "…"], "levels": null},
 "room": "N375",
 "floor": {"room": "N375", "floor": 3, "wing": "north", "label": "Probably on the third floor, north wing"},
 "confirmed": null,
 "entrances": [{"id": "n4849680873", "at": [42.3910, -72.5238], "level": null, "side": "east", "wheelchair": null}],
 "steps": ["Use the east entrance of Morrill I.", "That's the closest mapped door; once inside, head toward the north side.",
           "Room N375 should be on floor 3; take the stairs or elevator.", "…"],
 "classes_here": [{"course": "COMPSCI 240", "section": "U1 LEC03", "days": [1, 3], "start": "16:00", "end": "17:15", "term": "Fall 2026"}],
 "tips": [], "source": "Building outlines and doors from OpenStreetMap. …"}
```

- Draw `outline` as the building shape, mark `entrances[0]` as the door to use, and list `steps`.
- `404` means the building wasn't recognized; show the message from `detail`.

`GET /rooms/route?frm=Hasbrck134&to=MOR1 N375` gives walking between back-to-back classes:

```json
{"from": "Hasbrouck Laboratory", "to": "Morrill I", "meters": 192, "minutes": 2, "exit": {"id": "…", "at": […]}, "enter": {"id": "…", "at": […], "side": "east"}, "same_building": false}
```

`POST /rooms/confirm?q=MOR1 N375` `{"floor": 3, "entrance_id": "n4849680873", "landmark": "past the elevators on the left"}`:
- the student found the room
- once 2 students agree on a floor, `/rooms/locate` uses it and says "confirmed by N students"
- demo users get `403`

`GET /rooms/buildings` returns every building with outline and doors, for drawing the campus layer.

Student tips (`GET /rooms/{building}`, `POST /rooms/tips`, etc.) still work as before. Use the `building.id` from
`/rooms/locate` as the tip's `building` from now on.

## Indoor maps and directions to a classroom

Every general-assignment classroom on the University Registrar's list is covered: 244 rooms in 44 buildings.
- **ILC floor 1** is traced from the floor plan posted in the building (`"source": "traced"`).
- **Other floors** are laid out from the official room list and the building outline (`"source": "generated"`).
  Rooms are on the right floor and side and in number order, but their exact positions are approximate.
  Show a small "approximate layout" note on generated floors.

`GET /indoor/buildings` lists buildings with indoor maps: `[{"building", "id", "center", "classrooms", "floors": [1, 2, 3], "traced": true}]`.

`GET /indoor/{building or room}` (e.g. `/indoor/ILC`, `/indoor/ILC S220`) returns every floor:

```json
{"building": "Integrative Learning Center", "center": [42.3911, -72.5259], "ground_floor": 1,
 "entrances": [{"id": "t0", "level": 1, "at": [42.391, -72.526]}],
 "floors": [{"level": 1, "source": "traced",
             "rooms": [{"code": "ILC N151", "room": "N151", "capacity": 340, "features": ["ECHO", "FL", "AUD"], "polygon": [[lat, lon], "…"], "door": [lat, lon]}],
             "corridors": [[[lat, lon], "…"]], "stairs": [[lat, lon]], "elevators": [[lat, lon]],
             "other": [{"label": "Lobby", "polygon": ["…"]}]}]}
```

`GET /indoor/route?to=ILC S220&accessible=false&entrance=<id>` gives directions from a door to the room:

```json
{"building": "Integrative Learning Center", "room": "S220", "code": "ILC S220", "floor": 2, "source": "generated",
 "minutes": 1, "meters": 61, "entrance": {"id": "t1", "at": [lat, lon], "level": 1},
 "legs": [{"level": 1, "line": [[lat, lon], "…"]}, {"level": 2, "line": ["…"]}],
 "steps": ["Enter Integrative Learning Center by the east doors (floor 1).", "Take the elevator up to floor 2.",
           "Follow the hallway; S220 is on your left."],
 "room_polygon": [[lat, lon], "…"]}
```

- Draw the selected floor's `rooms` (label each with `room`), highlight `room_polygon`, and draw the `legs` line for that floor.
- Switch floors with a floor picker.
- `accessible=true` routes through elevators only. Routes that climb more than three floors use the elevator anyway.

## Where are my classes

`GET /schedule/where` returns every class with where it meets, today's first:

```json
{"term": "Fall 2026", "classes": [
  {"course": "STAT 315", "component": "LEC", "day_names": ["Mon", "Wed", "Fri"], "start": "11:15", "end": "12:05", "today": true,
   "location": {"found": true, "raw": "Hasbrouck 20", "building": "Hasbrouck Laboratory", "room": "20", "floor": 0,
                "floor_label": "lower level", "side": null, "summary": "Hasbrouck Laboratory, room 20, lower level",
                "door": {"side": "east"}, "steps": ["…"], "indoor": true, "navigate": {"to": "Hasbrouck 20", "label": "Take me to 20"}},
   "walk_from_previous": {"from": "COMPSCI 311", "day": "Fri", "minutes": 7, "gap_minutes": 15, "tight": false}}]}
```

- `location.found: false` comes with a `reason` ("online or to be announced", "unknown building").
- `navigate.to` goes straight into `/indoor/route?to=`.

`GET /courses/{code}` now includes `your_section_where`, the same location fields for the sections you're in, so the
course page can say "Lecture: ILC S120, 1st floor, south side".

`POST /ask` now also returns `"navigate": [{"to": "Marcus 131", "course": "ECE 122", "label": "Take me to ECE 122", "summary": "Marcus Hall, room 131, 1st floor"}]`
when Sam answers a "where is my class" question. Show these as "Take me there" buttons.

## Mobile sign-in (used by `mobile/`)

- Every endpoint also accepts `Authorization: Bearer <token>` instead of the cookie.
- `POST /auth/mobile/demo` → `{"token": "…"}`: a demo account.
- `GET /auth/mobile/start` runs Google sign-in in the phone's browser and ends at `umassradar://auth?code=…`.
  `POST /auth/mobile/exchange {"code": "…"}` then returns `{"token": "…"}`. Codes work once, for 5 minutes.

## Requests for the web frontend (Shaurya)

- **Map:** replace the emoji pins with plain dots and one accent color (maroon in study mode, forest in work mode).
  Simpler and calmer is the goal, and it should match the mobile app.
- **Map and Courses:** use `/schedule/where` and `/indoor/route` for "where is my class" and directions. The web map can
  draw the same indoor floors from `/indoor/{building}`.
- **Ask Sam:** show `navigate` buttons that open the map with directions.
- **Credits:** show "© OpenStreetMap contributors" on any map.
