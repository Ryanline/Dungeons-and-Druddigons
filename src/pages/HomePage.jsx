import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { assetUrl } from "../utils/assetUrl";

const HERO_INTERVAL_MS = 10000;
const HERO_TRANSITION_MS = 700;

export function HomePage() {
  const heroImages = useMemo(
    () => [
      assetUrl("resources/images/slides/arcanine.webp"),
      assetUrl("resources/images/slides/pikachu.jpg"),
      assetUrl("resources/images/slides/shinx.jpg"),
      assetUrl("resources/images/slides/chimchar.jpg"),
    ],
    []
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [incomingIndex, setIncomingIndex] = useState(null);
  const [incomingFromRight, setIncomingFromRight] = useState(false);
  const [currentExitingLeft, setCurrentExitingLeft] = useState(false);
  const transitionTimeoutRef = useRef(null);

  useEffect(() => {
    heroImages.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [heroImages]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const nextIndex = (currentIndex + 1) % heroImages.length;

      setIncomingIndex(nextIndex);
      setIncomingFromRight(true);
      setCurrentExitingLeft(true);

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setIncomingFromRight(false));
      });

      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current);
      }

      transitionTimeoutRef.current = window.setTimeout(() => {
        setCurrentIndex(nextIndex);
        setIncomingIndex(null);
        setCurrentExitingLeft(false);
      }, HERO_TRANSITION_MS + 50);
    }, HERO_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [currentIndex, heroImages.length]);

  return (
    <main className="page" role="main">
      <div className="content">
        <div className="hero">
          <img
            className={`hero-img is-active${currentExitingLeft ? " exit-left" : ""}`}
            src={heroImages[currentIndex]}
            alt="Pokemon artwork"
          />
          {incomingIndex !== null && (
            <img
              className={`hero-img is-active${incomingFromRight ? " enter-right" : ""}`}
              src={heroImages[incomingIndex]}
              alt="Pokemon artwork"
              aria-hidden="true"
            />
          )}
        </div>

        <h1>Dungeons &amp; Druddigons</h1>

        <section className="step" aria-labelledby="what-title">
          <h2 id="what-title">What is Dungeons &amp; Druddigons?</h2>
          <p>
            Dungeons &amp; Druddigons is a D&amp;D 5e Pokemon homebrew adaptation built for
            playing D&amp;D 5e as Pokemon player characters. Character classes and many other
            features remain the same as in vanilla D&amp;D 5e. But instead of typical character
            species, players choose a Pokemon species to play as. Instead of species features,
            Pokemon species have <Link to="/abilities" className="inline-link">Abilities</Link>.
            And instead of spells and weapons, Pokemon learn{" "}
            <Link to="/moves" className="inline-link">Moves</Link> that they can use in and out
            of battle.
          </p>
        </section>

        <section className="step" aria-labelledby="philosophy-title">
          <h2 id="philosophy-title">Design philosophy</h2>
          <p>
            You may be wondering, <q>Why would I use this system when things like Poke5e already
            exist?</q> To that I would say, you <em>should</em> check out Poke5e first. The system
            is better quality than this and more robust. I recommend taking a look at{" "}
            <a href="https://poke5e.app/" className="inline-link" target="_blank" rel="noreferrer">
              Poke5e.app
            </a>{" "}
            before proceeding here.
          </p>
          <p>
            That being said, Poke5e was built for playing as Pokemon <em>trainers</em>. While there
            are guides for how to adapt it for Pokemon character play, this is less balanced since
            it is not what the system was built for. Dungeons &amp; Druddigons fills a different
            niche, as it is designed first and foremost for players to play as Pokemon characters,
            such as in a Pokemon Mystery Dungeon campaign setting.
          </p>
          <p>
            Our design philosophy is two-fold. First, Dungeons &amp; Druddigons is meant to add
            minimal changes to vanilla D&amp;D 5e. More often than not, we rely on preexisting
            gameplay mechanics instead of trying to reinvent the wheel. D&amp;D veterans should
            have an easy time jumping in.
          </p>
          <p>
            Second, this is D&amp;D first and Pokemon second, mechanically speaking. Whenever there
            is an overlap between D&amp;D conventions and Pokemon conventions, D&amp;D conventions
            are favored. For example, D&amp;D has a level system where players can range from levels
            1-20. Pokemon classically has a level system where Pokemon can range from levels 1-100.
            Rather than adapting Pokemon&apos;s 1-100 system to work in D&amp;D, this system relies on
            D&amp;D&apos;s level system as-is.
          </p>
        </section>

        <section className="step" aria-labelledby="start-title">
          <h2 id="start-title">How do I get started?</h2>
          <p>
            Jump over to our{" "}
            <Link to="/character-creation" className="inline-link">
              Character Creation
            </Link>{" "}
            page to make your own Pokemon character.
          </p>
        </section>

        <section className="letsgo-section">
          <img
            src={assetUrl("resources/images/home/letsgo.svg")}
            alt="Your very own Pokemon legend is about to unfold."
            className="letsgo-image"
          />
        </section>

        <section className="disclaimer">
          <p>
            <em>
              (!) Dungeons &amp; Druddigons is an unofficial, fan-made homebrew adaptation. Pokemon
              is © Nintendo / Game Freak / The Pokemon Company. Dungeons &amp; Dragons is © Wizards
              of the Coast. This project is neither affiliated with nor endorsed by any of the
              above rights holders. This material is provided for personal, non-commercial use
              only.
            </em>
          </p>
        </section>
      </div>
    </main>
  );
}