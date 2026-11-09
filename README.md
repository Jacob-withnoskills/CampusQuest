# Campus Quest --- Project Guide, Run Instructions and Development Status

**Last updated:** 9 November 2026\
**Project:** Campus Quest --- QR Treasure Hunt Management System\
**Development environment:** Windows, PowerShell, Node.js, PostgreSQL
and Memurai

------------------------------------------------------------------------

## 1. Project overview

Campus Quest is a web application for running a team-based QR treasure
hunt at a college event. Teams use one smartphone to log in, discover
checkpoints, solve challenges, submit answers and earn points.
Organizers use an administrative interface to control rounds and monitor
game progress.

### Planned event configuration

  Item                 Planned configuration
  -------------------- -----------------------------
  Participants         Approximately 200
  Teams                Approximately 40
  Members per team     Approximately 5
  Devices              One smartphone per team
  Event duration       Approximately 2--3 hours
  Competition format   Knockout rounds
  Checkpoints          Configurable QR checkpoints
  Hosting              College local network

These are event planning targets, not proof that the application has
already passed a 200-person live load test.

## 2. Technology stack

  -----------------------------------------------------------------------
  Layer                   Technology              Purpose
  ----------------------- ----------------------- -----------------------
  Frontend                React, TypeScript       User interface and
                                                  application logic

  Frontend tooling        Vite                    Local development
                                                  server and production
                                                  build

  Styling                 Tailwind CSS 4, CSS     Layout and responsive
                                                  styling

  PWA                     Vite PWA plugin         Progressive Web App
                                                  configuration

  Backend                 Node.js, TypeScript,    API and game business
                          Fastify                 logic

  Real-time               Socket.IO               Live leaderboard and
                                                  round notifications

  Database                PostgreSQL 18           Persistent teams,
                                                  challenges, scans,
                                                  submissions and scores

  Cache                   Memurai                 Cache service for
                          (Redis-compatible)      development

  QR                      QR token validation and Checkpoint
                          QR-code generation      identification

  Version control         Git and GitHub          Source control and
                                                  collaboration
  -----------------------------------------------------------------------

PostgreSQL is the permanent source of truth. Scores, submissions and
qualification decisions must be validated and stored by the backend, not
calculated or trusted from the browser.

## 3. How to run Campus Quest on Windows

### 3.1 Prerequisites

Install and configure:

-   Node.js and npm.
-   PostgreSQL 18.
-   Memurai or the configured Redis-compatible service.
-   Git (optional, for source control).
-   A code editor such as Visual Studio Code.

The project folder used in the current development environment is:

``` text
C:\Users\Asus\Downloads\campus-quest-starter
```

The folder contains two separate applications:

``` text
campus-quest-starter/
├── backend/
└── frontend/
```

### 3.2 Start the database and cache services

Before starting the application:

1.  Start the PostgreSQL service.
2.  Start the Memurai service.
3.  Confirm that the database and cache are running.

The configured local service ports are:

  Service                                Port
  ------------------------------------ ------
  PostgreSQL                             5432
  Memurai / Redis-compatible service     6379
  Backend API                            4000
  Frontend development server            5174

The database must already exist and the project migrations must already
have been applied. Do not rerun the initial schema or migration scripts
on an already-migrated development database without first checking the
database state and taking a backup.

### 3.3 Configure the backend environment

Open the backend folder:

``` powershell
cd "$env:USERPROFILE\Downloads\campus-quest-starter\backend"
```

The backend uses a local `.env` file. It must contain the correct values
for the PostgreSQL connection, Redis-compatible service, frontend origin
and authentication secret.

The frontend origin currently configured for local development is:

``` text
http://localhost:5174
```

**Security:** Do not paste `.env` contents into chat, commit `.env` to
GitHub, or share database passwords, authentication secrets, team PINs,
bearer tokens or QR tokens. Keep secrets in local environment files and
provide a safe `.env.example` containing placeholders only.

Install dependencies if this is the first run or dependencies have
changed:

``` powershell
npm install
```

Check backend TypeScript:

``` powershell
npm run typecheck
```

Start the backend development server:

``` powershell
npm run dev
```

Keep this PowerShell window open while using the application.

### 3.4 Check backend health

Open a **second PowerShell window** and run:

``` powershell
Invoke-RestMethod http://localhost:4000/api/health
```

The expected healthy response reports:

-   Overall status: `ok`
-   Database: `ok`
-   Cache: `ok`

This confirms service connectivity. It does not mean that every game
feature or security requirement is complete.

### 3.5 Start the frontend

Open a **third PowerShell window**:

``` powershell
cd "$env:USERPROFILE\Downloads\campus-quest-starter\frontend"
```

