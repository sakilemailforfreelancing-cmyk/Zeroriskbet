import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'

const CAROUSEL_SLIDES = [
  { title: 'Welcome bonus', subtitle: 'Play smarter with Zeroriskbet', bg: 'linear-gradient(135deg, #1a2744 0%, #3d1f4d 100%)' },
  { title: 'Live sports', subtitle: 'Best odds, instant updates', bg: 'linear-gradient(135deg, #0d3d2e 0%, #1a4a6e 100%)' },
  { title: 'Jackpot night', subtitle: 'Big wins every hour', bg: 'linear-gradient(135deg, #4a1e1e 0%, #2a1850 100%)' },
]

const ANNOUNCEMENT = 'Welcome to Zeroriskbet — play responsibly. New games and promos updated regularly.'

type HomeGameItem = {
  id: string
  title: string
  mult: string
  hot: boolean
  theme: string
  thumbnail?: string
  route?: string
  cta?: string
}

const games = [
  {
    id: 'slots',
    title: 'Spin Hot Deal',
    mult: 'HOT DEAL',
    hot: true,
    theme: 'linear-gradient(145deg, #3a0c20, #c0471f)',
    thumbnail: '/images/spin-hot-thumb.svg',
    route: '/games/spin-wheel',
    cta: 'Play Spin',
  },
  {
    id: 'slots',
    title: 'Premium Slots',
    mult: 'JACKPOT',
    hot: true,
    theme: 'linear-gradient(145deg, #281130, #9f4f1e)',
    thumbnail: '/images/slot-card-thumb.svg',
    route: '/games/slots',
    cta: 'Tap to Bet',
  },
  { id: 'slots', title: 'Sport Book', mult: '10000x', hot: true, theme: 'linear-gradient(145deg, #1f5f8e, #2a263f)' },
  {
    id: 'crash',
    title: 'Aviator Crash',
    mult: 'LIVE',
    hot: true,
    theme: 'linear-gradient(145deg, #111c34, #3d1d3f)',
    thumbnail: '/images/crash-thumb.svg',
    route: '/games/crash',
    cta: 'Fly Now',
  },
  {
    id: 'lucky-box',
    title: 'Lucky Box',
    mult: 'UP TO 5x',
    hot: true,
    theme: 'linear-gradient(145deg, #271334, #5c2c22)',
    thumbnail: '/images/lucky-box-thumb.svg',
    route: '/games/lucky-box',
    cta: 'Pick One',
  },
  {
    id: 'coin-flip',
    title: 'Coin Flip',
    mult: '2x',
    hot: true,
    theme: 'linear-gradient(145deg, #25122d, #9a4b1f)',
    thumbnail: '/images/coin-flip-thumb.svg',
    route: '/games/coin-flip',
    cta: 'Flip Now',
  },
  {
    id: 'lucky7',
    title: 'Lucky 7',
    mult: 'JACKPOT',
    hot: true,
    theme: 'linear-gradient(145deg, #2d193c, #9d4e21)',
    thumbnail: '/images/lucky7-thumb.svg',
    route: '/games/lucky7',
    cta: 'Cast Magic',
  },
  {
    id: 'mines',
    title: 'Mines',
    mult: 'RISK',
    hot: true,
    theme: 'linear-gradient(145deg, #241933, #4f2f4a)',
    thumbnail: '/images/mines-thumb.svg',
    route: '/games/mines',
    cta: 'Reveal Gems',
  },
  { id: 'blackjack', title: 'Royal', mult: '2000x', hot: true, theme: 'linear-gradient(145deg, #60288d, #32204f)' },
  { id: 'slots', title: 'JetX3', mult: '5000x', hot: false, theme: 'linear-gradient(145deg, #4a4a4a, #6c5033)' },
  { id: 'roulette', title: 'Sexy', mult: '800x', hot: true, theme: 'linear-gradient(145deg, #7b2753, #241a36)' },
  { id: 'blackjack', title: 'Kingmaker', mult: '1200x', hot: false, theme: 'linear-gradient(145deg, #6c5b19, #4b4233)' },
  { id: 'slots', title: 'Lucky Spin', mult: '3000x', hot: true, theme: 'linear-gradient(145deg, #1e3a5f, #0d2840)' },
  {
    id: 'dice',
    title: 'Premium Dice',
    mult: '2x',
    hot: true,
    theme: 'linear-gradient(145deg, #232323, #8c2cff)',
    thumbnail: '/images/dice-thumb.svg',
  },
  { id: 'roulette', title: 'Turbo', mult: '2500x', hot: false, theme: 'linear-gradient(145deg, #3d2c1e, #5a3d22)' },
  { id: 'blackjack', title: 'Vegas', mult: '1800x', hot: true, theme: 'linear-gradient(145deg, #1a4d3a, #0f2d24)' },
] satisfies HomeGameItem[]

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function LobbyPage() {
  const [slide, setSlide] = useState(0)
  const [category, setCategory] = useState<'jackpot' | 'hot'>('jackpot')
  const [jackpot, setJackpot] = useState({ mini: 1195.52, grand: 43700.24, major: 12833.55 })

  useEffect(() => {
    const t = window.setInterval(() => {
      setJackpot((j) => ({
        mini: j.mini + (Math.random() - 0.45) * 2,
        grand: j.grand + (Math.random() - 0.45) * 8,
        major: j.major + (Math.random() - 0.45) * 4,
      }))
    }, 2000)
    return () => window.clearInterval(t)
  }, [])

  const nextSlide = () => setSlide((s) => (s + 1) % CAROUSEL_SLIDES.length)
  const prevSlide = () => setSlide((s) => (s - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length)

  return (
    <AppShell title="Home" variant="home">
      <div className="home-scroll">
        <div className="home-carousel-wrap">
          <button type="button" className="home-carousel-arrow home-carousel-arrow--prev" aria-label="Previous" onClick={prevSlide}>
            ‹
          </button>
          <div className="home-carousel" style={{ background: CAROUSEL_SLIDES[slide].bg }}>
            <div className="home-carousel-inner">
              <p className="home-carousel-kicker">Featured</p>
              <h2 className="home-carousel-title">{CAROUSEL_SLIDES[slide].title}</h2>
              <p className="home-carousel-sub">{CAROUSEL_SLIDES[slide].subtitle}</p>
            </div>
          </div>
          <button type="button" className="home-carousel-arrow home-carousel-arrow--next" aria-label="Next" onClick={nextSlide}>
            ›
          </button>
          <div className="home-carousel-dots">
            {CAROUSEL_SLIDES.map((_, i) => (
              <button key={i} type="button" className={`home-dot ${i === slide ? 'active' : ''}`} aria-label={`Slide ${i + 1}`} onClick={() => setSlide(i)} />
            ))}
          </div>
        </div>

        <div className="home-ticker" role="marquee">
          <span className="home-ticker-text">{ANNOUNCEMENT}</span>
        </div>

        <div className="home-category-row">
          <button type="button" className={`home-pill ${category === 'jackpot' ? 'active' : ''}`} onClick={() => setCategory('jackpot')}>
            <span className="home-pill-icon" aria-hidden="true">
              JP
            </span>
            Jackpot
          </button>
          <button type="button" className={`home-pill ${category === 'hot' ? 'active' : ''}`} onClick={() => setCategory('hot')}>
            <span className="home-pill-icon home-pill-icon--flame" aria-hidden="true" />
            Hot
          </button>
        </div>

        <section className="home-jackpot-banner">
          <p className="home-jackpot-brand">Zeroriskbet x JACKPOT</p>
          <div className="home-jackpot-row">
            <div className="home-jackpot-box home-jackpot-box--mini">
              <span className="home-jackpot-label">MINI</span>
              <strong>{formatMoney(jackpot.mini)}</strong>
            </div>
            <div className="home-jackpot-box home-jackpot-box--grand">
              <span className="home-jackpot-label">GRAND</span>
              <strong>{formatMoney(jackpot.grand)}</strong>
            </div>
            <div className="home-jackpot-box home-jackpot-box--major">
              <span className="home-jackpot-label">MAJOR</span>
              <strong>{formatMoney(jackpot.major)}</strong>
            </div>
          </div>
        </section>

        <div className="home-game-grid-wrap">
          <div className="home-game-grid">
            {(category === 'hot' ? games.filter((g) => g.hot) : games).map((game) => (
              <Link key={`${game.id}-${game.title}`} to={game.route ?? `/games/${game.id}`} className="home-game-tile">
                {game.hot ? <span className="home-badge-hot">HOT</span> : null}
                <span className="home-badge-mult">{game.mult}</span>
                <div className="home-game-art" style={{ background: game.theme }}>
                  {game.thumbnail ? <img className="home-game-thumb" src={game.thumbnail} alt={`${game.title} thumbnail`} /> : null}
                  <span className="home-game-title">{game.title}</span>
                  {game.cta ? <span className="home-game-cta">{game.cta}</span> : null}
                </div>
              </Link>
            ))}
          </div>
          <Link to="/promotion" className="home-fab" aria-label="Promotions">
            Z
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
