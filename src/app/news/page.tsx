
import type { Metadata } from "next";
import Header from "@/components/Header";
import BackToTop from "@/components/BackToTop";

export const metadata: Metadata = {
  title: "News | NP2F",
  description: "Latest news and updates from NP2F",
};

export default function NewsPage() {
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
            <span style={{ color: 'black', fontWeight: 'bold' }}>news</span>
        </div>

        <h1 style={{ fontSize: '24px', marginBottom: '40px', fontWeight: 'bold', textTransform: 'uppercase' }}>News</h1>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {/* Placeholder Content */}
            <article style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '5px' }}>2024.02.10</span>
                    <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Exhibition: Modern Wood Architecture</h2>
                    <p style={{ color: '#666' }}>
                        Our project "Taehwagang Eco-Center" is currently featured in the Modern Wood Architecture exhibition at Seoul Hall of Urbanism.
                    </p>
                </div>
            </article>

            <article style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '5px' }}>2023.12.05</span>
                    <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Award: Public Design 2023</h2>
                    <p style={{ color: '#666' }}>
                        NP2F has been awarded the Grand Prize in the 2023 Public Design Awards for our recent community center project.
                    </p>
                </div>
            </article>
        </div>
      </div>
      <BackToTop />
    </main>
  );
}
