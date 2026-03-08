"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./Header.module.css";
import { useAdmin } from "@/context/AdminContext";
import LoginModal from "./LoginModal";

export default function Header() {
  const [isTedooriOpen, setIsTedooriOpen] = useState(false);
  const [isWorksOpen, setIsWorksOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { isAdmin, logout, adminMode, toggleAdminMode } = useAdmin();
  const pathname = usePathname();

  const handleLoginClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoginModalOpen(true);
    setIsTedooriOpen(false);
  };

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          <div className={styles.leftGroup}>
            <Link href="/" className={styles.brand}>
              <Image
                src="/logo.png"
                alt="NP2F Logo"
                width={120}
                height={40}
                className={styles.logoImage}
                priority
              />
            </Link>
          </div>

          <div className={styles.rightGroup}>
            {/* TEDOORI Dropdown */}
            <div
              className={styles.menuWrapper}
              onMouseEnter={() => window.innerWidth >= 768 && setIsTedooriOpen(true)}
              onMouseLeave={() => window.innerWidth >= 768 && setIsTedooriOpen(false)}
              onClick={() => window.innerWidth < 768 && setIsTedooriOpen(!isTedooriOpen)}
            >
              <div
                className={styles.menuTrigger}
                aria-expanded={isTedooriOpen}
                role="button"
                tabIndex={0}
              >
                <span className={styles.menuText}>TEDOORI</span>
              </div>

              <nav className={`${styles.menuNav} ${isTedooriOpen ? styles.open : ""}`}>
                <ul className={styles.menuList}>
                  <li>
                    <Link href="/about" className={pathname === '/about' ? styles.active : ''}>About</Link>
                  </li>
                  <li>
                    <Link href="/news" className={pathname === '/news' ? styles.active : ''}>News</Link>
                  </li>
                  {isAdmin && (
                    <>
                      <li>
                        <button onClick={logout} style={{ background: 'none', border: 'none', font: 'inherit', cursor: 'pointer' }}>Logout</button>
                      </li>
                      <li>
                        <button
                          onClick={toggleAdminMode}
                          style={{
                            background: 'none',
                            border: 'none',
                            font: 'inherit',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {adminMode ? 'Admin: on' : 'Admin: off'}
                        </button>
                      </li>
                    </>
                  )}
                  {!isAdmin && (
                    <li>
                      <button onClick={handleLoginClick} style={{ background: 'none', border: 'none', font: 'inherit', cursor: 'pointer' }}>Login</button>
                    </li>
                  )}
                </ul>
              </nav>
            </div>

            {/* WORKS Dropdown */}
            <div
              className={styles.menuWrapper}
              onMouseEnter={() => window.innerWidth >= 768 && setIsWorksOpen(true)}
              onMouseLeave={() => window.innerWidth >= 768 && setIsWorksOpen(false)}
              onClick={() => window.innerWidth < 768 && setIsWorksOpen(!isWorksOpen)}
            >
              <div
                className={styles.menuTrigger}
                aria-expanded={isWorksOpen}
                role="button"
                tabIndex={0}
              >
                <span className={styles.menuText}>WORKS</span>
              </div>

              <nav className={`${styles.menuNav} ${isWorksOpen ? styles.open : ""}`}>
                <ul className={styles.menuList}>
                  <li>
                    <Link href="/" className={pathname === '/' ? styles.active : ''}>Projects</Link>
                  </li>
                  <li>
                    <Link href="/essays" className={pathname === '/essays' ? styles.active : ''}>Essays</Link>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </header>
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </>
  );
}