Install dependencies if needed:

``` powershell
npm install
```

Start the Vite development server:

``` powershell
npm run dev
```

Open the URL printed by Vite. The current development URL is:

``` text
http://localhost:5174
```

Keep the frontend terminal open too.

### 3.6 Running checklist

  Check                Expected result
  -------------------- -----------------------------------------------
  PostgreSQL service   Running
  Memurai service      Running
  Backend terminal     Development server running on port 4000
  Health endpoint      Database and cache checks report `ok`
  Frontend terminal    Vite development server running
  Browser              Campus Quest opens at `http://localhost:5174`

To stop a development server, focus its terminal and press `Ctrl + C`.

### 3.7 Important: local development versus college Wi-Fi

`localhost` works only on the computer running the application. For
students to access the application over college Wi-Fi, the frontend and
backend must be configured for the host computer's LAN address, the
backend CORS origin must be updated, and the required firewall rules
must be configured.

Do not simply expose the development server to the public internet.
Before a live event, use a tested deployment configuration, restrict
database access, and configure HTTPS where required. Browser camera
access and PWA service-worker features may require a secure context such
as HTTPS.

------------------------------------------------------------------------

## 4. Functionality currently implemented

The following status reflects the development work completed so far. A
working API does not automatically mean that its corresponding screen is
fully connected to the API.

### 4.1 Backend and infrastructure

  -----------------------------------------------------------------------
  Feature                 Current status          Notes
  ----------------------- ----------------------- -----------------------
  Node.js / Fastify       Implemented             Backend starts on port
  backend                                         4000

  PostgreSQL connection   Implemented and tested  Database health check
                                                  succeeded

  Memurai connection      Implemented and tested  Cache health check
                                                  succeeded

  Health API              Working                 `/api/health`

  Database schema         Applied                 Tables for teams,
                                                  rounds, challenges, QR,
                                                  submissions, scores and
                                                  related records exist

  Team registration API   Implemented and tested  Creates team and
                                                  participant records

  Team login API          Implemented and tested  Returns a signed team
                                                  token

  Team authentication     Implemented             Protects team routes
  middleware                                      that use the middleware

  Round listing API       Implemented             Returns configured
                                                  rounds and their
                                                  statuses

  Round activation        Implemented and tested  Enforces previous-round
                                                  completion and one
                                                  active round

  Round completion and    Implemented and tested  Supports percentage or
  qualification                                   exact-number
                                                  qualification

  Challenge management    Implemented             Create, update,
  APIs                                            activate/deactivate and
                                                  delete where allowed

  QR checkpoint creation  Implemented and tested  Stores a hash of the QR
                                                  token

  QR scan validation API  Implemented and tested  Checks team and
                                                  checkpoint eligibility;
                                                  duplicate scan is
                                                  prevented

  Answer submission API   Implemented and tested  Server-side answer
                                                  checking and score
                                                  recording

  Leaderboard API         Implemented and tested  Returns rankings and
                                                  scores by round

  Socket.IO leaderboard   Implemented and tested  Frontend can refresh
  updates                                         the leaderboard when an
                                                  update is broadcast

  Round status            Partially implemented   Activation notification
  notifications                                   is in place; completion
                                                  notification and
                                                  end-to-end verification
                                                  remain

  Admin authentication    Not completed           Management routes must
                                                  not be treated as
                                                  secured
  -----------------------------------------------------------------------

### 4.2 Frontend

  -----------------------------------------------------------------------
  Feature                 Current status          Notes
  ----------------------- ----------------------- -----------------------
  React + TypeScript +    Implemented             Development app runs on
  Vite setup                                      port 5174

  Initial landing /       Implemented             UI prototype exists
  dashboard prototype                             

  Round control display   Implemented as a        Displays round status;
                          prototype               backend status loading
                                                  is being integrated

  Team registration       Prototype implemented   Verify full API
  screen                                          integration before
                                                  event

  Team login screen       Prototype implemented   Do not use demo
                                                  credentials for a live
                                                  event

  Team dashboard          Basic prototype         Further API integration
                                                  required

  Leaderboard display     Implemented and         Live score refresh was
                          connected               tested

  Round status refresh    Integration added       Verify after build and
                                                  backend
                                                  completion-event
                                                  broadcast

  Admin dashboard         Prototype               Some controls still use
                                                  local frontend state

  Challenge management UI Not fully connected     Backend APIs exist;
                                                  connect the UI

  QR camera scanning      Not completed in        Backend QR scan API
                          frontend                exists; browser camera
                                                  scanner still needs
                                                  integration

  PWA/mobile installation Not event-validated     Test installation,
                                                  camera and
                                                  offline/connection
                                                  behavior on target
                                                  devices
  -----------------------------------------------------------------------

