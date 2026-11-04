# Campus Quest — QR Treasure Hunt Management System

## 1. Project Overview

Campus Quest is a local-network-based QR treasure hunt web application designed for college events.

The application allows students to participate in teams using one smartphone per team. Teams register, log in, scan QR checkpoints, solve clues, submit answers, earn points and compete through multiple knockout rounds.

The system also provides an administrative dashboard through which event organizers can manage teams, checkpoints, clues, scores, rounds and event progress.

### Planned Event Configuration

| Parameter           | Configuration            |
| ------------------- | ------------------------ |
| Total participants  | Approximately 200        |
| Total teams         | 40                       |
| Members per team    | 5                        |
| Devices per team    | 1 smartphone             |
| Event duration      | 2–3 hours                |
| Competition format  | 4 knockout levels        |
| QR checkpoints      | Configurable             |
| Hosting             | Local college network    |
| Internet dependency | Designed to work locally |

**Important:** These are the planned event requirements. The complete functionality has not yet been implemented.

---

## 2. Technology Stack

Campus Quest uses a modern full-stack architecture consisting of frontend, backend, database, caching and real-time communication technologies.

### 2.1 Frontend Technologies

| Technology / Language | Purpose                     | Why We Use It                                                                             |
| --------------------- | --------------------------- | ----------------------------------------------------------------------------------------- |
| HTML5                 | Webpage structure           | Defines the structure of pages, forms and application elements.                           |
| CSS3                  | Styling and layouts         | Creates responsive layouts, animations, colors and visual components.                     |
| JavaScript            | Programming language        | Provides browser-side logic and interactive functionality.                                |
| TypeScript            | Frontend programming        | Adds static typing, reduces errors and makes large React applications easier to maintain. |
| React                 | Frontend library            | Builds reusable components and interactive interfaces.                                    |
| Vite                  | Development and build tool  | Provides fast development startup, hot reloading and optimized production builds.         |
| Tailwind CSS 4        | CSS framework               | Provides utility classes for consistent and responsive styling.                           |
| PWA Plugin            | Progressive Web App support | Helps configure installable web application functionality and service-worker support.     |

**Why React and TypeScript?**

The application contains multiple screens, including registration, team dashboards, QR scanning, challenges, leaderboards and administration.

React allows us to create reusable components, while TypeScript helps maintain reliable data structures and application logic.

### 2.2 Backend Technologies

| Technology / Language | Purpose                     | Why We Use It                                                                                      |
| --------------------- | --------------------------- | -------------------------------------------------------------------------------------------------- |
| Node.js               | JavaScript runtime          | Executes JavaScript and TypeScript backend applications outside the browser.                       |
| TypeScript            | Backend programming         | Provides type safety for APIs, database operations and business logic.                             |
| Fastify               | Backend framework           | Provides a lightweight, high-performance framework for REST APIs.                                  |
| Socket.IO             | Real-time communication     | Sends live leaderboard updates, event announcements and game-state changes.                        |
| REST API              | Client-server communication | Allows the frontend to request registration, login, checkpoints, submissions and other operations. |

**Why Node.js and Fastify?**

Node.js allows the frontend and backend to share JavaScript/TypeScript concepts and data structures.

Fastify provides an organized way to implement API endpoints and validate incoming requests.

Socket.IO will support real-time updates without requiring students to repeatedly refresh their pages.

### 2.3 Database Technologies

| Technology / Language | Purpose                 | Why We Use It                                                                              |
| --------------------- | ----------------------- | ------------------------------------------------------------------------------------------ |
| PostgreSQL            | Relational database     | Permanently stores teams, members, checkpoints, submissions, scores and event information. |
| SQL                   | Database query language | Creates tables, retrieves records, updates information and manages relationships.          |
| Database constraints  | Data integrity          | Prevent duplicate registrations, invalid references and duplicate score awards.            |

**Why PostgreSQL?**

PostgreSQL is the permanent source of truth for the event.

It provides:
- Relational data management.
- Primary and foreign keys.
- Transactions.
- Unique constraints.
- Reliable score and submission storage.
- Consistent data during simultaneous requests.

### 2.4 Cache Technologies

| Technology             | Purpose                              | Why We Use It                                                        |
| ---------------------- | ------------------------------------ | -------------------------------------------------------------------- |
| Redis-compatible cache | Temporary data storage               | Stores frequently accessed information and supports fast operations. |
| Memurai                | Windows-compatible Redis alternative | Allows Redis-compatible caching during Windows development.          |

**Why Memurai?**

