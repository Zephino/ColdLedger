import type { FactionId, GameState } from "../sim/types";
import { POP_TOTAL } from "../sim/types";

export const TITLE = "Cold Ledger";
export const NEWSPAPER = "The Twilight Ledger";

export const FACTIONS: Record<FactionId, { name: string; desc: string }> = {
  faculty: { name: "The Faculty", desc: "Scientists and teachers from the ark's research decks. They want labs, schools and the truth." },
  crews: { name: "The Crews", desc: "Engineers, miners and dome hands. They want fair shares and safe shifts." },
  wardens: { name: "The Wardens", desc: "Ship security, now colony police. They want order and a clear chain of command." },
  board: { name: "The Board", desc: "Survivors of the Survival Trust that financed the ark. They hold sealed contracts and expect them honored." },
};

export const BRIEFING = [
  "The ark Meridian left the dying Earth with nine thousand sleepers and a crew of four hundred. It arrived at Kestrel's Lamp with a cracked reactor, forty-one dead officers, and you.",
  "You were the ship's comptroller. You counted fuel, rations and berths. Now you are the highest-ranking officer alive, and the colony's survival is yours to count.",
  "The ship's records do not add up. The Survival Trust, the cartel that financed the Meridian, sold berths that were never filled, and sealed contracts promise its Board members the best of whatever you build.",
  "Pack the ship. Choose a world. Build a colony that lasts. Then decide what the colony is for: a new ark, a living world, or a charter that ends the Trust's hold for good.",
];

export const ENDINGS = {
  secondArk: {
    title: "Second Ark",
    text: "The rebuilt Meridian climbs out of the twilight band on a column of light. The colony did not just survive; it built the means to carry humanity further. Every berth on this ship was assigned by lottery, and the list is public.",
  },
  greenHorizon: {
    title: "Green Horizon",
    text: "The first colonist to walk the terminator without a mask does it at dawn, which on Vigil never ends. The air holds. The domes are opened one by one. The world is home.",
  },
  openCharter: {
    title: "Open Charter",
    text: "The Ledger goes out on every channel: berths sold, pods emptied, contracts written to outlive the people who signed them. By the next muster the sealed contracts are void, the Board's stores are common stock, and the Free Berth delegates sit at the same table as your council.",
  },
  boardRule: {
    title: "The Trust Endures",
    text: "The ark launches on schedule, its best berths reserved for the Board, as the contracts always said they would be. You are aboard. History will record the colony as a success. The Ledger stays sealed.",
  },
  ghostTown: {
    title: "Ghost Town",
    text: "The last lights in the domes go dark. The tubes still hum with power for a while, carrying air to rooms where no one breathes. The Ledger closes with a balance of zero.",
  },
} as const;

export interface StoryChoice {
  label: string;
  available?: (s: GameState) => boolean;
  apply: (s: GameState) => string;
}

export interface StoryEvent {
  id: string;
  title: string;
  body: (s: GameState) => string;
  when: (s: GameState) => boolean;
  repeatable?: boolean;
  choices: StoryChoice[];
}

export function trust(s: GameState, f: FactionId, delta: number) {
  s.story.trust[f] = Math.max(0, Math.min(100, s.story.trust[f] + delta));
}

function morale(s: GameState, delta: number) {
  s.moraleBoost += delta;
}

function evidence(s: GameState, id: string) {
  if (s.story.evidenceSeen.includes(id)) return;
  s.story.evidenceSeen.push(id);
  s.story.evidence += 1;
}

const researched = (s: GameState, id: string) => s.research.done.includes(id);
const pop = (s: GameState) => POP_TOTAL(s.pop);

