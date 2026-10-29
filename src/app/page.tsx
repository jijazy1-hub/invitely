import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#FAFAF8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;1,9..144,400;1,9..144,600&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .nav { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 2.5rem; background: #fff; border-bottom: 1px solid #EBEBEB; position: sticky; top: 0; z-index: 50; }
        .logo { display: flex; align-items: center; gap: 0.625rem; text-decoration: none; }
        .logo-mark { width: 36px; height: 36px; background: #F05537; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .logo-text { font-family: 'Fraunces', serif; font-weight: 700; font-size: 1.375rem; color: #1A1A2E; letter-spacing: -0.02em; }
        .nav-links { display: flex; align-items: center; gap: 2rem; }
        .nav-link { color: #4A4A6A; font-size: 0.9rem; font-weight: 500; text-decoration: none; transition: color 0.2s; }
        .nav-link:hover { color: #1A1A2E; }
        .nav-cta { background: #F05537; color: #fff; padding: 0.625rem 1.375rem; border-radius: 100px; font-size: 0.9rem; font-weight: 600; text-decoration: none; transition: all 0.2s; display: inline-flex; align-items: center; gap: 0.375rem; }
        .nav-cta:hover { background: #D4431D; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(240,85,55,0.3); }

        .hero { padding: 5rem 2.5rem 4rem; max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 5rem; align-items: center; }
        .hero-badge { display: inline-flex; align-items: center; gap: 0.5rem; background: #FFF0EC; color: #F05537; padding: 0.375rem 0.875rem; border-radius: 100px; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 1.5rem; }
        .hero-badge-dot { width: 6px; height: 6px; background: #F05537; border-radius: 50%; animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .hero-title { font-family: 'Fraunces', serif; font-size: clamp(2.5rem, 5vw, 3.75rem); font-weight: 700; color: #1A1A2E; line-height: 1.1; letter-spacing: -0.03em; margin-bottom: 1.25rem; }
        .hero-title em { font-style: italic; color: #F05537; }
        .hero-sub { color: #6B6B8A; font-size: 1.1rem; line-height: 1.7; margin-bottom: 2.5rem; font-weight: 400; max-width: 480px; }
        .hero-actions { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
        .btn-primary { background: #F05537; color: #fff; padding: 0.875rem 2rem; border-radius: 100px; font-size: 0.95rem; font-weight: 600; text-decoration: none; transition: all 0.2s; display: inline-flex; align-items: center; gap: 0.5rem; }
        .btn-primary:hover { background: #D4431D; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(240,85,55,0.35); }
        .btn-secondary { color: #1A1A2E; padding: 0.875rem 1.5rem; border-radius: 100px; font-size: 0.95rem; font-weight: 600; text-decoration: none; border: 1.5px solid #DDDDE8; transition: all 0.2s; background: #fff; }
        .btn-secondary:hover { border-color: #1A1A2E; background: #F5F5FA; }
        .hero-stats { display: flex; gap: 2.5rem; margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #EBEBEB; }
        .stat-num { font-family: 'Fraunces', serif; font-size: 1.75rem; font-weight: 700; color: #1A1A2E; letter-spacing: -0.02em; }
        .stat-label { color: #9090A8; font-size: 0.82rem; font-weight: 500; margin-top: 0.125rem; }

        .hero-visual { position: relative; }
        .card-stack { position: relative; height: 420px; }
        .event-card { background: #fff; border-radius: 20px; padding: 1.5rem; box-shadow: 0 4px 32px rgba(26,26,46,0.1); position: absolute; width: 300px; }
        .card-1 { top: 0; right: 0; transform: rotate(3deg); z-index: 1; }
        .card-2 { top: 60px; right: 40px; transform: rotate(-1deg); z-index: 2; background: #1A1A2E; }
        .card-3 { top: 140px; right: 10px; z-index: 3; }
        .card-img { height: 140px; border-radius: 12px; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; font-size: 3rem; }
        .card-tag { display: inline-block; padding: 0.25rem 0.625rem; border-radius: 100px; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 0.625rem; }
        .card-name { font-weight: 700; font-size: 1rem; margin-bottom: 0.25rem; }
        .card-meta { font-size: 0.8rem; opacity: 0.6; }
        .floating-badge { position: absolute; background: #fff; border-radius: 14px; padding: 0.75rem 1rem; box-shadow: 0 8px 32px rgba(26,26,46,0.12); display: flex; align-items: center; gap: 0.625rem; font-size: 0.82rem; font-weight: 600; color: #1A1A2E; }
        .badge-1 { top: 20px; left: -20px; z-index: 10; }
        .badge-2 { bottom: 60px; left: 0; z-index: 10; }
        .badge-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1rem; }

        .logos-strip { background: #F5F5FA; padding: 2rem 2.5rem; text-align: center; }
        .logos-label { color: #9090A8; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 1.25rem; }
        .logos-row { display: flex; justify-content: center; align-items: center; gap: 3rem; flex-wrap: wrap; }
        .logo-item { color: #C0C0D0; font-family: 'Fraunces', serif; font-weight: 700; font-size: 1.1rem; letter-spacing: -0.01em; }

        .features { padding: 6rem 2.5rem; max-width: 1200px; margin: 0 auto; }
        .section-label { color: #F05537; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 1rem; }
        .section-title { font-family: 'Fraunces', serif; font-size: clamp(2rem, 4vw, 2.75rem); font-weight: 700; color: #1A1A2E; letter-spacing: -0.03em; line-height: 1.15; margin-bottom: 1rem; max-width: 520px; }
        .section-title em { font-style: italic; color: #F05537; }
        .section-sub { color: #6B6B8A; font-size: 1rem; line-height: 1.7; max-width: 480px; margin-bottom: 4rem; }
        .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
        .feature-card { background: #fff; border-radius: 20px; padding: 2rem; border: 1px solid #EBEBEB; transition: all 0.3s; position: relative; overflow: hidden; }
        .feature-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(26,26,46,0.08); border-color: transparent; }
        .feature-card.accent { background: #1A1A2E; border-color: #1A1A2E; }
        .feature-card.accent .feature-title { color: #fff; }
        .feature-card.accent .feature-desc { color: rgba(255,255,255,0.6); }
        .feature-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.375rem; margin-bottom: 1.25rem; }
        .feature-title { font-weight: 700; font-size: 1.05rem; color: #1A1A2E; margin-bottom: 0.5rem; }
        .feature-desc { color: #6B6B8A; font-size: 0.88rem; line-height: 1.65; }

        .event-types { background: #1A1A2E; padding: 6rem 2.5rem; }
        .event-types-inner { max-width: 1200px; margin: 0 auto; }
        .event-types .section-label { color: #F05537; }
        .event-types .section-title { color: #fff; max-width: 100%; }
        .event-types .section-sub { color: rgba(255,255,255,0.55); }
        .types-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-top: 3rem; }
        .type-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 1.5rem; transition: all 0.3s; cursor: default; }
        .type-card:hover { background: rgba(240,85,55,0.12); border-color: rgba(240,85,55,0.3); transform: translateY(-2px); }
        .type-emoji { font-size: 2rem; margin-bottom: 0.75rem; display: block; }
        .type-name { color: #fff; font-weight: 600; font-size: 0.95rem; margin-bottom: 0.25rem; }
        .type-desc { color: rgba(255,255,255,0.45); font-size: 0.8rem; }

        .how-it-works { padding: 6rem 2.5rem; max-width: 1200px; margin: 0 auto; }
        .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3rem; margin-top: 4rem; position: relative; }
        .steps::before { content: ''; position: absolute; top: 28px; left: calc(16.67% + 1.5rem); right: calc(16.67% + 1.5rem); height: 1px; background: repeating-linear-gradient(90deg, #DDDDE8 0, #DDDDE8 6px, transparent 6px, transparent 14px); }
        .step { text-align: center; }
        .step-num { width: 56px; height: 56px; border-radius: 50%; background: #F05537; color: #fff; font-family: 'Fraunces', serif; font-size: 1.25rem; font-weight: 700; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; position: relative; z-index: 1; box-shadow: 0 0 0 8px #FAFAF8; }
        .step-title { font-weight: 700; font-size: 1.05rem; color: #1A1A2E; margin-bottom: 0.5rem; }
        .step-desc { color: #6B6B8A; font-size: 0.88rem; line-height: 1.65; }

        .pricing { background: #F5F5FA; padding: 6rem 2.5rem; }
        .pricing-inner { max-width: 1000px; margin: 0 auto; text-align: center; }
        .pricing .section-title { margin: 0 auto 0.75rem; }
        .pricing .section-sub { margin: 0 auto 3.5rem; }
        .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
        .plan-card { background: #fff; border-radius: 24px; padding: 2rem; border: 1.5px solid #EBEBEB; text-align: left; position: relative; transition: all 0.3s; }
        .plan-card.popular { border-color: #F05537; background: #1A1A2E; }
        .plan-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(26,26,46,0.1); }
        .popular-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #F05537; color: #fff; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 0.25rem 0.875rem; border-radius: 100px; white-space: nowrap; }
        .plan-name { font-weight: 700; font-size: 0.85rem; letter-spacing: 0.06em; text-transform: uppercase; color: #9090A8; margin-bottom: 0.75rem; }
        .plan-card.popular .plan-name { color: rgba(255,255,255,0.5); }
        .plan-price { font-family: 'Fraunces', serif; font-size: 2.5rem; font-weight: 700; color: #1A1A2E; letter-spacing: -0.03em; line-height: 1; margin-bottom: 0.25rem; }
        .plan-card.popular .plan-price { color: #fff; }
        .plan-period { color: #9090A8; font-size: 0.82rem; margin-bottom: 1.5rem; }
        .plan-card.popular .plan-period { color: rgba(255,255,255,0.45); }
        .plan-features { list-style: none; margin-bottom: 2rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .plan-features li { display: flex; align-items: center; gap: 0.625rem; font-size: 0.88rem; color: #4A4A6A; }
        .plan-card.popular .plan-features li { color: rgba(255,255,255,0.75); }
        .plan-features li::before { content: '✓'; color: #F05537; font-weight: 700; font-size: 0.8rem; flex-shrink: 0; }
        .plan-btn { width: 100%; padding: 0.75rem; border-radius: 100px; font-weight: 600; font-size: 0.9rem; text-align: center; text-decoration: none; display: block; transition: all 0.2s; border: 1.5px solid #DDDDE8; color: #1A1A2E; background: transparent; }
        .plan-btn:hover { border-color: #1A1A2E; background: #F5F5FA; }
        .plan-btn.primary { background: #F05537; border-color: #F05537; color: #fff; }
        .plan-btn.primary:hover { background: #D4431D; border-color: #D4431D; box-shadow: 0 4px 16px rgba(240,85,55,0.35); }

        .cta-section { padding: 6rem 2.5rem; max-width: 800px; margin: 0 auto; text-align: center; }
        .cta-title { font-family: 'Fraunces', serif; font-size: clamp(2.25rem, 4.5vw, 3.25rem); font-weight: 700; color: #1A1A2E; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 1.25rem; }
        .cta-title em { font-style: italic; color: #F05537; }
        .cta-sub { color: #6B6B8A; font-size: 1.05rem; margin-bottom: 2.5rem; line-height: 1.65; }
        .cta-actions { display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; }

        footer { background: #1A1A2E; padding: 3rem 2.5rem; }
        .footer-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1.5rem; }
        .footer-logo { font-family: 'Fraunces', serif; font-weight: 700; font-size: 1.25rem; color: #fff; text-decoration: none; }
        .footer-links { display: flex; gap: 2rem; }
        .footer-link { color: rgba(255,255,255,0.4); font-size: 0.85rem; text-decoration: none; transition: color 0.2s; }
        .footer-link:hover { color: rgba(255,255,255,0.8); }
        .footer-copy { color: rgba(255,255,255,0.3); font-size: 0.82rem; }

        @media (max-width: 900px) {
          .hero { grid-template-columns: 1fr; gap: 3rem; }
          .card-stack { height: 300px; }
          .features-grid { grid-template-columns: 1fr 1fr; }
          .types-grid { grid-template-columns: repeat(2, 1fr); }
          .steps { grid-template-columns: 1fr; }
          .steps::before { display: none; }
          .pricing-grid { grid-template-columns: 1fr; max-width: 400px; margin: 0 auto; }
          .nav-links { display: none; }
        }
      `}</style>

      {/* Nav */}
      <nav className="nav">
        <Link href="/" className="logo">
          <div className="logo-mark">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L11.5 7H16.5L12.5 10.5L14 16L9 13L4 16L5.5 10.5L1.5 7H6.5L9 2Z" fill="white"/>
            </svg>
          </div>
          <span className="logo-text">Invitely</span>
        </Link>
        <div className="nav-links">
          <Link href="#features" className="nav-link">Features</Link>
          <Link href="#how-it-works" className="nav-link">How it works</Link>
          <Link href="#pricing" className="nav-link">Pricing</Link>
          <Link href="/sign-in" className="nav-link">Sign in</Link>
        </div>
        <Link href="/sign-up" className="nav-cta">
          Create event
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Link>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div>
          <div className="hero-badge">
            <span className="hero-badge-dot"></span>
            Now with QR check-in
          </div>
          <h1 className="hero-title">
            Events that leave a<br /><em>lasting impression</em>
          </h1>
          <p className="hero-sub">
            Create stunning digital invitations, manage RSVPs effortlessly, and check in guests with QR codes. Everything you need to host unforgettable events.
          </p>
          <div className="hero-actions">
            <Link href="/sign-up" className="btn-primary">
              Start for free
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M8 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
            <Link href="/sign-in" className="btn-secondary">Sign in</Link>
          </div>
          <div className="hero-stats">
            <div>
              <div className="stat-num">10+</div>
              <div className="stat-label">Event types</div>
            </div>
            <div>
              <div className="stat-num">Free</div>
              <div className="stat-label">To get started</div>
            </div>
            <div>
              <div className="stat-num">QR</div>
              <div className="stat-label">Check-in built in</div>
            </div>
          </div>
        </div>

        {/* Card Visual */}
        <div className="hero-visual">
          <div className="card-stack">
            <div className="event-card card-1">
              <div className="card-img" style={{background: "linear-gradient(135deg, #FFF0EC, #FFDDD5)"}}>🎂</div>
              <span className="card-tag" style={{background: "#FFF0EC", color: "#F05537"}}>Birthday</span>
              <div className="card-name" style={{color: "#1A1A2E"}}>Tolu's 30th Bash</div>
              <div className="card-meta" style={{color: "#9090A8"}}>Sat, June 14 · Lagos</div>
            </div>
            <div className="event-card card-2">
              <div className="card-img" style={{background: "linear-gradient(135deg, #1A1A2E, #2D2D4E)"}}>💍</div>
              <span className="card-tag" style={{background: "rgba(240,85,55,0.2)", color: "#F05537"}}>Wedding</span>
              <div className="card-name" style={{color: "#fff"}}>Gabi & Esther</div>
              <div className="card-meta" style={{color: "rgba(255,255,255,0.45)"}}>Sat, Aug 2 · Abuja</div>
            </div>
            <div className="event-card card-3">
              <div className="card-img" style={{background: "linear-gradient(135deg, #E8F5FF, #C8E8FF)"}}>🎤</div>
              <span className="card-tag" style={{background: "#E8F5FF", color: "#0066CC"}}>Conference</span>
              <div className="card-name" style={{color: "#1A1A2E"}}>TechFest 2025</div>
              <div className="card-meta" style={{color: "#9090A8"}}>Fri, Sep 5 · Lagos</div>
            </div>
            <div className="floating-badge badge-1">
              <div className="badge-icon" style={{background: "#ECFDF5"}}>✅</div>
              <div>
                <div style={{fontSize: "0.75rem", color: "#1A1A2E", fontWeight: 700}}>247 confirmed</div>
                <div style={{fontSize: "0.7rem", color: "#9090A8"}}>RSVPs today</div>
              </div>
            </div>
            <div className="floating-badge badge-2">
              <div className="badge-icon" style={{background: "#FFF0EC"}}>📱</div>
              <div>
                <div style={{fontSize: "0.75rem", color: "#1A1A2E", fontWeight: 700}}>QR Check-in</div>
                <div style={{fontSize: "0.7rem", color: "#9090A8"}}>Instant scan</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features" id="features">
        <div className="section-label">Why Invitely</div>
        <h2 className="section-title">Everything your event <em>deserves</em></h2>
        <p className="section-sub">From the invitation to the last check-in, we've built every tool you need to host flawlessly.</p>
        <div className="features-grid">
          {[
            { icon: "✉️", bg: "#FFF0EC", title: "Beautiful Invitations", desc: "Stunning digital cards with your brand colors. Guests can view, RSVP, and download their admission card in seconds.", accent: false },
            { icon: "👥", bg: "#F0F0FF", title: "Smart Guest Management", desc: "Import from CSV, Excel, or paste bulk text. Auto-deduplication, phone normalization, and detailed import reports.", accent: true },
            { icon: "📱", bg: "#ECFDF5", title: "QR Code Check-In", desc: "Every confirmed guest gets a unique QR code. Scan at the door for instant verification with duplicate prevention.", accent: false },
            { icon: "📊", bg: "#FFF8E1", title: "Live Analytics", desc: "Track RSVPs in real time. See daily trends, response rates, and check-in stats as they happen.", accent: false },
            { icon: "🎨", bg: "#F5F0FF", title: "Custom Branding", desc: "Match your event's colors and style. Every invitation feels uniquely yours with full color customization.", accent: false },
            { icon: "⚡", bg: "#FFF0EC", title: "Lightning Fast Setup", desc: "Create your event and share the invite link in under 3 minutes. No tech skills required.", accent: false },
          ].map((f) => (
            <div key={f.title} className={`feature-card${f.accent ? " accent" : ""}`}>
              <div className="feature-icon" style={{background: f.accent ? "rgba(255,255,255,0.1)" : f.bg}}>{f.icon}</div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Event Types */}
      <section className="event-types">
        <div className="event-types-inner">
          <div className="section-label">Every occasion</div>
          <h2 className="section-title" style={{color: "#fff", maxWidth: "100%"}}>One platform, <em>infinite events</em></h2>
          <p className="section-sub" style={{color: "rgba(255,255,255,0.55)"}}>From intimate dinners to massive conferences — Invitely handles every type of gathering with grace.</p>
          <div className="types-grid">
            {[
              { emoji: "💍", name: "Weddings", desc: "Elegant invitations for your big day" },
              { emoji: "🎂", name: "Birthdays", desc: "Celebrate in style, big or small" },
              { emoji: "🎤", name: "Conferences", desc: "Professional events, seamlessly managed" },
              { emoji: "🎵", name: "Concerts", desc: "Ticketing and check-in made easy" },
              { emoji: "⛪", name: "Church Programs", desc: "Worship events and special services" },
              { emoji: "🥂", name: "VIP Parties", desc: "Exclusive access with QR codes" },
              { emoji: "🕊️", name: "Burials", desc: "Dignified farewell ceremonies" },
              { emoji: "🍽️", name: "Private Dinners", desc: "Intimate gatherings, perfectly managed" },
            ].map((t) => (
              <div key={t.name} className="type-card">
                <span className="type-emoji">{t.emoji}</span>
                <div className="type-name">{t.name}</div>
                <div className="type-desc">{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="how-it-works" id="how-it-works">
        <div style={{textAlign: "center"}}>
          <div className="section-label">Simple process</div>
          <h2 className="section-title" style={{margin: "0 auto 0.75rem"}}>Up and running in <em>minutes</em></h2>
          <p className="section-sub" style={{margin: "0 auto 0"}}>No complicated setup. Just create, invite, and enjoy.</p>
        </div>
        <div className="steps">
          {[
            { n: "1", title: "Create your event", desc: "Fill in your event details, pick your colors, and publish your invitation page in under 3 minutes." },
            { n: "2", title: "Invite your guests", desc: "Share your unique invite link via WhatsApp, email, or social media. Guests RSVP instantly." },
            { n: "3", title: "Check in at the door", desc: "Every confirmed guest has a QR code. Scan it for instant check-in — no printed lists needed." },
          ].map((s) => (
            <div key={s.n} className="step">
              <div className="step-num">{s.n}</div>
              <div className="step-title">{s.title}</div>
              <div className="step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="pricing" id="pricing">
        <div className="pricing-inner">
          <div className="section-label">Pricing</div>
          <h2 className="section-title" style={{margin: "0 auto 0.75rem"}}>Simple, honest <em>pricing</em></h2>
          <p className="section-sub" style={{margin: "0 auto"}}>Start free, upgrade when you need more. No hidden fees, ever.</p>
          <div className="pricing-grid" style={{marginTop: "3.5rem"}}>
            {[
              { name: "Free", price: "₦0", period: "forever", popular: false, features: ["1 event", "Up to 50 guests", "QR check-in", "Basic analytics", "Invite page"], btn: "Get started", btnClass: "" },
              { name: "Basic", price: "₦5,000", period: "per month", popular: true, features: ["Up to 5 events", "Up to 500 guests", "QR check-in", "Full analytics", "Custom branding", "Priority support"], btn: "Start free trial", btnClass: "primary" },
              { name: "Premium", price: "₦15,000", period: "per month", popular: false, features: ["Unlimited events", "Unlimited guests", "Everything in Basic", "White-label", "API access", "Dedicated support"], btn: "Contact us", btnClass: "" },
            ].map((p) => (
              <div key={p.name} className={`plan-card${p.popular ? " popular" : ""}`}>
                {p.popular && <div className="popular-badge">Most popular</div>}
                <div className="plan-name">{p.name}</div>
                <div className="plan-price">{p.price}</div>
                <div className="plan-period">{p.period}</div>
                <ul className="plan-features">
                  {p.features.map((f) => <li key={f}>{f}</li>)}
                </ul>
                <Link href="/sign-up" className={`plan-btn${p.btnClass ? " " + p.btnClass : ""}`}>{p.btn}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2 className="cta-title">Ready to host your<br /><em>next great event?</em></h2>
        <p className="cta-sub">Join thousands of event organizers who trust Invitely to make their events unforgettable. Free to start, no credit card required.</p>
        <div className="cta-actions">
          <Link href="/sign-up" className="btn-primary">
            Create your first event
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M8 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
          <Link href="/sign-in" className="btn-secondary">Sign in</Link>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="footer-inner">
          <Link href="/" className="footer-logo">Invitely</Link>
          <div className="footer-links">
            <a href="#" className="footer-link">Privacy</a>
            <a href="#" className="footer-link">Terms</a>
            <a href="#" className="footer-link">Support</a>
          </div>
          <div className="footer-copy">© 2025 Invitely. All rights reserved.</div>
        </div>
      </footer>
    </main>
  );
}