Memurai provides a Redis-compatible service for Windows.

It can be used for caching, temporary game-state information and other performance-related operations.

PostgreSQL remains the permanent source of truth. Cache data must never be the only record of a score or submission.

The licensing and connection limits of the selected Memurai edition must be checked before the event.

### 2.5 Development and Deployment Tools

| Tool                    | Purpose                                  |
| ----------------------- | ---------------------------------------- |
| Visual Studio Code      | Source-code editing                      |
| Windows PowerShell      | Running development commands             |
| npm                     | Installing and managing dependencies     |
| Git                     | Version control                          |
| GitHub                  | Source-code repository and collaboration |
| pgAdmin                 | PostgreSQL database administration       |
| Browser Developer Tools | Frontend debugging                       |
| Windows Firewall        | Controlling local-network access         |

---

## 3. Complete Application Architecture

The application follows a client-server architecture.

```text
                 STUDENT SMARTPHONES
                   (40 TEAM DEVICES)
                          |
                          |
                     CAMPUS WI-FI
                          |
                          |
                REACT FRONTEND (VITE)
                          |
                 REST API / SOCKET.IO
                          |
                          |
                NODE.JS + FASTIFY
                          |
              -----------------------
              |          |          |
              |          |          |
          PostgreSQL  Memurai   Socket.IO
              |          |          |
              |          |          |
          Permanent   Temporary   Live updates
          data        cache       to clients
              |
              |
       GAME MANAGEMENT
              |
       ------------------
       |        |       |
      Teams   Scores  Checkpoints
```

### Data Flow

1. A student opens the Campus Quest website.
2. The team registers using one smartphone.
3. The frontend sends registration information to the backend.
4. The backend validates the information.
5. PostgreSQL stores the team and member details.
6. The team logs in using its credentials.
7. The team scans a physical QR checkpoint.
8. The backend validates the QR token and team eligibility.
9. The team submits its answer.
10. The backend checks the answer and calculates the score.
11. PostgreSQL records the submission and score.
12. Socket.IO broadcasts updated leaderboard information.

All scoring and qualification decisions must be performed by the backend, never by the browser.

---

## 4. Programming Languages Used and Their Roles

The project uses the following languages and formats:

### TypeScript
Used for frontend and backend application logic.

Examples:
- React components.
- API controllers.
- Authentication.
- QR validation.
- Scoring algorithms.
- Socket.IO events.
- Database service functions.

### JavaScript
The underlying language of the Node.js and React ecosystem. TypeScript is compiled into JavaScript for execution.

### HTML5
Used to structure application pages, forms, navigation, buttons and content.

### CSS3
Used to design the user interface, including:
- Responsive layouts.
- Mobile-friendly screens.
- Dashboard designs.
- Animations.
- QR scanning interface.
- Leaderboard presentation.

### SQL
Used to create and manage PostgreSQL database objects.

Examples:
- CREATE TABLE
- INSERT
- SELECT
- UPDATE
- DELETE
- JOIN
- Transactions and constraints.

### JSON
Used as the data-exchange format between the frontend and backend.

Example:

```json
{
  "teamId": "CQ-1001",
  "checkpointId": "CP-01",
  "answer": "Example answer"
}
```

### PowerShell
Used to install dependencies, start development servers, inspect services and manage the application on Windows.

---

## 5. Application Modules and Functional Workflow

### Module 1: Student Landing Page

The landing page is the first screen students see.

Planned features:
- Campus Quest branding.
- Event introduction.
- How to play.
- Event rules.
- Registration button.
- Team login button.
- Event information.
- Contact and support information.

### Module 2: Team Registration

Each team registers using one smartphone.

Features:
- Team name.
- Five team member names.
- Team leader identification.
- Unique Team ID.
- Secure PIN or authentication credentials.
- Registration confirmation.

The backend will validate registrations and store them in PostgreSQL.

### Module 3: Team Login

Features:
- Team ID.
- PIN or secure authentication.
- Session management.
- One active device session per team.
- Logout functionality.

### Module 4: Team Dashboard

The dashboard will display:
- Team name and Team ID.
- Team member details.
- Current score.
- Current rank.
- Current competition round.
- Checkpoint progress.
- Remaining time.
- Instructions and announcements.

### Module 5: QR Code Checkpoint System

Each physical checkpoint will have a unique QR code.

Features:
- QR code generation.
- QR scanning using the smartphone camera.
- Unique checkpoint token.
- Server-side token validation.
- Team eligibility verification.
- Duplicate scan prevention.
- Checkpoint completion status.

