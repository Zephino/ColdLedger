import "./styles.css";
import type { GameState } from "./sim/types";
import { GameScreen } from "./ui/game";
import { titleScreen } from "./ui/setup";
import { help } from "./ui/reports";

const root = document.getElementById("app")!;
let game: GameScreen | null = null;

function showTitle() {
  game?.destroy();
  game = null;
  titleScreen({ root, start });
}

function start(state: GameState, fresh: boolean) {
  game?.destroy();
  game = new GameScreen(root, state, { quitToTitle: showTitle });
  if (fresh) help();
}

showTitle();
