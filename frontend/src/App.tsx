import { useState } from "react";
import "./style.css";

type Screen = "home" | "register" | "login" | "dashboard";
type Team = { name: string; members: string[]; id: string; pin: string };

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState(["", "", "", "", ""]);
  const [team, setTeam] = useState<Team | null>(null);
  const [teamId, setTeamId] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");

  function register(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim() || members.some(x => !x.trim())) {
      setMessage("Enter a team name and all five member names.");
      return;
    }
    // Demo-only credentials. The backend will generate secure credentials later.
    const t = {
      name: teamName.trim(),
      members: members.map(x => x.trim()),
      id: "CQ-" + Math.random().toString(36).slice(2, 7).toUpperCase(),
      pin: String(Math.floor(1000 + Math.random() * 9000))
    };
    setTeam(t);
    setTeamId(t.id);
    setMessage("Demo team created. Keep these preview credentials safe.");
    setScreen("dashboard");
  }

  function login(e: React.FormEvent) {
    e.preventDefault();
    if (team && teamId.toUpperCase() === team.id && pin === team.pin) {
      setMessage("Signed in on this browser.");
      setScreen("dashboard");
    } else {
      setMessage("For this preview, register a team in this browser first.");
    }
  }

  return <div className="app">
    <header className="topbar">
      <button className="brand" onClick={() => setScreen("home")}><span className="logo">CQ</span> CAMPUS <b>QUEST</b></button>
      <span className="event-tag">● EVENT PORTAL</span>
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
          <div className="map-foot"><span>CHECKPOINTS AHEAD</span><strong>01 / 04</strong></div>
        </div>
        <div className="sticker sticker1">⌁ FOLLOW THE CLUES</div><div className="sticker sticker2">✦ THE HUNT IS ON</div>
      </section>
      <section className="stats"><div><b>40</b><span>TEAMS</span></div><div><b>05</b><span>MEMBERS PER TEAM</span></div><div><b>01</b><span>PHONE PER TEAM</span></div><small>YOUR CAMPUS. YOUR CHALLENGE. YOUR QUEST.</small></section>
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
        <div className="pin-display"><span>TEAM PIN</span><b>{team.pin}</b><small>DEMO CREDENTIALS</small></div>
        <hr /><label>QUEST PROGRESS</label><div className="progress"><i /></div><div className="progress-caption"><span>Waiting for event to begin</span><b>0 / 4 checkpoints</b></div>
        <button className="primary full" disabled>Checkpoints unlock when the admin starts the game</button>
      </section><section className="panel"><label>THE CREW</label><h2>Team members</h2>{team.members.map((m, i) => <div className="roster" key={i}><span>{m.charAt(0).toUpperCase()}</span>{m}{i === 0 && <small>LEADER</small>}</div>)}</section></div>
      <div className="callout"><b>▣ &nbsp; This is your team's registered device.</b><span>Keep this phone available for QR scanning and answer submissions during the event.</span></div>
      <button className="back" onClick={() => { setScreen("home"); setMessage(""); }}>← Sign out</button>
    </main>}

    <footer>© 2026 CAMPUS QUEST <span>BUILT FOR THE CURIOUS ✦</span></footer>
  </div>;
}
