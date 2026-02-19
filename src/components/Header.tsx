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
              <Link href="/about" className={styles.aboutLink}>
                <span className={styles.menuText}>about</span>
              </Link>

              <div 
                  className={styles.menuWrapper}
                  onMouseEnter={() => setIsOpen(true)}
                  onMouseLeave={() => setIsOpen(false)}
              >
                  <div 
                    className={styles.menuTrigger} 
                    aria-expanded={isOpen}
                    role="button"
                    tabIndex={0}
                  >
                    <span className={styles.menuText}>works</span>
                  </div>

                  <nav className={`${styles.menuNav} ${isOpen ? styles.open : ""}`}>
                <ul className={styles.menuList}>
                  <li>
                    <Link href="#">projects</Link>
                  </li>
                  <li>
                    <Link href="#">essays</Link>
                  </li>
                  <li>
                    <Link href="#">news</Link>
                  </li>
                  {isAdmin ? (
                      <li>
                          <button onClick={logout} style={{ background: 'none', border: 'none', font: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>logout</button>
                      </li>
                  ) : (
                      <li>
                          <button onClick={handleLoginClick} style={{ background: 'none', border: 'none', font: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>login</button>
                      </li>
                  )}
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
