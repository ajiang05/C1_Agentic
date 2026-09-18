import { Icon } from "../../components/Icon";
import { useStudy } from "../../lib/store";

export function Welcome() {
  const { go, patch } = useStudy();

  const enter = () => {
    patch({ name: "Matthew" });
    go("preferences");
  };

  return (
    <div className="welcome-page">
      <div className="welcome-atmosphere" aria-hidden="true">
        <span className="welcome-wash welcome-wash-a" />
        <span className="welcome-wash welcome-wash-b" />
      </div>

      <main id="main-content" className="welcome-stage" tabIndex={-1}>
        <div className="welcome-copy">
          <p className="welcome-brand" aria-label="edaptify">
            <span className="welcome-logo">edaptify</span>
          </p>

          <h1 className="welcome-headline">Welcome, Matthew</h1>
          <p className="welcome-support">
            Your course, one clear step at a time.
          </p>

          <div className="welcome-cta">
            <button className="button welcome-enter" onClick={enter}>
              Start learning <Icon name="arrow" size={17} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
