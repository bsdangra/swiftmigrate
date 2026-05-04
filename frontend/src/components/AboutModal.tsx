import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AboutModal({ open, onClose }: Props) {

  const team = [
    {
      name: "Ashish Kumar",
      role: "Automation Maven",
      bg: "linear-gradient(135deg,#00E5A0,#4D9FFF)",
      initials: "AK",
      imgSrc: 'src/assets/ashish.png',
    },
    {
      name: "Bharat Sharadkumar Dangra",
      role: "Full Stack Craftsman",
      bg: "linear-gradient(135deg,#FFB020,#FF6B6B)",
      initials: "BSD",
      imgSrc: 'src/assets/bharat.png',
    },
    {
      name: "Jyoti Patil",
      role: "Business Analyst",
      bg: "linear-gradient(135deg,#A78BFA,#7C3AED)",
      initials: "JP",
      imgSrc: 'src/assets/jyoti.png',
    },
    {
      name: "Kaushik Kumar Mishra",
      role: "Automation Lead",
      bg: "linear-gradient(135deg,#A78BFA,#7C3AED)",
      initials: "KKM",
      imgSrc: 'src/assets/kaushik.png',
    },
    {
      name: "Muktapuram Sridhar Sai Raghavi Reddy",
      role: "Python Specialist",
      bg: "linear-gradient(135deg,#4D9FFF,#00E5A0)",
      initials: "MSSRR",
      imgSrc: 'src/assets/raghavi.jpeg',
    },
    {
      name: "Pranavnath Jujaray",
      role: "Team Owner",
      bg: "linear-gradient(135deg,#00E5A0,#4D9FFF)",
      initials: "PJ",
      imgSrc: 'src/assets/pranav.jpeg',
    },
    {
      name: "Seema Mittal",
      role: "Tech Lead",
      bg: "linear-gradient(135deg,#FFB020,#FF6B6B)",
      initials: "SM",
      imgSrc: 'src/assets/seema.png',
    },
  ];

  const shuffleArray = (array: any[]) => {
    const newArray = [...array]; // avoid mutating original
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const shuffledTeam = shuffleArray(team);

   useEffect(() => {
    const handler = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div
      className={`about-overlay ${open ? "active" : ""}`}
      onClick={onClose}
    >
      <div
        className="about-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="about-header">
          <div className="about-logo">SA</div>

          <div>
            <div className="about-title">Team Antaran</div>
            <div className="about-subtitle">Hackathon 2026</div>
          </div>

          <button className="about-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* DESCRIPTION */}
        <div className="about-description">
          <strong>SwiftMigrate</strong> is an agentic AI pipeline that migrates legacy Java Selenium test suites to Playwright. A deterministic rule engine handles known patterns predictably - same input, same output, every time. The AI agent layer resolves complex patterns, self-heals failing tests, and generates additional test cases beyond what the original suite covered. Unresolvable patterns are explicitly flagged, never silently dropped.
        </div>

        {/* TEAM */}
        <div className="about-section-title">Built by</div>

        <div className="team-grid">
          {shuffledTeam.map((m) => (
            <div key={m.name} className="team-member">
              <div
                className="member-avatar"
                style={{ background: m.bg, overflow: "hidden" }}
              >
                <img
                  src={m.imgSrc}
                  alt={m.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>

              <div className="member-info">
                <div className="member-name">{m.name}</div>
                <div className="member-role">{m.role}</div>
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div className="about-footer">
          SwiftMigrate · AI-driven Migration Engine
        </div>
      </div>
    </div>
  );
}