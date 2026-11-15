# Devpost submission: UMass Radar

## Project name
UMass Radar

## Elevator pitch (tagline, max 200 characters)
Your UMass life on one radar: deadlines pulled from your inbox, a to-do that plans for you in study or work mode, jobs ranked for you, and turn-by-turn directions to any classroom.

## Inspiration
Every UMass student gets dozens of emails a day: Canvas, Gradescope, Piazza, professors, Handshake, Res Life. The one deadline that matters is buried in there. Freshmen also get lost in the same way every semester: Google Maps gets you to Morrill, but not to N375. We wanted one place that reads the noise for you, tells you what to do next, and walks you to the right room.

## What it does
- **Reads your UMass email, Canvas and syllabi** and turns them into deadlines, appointments, replies you owe, jobs and housing dates, each linked to the sentence it came from.
- **Study and Work modes.** Study shows classes, schedule and coursework. Work shows jobs, internships, applications and housing, with its own look.
- **An agentic to-do.** It suggests next steps and the reason for each: a free 90 minutes to start Lab 6 before it's due, office hours you can actually make, a study block before a quiz, prep time before an interview, and a follow-up note when an application has been quiet for 12 days. Accept one and it lands on your calendar.
- **Personalized jobs.** You answer a few questions when you sign in. After that it learns from the application confirmations, interviews and rejections in your inbox, plus what you save or hide. Every job gets a match score and plain reasons, and a log shows everything it learned so you can undo any of it.
- **Find any classroom.** Search "ILC S220", or tap one of your classes. You see the building, the door to use, the floor plan, the floor and turn-by-turn steps, with a step-free route that uses elevators only. It covers all 244 general-purpose classrooms on the registrar's list.
- **Ask Sam,** our minuteman mascot, anything: "What's due this week?", "Where is my ECE 122 class?" (answer: Marcus Hall, room 131, 1st floor, with a button that opens directions), "Do I need to buy the textbook?"
- **Also included:** a schedule you can type into ("coffee with Priya tue 3pm at Roots"), textbooks pulled from syllabi, a UMass-only housing board, weekly streaks and exam countdowns.
- **A mobile app for iOS and Android,** built around the map.

## How we built it
- **Backend:** FastAPI and MongoDB. Gmail is read-only through the Gmail API; message bodies are processed in memory and never stored, and Google tokens are encrypted.
- **Gemini:** extracts deadlines and applications, writes the morning brief, and powers Ask Sam. A smaller model and fallbacks keep responses fast.
- **Rules first:** Canvas, Gradescope, Piazza and Handshake mail goes through rule-based parsers, and Gemini only reads what's left.
- **Room data:** the registrar's public classroom list (244 rooms), building outlines and doors from OpenStreetMap, and the ILC's first floor traced from the evacuation plan posted inside the building. Other floors are laid out from the official room list and marked as approximate. Routes use a hallway graph with stairs and elevators.
- **Web app:** Next.js and React with Tailwind. **Mobile app:** Expo and React Native, sharing the same API.
- **178 backend tests.**

## Challenges we ran into
- UMass doesn't publish classroom floor plans. We combined the registrar's room list, OpenStreetMap doors and a floor plan photographed in the ILC, and we're upfront about which floors are traced and which are estimated.
- SPIRE has no student API, and every building is abbreviated three different ways (MOR1, Morr1, Morrill I). We mapped all of them.
- Gemini rate limits and overloads during a hackathon: we added caching, fallback models and timeouts.
- Keeping the agent helpful rather than noisy: every suggestion has a reason, and dismissing one keeps it gone.

## Accomplishments that we're proud of
- Every general classroom on campus is searchable with directions, including step-free routes.
- The to-do actually plans around your real free time.
- Job matching you can inspect and undo, learned from your own applications.
- Privacy by design: read-only Gmail, no email bodies stored, and you can delete everything.

## What we learned
How much of a student's week is hidden in email, and how much a small, well-placed suggestion beats another list. We also learned a lot about indoor wayfinding without official data.

## What's next for UMass Radar
- Real floor plans from UMass Facilities (request drafted) and students confirming room locations.
- Recognizing a door sign with the phone camera ("you're at N362, N375 is 6 doors ahead").
- Push notifications on mobile.
- A public launch at onemass.us.

## Built with
python, fastapi, mongodb, gemini, gmail-api, google-oauth, next.js, react, typescript, tailwindcss, expo, react-native, openstreetmap, leaflet, cloudflare, ngrok

## Try it out links
- https://github.com/sidjainnn/umassradar
- https://unhidden-unstitch-clothes.ngrok-free.dev (click "Try the demo"; no account needed)
- https://www.onemass.us (once the domain is live)

## Tracks to select
Best UMass Hack, Most Impactful AI Hack, Best Use of Gemini API, Best Use of MongoDB Atlas (only if the database is moved to Atlas), Best Accessibility Hack (step-free routing), Best UI/UX, Best Domain Name from GoDaddy Registry (onemass.us)
