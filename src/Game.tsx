import { useEffect, useRef, useState } from "react";
import { Row, RowState } from "./Row";
import dictionary from "./dictionary.json";
import { Clue, clue, describeClue, violation } from "./clue";
import { Keyboard } from "./Keyboard";
import { StatProps, defaultStats, updateStats, updateGuesses } from "./Stats";
import clueList from "./answers.json";
import {
  useSetting,
  dictionarySet,
  Difficulty,
  gameName,
  seed,
  speak,
  urlParam,
  indexOfToday
} from "./util";
import { decode, encode } from "./base64";
import ReactGA from "react-ga4";

enum GameState {
  Playing,
  Won,
  Lost,
  AlreadyPlayed,
}

interface GameProps {
  maxGuesses: number;
  hidden: boolean;
  difficulty: Difficulty;
  colorBlind: boolean;
  keyboardLayout: string;
}

const minLength = 4;
const maxLength = 11;
const defaultLength = 5;
const limitLength = (n: number) =>
  n >= minLength && n <= maxLength ? n : defaultLength;

function getTodaysTarget(wordLength: number, index: number): string {
  const eligible = clueList.filter(function (el) { return el.answer.length === wordLength; });
  let candidate = eligible[index];
  return candidate.answer.toLowerCase();
}

// function randomTarget(wordLength: number): string {
//   // console.log(clueList);
//   const eligible = clueList.filter(function (el) { return el.answer.length === wordLength; });

//   // const eligible = targets.filter((word) => word.length === wordLength);
//   // let candidate: string;
//   // do {
//   //   candidate = pick(eligible);
//   // } while (/\*/.test(candidate));

//   let candidate = pick(eligible);
//   return candidate.answer.toLowerCase();
// }

function getClues(target: string): string[] {
  const clues = clueList.filter(function (el) { return el.answer.toLowerCase() === target; });
  return clues[0].clues;
}

function getChallengeUrl(target: string): string {
  return (
    window.location.origin +
    window.location.pathname +
    "?challenge=" +
    encode(target)
  );
}

let initChallenge = "";
let challengeError = false;
try {
  initChallenge = decode(urlParam("challenge") ?? "").toLowerCase();
} catch (e) {
  console.warn(e);
  challengeError = true;
}
if (initChallenge && !dictionarySet.has(initChallenge)) {
  initChallenge = "";
  challengeError = true;
}

function parseUrlLength(): number {
  const lengthParam = urlParam("length");
  if (!lengthParam) return defaultLength;
  return limitLength(Number(lengthParam));
}

function parseUrlGameNumber(): number {
  return indexOfToday();
  // const gameParam = urlParam("game");
  // if (!gameParam) return 1;
  // const gameNumber = Number(gameParam);
  // return gameNumber >= 1 && gameNumber <= 1000 ? gameNumber : 1;
}

