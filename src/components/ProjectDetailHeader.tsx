"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import styles from "./ProjectDetailHeader.module.css";
import { Project } from "@/data/projects";
import { useAdmin } from "@/context/AdminContext";
import LoginModal from "./LoginModal";

interface ProjectDetailHeaderProps {
  currentProject: Project;
  prevProject: Project | null;
  nextProject: Project | null;
}

export default function ProjectDetailHeader({
  currentProject,
  prevProject,
  nextProject,
}: ProjectDetailHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { isAdmin, logout, adminMode, toggleAdminMode } = useAdmin();
  const pathname = usePathname();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleLoginClick = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsLoginModalOpen(true);
      setIsOpen(false); // Close menu when opening modal
  };

  const getProjectHref = (project: Project) => {
    return project.link || `/projet/${project.id}`;
  };

  return (
    <>
        <header className={styles.header}>
        <div className={styles.inner}>
            <div className={styles.leftGroup}>
                <div className={styles.logoWrapper}>
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
                
                <div className={styles.projectNav}>
                    {prevProject ? (
                        <Link href={getProjectHref(prevProject)} className={styles.navArrow} title={`Projet précédent: ${prevProject.title}`}>
                            <span>&lt;</span>
                        </Link>
                    ) : (
                        <span className={`${styles.navArrow} ${styles.disabled}`}>&lt;</span>
                    )}
                    
                    <span className={styles.projectId}>{currentProject.id}</span>
                    
                    {nextProject ? (
                        <Link href={getProjectHref(nextProject)} className={styles.navArrow} title={`Projet suivant: ${nextProject.title}`}>
                            <span>&gt;</span>
                        </Link>
                    ) : (
                        <span className={`${styles.navArrow} ${styles.disabled}`}>&gt;</span>
                    )}
                </div>
            </div>

            <div className={styles.rightGroup}>
                <Link href="/about" className={styles.aboutLink}>
                  <span className={styles.menuText}>about</span>
                </Link>

                <div 
                    className={styles.menuWrapper}
                    onMouseEnter={() => window.innerWidth >= 768 && setIsOpen(true)}
                    onMouseLeave={() => window.innerWidth >= 768 && setIsOpen(false)}
                    onClick={() => window.innerWidth < 768 && toggleMenu()}
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
                    <Link href="/" className={pathname === '/' ? styles.active : ''}>projects</Link>
                  </li>
                  <li>
                    <Link href="/essays" className={pathname === '/essays' ? styles.active : ''}>essays</Link>
                  </li>
                  <li>
                    <Link href="/news" className={pathname === '/news' ? styles.active : ''}>news</Link>
                  </li>
                    {isAdmin && (
                        <>
                            <li>
                                <button 
                                    onClick={toggleAdminMode} 
                                    style={{ 
                                        background: 'none', 
                                        border: 'none', 
                                        font: 'inherit', 
                                        cursor: 'pointer', 
                                        textDecoration: 'none',
                                        fontWeight: 'normal',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {adminMode ? 'admin: on' : 'admin: off'}
                                </button>
                            </li>
                            <li>
                                <button onClick={logout} style={{ background: 'none', border: 'none', font: 'inherit', cursor: 'pointer', textDecoration: 'none' }}>logout</button>
                            </li>
                        </>
                    )}
                    {!isAdmin && (
                        <li>
                            <button onClick={handleLoginClick} style={{ background: 'none', border: 'none', font: 'inherit', cursor: 'pointer', textDecoration: 'none' }}>login</button>
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
