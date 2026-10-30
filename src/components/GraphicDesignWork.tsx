import { sitePath } from "../lib/site-path";
import "./GraphicDesignWork.css";

type DesignScreen = {
  src: string;
  label: string;
  description: string;
  className?: string;
};

const screens: DesignScreen[] = [
  {
    src: "/projects/codecart/navigation.png",
    label: "Navigation",
    description: "Category navigation and utility actions",
    className: "graphic-design-screen-wide",
  },
  {
    src: "/projects/codecart/hero-full.png",
    label: "Landing hero",
    description: "Primary campaign message and shopping actions",
  },
  {
    src: "/projects/codecart/product-showcase.png",
    label: "Product showcase",
    description: "Featured products with a visual product hierarchy",
  },
  {
    src: "/projects/codecart/collection-options.png",
    label: "Collection paths",
    description: "Three category-led shopping entry points",
  },
  {
    src: "/projects/codecart/sign-in-layout.png",
    label: "Sign-in layout",
    description: "Split-screen authentication experience",
  },
  {
    src: "/projects/codecart/brand-statement.png",
    label: "Brand statement",
    description: "Campaign message and brand voice treatment",
    className: "graphic-design-screen-wide",
  },
  {
    src: "/projects/codecart/footer.png",
    label: "Footer",
    description: "Closing legal and utility content",
    className: "graphic-design-screen-wide",
  },
];

function Arrow() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

export default function GraphicDesignWork() {
  return (
    <article className="graphic-design-case-study">
      <header className="graphic-design-case-header">
        <div>
          <div className="graphic-design-kicker">
            <span>CODECART</span>
            <span>FIGMA UI CONCEPT</span>
          </div>
          <h4>Footwear e-commerce, designed as a complete visual system.</h4>
        </div>
        <p>
          A self-directed Figma concept that brings together campaign-led
          landing pages, product discovery, category paths, navigation, and a
          sign-in layout in one consistent storefront.
        </p>
      </header>

      <div className="graphic-design-featured-grid">
        <figure className="graphic-design-primary-screen">
          <img
            src={sitePath("/projects/codecart/product-showcase.png")}
            alt="CodeCart footwear product showcase designed in Figma"
            loading="lazy"
            width="1897"
            height="932"
          />
          <figcaption>
            <span>01 / FEATURED PRODUCT SHOWCASE</span>
            <span>FIGMA</span>
          </figcaption>
        </figure>
        <div className="graphic-design-summary">
          <div className="graphic-design-summary-top">
            <span>DESIGN FOCUS</span>
            <span>07 SCREENS</span>
          </div>
          <dl>
            <div>
              <dt>Visual direction</dt>
              <dd>Forest, cream, and muted seasonal color pairings.</dd>
            </div>
            <div>
              <dt>Core flows</dt>
              <dd>Browse, select a collection, and sign in.</dd>
            </div>
            <div>
              <dt>Design details</dt>
              <dd>Clear hierarchy, repeated actions, and component consistency.</dd>
            </div>
          </dl>
          <ul className="graphic-design-tags" aria-label="Design capabilities shown">
            <li>UI design</li>
            <li>E-commerce</li>
            <li>Responsive layouts</li>
            <li>Visual hierarchy</li>
          </ul>
        </div>
      </div>

      <details className="graphic-design-screen-details">
        <summary>
          Browse all 7 Figma screens
          <Arrow />
        </summary>
        <div className="graphic-design-screen-grid">
          {screens.map((screen) => (
            <figure
              className={`graphic-design-screen ${screen.className ?? ""}`}
              key={screen.src}
            >
              <img
                src={sitePath(screen.src)}
                alt={`CodeCart ${screen.label.toLowerCase()} screen: ${screen.description}`}
                loading="lazy"
                width="1897"
                height="932"
              />
              <figcaption>
                <strong>{screen.label}</strong>
                <span>{screen.description}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </details>

      <p className="graphic-design-disclaimer">
        CodeCart is an independent design concept created in Figma. Product
        imagery and Nike marks appear only within this portfolio sample; no
        affiliation or endorsement is implied.
      </p>
    </article>
  );
}
