import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const PHRASES = [
  'Split the rent',
  'Shared bills',
  'Fair shares',
  'One household',
];

const CYCLE_MS = 2600;

const OpenLink = ({ to, children }) => (
  <Link className="home-textlink" to={to}>
    <i />
    {children}
    <span aria-hidden="true">→</span>
  </Link>
);

export default function HomeOpen({
  isLoggedIn,
  phrases = PHRASES,
  fixedLine = 'SplitRoof',
  eyebrow = 'SplitRoof',
  eyebrowEnd = 'Shared living',
  label = 'One household. SplitRoof.',
  subtext = "Splitting household costs shouldn't be messy.",
  sectionLabel = 'Introduction',
  action,
}) {
  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState(null);
  const [opening, setOpening] = useState(true);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches) {
      setOpening(false);
      return undefined;
    }

    const handoff = window.setTimeout(() => setOpening(false), 1500);
    const cycle = window.setInterval(() => {
      setOpening(false);
      setIndex((current) => {
        setPrevious(current);
        return (current + 1) % phrases.length;
      });
    }, CYCLE_MS);

    return () => {
      window.clearTimeout(handoff);
      window.clearInterval(cycle);
    };
  }, [phrases.length]);

  return (
    <section className="home-open" aria-label={sectionLabel}>
      <div className="home-open-inner">
        <p className="home-open-eyebrow">{eyebrow} <i /> {eyebrowEnd}</p>
        <h1 aria-label={label}>
          <span className={`home-open-line home-open-rotor ${opening ? 'is-opening' : ''}`} aria-hidden="true">
            {previous !== null && (
              <span key={`out-${previous}`} className="is-out">{phrases[previous]}</span>
            )}
            <span key={`in-${index}`} className="is-in">{phrases[index]}</span>
          </span>
          <span className="home-open-line home-open-fixed">
            <span className="home-open-rise">{fixedLine}</span>
          </span>
        </h1>
        <div className="home-open-runway" aria-hidden="true">
          <span className="track" />
          <span className="draw" />
          <span className="mark" />
        </div>
        <div className="home-open-below">
          <p>{subtext}</p>
          {action !== undefined ? action : isLoggedIn ? (
            <OpenLink to="/household">Household</OpenLink>
          ) : (
            <div className="home-open-actions">
              <OpenLink to="/login">Login</OpenLink>
              <OpenLink to="/registration">Get Started</OpenLink>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
