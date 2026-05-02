export default function Footer({ onOpenAbout, onOpenProject }: { onOpenAbout: () => void; onOpenProject: () => void }) {
  return (
    <div className="app-footer">
      <span style={{ color: "var(--text1)" }}>SwiftMigrate v1.0</span>

      <span className="app-footer-btn ml-4" onClick={onOpenAbout}>
        About Us.
      </span>

      <span className="app-footer-btn ml-4" onClick={onOpenProject}>
        About Project.
      </span> 
    </div>
  );
}