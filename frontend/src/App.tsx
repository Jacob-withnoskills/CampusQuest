import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./style.css";

type RoundStatus = "LOCKED" | "ACTIVE" | "COMPLETED";
type RoundId = 1 | 2 | 3;
type Screen = "home" | "register" | "login" | "dashboard" | "round" | "admin-login" | "admin";
type Team = { name: string; members: string[]; id: string; pin: string };

type LeaderboardEntry = {
  teamId: string;
  teamCode: string;
  teamName: string;
  totalPoints: number;
  rank: number | string;
};

type RoundInfo = {
  id: RoundId;
  title: string;
  subtitle: string;
  description: string;
  status: RoundStatus;
};

const initialRounds: RoundInfo[] = [
  {
    id: 1,
    title: "Puzzle Hunt",
    subtitle: "ROUND 01",
    description: "Read the clue, explore the campus and submit the answer.",
    status: "LOCKED"
  },
  {
    id: 2,
    title: "Mystery Challenge",
    subtitle: "ROUND 02",
    description: "Solve the logic challenge and prove your team's thinking.",
    status: "LOCKED"
  },
  {
    id: 3,
    title: "Ultimate QR Quest",
    subtitle: "ROUND 03",
    description: "Find the hidden checkpoint, scan its QR code and solve the final puzzle.",
    status: "LOCKED"
  }
];

const roundContent: Record<RoundId, { clue: string; hint: string; question: string; answer: string }> = {
  1: {
    clue: "I have many pages, but I am not a website. Students visit me to find knowledge. What am I?",
    hint: "Think of a place on campus where books and quiet study come together.",
    question: "Enter the place or answer that solves the clue.",
    answer: "library"
  },
  2: {
    clue: "A number sequence follows a hidden rule: 2, 6, 12, 20, 30, __. What comes next?",
    hint: "Look at the difference between consecutive numbers.",
    question: "Enter the next number in the sequence.",
    answer: "42"
  },
  3: {
    clue: "Your QR checkpoint has been found. Solve this final challenge to complete the quest.",
    hint: "The final answer is the number of sides on a hexagon.",
    question: "How many sides does a hexagon have?",
    answer: "6"
  }
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState(["", "", "", "", ""]);
  const [team, setTeam] = useState<Team | null>(null);
  const [teamId, setTeamId] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  
  
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardRound, setLeaderboardRound] = useState(1);

  // Frontend preview state. In the live version, the backend/admin panel controls these.
  const [rounds, setRounds] = useState<RoundInfo[]>(initialRounds);
  const [selectedRound, setSelectedRound] = useState<RoundId>(1);
  const [answers, setAnswers] = useState<Record<RoundId, string>>({ 1: "", 2: "", 3: "" });
  const [completedRounds, setCompletedRounds] = useState<RoundId[]>([]);
  const [qrScanned, setQrScanned] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [qualificationMode, setQualificationMode] = useState<"percentage" | "number">("percentage");
  const [qualificationValue, setQualificationValue] = useState("50");
  const [roundDrafts, setRoundDrafts] = useState(roundContent);


  useEffect(() => {
    const socket = io("http://localhost:4000");

    // Load leaderboard from backend
    async function loadLeaderboard(roundId: number) {
      try {
        const response = await fetch(
          `http://localhost:4000/api/leaderboard?roundId=${roundId}`
        );

        if (!response.ok) {
          throw new Error("Unable to load leaderboard.");
        }

        const data = await response.json();
        setLeaderboard(data.leaderboard);
        setLeaderboardRound(roundId);
      } catch (error) {
        console.error("Leaderboard error:", error);
      }
    }

    // Load actual round statuses from database
    async function loadRounds() {
      try {
        const response = await fetch(
          "http://localhost:4000/api/rounds"
        );

        if (!response.ok) {
          throw new Error("Unable to load rounds.");
        }

        const data = await response.json();

        setRounds(old =>
          old.map(round => {
            const backendRound = data.rounds.find(
              (item: { roundNumber: number; status: RoundStatus }) =>
                item.roundNumber === round.id
            );

            return backendRound
              ? { ...round, status: backendRound.status }
              : round;
          })
        );
      } catch (error) {
        console.error("Round loading error:", error);
      }
    }

    // Initial data loading
    loadLeaderboard(1);
    loadRounds();

    // Listen for leaderboard changes
    socket.on("leaderboard:update", (data: { roundId: number }) => {
      loadLeaderboard(data.roundId);
    });

    // Listen for round activation changes
    socket.on("rounds:update", () => {
      loadRounds();
    });

    // Cleanup
    return () => {
      socket.off("leaderboard:update");
      socket.off("rounds:update");
      socket.disconnect();
    };
  }, []);


  async function register(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!teamName.trim() || members.some(x => !x.trim())) {
      setMessage("Enter a team name and all five member names.");
      return;
    }

    setMessage("Registering your team...");

    try {
      const response = await fetch(
        "http://localhost:4000/api/teams/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            teamName: teamName.trim(),
            members: members.map(x => x.trim())
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed.");
      }

      const t: Team = {
        name: data.team.teamName,
        members: data.team.members,
        id: data.team.teamCode,
        pin: data.team.pin
      };

      setTeam(t);
      setTeamId(t.id);
      setPin("");
      setMessage("Team registered successfully. Save your Team ID and PIN.");
      setTeamName("");
      setMembers(["", "", "", "", ""]);
      setScreen("dashboard");

    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not connect to the server."
      );
    }
  }
 
  
