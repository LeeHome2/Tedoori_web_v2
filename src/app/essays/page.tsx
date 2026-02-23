
import type { Metadata } from "next";
import Header from "@/components/Header";
import BackToTop from "@/components/BackToTop";

export const metadata: Metadata = {
  title: "Essays | NP2F",
  description: "Architectural essays and thoughts by NP2F",
};

export default function EssaysPage() {
  return (
    <main>
      <Header />
      <div style={{ 
        maxWidth: '800px', 
        margin: '150px auto 100px', 
        padding: '0 20px', 
        fontFamily: 'Consolas, monospace',
        lineHeight: '1.6',
        minHeight: '60vh'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px', fontSize: '14px', color: '#666' }}>
            <span>works</span>
            <span>/</span>
            <span style={{ color: 'black', fontWeight: 'bold' }}>essays</span>
        </div>

        <h1 style={{ fontSize: '24px', marginBottom: '40px', fontWeight: 'bold', textTransform: 'uppercase' }}>Essays</h1>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {/* Placeholder Content */}
            <article style={{ borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
                <span style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '5px' }}>2024.03.15</span>
                <h2 style={{ fontSize: '18px', marginBottom: '10px', cursor: 'pointer' }}>On Structure and Space</h2>
                <p style={{ color: '#666' }}>
                    Exploring the fundamental relationship between structural integrity and spatial experience in modern architecture...
                </p>
            </article>

            <article style={{ borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
                <span style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '5px' }}>2024.01.20</span>
                <h2 style={{ fontSize: '18px', marginBottom: '10px', cursor: 'pointer' }}>Materiality in Context</h2>
                <p style={{ color: '#666' }}>
                    How local materials shape the identity of place and ground architecture in its specific environment...
                </p>
            </article>
        </div>
      </div>
      <BackToTop />
    </main>
  );
}