function Game(props: GameProps) {
  const [stats, setStats] = useSetting<StatProps>("stats", defaultStats());
  const [currentGuess, setCurrentGuess] = useState<string>("");
  const [challenge, setChallenge] = useState<string>(initChallenge);
  const [wordLength, setWordLength] = useState(
    challenge ? challenge.length : parseUrlLength()
  );
  const [gameNumber, setGameNumber] = useState(parseUrlGameNumber());
  const [gameState, setGameState] = useState((gameNumber > stats.gameNumberLastPlayed) ? GameState.Playing : GameState.AlreadyPlayed);
  const [guesses, setGuesses] = useState<string[]>(() => {
    return ((gameState === GameState.AlreadyPlayed) || (gameNumber === stats.gameNumberLastStarted)) ? stats.guesses : [];
  });
  const [target, setTarget] = useState(() => {
    return getTodaysTarget(wordLength, gameNumber);
    // resetRng();
    // // Skip RNG ahead to the parsed initial game number:
    // for (let i = 1; i < gameNumber; i++) randomTarget(wordLength);
    // return challenge || randomTarget(wordLength);
  });
  const [clues, fetchClues] = useState<string[]>(getClues(target));
  const [hint, setHint] = useState<string>(
    challengeError
      ? `Invalid challenge string, playing random game.`
      : (gameState === GameState.AlreadyPlayed ? (`You ` + (stats.lostGameLastPlayed ? `lost` : `won`) + `! The answer was ` + target.toUpperCase() + `. Come back tomorrow for the next game.`) : `Make your first guess!`)
  );

  // const currentSeedParams = () =>
  //   `?seed=${seed}&length=${wordLength}&game=${gameNumber}`;
  // useEffect(() => {
  //   if (seed) {
  //     window.history.replaceState(
  //       {},
  //       document.title,
  //       window.location.pathname + currentSeedParams()
  //     );
  //   }
  // }, [wordLength, gameNumber]);
  const tableRef = useRef<HTMLTableElement>(null);
  // const startNextGame = () => {
  //   if (challenge) {
  //     // Clear the URL parameters:
  //     window.history.replaceState({}, document.title, window.location.pathname);
  //   }
  //   setChallenge("");
  //   const newWordLength = limitLength(wordLength);
  //   setWordLength(newWordLength);
  //   let newTarget = randomTarget(newWordLength);
  //   setTarget(newTarget);
  //   setHint("");
  //   setGuesses([]);
  //   setCurrentGuess("");
  //   fetchClues(getClues(newTarget));
  //   setGameState(GameState.Playing);
  //   setGameNumber((x) => x + 1);
  // };

  async function share(copiedHint: string, text?: string) {
    const url = seed
      ? window.location.origin + window.location.pathname// + currentSeedParams()
      : getChallengeUrl(target);
    const body = url + (text ? "\n\n" + text : "");
    if (
      /android|iphone|ipad|ipod|webos/i.test(navigator.userAgent) &&
      !/firefox/i.test(navigator.userAgent)
    ) {
      try {
        await navigator.share({ text: body });
        return;
      } catch (e) {
        console.warn("navigator.share failed:", e);
      }
    }
    try {
      await navigator.clipboard.writeText(body);
      setHint(copiedHint);
      // send ga4 share score event
      ReactGA.event({
        category: "engagement",
        action: "share_score",
        label: "Share score",
        nonInteraction: false,
      });
      return;
    } catch (e) {
      console.warn("navigator.clipboard.writeText failed:", e);
    }
    setHint(url);
  }

  const onKey = (key: string) => {
    if (gameState !== GameState.Playing) {
      if (key === "Enter") {
        // startNextGame();
      }
      return;
    }
    if (guesses.length === props.maxGuesses) return;
    if (/^[a-z]$/i.test(key)) {
      setCurrentGuess((guess) =>
        (guess + key.toLowerCase()).slice(0, wordLength)
      );
      tableRef.current?.focus();
      setHint("");
    } else if (key === "Backspace") {
      setCurrentGuess((guess) => guess.slice(0, -1));
      setHint("");
    } else if (key === "Enter") {
      if (currentGuess.length !== wordLength) {
        setHint("Too short");
        return;
      }
      if (!dictionary.includes(currentGuess)) {
        setHint("Not a valid word");
        return;
      }
      for (const g of guesses) {
        const c = clue(g, target);
        const feedback = violation(props.difficulty, c, currentGuess);
        if (feedback) {
          setHint(feedback);
          return;
        }
      }
      setGuesses((guesses) => guesses.concat([currentGuess]));
      setCurrentGuess((guess) => "");

      const gameOver = (verbed: string) =>
        `You ${verbed}! The answer was ${target.toUpperCase()}.`;

      if (currentGuess === target) {
        setHint(gameOver("won"));
        let newStats = updateStats(stats, guesses, false, gameNumber, currentGuess);
        setStats(newStats);
        setGameState(GameState.Won);
        ReactGA.event({
          category: "engagement",
          action: "game_completed",
          label: "Game won",
          nonInteraction: false,
        });
      } else if (guesses.length + 1 === props.maxGuesses) {
        setHint(gameOver("lost"));
        let newStats = updateStats(stats, guesses, true, gameNumber, currentGuess);
        setStats(newStats);
        setGameState(GameState.Lost);
        ReactGA.event({
          category: "engagement",
          action: "game_completed",
          label: "Game lost",
          nonInteraction: false,
        });
      } else {
        setHint("");
        speak(describeClue(clue(currentGuess, target)));
        setStats(updateGuesses(stats, guesses, gameNumber, currentGuess));
      }
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        onKey(e.key);
      }
      if (e.key === "Backspace") {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [currentGuess, gameState]);

  let letterInfo = new Map<string, Clue>();
  const tableRows = Array(props.maxGuesses)
    .fill(undefined)
    .map((_, i) => {
      const guess = [...guesses, currentGuess][i] ?? "";
      const cluedLetters = clue(guess, target);
      const lockedIn = i < guesses.length;
      const isPlaying = +(gameState === GameState.Playing);
      const riddle = (i < (guesses.length +  isPlaying)) ? clues[i] : "";
      if (lockedIn) {
        for (const { clue, letter } of cluedLetters) {
          if (clue === undefined) break;
          const old = letterInfo.get(letter);
          if (old === undefined || clue > old) {
            letterInfo.set(letter, clue);
          }
        }
      }
      return (
        <Row
          key={i}
          wordLength={wordLength}
          rowState={
            lockedIn
              ? RowState.LockedIn
              : i === guesses.length
              ? RowState.Editing
              : RowState.Pending
          }
          cluedLetters={cluedLetters}
          annotation={riddle}
        />
      );
    });

  return (
    <div className="Game" style={{ display: props.hidden ? "none" : "block" }}>
      <table
        className="Game-rows"
        tabIndex={0}
        aria-label="Table of guesses"
        ref={tableRef}
      >
        <tbody>{tableRows}</tbody>
      </table>
      <p
        role="alert"
        style={{
          userSelect: /https?:/.test(hint) ? "text" : "none",
          whiteSpace: "pre-wrap",
        }}
      >
        {hint || `\u00a0`}
      </p>
      {gameState === GameState.Playing && (<Keyboard
        layout={props.keyboardLayout}
        letterInfo={letterInfo}
        onKey={onKey}
      />
      )}
      <p>
        {gameState !== GameState.Playing && (
          <button
            className="share-link"
            onClick={() => {
              const emoji = props.colorBlind
                ? ["⬛", "⬛", "🟧"]
                : ["⬛", "⬛", "🟧"];
              const score = ((gameState === GameState.Lost) || (gameState === GameState.AlreadyPlayed && stats.lostGameLastPlayed)) ? "X" : guesses.length;
              const puzzleIndex = gameNumber.toString();
              share(
                "Result copied to clipboard!",
                `${gameName} #${puzzleIndex}: ${score}/${props.maxGuesses}\n` +
                  guesses
                    .map((guess) =>
                      clue(guess, target)
                        .map((c) => emoji[c.clue ?? 0])
                        .join("")
                    )
                    .join("\n")
              );
            }}
          >
            Share
          </button>
        )}
      </p>
    </div>
  );
}

export default Game;
