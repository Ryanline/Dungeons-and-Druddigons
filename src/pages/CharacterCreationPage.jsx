import { Link } from "react-router-dom";
import { assetUrl } from "../utils/assetUrl";

export function CharacterCreationPage() {
  return (
    <main className="page" role="main">
      <div className="content">
        <h1>Character creation</h1>

        <p className="lede">
          Follow this guide to create your character. Fill out a{" "}
          <a
            href={assetUrl("resources/character/character-sheet.pdf")}
            target="_blank"
            rel="noreferrer"
            className="inline-link"
          >
            character sheet
          </a>{" "}
          as you go.
        </p>

        <section className="step" aria-labelledby="step-1-title">
          <h2 id="step-1-title">
            <span className="step-num">1.</span> Select a Pokemon
          </h2>
          <p>
            Choose a Pokemon to play as. Your starting Pokemon cannot be Legendary or Mythical.
            Choose one of its abilities and record it on your character sheet. For example,
            Pikachu may choose Static or Lightning Rod. See the{" "}
            <Link to="/abilities" className="inline-link">
              abilities list
            </Link>{" "}
            to find out what abilities do.
          </p>
        </section>

        <section className="step" aria-labelledby="step-2-title">
          <h2 id="step-2-title">
            <span className="step-num">2.</span> Select a class
          </h2>
          <p className="step-sub">Choose a class from the following list. Record any class features on your character sheet.</p>
          <ul className="bullets">
            <li><a href="http://dnd2024.wikidot.com/artificer:main" className="inline-link" target="_blank" rel="noreferrer">Artificer</a></li>
            <li><a href="http://dnd2024.wikidot.com/barbarian:main" className="inline-link" target="_blank" rel="noreferrer">Barbarian</a></li>
            <li><a href="http://dnd2024.wikidot.com/bard:main" className="inline-link" target="_blank" rel="noreferrer">Bard</a></li>
            <li><a href="http://dnd2024.wikidot.com/cleric:main" className="inline-link" target="_blank" rel="noreferrer">Cleric</a></li>
            <li><a href="http://dnd2024.wikidot.com/druid:main" className="inline-link" target="_blank" rel="noreferrer">Druid</a></li>
            <li><a href="http://dnd2024.wikidot.com/fighter:main" className="inline-link" target="_blank" rel="noreferrer">Fighter</a></li>
            <li><a href="http://dnd2024.wikidot.com/monk:main" className="inline-link" target="_blank" rel="noreferrer">Monk</a></li>
            <li><a href="http://dnd2024.wikidot.com/paladin:main" className="inline-link" target="_blank" rel="noreferrer">Paladin</a></li>
            <li><a href="http://dnd2024.wikidot.com/ranger:main" className="inline-link" target="_blank" rel="noreferrer">Ranger</a></li>
            <li><a href="http://dnd2024.wikidot.com/rogue:main" className="inline-link" target="_blank" rel="noreferrer">Rogue</a></li>
            <li><a href="http://dnd2024.wikidot.com/sorcerer:main" className="inline-link" target="_blank" rel="noreferrer">Sorcerer</a></li>
            <li><a href="http://dnd2024.wikidot.com/warlock:main" className="inline-link" target="_blank" rel="noreferrer">Warlock</a></li>
            <li><a href="http://dnd2024.wikidot.com/wizard:main" className="inline-link" target="_blank" rel="noreferrer">Wizard</a></li>
          </ul>
        </section>

        <section className="step" aria-labelledby="step-3-title">
          <h2 id="step-3-title">
            <span className="step-num">3.</span> Determine ability scores
          </h2>
          <p>
            Designate ability scores using your preferred method such as{" "}
            <a
              href="https://roll20.net/compendium/dnd5e/Rules:Step%203%20-%20Ability%20Scores"
              className="inline-link"
              target="_blank"
              rel="noreferrer"
            >
              Standard Array
            </a>
            ,{" "}
            <a
              href="https://chicken-dinner.com/5e/5e-point-buy.html"
              className="inline-link"
              target="_blank"
              rel="noreferrer"
            >
              Point Buy/Point Cost
            </a>
            , dice rolls, or otherwise. Record these on your character sheet.
          </p>
        </section>

        <section className="step" aria-labelledby="step-4-title">
          <h2 id="step-4-title">
            <span className="step-num">4.</span> Select a background
          </h2>
          <p>
            Select a{" "}
            <a
              href="https://pages.roll20.net/dnd/2024-backgrounds"
              className="inline-link"
              target="_blank"
              rel="noreferrer"
            >
              Background
            </a>{" "}
            as usual. Record any background features on your character sheet.
          </p>
        </section>

        <section className="step" aria-labelledby="step-5-title">
          <h2 id="step-5-title">
            <span className="step-num">5.</span> Miscellaneous
          </h2>
          <p>
            <strong>Armor class. </strong>Calculate your starting AC as if you were wearing your class&apos;
            typical starting armor, including shields, if applicable. In a typical setting where Pokemon
            are generally unclothed, this will function as your naked AC and you will gain +1 AC at levels
            4, 8, 12, 16, and 20. Your AC may also be influenced by Held Items such as the Eviolite.
            Alternatively, your DM may opt for a setting in which Pokemon simply do wear armor. In this
            case, handle AC as usual.
          </p>
          <p>
            <strong>Type effectiveness. </strong>Attack rolls for super-effective moves are made with
            advantage, while attack rolls for not-very-effective moves are made with disadvantage.
            Similarly, saving throws made against super-effective moves are made with disadvantage,
            while saving throws made against not-very-effective moves are made with advantage. Refer
            to a <a href="https://pokemondb.net/type" className="inline-link" target="_blank" rel="noreferrer">Type Chart</a> to
            see how the types interact.
          </p>
          <p>
            <strong>Darkvision. </strong>Dark- and Ghost-type Pokemon have Darkvision inherently with a
            range of 60 feet. This effect does <em>not</em> stack to become superior darkvision for
            Pokemon such as Sableye and Spiritomb.
          </p>
        </section>
      </div>
    </main>
  );
}