The QR code will contain a checkpoint identifier or secure token, never the answer.

### Module 6: Clues and Challenges

Features:
- Display clues after checkpoint validation.
- Riddles and questions.
- Answer submission form.
- Server-side answer verification.
- Attempt limits.
- Time-based challenges, if required.
- Correct and incorrect answer feedback.

### Module 7: Scoring System

The backend will calculate scores based on event rules.

Possible scoring parameters:
- Correct answer.
- Time taken.
- Checkpoint completion.
- Penalties.
- Bonus points.

Every accepted submission will have a unique identifier and will be protected against duplicate score awards using database constraints and transactions.

### Module 8: Four Knockout Rounds

The system will support four configurable competition levels.

Planned workflow:

1. Teams begin in the first round.
2. Teams complete assigned checkpoints and challenges.
3. The server calculates the scores.
4. The admin reviews the qualification results.
5. Qualified teams advance to the next round.
6. The process continues until the final round.
7. Final results determine the winners.

The exact number of qualifying teams per round will be configurable by the admin.

### Module 9: Live Leaderboard

The leaderboard will display:
- Team ranking.
- Team name.
- Total score.
- Completed checkpoints.
- Current round.
- Qualification status.

Socket.IO will broadcast updates when scores or qualification statuses change.

### Module 10: Admin Dashboard

The admin dashboard will be used by event organizers.

Planned features:
- Secure administrator login.
- View registered teams.
- Search and filter teams.
- Activate or deactivate teams.
- Manage checkpoints.
- Generate QR codes.
- Create and edit clues.
- Configure answer validation.
- Start and stop the event.
- Control competition rounds.
- Manage qualification.
- Monitor submissions.
- View scores and leaderboard.
- Publish announcements.
- Export event results.

---

## 6. Current Development Status

The infrastructure has been configured and the first frontend prototype has been prepared.

| Component               | Current status |
| ----------------------- | -------------- |
| Node.js installation    | Completed      |
| PostgreSQL installation | Completed      |
| PostgreSQL service      | Running        |
| Campus Quest database   | Created        |
| Database connectivity   | Verified       |
| Memurai installation    | Completed      |
| Cache connectivity      | Verified       |
| Backend setup           | Completed      |
| Backend health endpoint | Working        |
| React frontend setup    | Completed      |
| Landing page prototype  | Implemented    |
| Team registration UI    | Implemented    |
| Team login UI           | Implemented    |
| Basic team dashboard UI | Implemented    |

### Current Backend Health Check

Endpoint:

`http://localhost:4000/api/health`

Expected response:

```json
{
  "status": "ok",
  "service": "campus-quest-api",
  "checks": {
    "database": "ok",
    "cache": "ok"
  }
}
```

This verifies infrastructure connectivity, not the completion of game functionality.

---

## 7. Features Yet to Be Developed

The following work remains before Campus Quest can be used for a real event.

### Phase 1 — Complete Frontend Design

- [ ] Final student landing page.
- [ ] How to play page.
- [ ] Event rules page.
- [ ] Registration page refinement.
- [ ] Login page refinement.
- [ ] Complete team dashboard.
- [ ] Admin login page.
- [ ] Admin dashboard.
- [ ] QR scanner page.
- [ ] Clue and challenge page.
- [ ] Answer submission page.
- [ ] Leaderboard page.
- [ ] Round results page.
- [ ] Final winners page.
- [ ] Mobile responsive testing.

### Phase 2 — Database and Backend Development

- [ ] Finalize database schema.
- [ ] Implement team registration API.
- [ ] Implement team login API.
- [ ] Implement secure authentication.
- [ ] Implement session management.
- [ ] Enforce one active device per team.
- [ ] Implement admin authentication.
- [ ] Implement team management APIs.
- [ ] Implement checkpoint management APIs.
- [ ] Implement QR token validation.
- [ ] Implement clue management.
- [ ] Implement answer validation.
- [ ] Implement score calculation.
- [ ] Implement duplicate submission protection.

### Phase 3 — Game Management

- [ ] Create four knockout rounds.
- [ ] Configure qualification rules.
- [ ] Assign checkpoints to rounds.
- [ ] Implement team-specific checkpoint routes.
- [ ] Implement event start and stop controls.
- [ ] Implement countdown timer.
- [ ] Implement score penalties and bonuses.
- [ ] Implement tie-breaking rules.
- [ ] Implement final winner calculation.

### Phase 4 — Real-Time Features