### 4.3 Current round configuration

The current application has **three configured rounds**, not the four
rounds mentioned in the original planning draft.

  Round   Name                Current development status
  ------- ------------------- ----------------------------
  1       Puzzle Hunt         COMPLETED
  2       Mystery Challenge   ACTIVE
  3       Ultimate QR Quest   LOCKED

Round 2 has a test challenge and has been used to verify a 50-point
leaderboard update. Keep this test round active unless intentionally
resetting or progressing the test data.

------------------------------------------------------------------------

## 5. How the game is intended to work

1.  The organizer prepares teams, rounds, challenges and QR checkpoints.
2.  Each team registers and uses its team credentials to log in.
3.  The team opens its dashboard on one smartphone.
4.  The team follows the clue or location hint.
5.  The team scans the QR checkpoint.
6.  The backend validates the QR token and whether the team is allowed
    to access it.
7.  The challenge is presented to the team.
8.  The team submits its answer.
9.  The backend checks the answer and records the result and points.
10. The leaderboard is refreshed through the real-time update mechanism.
11. When a round is completed, the backend calculates qualification
    according to the configured rule.
12. Qualified teams proceed to the next round when the organizer
    activates it.

The exact event rules---attempt limits, penalties, time limits,
tie-breakers and checkpoint order---must be finalized and implemented
before the live event.

------------------------------------------------------------------------

## 6. Main application modules

### Student-facing modules

1.  **Landing page:** Event introduction, instructions and entry points.
2.  **Team registration:** Team name and participant details.
3.  **Team login:** Team code and PIN-based login.
4.  **Team dashboard:** Team details, current round and progress.
5.  **QR checkpoint:** Scan a physical checkpoint and validate it with
    the server.
6.  **Challenge page:** Display clues and questions.
7.  **Answer submission:** Submit an answer and receive validation
    feedback.
8.  **Leaderboard:** View team scores and rankings.
9.  **Round results:** Show qualification and progression information.
10. **Final results:** Display winners and final rankings.

### Organizer / admin modules

1.  **Admin login and authorization.**
2.  **Team management:** View, search, activate or deactivate teams.
3.  **Round management:** Configure, activate and complete rounds.
4.  **Challenge management:** Create, edit, activate and deactivate
    challenges.
5.  **Checkpoint management:** Create checkpoints and generate QR codes.
6.  **Qualification management:** Configure percentage or exact-number
    qualification.
7.  **Submission monitoring:** Review submitted answers and results.
8.  **Score and leaderboard monitoring.**
9.  **Announcements and event controls.**
10. **Results export and event reporting.**

Several of these are planned modules or backend capabilities; they
should not be described as fully available in the frontend until their
screens and API connections have been completed and tested.

------------------------------------------------------------------------

## 7. What still needs to be added

### Priority 1 --- Finish the current development workflow

-   [ ] Add and verify `rounds:update` broadcast after a round is
    completed.
-   [ ] Verify that the dashboard refreshes after both round activation
    and completion.
-   [ ] Connect the round control buttons to backend APIs instead of
    only changing local React state.
-   [ ] Connect challenge creation, editing and activation screens to
    the backend.
-   [ ] Connect team dashboard data to authenticated backend APIs.
-   [ ] Connect the QR scan flow to the actual QR scan API.
-   [ ] Replace demo-only answer submission behavior with the backend
    submission API wherever it remains in the frontend.
-   [ ] Show useful loading, success and error messages.

### Priority 2 --- Admin authentication and authorization

-   [ ] Implement secure admin login.
-   [ ] Protect all admin management endpoints.
-   [ ] Enforce admin authorization on round, challenge and QR
    management routes.
-   [ ] Record important admin actions in audit logs.
-   [ ] Remove hardcoded demo admin credentials.
-   [ ] Ensure a team account cannot access another team's private
    information.

**Important:** Management endpoints currently lack complete admin
authorization. Keep the system local and for development/testing only.
Do not deploy it for public or live event use until this is fixed.

### Priority 3 --- Complete student experience

-   [ ] Finish team registration and login UI integration.
-   [ ] Enforce the intended one-device-per-team policy if required by
    event rules.
-   [ ] Complete team dashboard and progress display.
-   [ ] Integrate browser camera-based QR scanning.
-   [ ] Add invalid QR, already-scanned QR and ineligible-team messages.
-   [ ] Complete challenge and answer screens.
-   [ ] Display current score, rank and qualification status.
-   [ ] Add event instructions, rules and support information.

### Priority 4 --- Game rules and event controls

-   [ ] Confirm whether the event will use three or four rounds.
-   [ ] Define checkpoint order and whether checkpoints are
    team-specific.
