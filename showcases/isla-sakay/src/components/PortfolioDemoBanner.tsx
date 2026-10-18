import { ArrowLeft, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PortfolioDemoBanner() {
  return (
    <div className="portfolio-demo-banner" role="note" aria-label="Portfolio demo information">
      <span className="portfolio-demo-label">Portfolio demo <span aria-hidden="true">·</span> Fictional sample data <span aria-hidden="true">·</span> Changes reset on reload</span>
      <div className="portfolio-demo-actions">
        <Link to="/home">Public website</Link>
        <a href="/#work"><ArrowLeft aria-hidden="true" size={13} /> Portfolio</a>
        <button type="button" onClick={() => window.location.reload()}><RotateCcw aria-hidden="true" size={13} /> Reset demo</button>
      </div>
    </div>
  );
}