async function login(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();

  const code = teamId.trim().toUpperCase();
  const enteredPin = pin.trim();

  if (!code || !/^\d{6}$/.test(enteredPin)) {
    setMessage("Enter your Team ID and six-digit PIN.");
    return;
  }

  setMessage("Signing in...");

  try {
    const response = await fetch(
      "http://localhost:4000/api/teams/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          teamCode: code,
          pin: enteredPin
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed.");
    }

    const loggedInTeam: Team = {
      name: data.team.teamName,
      members: data.team.members,
      id: data.team.teamCode,
      pin: ""
    };

    setTeam(loggedInTeam);
    setTeamId(loggedInTeam.id);
    setPin("");
    setMessage("Login successful. Welcome back!");
    setScreen("dashboard");

  } catch (error) {
    setMessage(
      error instanceof Error
        ? error.message
        : "Could not connect to the server."
    );
  }
}


  function adminLogin(e: React.FormEvent) {
    e.preventDefault();
    // Prototype credentials only. Replace with server-side authentication before deployment.
    if (adminId.trim().toLowerCase() === "admin" && adminPin === "2468") {
      setAdminMessage("");
      setScreen("admin");
    } else {
      setAdminMessage("Invalid demo admin credentials.");
    }
  }

  function updateRoundDraft(roundId: RoundId, field: "clue" | "hint" | "question" | "answer", value: string) {
    setRoundDrafts(old => ({
      ...old,
      [roundId]: { ...old[roundId], [field]: value }
    }));
  }

  function toggleRound(roundId: RoundId) {
    setRounds(old => old.map(round => {
      if (round.id !== roundId) return round;
      return { ...round, status: round.status === "ACTIVE" ? "LOCKED" : "ACTIVE" };
    }));
    setAdminMessage(`Round ${roundId} status updated in this preview.`);
  }

  function adminLogout() {
    setAdminId("");
    setAdminPin("");
    setAdminMessage("");
    setScreen("home");
  }

  function openRound(roundId: RoundId) {
    const round = rounds.find(item => item.id === roundId);
    if (!round || round.status !== "ACTIVE") {
      setMessage("This round is locked. It will open when the event admin starts it.");
      return;
    }
    setSelectedRound(roundId);
    setQrScanned(false);
    setMessage("");
    setScreen("round");
  }

  function submitAnswer(e: React.FormEvent) {
    e.preventDefault();
    const submitted = answers[selectedRound].trim().toLowerCase();
    const expected = roundDrafts[selectedRound].answer.toLowerCase();

    if (selectedRound === 3 && !qrScanned) {
      setMessage("Scan the checkpoint QR code before submitting the final answer.");
      return;
    }

    if (submitted === expected) {
      setCompletedRounds(old => old.includes(selectedRound) ? old : [...old, selectedRound]);
      setRounds(old => old.map(round =>
        round.id === selectedRound ? { ...round, status: "COMPLETED" } : round
      ));
      setMessage("Correct answer! This round is completed in the preview.");
    } else {
      setMessage("That answer is not correct. Try again!");
    }
  }

  const currentRound = rounds.find(round => round.id === selectedRound)!;
  const completedCount = completedRounds.length;

  return <div className="app">
    <header className="topbar">
      <button className="brand" onClick={() => setScreen("home")}><span className="logo">CQ</span> CAMPUS <b>QUEST</b></button>
      <div className="header-actions"><span className="event-tag">● EVENT PORTAL</span><button className="admin-link" onClick={() => { setAdminMessage(""); setScreen("admin-login"); }}>Admin login ↗</button></div>
    </header>

    {screen === "home" && <main className="hero">
      <section className="hero-copy">
        <div className="eyebrow">THE CAMPUS ADVENTURE STARTS HERE</div>
        <h1>Think fast.<br /><em>Explore more.</em><br />Find the next clue.</h1>
        <p>Team up, follow the clues, scan checkpoints and race your way to the top. One team. One phone. One unforgettable quest.</p>
        <div className="actions">
          <button className="primary" onClick={() => { setMessage(""); setScreen("register"); }}>Register your team <span>↗</span></button>
          <button className="secondary" onClick={() => { setMessage(""); setScreen("login"); }}>Team login →</button>
        </div>
        <div className="hint">✦ One phone is used by the entire team during the game.</div>
      </section>
      <section className="art">
        <div className="orbit"></div><div className="orbit orbit2"></div>
        <div className="map">
          <div className="map-head"><span>YOUR QUEST</span><span className="live">● LIVE MAP</span></div>
          <div className="map-grid"><i className="route"></i><i className="pin p1">⌖</i><i className="pin p2">⌖</i><i className="pin p3">⌖</i><b>✦</b></div>
          <div className="map-foot"><span>CHECKPOINTS AHEAD</span><strong>01 / 03</strong></div>
        </div>
        <div className="sticker sticker1">⌁ FOLLOW THE CLUES</div><div className="sticker sticker2">✦ THE HUNT IS ON</div>
      </section>
      <section className="stats"><div><b>03</b><span>GAME ROUNDS</span></div><div><b>05</b><span>MEMBERS PER TEAM</span></div><div><b>01</b><span>PHONE PER TEAM</span></div><small>YOUR CAMPUS. YOUR CHALLENGE. YOUR QUEST.</small></section>
    </main>}

    {screen === "register" && <main className="form-layout">
      <section className="intro"><div className="eyebrow">JOIN THE QUEST</div><h1>Build your<br /><em>dream team.</em></h1><p>Register once using the phone your team will carry throughout the treasure hunt.</p><div className="callout"><b>▣ &nbsp; One team. One device.</b><span>Use the same phone to log in, scan QR checkpoints and submit answers.</span></div></section>
      <form className="panel" onSubmit={register}>
        <div className="panel-head"><div><small>TEAM REGISTRATION / 01</small><h2>Team details</h2></div><span className="count">{members.filter(x => x.trim()).length}/5</span></div>
        <label>TEAM NAME</label><input className="field" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. The Code Breakers" maxLength={40} />
        <div className="members-title"><label>TEAM MEMBERS</label><span>Enter all five names</span></div>
        {members.map((m, i) => <div className="member" key={i}><span>{String(i + 1).padStart(2, "0")}</span><input value={m} onChange={e => setMembers(old => old.map((v, j) => i === j ? e.target.value : v))} placeholder={i === 0 ? "Team leader name" : `Member ${i + 1} name`} maxLength={60} />{i === 0 && <small>LEADER</small>}</div>)}
        {message && <p className="message">{message}</p>}
        <button className="primary full" type="submit">Create team profile ↗</button>
        <p className="switch">Already registered? <button type="button" onClick={() => { setMessage(""); setScreen("login"); }}>Team login</button></p>
      </form>
    </main>}

    {screen === "login" && <main className="login">
      <div className="login-logo">CQ✦</div><div className="eyebrow">WELCOME BACK, TEAM</div><h1>Your quest<br /><em>continues here.</em></h1>
      <p>Enter the Team ID and PIN created during registration. Use your team's registered phone.</p>
      <form className="panel" onSubmit={login}>
        <label>TEAM ID</label><input className="field" value={teamId} onChange={e => setTeamId(e.target.value)} placeholder="e.g. CQ-8F2KQ" />
        <label className="spaced">TEAM PIN</label><input className="field" value={pin} onChange={e => setPin(e.target.value)} placeholder="Enter your PIN" inputMode="numeric" />
        {message && <p className="message">{message}</p>}
        <button className="primary full" type="submit">Enter the quest ↗</button>
      </form><button className="back" onClick={() => setScreen("home")}>← Back to home</button>
    </main>}

    {screen === "dashboard" && team && <main className="dashboard">
      <div className="dash-head"><div className="eyebrow">TEAM PORTAL</div><h1>Ready, <em>{team.name}?</em></h1><p>Your team's quest hub. Keep this phone with your team.</p></div>
      {message && <p className="message">{message}</p>}
      <div className="dash-grid"><section className="panel">
        <label>YOUR TEAM ID</label><div className="team-id">{team.id}</div>
        {team.pin && (
          <div className="pin-display">
            <span>TEAM PIN</span>
            <b>{team.pin}</b>
            <small>SAVE YOUR PIN SECURELY — SHOWN ONLY AT REGISTRATION</small>
          </div>
        )}
        <hr /><label>QUEST PROGRESS</label><div className="progress"><i style={{ width: `${(completedCount / 3) * 100}%` }} /></div><div className="progress-caption"><span>{completedCount === 0 ? "Waiting for event to begin" : `${completedCount} of 3 rounds completed`}</span><b>{completedCount} / 3 rounds</b></div>
      </section><section className="panel"><label>THE CREW</label><h2>Team members</h2>{team.members.map((m, i) => <div className="roster" key={i}><span>{m.charAt(0).toUpperCase()}</span>{m}{i === 0 && <small>LEADER</small>}</div>)}</section></div>

      <section className="rounds-section">
        <div className="rounds-heading"><div><div className="eyebrow">YOUR GAME PLAN</div><h2>Three rounds. One champion.</h2></div><span>{completedCount}/3 COMPLETE</span></div>
        <div className="round-list">
          {rounds.map(round => <article className="round-card" key={round.id}>
            <div className="round-number">0{round.id}</div>
            <div className="round-info"><small>{round.subtitle}</small><h3>{round.title}</h3><p>{round.description}</p></div>
            <div className={`status status-${round.status.toLowerCase()}`}>{round.status}</div>
            <button className="round-open" disabled={round.status !== "ACTIVE"} onClick={() => openRound(round.id)}>
              {round.status === "ACTIVE" ? "Open round →" : round.status === "COMPLETED" ? "Completed ✓" : "Locked"}
            </button>
          </article>)}
        </div>
      </section>
      <section className="panel admin-section">
        <div className="admin-section-head">
          <div>
            <div className="eyebrow">LIVE RANKINGS</div>
            <h2>Leaderboard – Round {leaderboardRound}</h2>
          </div>
          <span className="status status-active">● LIVE</span>
        </div>

        {leaderboard.length === 0 ? (
          <p className="admin-empty">No leaderboard data available.</p>
        ) : (
          leaderboard.map((entry) => (
            <div className="admin-team-row" key={entry.teamId}>
              <div>
                <b>#{entry.rank} · {entry.teamName}</b>
                <small>{entry.teamCode}</small>
              </div>
              <strong>{entry.totalPoints} points</strong>
            </div>
          ))
        )}
      </section>

      <div className="callout"><b>▣ &nbsp; This is your team's registered device.</b><span>Keep this phone available for QR scanning and answer submissions during the event.</span></div>
      <button className="back" onClick={() => { setScreen("home"); setMessage(""); }}>← Sign out</button>
    </main>}

    {screen === "round" && team && <main className="round-page">
      <button className="back round-back" onClick={() => { setScreen("dashboard"); setMessage(""); }}>← Back to team dashboard</button>
      <div className="eyebrow">{currentRound.subtitle} · TEAM {team.id}</div>
      <h1>{currentRound.title}</h1>
      <p className="round-lead">{currentRound.description}</p>
      <section className="panel challenge-panel">
        <div className="challenge-top"><span className="status status-active">ACTIVE</span><span>TEAM CHALLENGE</span></div>
        <label>YOUR CLUE</label>
        <div className="clue-box">{roundDrafts[selectedRound].clue}</div>
        <details className="hint-details"><summary>Need a hint?</summary><p>{roundDrafts[selectedRound].hint}</p></details>

        {selectedRound === 3 && <div className="qr-box">
          <div className="qr-symbol">▦</div>
          <div><b>Checkpoint QR scan</b><p>{qrScanned ? "Checkpoint verified in this preview." : "Reach the location shown by your event organiser and scan its QR code."}</p></div>
          <button className="secondary" type="button" onClick={() => { setQrScanned(true); setMessage("Demo QR scan successful. You can now answer the final puzzle."); }}>
            {qrScanned ? "Scanned ✓" : "Simulate QR scan"}
          </button>
          <small>DEMO ONLY — this button simulates a scan; it does not read a real QR code.</small>
        </div>}

        <form onSubmit={submitAnswer}>
          <label htmlFor="round-answer">{roundDrafts[selectedRound].question}</label>
          <input id="round-answer" className="field answer-field" value={answers[selectedRound]} onChange={e => setAnswers(old => ({ ...old, [selectedRound]: e.target.value }))} placeholder="Type your answer here" />
          {message && <p className="message">{message}</p>}
          <button className="primary full" type="submit">Submit answer ↗</button>
        </form>
      </section>
      <p className="demo-note">Preview mode: clues and answers are sample content. In the live event, the admin panel and backend will control round access and verify submissions.</p>
    </main>}
 

    {screen === "admin-login" && <main className="login admin-login">
      <div className="login-logo">CQ✦</div>
      <div className="eyebrow">EVENT CONTROL CENTRE</div>
      <h1>Admin <em>access.</em></h1>
      <p>Sign in to manage teams, configure challenges and control the three game rounds.</p>
      <form className="panel" onSubmit={adminLogin}>
        <label>ADMIN USERNAME</label>
        <input className="field" value={adminId} onChange={e => setAdminId(e.target.value)} placeholder="Enter admin username" autoComplete="username" />
        <label className="spaced">ADMIN PIN</label>
        <input className="field" type="password" value={adminPin} onChange={e => setAdminPin(e.target.value)} placeholder="Enter admin PIN" autoComplete="current-password" />
        {adminMessage && <p className="message">{adminMessage}</p>}
        <button className="primary full" type="submit">Open admin panel ↗</button>
        <p className="admin-demo-credentials">DEMO LOGIN: username <b>admin</b> · PIN <b>2468</b></p>
      </form>
      <button className="back" onClick={() => setScreen("home")}>← Back to student portal</button>
    </main>}

    {screen === "admin" && <main className="admin-dashboard">
      <div className="admin-heading">
        <div><div className="eyebrow">CAMPUS QUEST / ADMINISTRATION</div><h1>Event <em>control room.</em></h1><p>Manage the event rounds and configure the challenges shown to student teams.</p></div>
        <button className="secondary" onClick={adminLogout}>Sign out</button>
      </div>

      <div className="admin-stats">
        <div className="admin-stat"><small>REGISTERED TEAMS (THIS BROWSER)</small><b>{team ? "1" : "0"}</b></div>
        <div className="admin-stat"><small>ACTIVE ROUNDS</small><b>{rounds.filter(r => r.status === "ACTIVE").length}/3</b></div>
        <div className="admin-stat"><small>COMPLETED ROUNDS</small><b>{rounds.filter(r => r.status === "COMPLETED").length}/3</b></div>
      </div>

      <section className="panel admin-section">
        <div className="admin-section-head"><div><div className="eyebrow">01 / TEAM MANAGEMENT</div><h2>Registered teams</h2></div><span className="count">{team ? "1 TEAM" : "NO TEAMS"}</span></div>
        {team ? <div className="admin-team-row"><div><b>{team.name}</b><small>{team.id} · {team.members.length} members</small></div><span className="status status-active">REGISTERED</span></div> : <p className="admin-empty">No team has registered in this browser preview yet. Team registrations from other devices are not connected to this demo admin panel.</p>}
      </section>

      <section className="panel admin-section">
        <div className="admin-section-head"><div><div className="eyebrow">02 / ROUND CONTROL</div><h2>Manage game rounds</h2></div><span className="admin-help">Start or lock each round</span></div>
        <div className="admin-round-list">
          {rounds.map(round => <div className="admin-round" key={round.id}>
            <div className="admin-round-title"><span className="round-number">0{round.id}</span><div><b>{round.title}</b><small>{round.subtitle}</small></div></div>
            <span className={`status status-${round.status.toLowerCase()}`}>{round.status}</span>
            <button className={round.status === "ACTIVE" ? "admin-stop" : "admin-start"} disabled={round.status === "COMPLETED"} onClick={() => toggleRound(round.id)}>{round.status === "ACTIVE" ? "Lock round" : round.status === "COMPLETED" ? "Completed" : "Start round"}</button>
          </div>)}
        </div>
        {adminMessage && <p className="message">{adminMessage}</p>}
      </section>

      <section className="panel admin-section">
        <div className="admin-section-head"><div><div className="eyebrow">03 / CHALLENGE BUILDER</div><h2>Configure clues and answers</h2></div></div>
        <p className="admin-help admin-description">Changes are reflected in this browser's student preview. In production, save these values through the backend.</p>
        {([1, 2, 3] as RoundId[]).map(id => <div className="challenge-editor" key={id}>
          <h3>ROUND 0{id} — {rounds.find(r => r.id === id)?.title}</h3>
          <label>CLUE / CHALLENGE</label>
          <textarea className="admin-textarea" value={roundDrafts[id].clue} onChange={e => updateRoundDraft(id, "clue", e.target.value)} />
          <label>HINT</label>
          <textarea className="admin-textarea short-textarea" value={roundDrafts[id].hint} onChange={e => updateRoundDraft(id, "hint", e.target.value)} />
          <label>QUESTION / ANSWER INSTRUCTION</label>
          <input className="field" value={roundDrafts[id].question} onChange={e => updateRoundDraft(id, "question", e.target.value)} />
          <label>EXPECTED ANSWER (KEEP PRIVATE FROM STUDENTS)</label>
          <input className="field" value={roundDrafts[id].answer} onChange={e => updateRoundDraft(id, "answer", e.target.value)} />
        </div>)}
      </section>

      <section className="panel admin-section">
        <div className="admin-section-head"><div><div className="eyebrow">04 / QUALIFICATION SETTINGS</div><h2>Set qualifiers</h2></div></div>
        <p className="admin-help admin-description">Choose how many eligible teams advance to the next round. This is a preview setting; it does not yet filter teams.</p>
        <div className="qualification-controls">
          <select className="field qualification-select" value={qualificationMode} onChange={e => setQualificationMode(e.target.value as "percentage" | "number")}>
            <option value="percentage">Percentage of eligible teams</option>
            <option value="number">Exact number of teams</option>
          </select>
          <input className="field qualification-value" type="number" min="1" max={qualificationMode === "percentage" ? 100 : undefined} value={qualificationValue} onChange={e => setQualificationValue(e.target.value)} />
          <span>{qualificationMode === "percentage" ? "%" : "teams"}</span>
        </div>
        <p className="admin-help">For percentage mode, the live backend should round up the qualifying team count.</p>
      </section>

      <div className="admin-warning"><b>Prototype limitation:</b> Admin login is a demo-only client-side gate. Data is held in React memory and is not shared across devices or saved after refresh. Do not use these demo credentials for a real event. Production admin authentication, database persistence, team-wide round unlocking, QR token validation and qualification processing must be implemented on the backend.</div>
    </main>}

    <footer>© 2026 CAMPUS QUEST <span>BUILT FOR THE CURIOUS ✦</span></footer>
  </div>;
}