- [ ] Integrate Socket.IO.
- [ ] Live leaderboard.
- [ ] Live team progress.
- [ ] Admin monitoring dashboard.
- [ ] Event announcements.
- [ ] Real-time round updates.
- [ ] Connection recovery and reconnection handling.

### Phase 5 — QR Scanner and Mobile Experience

- [ ] Integrate browser camera access.
- [ ] Implement QR scanning.
- [ ] Handle invalid QR codes.
- [ ] Handle already-used checkpoints.
- [ ] Provide scanning feedback.
- [ ] Test Android devices.
- [ ] Test iOS devices.
- [ ] Test different browsers.
- [ ] Configure PWA installation.
- [ ] Evaluate trusted local HTTPS for service-worker functionality.

### Phase 6 — Security and Testing

- [ ] Password hashing.
- [ ] Secure session or token authentication.
- [ ] Input validation.
- [ ] API rate limiting.
- [ ] Admin authorization.
- [ ] QR token security.
- [ ] Duplicate request protection.
- [ ] Database transaction testing.
- [ ] Simultaneous QR scanning tests.
- [ ] Concurrent submission tests.
- [ ] Network interruption tests.
- [ ] Recovery after server restart.
- [ ] Load testing for approximately 200 participants.

### Phase 7 — Deployment

- [ ] Configure production frontend build.
- [ ] Configure production backend.
- [ ] Configure LAN reverse proxy.
- [ ] Configure HTTPS if required.
- [ ] Configure Windows Firewall.
- [ ] Test campus Wi-Fi coverage.
- [ ] Test all 40 teams simultaneously.
- [ ] Prepare database backup.
- [ ] Prepare event-day recovery plan.
- [ ] Conduct a complete mock treasure hunt.

---

## 8. Security and Data Integrity

The following principles are mandatory for event deployment:

1. PostgreSQL is the permanent source of truth.
2. The frontend must never determine scores.
3. Qualification decisions must be performed by the backend.
4. QR codes must not reveal answers.
5. Each QR checkpoint must have a unique token.
6. Duplicate submissions must not generate duplicate points.
7. Database transactions must protect score updates.
8. Team authentication must be securely implemented.
9. Admin endpoints must require administrator authorization.
10. One team must not be able to access another team's private information.

---

## 9. Local Network Deployment

The application is intended to run on a computer connected to the college network.

Example configuration:

| Service    | Address                    |
| ---------- | -------------------------- |
| Frontend   | `http://192.168.1.20:5173` |
| Backend    | `http://192.168.1.20:4000` |
| PostgreSQL | `127.0.0.1:5432`           |
| Memurai    | `127.0.0.1:6379`           |

The IP address above is an example. The actual address must be determined from the host computer.

Students will access the frontend using the host computer's LAN IP.

The backend and database should remain accessible only to authorized services and devices as appropriate.

### Network considerations

- All student devices must connect to the intended campus Wi-Fi network.
- Windows Firewall must permit the required application traffic.
- The router must support the expected number of simultaneous clients.
- The development proxy must be configured for the actual LAN address.
- Local HTTP is not a secure context for all browser camera and PWA capabilities.
- Trusted local HTTPS may be required for reliable camera and service-worker functionality.

---

## 10. Project Folder Structure

The planned project organization is:

```text
campus-quest/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── sockets/
│   │   ├── utils/
│   │   └── server.ts
│   ├── .env
│   └── package.json
│
├── database/
│   └── schema.sql
│
├── docs/
│
└── README.md
```

This is the intended organized structure; some folders and modules will be added as development progresses.

---

## 11. Development Commands

### Backend

```powershell
cd backend
npm install
npm run typecheck
npm run dev
```

Backend health check:

```powershell
Invoke-RestMethod http://127.0.0.1:4000/api/health
```

### Frontend

```powershell
cd frontend
npm install
npm run typecheck
npm run dev
```

Open:

`http://localhost:5173`

### Database

PostgreSQL runs on port `5432`.

Memurai runs on port `6379`.

Do not share the backend `.env` file or commit credentials to Git.

---

## 12. Final Project Goal

Campus Quest aims to provide a complete college treasure hunt platform where approximately 200 students can participate in 40 teams using one smartphone per team.

The completed system will support:

- Team registration and authentication.
- QR-based checkpoint discovery.
- Clue and answer challenges.
- Automated scoring.
- Four knockout competition rounds.
- Live leaderboards.
- Administrative event management.
- Mobile-friendly participation.
- Local-network deployment.

**Current development stage:** Infrastructure setup and initial frontend prototype completed. Full application functionality, security implementation, event management and load testing remain in progress.