-   [ ] Define answer attempt limits.
-   [ ] Define penalties, bonuses and time limits.
-   [ ] Define tie-breaking rules.
-   [ ] Add event start, pause and stop controls.
-   [ ] Add countdown and round timer behavior.
-   [ ] Verify qualification behavior for ties and teams with no score.
-   [ ] Add final winner calculation and results export.

### Priority 5 --- Security and reliability

-   [ ] Add API rate limiting and request validation.
-   [ ] Review token expiry, refresh and revocation behavior.
-   [ ] Secure admin sessions and credentials.
-   [ ] Restrict CORS to the actual application origin.
-   [ ] Protect Socket.IO subscriptions and any team-specific
    information.
-   [ ] Use database transactions for all score-changing operations.
-   [ ] Test duplicate requests and idempotency behavior.
-   [ ] Protect QR tokens and avoid exposing them in logs or source
    control.
-   [ ] Configure secure local-network hosting and HTTPS where needed.
-   [ ] Rotate any development credentials that may have been exposed.

### Priority 6 --- Testing and deployment

-   [ ] Test all three rounds end to end.
-   [ ] Test registration and login with multiple teams.
-   [ ] Test valid and invalid QR codes.
-   [ ] Test duplicate QR scans and duplicate answer submissions.
-   [ ] Test simultaneous submissions and score consistency.
-   [ ] Test Socket.IO reconnect behavior.
-   [ ] Test server restart and recovery.
-   [ ] Test Android and iOS browsers and camera permissions.
-   [ ] Test on the actual college Wi-Fi network.
-   [ ] Load-test the target of approximately 40 teams / 200
    participants.
-   [ ] Back up the database and rehearse recovery.
-   [ ] Conduct a complete mock event before launch.

------------------------------------------------------------------------

## 8. Security and data integrity rules

1.  PostgreSQL is the permanent source of truth.
2.  The browser must never be trusted to award points or decide
    qualification.
3.  QR tokens must be validated by the backend.
4.  Answers must not be stored in QR codes.
5.  Duplicate scans and submissions must not award duplicate points.
6.  Score updates and submissions must use appropriate database
    transactions and idempotency protection.
7.  Admin routes must require authenticated administrator authorization.
8.  Team routes must verify the authenticated team.
9.  Secrets must not be committed to GitHub.
10. The application must be tested under realistic concurrent usage
    before the event.

------------------------------------------------------------------------

## 9. Local network deployment overview

During development, the frontend is accessed at `http://localhost:5174`
and the backend at `http://localhost:4000`.

For a college event, students need to access the frontend through the
host computer's LAN IP address, for example:

``` text
http://192.168.1.20:5174
```

This is only an example. Find the actual host computer IP address on the
event network. The frontend API and Socket.IO URLs, backend CORS
configuration, firewall rules and hosting setup must all be changed and
tested for that network.

Do not expose PostgreSQL or Memurai directly to student devices. Only
expose the application services that students need. Use a
production-ready server/reverse-proxy configuration rather than relying
on the Vite development server for a live event.

------------------------------------------------------------------------

## 10. Git and GitHub

From the project root:

``` powershell
cd "$env:USERPROFILE\Downloads\campus-quest-starter"
git status
git remote -v
git branch --show-current
```

Before committing, confirm that `.gitignore` excludes secrets and
generated dependencies/build output. At minimum, review entries such as:

``` gitignore
.env
.env.*
!.env.example
node_modules/
dist/
```

Review the files before staging:

``` powershell
git add .
git status
```

Only commit if no passwords, tokens, database dumps or other sensitive
files are staged:

``` powershell
git commit -m "Update Campus Quest functionality and documentation"
git push
```

If the branch has no upstream configured, use the upstream command for
the actual branch name, for example:

``` powershell
git push -u origin main
```

Do not assume the branch is named `main`; check it with
`git branch --show-current`.

------------------------------------------------------------------------

## 11. Final status

Campus Quest has a working local development foundation: PostgreSQL and
cache connectivity, a Fastify API, React frontend, team
registration/login APIs, round and challenge management APIs, QR token
validation, answer submission, qualification logic and a live
leaderboard test.

It is **not yet ready for a live college event**. The main remaining
work is to complete frontend-to-backend integration, camera-based QR
scanning, admin authentication and authorization, security hardening,
full end-to-end testing and local-network deployment.

The next recommended development sequence is:

1.  Finish round status real-time updates.
2.  Connect round and challenge management UI to the backend.
3.  Connect student dashboard and answer submission UI.
4.  Integrate the camera QR scanner.
5.  Implement admin authentication and authorization.
6.  Complete security, load testing and event-day deployment rehearsal.
