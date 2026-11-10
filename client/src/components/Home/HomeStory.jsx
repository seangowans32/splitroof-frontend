import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import expensesImage from '../../assets/img-2.jpeg';
import clarityImage from '../../assets/img-1.jpg';

const startPath = (isLoggedIn) => (isLoggedIn ? '/household' : '/registration');

export default function HomeStory({ isLoggedIn }) {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const nodes = [...root.querySelectorAll('.home-reveal')];
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches) {
      nodes.forEach((node) => node.classList.add('is-in'));
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16 });

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const begin = startPath(isLoggedIn);

  return (
    <div ref={rootRef}>
      <section className="home-statement">
        <p className="home-kicker home-reveal">What it is</p>
        <p className="home-statement-lead home-reveal">
          SplitRoof is a shared household expense app. Track costs, split bills, and keep everyone on the same page.
          <span> Built for roommates, couples, and anyone who shares a roof.</span>
        </p>
        <Link className="home-textlink home-reveal" to={begin}>
          <i />
          {isLoggedIn ? 'Open your household' : 'Create an account'}
          <span aria-hidden="true">→</span>
        </Link>
      </section>

      <p className="home-section-label home-reveal">In the household</p>

      <section className="home-panel">
        <img src={expensesImage} alt="" />
        <div className="home-panel-copy">
          <p className="home-kicker">Expenses <i /> Daily</p>
          <h2>From rent and utilities to groceries and everyday purchases.</h2>
          <Link className="home-textlink" to={begin}>
            <i />
            {isLoggedIn ? 'Open your household' : 'Get Started'}
            <span aria-hidden="true">→</span>
          </Link>
          <ul className="home-stats">
            <li>
              <strong>Split</strong>
              <span>Divide shared costs across the household</span>
            </li>
            <li>
              <strong>Track</strong>
              <span>See what was paid and who still owes</span>
            </li>
            <li>
              <strong>Share</strong>
              <span>One view for everyone under the roof</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="home-panel home-panel-plain">
        <div className="home-panel-copy">
          <p className="home-kicker">Households <i /> Shared</p>
          <h2>Built for the way people actually live together.</h2>
          <ul className="home-stats">
            <li>
              <strong>Roommates</strong>
              <span>Rent, bills, and groceries without the spreadsheet</span>
            </li>
            <li>
              <strong>Couples</strong>
              <span>Shared spending in one clear place</span>
            </li>
            <li>
              <strong>Shared homes</strong>
              <span>Everyone can see the household costs</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="home-panel">
        <img src={clarityImage} alt="" />
        <div className="home-panel-copy">
          <p className="home-kicker">Balances <i /> Clear</p>
          <h2>See who paid what, then settle up without the awkward math.</h2>
          <Link className="home-textlink" to={begin}>
            <i />
            {isLoggedIn ? 'Open your household' : 'Get Started'}
            <span aria-hidden="true">→</span>
          </Link>
          <ul className="home-stats">
            <li>
              <strong>Add</strong>
              <span>Log shared expenses as they happen</span>
            </li>
            <li>
              <strong>Split</strong>
              <span>Fair shares across household members</span>
            </li>
            <li>
              <strong>Settle</strong>
              <span>Clearer balances when it is time to pay</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="home-doors">
        <p className="home-section-label">How to start</p>
        <div className="home-doorgrid">
          <Link className="home-door" to={begin}>
            <p>01 <i /> {isLoggedIn ? 'Your household' : 'Get started'}</p>
            <h2>{isLoggedIn ? 'Pick up the household where you left it.' : 'Create your household and invite the room.'}</h2>
            <span className="home-door-copy">
              {isLoggedIn
                ? 'Your household is already set up. Open it and keep shared spending in one place.'
                : 'Create an account, set up the household, and invite the people who share the costs.'}
            </span>
            <span className="home-textlink">
              <i />
              {isLoggedIn ? 'Open your household' : 'Get Started'}
              <span aria-hidden="true">→</span>
            </span>
            <b aria-hidden="true">01</b>
          </Link>
          <Link className="home-door" to={isLoggedIn ? '/household' : '/login'}>
            <p>02 <i /> {isLoggedIn ? 'Members' : 'Sign in'}</p>
            <h2>{isLoggedIn ? 'Everyone under one roof.' : 'Already part of a household?'}</h2>
            <span className="home-door-copy">
              {isLoggedIn
                ? 'Invite roommates or partners so everyone can track and split the same expenses.'
                : 'Sign in to the household you already share. The expenses and balances are waiting.'}
            </span>
            <span className="home-textlink">
              <i />
              {isLoggedIn ? 'Open your household' : 'Login'}
              <span aria-hidden="true">→</span>
            </span>
            <b aria-hidden="true">02</b>
          </Link>
        </div>
      </section>
    </div>
  );
}
