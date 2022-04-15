import "./App.css";
import { useSetting, maxGuesses } from "./util";
import Game from "./Game";
import { useEffect, useState } from "react";
import { About } from "./About";
import { Stats } from "./Stats";
import ReactGA from "react-ga4";

// initialize GA4 property
// TODO: will have to update this ID to your GA4 measurement ID
ReactGA.initialize("G-SVTBVJGSCW");

function App() {
  type Page = "game" | "about" | "settings" | "stats";
  const [page, setPage] = useState<Page>("game");
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const [dark, setDark] = useSetting<boolean>("dark", prefersDark);
  const [colorBlind, setColorBlind] = useSetting<boolean>("colorblind", false);
  const [difficulty, setDifficulty] = useSetting<number>("difficulty", 0);
  const [keyboard, setKeyboard] = useSetting<string>(
    "keyboard",
    "qwertyuiop-asdfghjkl-BzxcvbnmE"
  );
  const [enterLeft, setEnterLeft] = useSetting<boolean>("enter-left", true);

  useEffect(() => {
    document.body.className = dark ? "dark" : "";
    // if (urlParam("today") !== null || urlParam("todas") !== null) {
    //   document.location = "?seed=" + todaySeed;
    // }
    // send pageview on page update
    ReactGA.send({ hitType: "pageview", page: page });
    setTimeout(() => {
      // Avoid transition on page load
      document.body.style.transition = "0.3s background-color ease-out";
    }, 1);
  }, [dark, page]);

  const link = (emoji: string, label: string, page: Page) => (
    <button
      className="emoji-link"
      onClick={() => setPage(page)}
      title={label}
      aria-label={label}
    >
      {emoji}
    </button>
  );

  return (
    <div className={"App-container" + (colorBlind ? " color-blind" : "")}>
      <h1>
        <span
          style={{
            color: difficulty > 0 ? "#e66" : "inherit",
            fontStyle: difficulty > 1 ? "italic" : "inherit",
          }}
        >
          Cluedle
        </span>
      </h1>
      <div className="top-right">
        {page !== "game" ? (
          link("❌", "Close", "game")
        ) : (
          <>
            {link("📊", "Stats", "stats")}
            {link("❓", "About", "about")}
            {link("⚙️", "Settings", "settings")}
          </>
        )}
      </div>

      {page === "stats" && <Stats />}
      {page === "about" && <About />}
      {page === "settings" && (
        <div className="Settings">
          <div className="Settings-setting">
            <input
              id="dark-setting"
              type="checkbox"
              checked={dark}
              onChange={() => setDark((x: boolean) => !x)}
            />
            <label htmlFor="dark-setting">Dark theme</label>
          </div>
          <div className="Settings-setting">
            <label htmlFor="keyboard-setting">Keyboard layout:</label>
            <select
              name="keyboard-setting"
              id="keyboard-setting"
              value={keyboard}
              onChange={(e) => setKeyboard(e.target.value)}
            >
              <option value="qwertyuiop-asdfghjkl-BzxcvbnmE">QWERTY</option>
              <option value="azertyuiop-qsdfghjklm-BwxcvbnE">AZERTY</option>
              <option value="qwertzuiop-asdfghjkl-ByxcvbnmE">QWERTZ</option>
              <option value="BpyfgcrlE-aoeuidhtns-qjkxbmwvz">Dvorak</option>
              <option value="qwfpgjluy-arstdhneio-BzxcvbkmE">Colemak</option>
            </select>
            <input
              style={{ marginLeft: 20 }}
              id="enter-left-setting"
              type="checkbox"
              checked={enterLeft}
              onChange={() => setEnterLeft((x: boolean) => !x)}
            />
            <label htmlFor="enter-left-setting">"Enter" on left side</label>
          </div>
          <div className="Settings-setting setting-contrast">
            <input
              id="colorblind-setting"
              type="checkbox"
              checked={colorBlind}
              onChange={() => setColorBlind((x: boolean) => !x)}
            />
            <label htmlFor="colorblind-setting">High-contrast colors</label>
          </div>
          <div className="Settings-setting setting-difficulty">
            <input
              id="difficulty-setting"
              type="range"
              min="0"
              max="2"
              value={difficulty}
              onChange={(e) => setDifficulty(+e.target.value)}
            />
            <div className="setting-difficulty">
              <label htmlFor="difficulty-setting">Difficulty:</label>
              <strong>{["Normal", "Hard", "Ultra Hard"][difficulty]}</strong>
              <div
                style={{
                  fontSize: 14,
                  height: 40,
                  marginLeft: 8,
                  marginTop: 8,
                }}
              >
                {
                  [
                    `Guesses must be valid dictionary words.`,
                    `Wordle's "Hard Mode". Green letters must stay fixed, and yellow letters must be reused.`,
                    `An even stricter Hard Mode. Yellow letters must move away from where they were clued, and gray clues must be obeyed.`,
                  ][difficulty]
                }
              </div>
            </div>
          </div>
        </div>
      )}
      <Game
        maxGuesses={maxGuesses}
        hidden={page !== "game"}
        difficulty={difficulty}
        colorBlind={colorBlind}
        keyboardLayout={keyboard.replaceAll(
          /[BE]/g,
          (x) => (enterLeft ? "EB" : "BE")["BE".indexOf(x)]
        )}
      />
    </div>
  );
}

export default App;
