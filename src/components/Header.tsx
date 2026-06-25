import { useState, useRef, useEffect } from "react";
import type { UserInfo } from "../types";
import "./Header.scss";

interface HeaderProps {
  user?: UserInfo | null;
  onLogout: () => void;
}

export function Header({ user, onLogout }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__logo" aria-hidden>
          <svg
            className="header__logo-mark"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M13.6 2.2 L5 13.4 H10.7 L9.3 21.8 L19.2 9.8 H13.1 L13.6 2.2 Z"
              fill="#fff"
              stroke="#fff"
              strokeWidth="1.1"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div className="header__brand-text">
          <h1 className="header__title">
            Neo <span>Flex</span> Scouter
          </h1>
          {!user && (
            <p className="header__subtitle">근태를 조회하려면 로그인하세요</p>
          )}
        </div>
      </div>

      {user && (
        <div className="header__account" ref={menuRef}>
          <button
            className={`header__profile ${menuOpen ? "is-open" : ""}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <img
              className="header__avatar"
              src={user.googleUser.photo}
              alt={user.employee.name}
            />
            <span className="header__name">{user.employee.name}</span>
            <span className={`header__chevron ${menuOpen ? "is-open" : ""}`} aria-hidden>
              ▾
            </span>
          </button>

          {menuOpen && (
            <div className="header__menu" role="menu">
              <div className="header__menu-head">
                <img
                  className="header__menu-avatar"
                  src={user.googleUser.photo}
                  alt={user.employee.name}
                />
                <div className="header__menu-id">
                  <span className="header__menu-name">{user.employee.name}</span>
                  <span className="header__menu-sub">
                    {user.employee.dutyNm} · {user.employee.organization.name}
                  </span>
                  <span className="header__menu-email">{user.googleUser.email}</span>
                </div>
              </div>
              <button
                className="header__logout"
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
                role="menuitem"
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
