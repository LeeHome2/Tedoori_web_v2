"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import styles from "./Header.module.css";
import { useAdmin } from "@/context/AdminContext";
import LoginModal from "./LoginModal";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { isAdmin, logout } = useAdmin();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleLoginClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoginModalOpen(true);
    setIsOpen(false); // Close menu when opening modal
  };

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          <div className={styles.leftGroup}>
            <div 
              className={`${styles.menuTrigger} ${isOpen ? styles.active : ''}`} 
              onClick={toggleMenu}
              aria-expanded={isOpen}
              role="button"
              tabIndex={0}
            >
              <div className={styles.menuIcon}>
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L6 6L11 1" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            <Link href="/" className={styles.brand}>
              <Image 
                src="/logo.png" 
                alt="NP2F Logo" 
                width={60} 
                height={20} 
                className={styles.logoImage}
                priority
              />
            </Link>
          </div>

          <nav className={`${styles.menuNav} ${isOpen ? styles.open : ""}`}>
            <ul className={styles.menuList}>
              <li>
                <Link href="#">architectes</Link>
              </li>
              <li>
                <Link href="#">index</Link>
              </li>
              <li>
                <Link href="#">news</Link>
              </li>
              <li>
                <Link href="#">à propos</Link>
              </li>
              <li>
                <Link href="#">contact</Link>
              </li>
              {isAdmin ? (
                  <li>
                      <button onClick={logout} style={{ background: 'none', border: 'none', font: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>Logout</button>
                  </li>
              ) : (
                  <li>
                      <button onClick={handleLoginClick} style={{ background: 'none', border: 'none', font: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>Admin Login</button>
                  </li>
              )}
              <li className={styles.unlink}>
                Unlink
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </>
  );
}