export const EVENTS: StoryEvent[] = [
  {
    id: "memorial",
    title: "Forty-One Names",
    body: () => "The crews have carved the names of the dead officers into a hull plate salvaged from the seed lander. They ask whether you will speak at the memorial.",
    when: (s) => s.turn >= 3,
    choices: [
      {
        label: "Speak, and promise an honest count.",
        apply: (s) => {
          morale(s, 40);
          trust(s, "crews", 5);
          trust(s, "faculty", 5);
          return "Your speech is short. People remember the promise more than the words.";
        },
      },
      {
        label: "Keep it brief; there is work to do.",
        apply: (s) => {
          trust(s, "wardens", 5);
          return "The memorial lasts ten minutes. The dozers are running again by the next shift.";
        },
      },
    ],
  },
  {
    id: "berthList",
    title: "The Berth List",
    body: () =>
      "A crew engineer restoring the lander's memory core finds the original berth list. Beside two hundred names is a single annotation: SURVIVAL TRUST — PAID IN FULL. None of those names were among the sleepers who woke.",
    when: (s) => s.turn >= 14 && s.colonistsLanded,
    choices: [
      {
        label: "Seal the file. Morale is fragile enough.",
        apply: (s) => {
          trust(s, "board", 10);
          trust(s, "crews", -10);
          return "The file is locked under comptroller access. The engineer was not happy about it.";
        },
      },
      {
        label: "Enter it in the Ledger, quietly.",
        apply: (s) => {
          evidence(s, "berthList");
          trust(s, "board", -5);
          trust(s, "crews", 5);
          return "The first entry in what the crews are already calling the Cold Ledger.";
        },
      },
      {
        label: "Read it aloud at muster.",
        apply: (s) => {
          evidence(s, "berthList");
          trust(s, "board", -20);
          trust(s, "crews", 15);
          trust(s, "wardens", -5);
          morale(s, -30);
          return "The muster hall goes silent, then loud. The Board's representative leaves early.";
        },
      },
    ],
  },
  {
    id: "sealedContract",
    title: "Sealed Contracts",
    body: () =>
      "The Board presents sealed contracts signed on Earth. They grant Trust members first claim on housing and a double ration of luxuries, 'in consideration of capital advanced'.",
    when: (s) => s.turn >= 25,
    choices: [
      {
        label: "Honor them. Contracts are contracts.",
        apply: (s) => {
          trust(s, "board", 15);
          trust(s, "crews", -10);
          morale(s, -40);
          s.story.flags.contractsHonored = true;
          return "Board quarters are moved to the head of the housing list. The crews notice.";
        },
      },
      {
        label: "Refuse. There is no Earth to enforce them.",
        apply: (s) => {
          trust(s, "board", -15);
          trust(s, "crews", 10);
          return "The Board files a formal protest, addressed to a court that no longer exists.";
        },
      },
      {
        label: "Renegotiate the terms (Economics).",
        available: (s) => researched(s, "economics"),
        apply: (s) => {
          trust(s, "board", -5);
          trust(s, "faculty", 5);
          evidence(s, "contractTerms");
          return "Reading the fine print, your economists find clauses no honest lender would write. Into the Ledger they go.";
        },
      },
    ],
  },
  {
    id: "faculty",
    title: "The Faculty Petition",
    body: () => "The Faculty asks for precious metals to restart the ark's teaching seminar. 'Ignorance is the most expensive thing we could import,' their letter says.",
    when: (s) => s.turn >= 35,
    choices: [
      {
        label: "Fund it (20 Precious Metal B).",
        available: (s) => s.stock.PrecB >= 20,
        apply: (s) => {
          s.stock.PrecB -= 20;
          trust(s, "faculty", 12);
          s.research.progress += 15;
          return "The seminar meets in a storage tank lit by a single panel. Attendance is standing room only.";
        },
      },
      {
        label: "Not now.",
        apply: (s) => {
          trust(s, "faculty", -6);
          return "The Faculty accepts the answer with visible disappointment.";
        },
      },
    ],
  },
  {
    id: "wardens",
    title: "The Armory Request",
    body: () => "The Wardens want to unseal the ship's armory. 'The Free Berth people took weapons when they split off. We should be ready.'",
    when: (s) => s.turn >= 45,
    choices: [
      {
        label: "Approve it.",
        apply: (s) => {
          trust(s, "wardens", 15);
          trust(s, "crews", -5);
          s.crime = Math.max(0, s.crime - 15);
          s.rebels.hostility += 10;
          morale(s, -15);
          return "Armed patrols walk the tubes. Crime drops. So does conversation.";
        },
      },
      {
        label: "Deny it.",
        apply: (s) => {
          trust(s, "wardens", -10);
          s.rebels.hostility -= 5;
          return "The armory stays sealed. The Wardens comply, stiffly.";
        },
      },
    ],
  },
  {
    id: "envoy",
    title: "An Envoy From Free Berth",
    body: (s) =>
      `A rover from the Free Berth colony stops at the edge of your mining zone. Their envoy carries a data slate and an offer to talk. Free Berth holds about ${Math.round(s.rebels.population)} people.`,
    when: (s) => s.turn >= 55 && s.rebels.population > 0,
    choices: [
      {
        label: "Receive the envoy.",
        apply: (s) => {
          s.rebels.hostility -= 15;
          trust(s, "board", -10);
          s.story.flags.envoyReceived = true;
          return "The envoy says Free Berth split off because they saw the berth list before you did. They are willing to trade.";
        },
      },
      {
        label: "Turn the rover away.",
        apply: (s) => {
          s.rebels.hostility += 10;
          trust(s, "board", 5);
          return "The rover idles for an hour, then leaves.";
        },
      },
      {
        label: "Detain the envoy and take the slate.",
        apply: (s) => {
          s.rebels.hostility += 25;
          trust(s, "wardens", 10);
          trust(s, "faculty", -5);
          evidence(s, "envoySlate");
          return "The slate holds Trust shipping manifests. Free Berth will not forget this.";
        },
      },
    ],
  },
  {
    id: "crates",
    title: "Trust Reserve",
    body: () =>
      "An audit of the lander holds finds forty tonnes of cargo listed as 'Trust reserve — not for colonial use'. The seals are Board seals.",
    when: (s) => s.story.evidence >= 2 && s.turn >= 50,
    choices: [
      {
        label: "Open the crates.",
        apply: (s) => {
          s.items.luxury += 30;
          s.stock.PrecA += 40;
          s.items.medicine += 20;
          trust(s, "board", -15);
          trust(s, "crews", 8);
          evidence(s, "crates");
          return "Wine, medicine, gold wire, and a case of handwritten contracts. The contracts go in the Ledger.";
        },
      },
      {
        label: "Leave them sealed.",
        apply: (s) => {
          trust(s, "board", 10);
          return "The Board thanks you for your discretion.";
        },
      },
    ],
  },
  {
    id: "ghosts",
    title: "Empty Pods",
    body: () =>
      "Cryo logs show forty pods registered to paying passengers were never filled. Their power, air and berth weight went to Trust cargo. Somewhere on Earth, those passengers were told they were aboard.",
    when: (s) => s.story.evidence >= 3 && s.turn >= 70,
    choices: [
      {
        label: "Record it.",
        apply: (s) => {
          evidence(s, "pods");
          trust(s, "faculty", 5);
          return "The Ledger grows heavier.";
        },
      },
    ],
  },
  {
    id: "storm",
    title: "Terminator Front",
    body: () => "The weather crews track a storm wall moving along the twilight band toward the colony. The Wardens want to pull surface crews into shelter for the next few turns.",
    when: (s) => s.planetId === "vigil" && s.turn >= 30,
    repeatable: true,
    choices: [
      {
        label: "Shelter the crews.",
        apply: (s) => {
          s.story.flags.stormShelter = s.turn + 6;
          trust(s, "wardens", 5);
          morale(s, 10);
          return "The surface goes quiet. If the storm hits in the next few turns, the damage will be lighter.";
        },
      },
      {
        label: "Keep working.",
        apply: (s) => {
          trust(s, "crews", -4);
          return "The crews pull their hoods tighter and keep working.";
        },
      },
    ],
  },
  {
    id: "strike",
    title: "Shift Strike",
    body: () => "The Crews have downed tools. They say the Board's quarters get air and heat priority while dome hands work double shifts.",
    when: (s) => s.story.trust.crews < 30 && s.turn >= 40,
    repeatable: true,
    choices: [
      {
        label: "Concede: share the luxury stock (20 luxuries).",
        available: (s) => s.items.luxury >= 20,
        apply: (s) => {
          s.items.luxury -= 20;
          trust(s, "crews", 15);
          trust(s, "board", -5);
          return "The strike ends after a long night of negotiation.";
        },
      },
      {
        label: "Order the Wardens to break it.",
        apply: (s) => {
          trust(s, "crews", -10);
          trust(s, "wardens", 5);
          morale(s, -80);
          s.story.flags.strikeUntil = s.turn + 3;
          return "The strike breaks. Production limps for days. Nobody forgets who gave the order.";
        },
      },
      {
        label: "Let it run its course.",
        apply: (s) => {
          s.story.flags.strikeUntil = s.turn + 5;
          trust(s, "crews", 5);
          return "The strike lasts five turns. Workers stay home.";
        },
      },
    ],
  },
  {
    id: "offer",
    title: "A Berth For The Comptroller",
    body: () =>
      "A Board envoy visits your quarters after midnight. If you hand over the Ledger, the Trust will see you have a stateroom on the rebuilt ark, 'and your name on its dedication plate'.",
    when: (s) => s.story.evidence >= 4 && s.research.done.includes("spacecraftTesting"),
    choices: [
      {
        label: "Accept.",
        apply: (s) => {
          s.story.flags.boardDeal = true;
          trust(s, "board", 30);
          s.story.evidence = Math.max(0, s.story.evidence - 3);
          return "The Ledger's copies disappear from the archive one by one.";
        },
      },
      {
        label: "Refuse.",
        apply: (s) => {
          trust(s, "board", -10);
          trust(s, "faculty", 5);
          return "The envoy shrugs. 'Then we will find another comptroller.'";
        },
      },
    ],
  },
  {
    id: "coup",
    title: "The Night Muster",
    body: () => "Board loyalists, with a handful of Wardens, have occupied the Command Center and declared the sealed contracts in force.",
    when: (s) => s.story.trust.board < 20 && s.turn >= 90 && !s.story.flags.boardDeal,
    choices: [
      {
        label: "Call on the Wardens' loyalty.",
        apply: (s) => {
          if (s.story.trust.wardens >= 50) {
            trust(s, "board", -20);
            s.story.flags.boardBroken = true;
            return "The Wardens retake the Command Center without a shot. The Board's leaders are confined to quarters.";
          }
          morale(s, -150);
          const lost = Math.min(s.pop.workers, Math.ceil(pop(s) * 0.05));
          s.pop.workers -= lost;
          s.rebels.population += lost;
          return `The standoff lasts three days. ${lost} colonists leave for Free Berth rather than choose sides.`;
        },
      },
      {
        label: "Negotiate.",
        apply: (s) => {
          trust(s, "board", 25);
          trust(s, "crews", -10);
          s.story.evidence = Math.max(0, s.story.evidence - 1);
          return "You agree to honor some contracts. One Ledger entry is quietly withdrawn.";
        },
      },
      {
        label: "Publish the Ledger to the colony (needs 4 entries).",
        available: (s) => s.story.evidence >= 4,
        apply: (s) => {
          trust(s, "board", -30);
          trust(s, "crews", 15);
          trust(s, "faculty", 10);
          s.story.flags.boardBroken = true;
          return "The Ledger plays on every screen in the colony. The loyalists walk out of the Command Center with their hands up.";
        },
      },
    ],
  },
  {
    id: "charter",
    title: "A Charter Draft",
    body: () => "The Faculty's political scientists have drafted an Open Charter: common ownership of the colony's stores, public berth lotteries, and a seat for Free Berth.",
    when: (s) => s.research.done.includes("politicalScience") && s.story.evidence >= 3,
    choices: [
      {
        label: "Endorse the draft.",
        apply: (s) => {
          s.story.flags.charterDrafted = true;
          trust(s, "faculty", 10);
          trust(s, "board", -15);
          return "The draft circulates. To broadcast it with the Ledger, you will need Harsh Environment Signals Processing and a working Communications Tower.";
        },
      },
      {
        label: "Shelve it.",
        apply: (s) => {
          trust(s, "faculty", -10);
          return "The draft goes into a drawer.";
        },
      },
    ],
  },
  {
    id: "seedWarning",
    title: "Seed Equipment Failing",
    body: () => "The crews report the seed units were never meant to run this long. Expect the seed power, smelter and factory to fail within ten turns. The seed command module will survive, but it will stop housing colonists.",
    when: (s) => s.turn >= 140 && !s.seedCollapsed,
    choices: [{ label: "Understood.", apply: () => "Make sure you have replacement power, smelting, factory capacity and housing." }],
  },
];

export const EVENT_BY_ID: Record<string, StoryEvent> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
