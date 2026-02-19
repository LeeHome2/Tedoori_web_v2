
import Header from "@/components/Header";
import BackToTop from "@/components/BackToTop";

export default function AboutPage() {
  return (
    <main>
      <Header />
      <div style={{ 
        maxWidth: '800px', 
        margin: '150px auto 100px', 
        padding: '0 20px', 
        fontFamily: 'Consolas, monospace',
        lineHeight: '1.6'
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '40px', fontWeight: 'bold' }}>ABOUT</h1>
        
        <div style={{ marginBottom: '40px' }}>
          <p style={{ marginBottom: '20px' }}>
            Tedoori is an architectural practice based in Seoul.
          </p>
          <p>
            We focus on the essential qualities of space and structure, exploring the relationship between form and function.
          </p>
        </div>

        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px', fontWeight: 'bold' }}>CONTACT</h2>
          <p>Email: info@tedoori.com</p>
          <p>Tel: +82 2 1234 5678</p>
          <p>Address: 123, Sejong-daero, Jongno-gu, Seoul, Republic of Korea</p>
        </div>
      </div>
      <BackToTop />
    </main>
  );
}
