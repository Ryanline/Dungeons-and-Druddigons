import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const navLinks = [
  { to: "/", label: "Home", end: true },
  { to: "/character-creation", label: "Character Creation" },
  { to: "/moves", label: "Moves" },
  { to: "/abilities", label: "Abilities" },
];

export function SiteLayout() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <>
      <header className="topbar" role="banner">
        <nav className="nav" aria-label="Primary">
          <NavLink className="brand" to="/" aria-label="Dungeons and Druddigons Home" end>
            Dungeons and Druddigons
          </NavLink>

          <ul className={`nav-links${isOpen ? " is-open" : ""}`}>
            {navLinks.map((item) => (
              <li key={item.to}>
                <NavLink
                  className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}
                  to={item.to}
                  end={item.end}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <button
            className="nav-toggle"
            type="button"
            aria-label="Toggle menu"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((current) => !current)}
          >
            ?
          </button>
        </nav>
        <div className="accent-bar" aria-hidden="true" />
      </header>

      <Outlet />
    </>
  );
}