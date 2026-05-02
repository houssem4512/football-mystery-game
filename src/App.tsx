import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Position = "GK" | "LB" | "CB" | "RB" | "CDM" | "CM" | "CAM" | "LW" | "ST" | "RW";
type Side = 1 | 2;
type Choice = "featured" | "mystery";
type Mode = "ai" | "local";
type AIDifficulty = "tactical" | "god_mode";
type ManagerStyle = "pragmatist" | "entertainer" | "alchemist" | "gambler";

type Player = {
  id: string;
  name: string;
  position: Position;
  rating: number;
  trait: string;
  tier: "legend" | "elite" | "solid" | "chaos";
};

type DraftPick = {
  slot: Position;
  player: Player;
  source: Choice;
};

type Squads = Record<Side, DraftPick[]>;

type TeamProfile = {
  overall: number;
  attack: number;
  midfield: number;
  defense: number;
  chemistry: number;
  flair: number;
  momentum: number;
};

type GoalEvent = {
  minute: number;
  player: string;
  side: Side;
};

type MatchResult = {
  score: [number, number];
  winner: Side;
  profile: Record<Side, TeamProfile>;
  xg: [number, number];
  report: string[];
  headline: string;
  goals: GoalEvent[];
  mvp: Record<Side, Player>;
  tiebreak?: string;
};

type RevealState = {
  chooser: Side;
  choice: Choice;
  chooserPick: Player;
  otherPick: Player;
  otherSide: Side;
  autoContinue: boolean;
  note: string;
};

type SetupState = {
  mode: Mode;
  difficulty: AIDifficulty;
  p1Style: ManagerStyle;
  p2Style: ManagerStyle;
  playerOneName: string;
  playerTwoName: string;
};

const draftPlan: Position[] = ["GK", "LB", "CB", "CB", "RB", "CDM", "CM", "CAM", "LW", "ST", "RW"];

// FEATURED POOL (82 - 89): High balance. Never over 90, meaning the safety has a clear limit.
const featuredPlayers: Player[] = [
  { id: "feat-oblak", name: "Jan Oblak", position: "GK", rating: 88, trait: "elite handling", tier: "elite" },
  { id: "feat-grimaldo", name: "Alex Grimaldo", position: "LB", rating: 86, trait: "sweet left boot", tier: "solid" },
  { id: "feat-marquinhos", name: "Marquinhos", position: "CB", rating: 87, trait: "vocal leader", tier: "solid" },
  { id: "feat-rudiger", name: "Antonio Rüdiger", position: "CB", rating: 88, trait: "physical dominance", tier: "elite" },
  { id: "feat-carvajal", name: "Dani Carvajal", position: "RB", rating: 86, trait: "tenacious spirit", tier: "solid" },
  { id: "feat-rodri", name: "Rodri", position: "CDM", rating: 89, trait: "midfield anchor", tier: "elite" },
  { id: "feat-fdj", name: "Frenkie de Jong", position: "CM", rating: 87, trait: "press resistor", tier: "solid" },
  { id: "feat-odegaard", name: "Martin Ødegaard", position: "CAM", rating: 88, trait: "creative architect", tier: "elite" },
  { id: "feat-diaz", name: "Luis Díaz", position: "LW", rating: 86, trait: "dynamic winger", tier: "solid" },
  { id: "feat-kane", name: "Harry Kane", position: "ST", rating: 89, trait: "all-round scorer", tier: "elite" },
  { id: "feat-saka", name: "Bukayo Saka", position: "RW", rating: 88, trait: "dangerous cutbacks", tier: "elite" },
];

// EXPANDED MYSTERY POOL (54 - 95): Wide range, much deeper options. Includes top tier superstars down to amateur chaos.
const mysteryPools: Record<Position, Player[]> = {
  GK: [
    { id: "gk-buffon", name: "Gianluigi Buffon", position: "GK", rating: 93, trait: "legendary presence", tier: "legend" },
    { id: "gk-yashin", name: "Lev Yashin", position: "GK", rating: 94, trait: "black spider reflexes", tier: "legend" },
    { id: "gk-casillas", name: "Iker Casillas", position: "GK", rating: 91, trait: "acrobatic saves", tier: "elite" },
    { id: "gk-schmeichel", name: "Peter Schmeichel", position: "GK", rating: 90, trait: "unbreakable aura", tier: "elite" },
    { id: "gk-mister", name: "Mystery Wall", position: "GK", rating: 86, trait: "consistent positioning", tier: "solid" },
    { id: "gk-dida", name: "Dida", position: "GK", rating: 88, trait: "penalty stopper", tier: "elite" },
    { id: "gk-navas", name: "Keylor Navas", position: "GK", rating: 87, trait: "quick recovery", tier: "solid" },
    { id: "gk-alisson", name: "Alisson Becker", position: "GK", rating: 89, trait: "calm distributor", tier: "elite" },
    { id: "gk-ederson", name: "Ederson Moraes", position: "GK", rating: 88, trait: "laser passes", tier: "elite" },
    { id: "gk-courtois", name: "Thibaut Courtois", position: "GK", rating: 90, trait: "huge coverage", tier: "elite" },
    { id: "gk-journeyman", name: "Backup keeper", position: "GK", rating: 71, trait: "nervous clearances", tier: "chaos" },
    { id: "gk-sunday", name: "Amateur goalie", position: "GK", rating: 59, trait: "poor catching", tier: "chaos" },
  ],
  LB: [
    { id: "lb-roberto-carlos", name: "Roberto Carlos", position: "LB", rating: 92, trait: "free-kick thunder", tier: "legend" },
    { id: "lb-maldini-lb", name: "Paolo Maldini", position: "LB", rating: 94, trait: "flawless defender", tier: "legend" },
    { id: "lb-marcelo", name: "Marcelo", position: "LB", rating: 89, trait: "unbelievable dribbling", tier: "elite" },
    { id: "lb-brehme", name: "Andreas Brehme", position: "LB", rating: 91, trait: "two-footed crosses", tier: "elite" },
    { id: "lb-cole", name: "Ashley Cole", position: "LB", rating: 88, trait: "tenacious tackle", tier: "elite" },
    { id: "lb-alba", name: "Jordi Alba", position: "LB", rating: 86, trait: "overlapping speed", tier: "solid" },
    { id: "lb-mendy", name: "Ferland Mendy", position: "LB", rating: 84, trait: "defensive wall", tier: "solid" },
    { id: "lb-robertson", name: "Andy Robertson", position: "LB", rating: 86, trait: "nonstop stamina", tier: "solid" },
    { id: "lb-zinchenko", name: "Oleksandr Zinchenko", position: "LB", rating: 82, trait: "inverted playmaker", tier: "solid" },
    { id: "lb-academy", name: "Prospect left back", position: "LB", rating: 68, trait: "pacy but raw", tier: "chaos" },
    { id: "lb-unknown", name: "Sunday sub", position: "LB", rating: 56, trait: "gets easily beaten", tier: "chaos" },
  ],
  CB: [
    { id: "cb-maldini", name: "Paolo Maldini", position: "CB", rating: 94, trait: "perfect tackling", tier: "legend" },
    { id: "cb-beckenbauer", name: "Franz Beckenbauer", position: "CB", rating: 93, trait: "regal defender", tier: "legend" },
    { id: "cb-baresi", name: "Franco Baresi", position: "CB", rating: 93, trait: "anticipates danger", tier: "legend" },
    { id: "cb-ramos", name: "Sergio Ramos", position: "CB", rating: 91, trait: "physical presence", tier: "elite" },
    { id: "cb-cannavaro", name: "Fabio Cannavaro", position: "CB", rating: 92, trait: "aerial master", tier: "legend" },
    { id: "cb-nesta", name: "Alessandro Nesta", position: "CB", rating: 90, trait: "elite positioning", tier: "elite" },
    { id: "cb-vidic", name: "Nemanja Vidic", position: "CB", rating: 88, trait: "uncompromising force", tier: "elite" },
    { id: "cb-puyol", name: "Carles Puyol", position: "CB", rating: 91, trait: "lion's heart", tier: "elite" },
    { id: "cb-desailly", name: "Marcel Desailly", position: "CB", rating: 90, trait: "absolute unit", tier: "elite" },
    { id: "cb-terry", name: "John Terry", position: "CB", rating: 89, trait: "brave defender", tier: "elite" },
    { id: "cb-stones", name: "John Stones", position: "CB", rating: 86, trait: "ball-playing cb", tier: "solid" },
    { id: "cb-maguire", name: "Harry Maguire", position: "CB", rating: 81, trait: "dominant in air", tier: "solid" },
    { id: "cb-local", name: "Local hard tackle", position: "CB", rating: 66, trait: "rugged headers", tier: "chaos" },
    { id: "cb-rookie", name: "Youth trialist", position: "CB", rating: 59, trait: "lacks confidence", tier: "chaos" },
  ],
  RB: [
    { id: "rb-cafu", name: "Cafu", position: "RB", rating: 92, trait: "unstoppable engine", tier: "legend" },
    { id: "rb-zanetti", name: "Javier Zanetti", position: "RB", rating: 91, trait: "reliable consistency", tier: "elite" },
    { id: "rb-alves", name: "Dani Alves", position: "RB", rating: 89, trait: "offensive spark", tier: "elite" },
    { id: "rb-thuram", name: "Lilian Thuram", position: "RB", rating: 91, trait: "defensive wall", tier: "elite" },
    { id: "rb-lahm", name: "Philipp Lahm", position: "RB", rating: 91, trait: "tactical genius", tier: "elite" },
    { id: "rb-walker", name: "Kyle Walker", position: "RB", rating: 86, trait: "supreme pace", tier: "solid" },
    { id: "rb-james", name: "Reece James", position: "RB", rating: 85, trait: "precise crosses", tier: "solid" },
    { id: "rb-hakimi", name: "Achraf Hakimi", position: "RB", rating: 87, trait: "speedy transition", tier: "solid" },
    { id: "rb-fill", name: "Amateur cover", position: "RB", rating: 69, trait: "safe clearances", tier: "chaos" },
    { id: "rb-trial", name: "Trial sub", position: "RB", rating: 57, trait: "easily bypassed", tier: "chaos" },
  ],
  CDM: [
    { id: "cdm-makelele", name: "Claude Makelele", position: "CDM", rating: 90, trait: "elite positioning", tier: "elite" },
    { id: "cdm-matthaus", name: "Lothar Matthäus", position: "CDM", rating: 93, trait: "midfield engine", tier: "legend" },
    { id: "cdm-kante", name: "N'Golo Kante", position: "CDM", rating: 89, trait: "infinite engine", tier: "elite" },
    { id: "cdm-keane", name: "Roy Keane", position: "CDM", rating: 91, trait: "vocal leader", tier: "elite" },
    { id: "cdm-vieira", name: "Patrick Vieira", position: "CDM", rating: 92, trait: "dominant presence", tier: "legend" },
    { id: "cdm-busquets", name: "Sergio Busquets", position: "CDM", rating: 89, trait: "tactical hub", tier: "elite" },
    { id: "cdm-pirlo", name: "Andrea Pirlo", position: "CDM", rating: 92, trait: "deep playmaker", tier: "legend" },
    { id: "cdm-rice", name: "Declan Rice", position: "CDM", rating: 86, trait: "ball thief", tier: "solid" },
    { id: "cdm-casemiro", name: "Casemiro", position: "CDM", rating: 88, trait: "tackle specialist", tier: "elite" },
    { id: "cdm-amateur", name: "Reckless tackler", position: "CDM", rating: 67, trait: "prone to fouls", tier: "chaos" },
    { id: "cdm-veteran", name: "Older pro", position: "CDM", rating: 58, trait: "reads it slowly", tier: "chaos" },
  ],
  CM: [
    { id: "cm-zidane", name: "Zinedine Zidane", position: "CM", rating: 94, trait: "graceful feet", tier: "legend" },
    { id: "cm-xavi", name: "Xavi", position: "CM", rating: 92, trait: "tiki-taka genius", tier: "elite" },
    { id: "cm-modric", name: "Luka Modric", position: "CM", rating: 91, trait: "outside-foot curl", tier: "elite" },
    { id: "cm-gerrard", name: "Steven Gerrard", position: "CM", rating: 91, trait: "explosive shots", tier: "elite" },
    { id: "cm-lampard", name: "Frank Lampard", position: "CM", rating: 90, trait: "late box arrivals", tier: "elite" },
    { id: "cm-kroos", name: "Toni Kroos", position: "CM", rating: 90, trait: "metronome passing", tier: "elite" },
    { id: "cm-scholes", name: "Paul Scholes", position: "CM", rating: 91, trait: "diagonal pings", tier: "elite" },
    { id: "cm-dejong", name: "Frenkie de Jong", position: "CM", rating: 87, trait: "agile dribbler", tier: "solid" },
    { id: "cm-youngster", name: "Reserve prospect", position: "CM", rating: 71, trait: "energetic but raw", tier: "solid" },
    { id: "cm-local", name: "Pub regular", position: "CM", rating: 61, trait: "heavy touch", tier: "chaos" },
  ],
  CAM: [
    { id: "cam-ronaldinho", name: "Ronaldinho", position: "CAM", rating: 93, trait: "flic-flac trickster", tier: "legend" },
    { id: "cam-kaka", name: "Kaka", position: "CAM", rating: 91, trait: "dynamic bursts", tier: "elite" },
    { id: "cam-maradona", name: "Diego Maradona", position: "CAM", rating: 95, trait: "hand of magic", tier: "legend" },
    { id: "cam-de-bruyne", name: "Kevin De Bruyne", position: "CAM", rating: 92, trait: "visionary passing", tier: "elite" },
    { id: "cam-totti", name: "Francesco Totti", position: "CAM", rating: 91, trait: "panenka finishes", tier: "elite" },
    { id: "cam-nedved", name: "Pavel Nedved", position: "CAM", rating: 91, trait: "long shot expert", tier: "elite" },
    { id: "cam-zidane", name: "Zinedine Zidane", position: "CAM", rating: 94, trait: "master orchestrator", tier: "legend" },
    { id: "cam-ozil", name: "Mesut Özil", position: "CAM", rating: 88, trait: "unreal vision", tier: "solid" },
    { id: "cam-futsal", name: "Street ace", position: "CAM", rating: 75, trait: "tight footwork", tier: "solid" },
    { id: "cam-unfit", name: "Out of breath pro", position: "CAM", rating: 62, trait: "doesn't track back", tier: "chaos" },
  ],
  LW: [
    { id: "lw-cristiano", name: "Cristiano Ronaldo", position: "LW", rating: 94, trait: "lethal finishing", tier: "legend" },
    { id: "lw-henry", name: "Thierry Henry", position: "LW", rating: 92, trait: "clinical finesse", tier: "legend" },
    { id: "lw-neymar", name: "Neymar Jr", position: "LW", rating: 91, trait: "skills overload", tier: "elite" },
    { id: "lw-rivaldo", name: "Rivaldo", position: "LW", rating: 91, trait: "spectacular shots", tier: "legend" },
    { id: "lw-leao", name: "Rafael Leão", position: "LW", rating: 87, trait: "bursting acceleration", tier: "solid" },
    { id: "lw-son", name: "Heung-min Son", position: "LW", rating: 88, trait: "deadly both feet", tier: "elite" },
    { id: "lw-grealish", name: "Jack Grealish", position: "LW", rating: 85, trait: "calf drop master", tier: "solid" },
    { id: "lw-trialist", name: "Trialist LW", position: "LW", rating: 69, trait: "raw pace", tier: "chaos" },
    { id: "lw-pub", name: "Pub sub", position: "LW", rating: 58, trait: "heavy crosses", tier: "chaos" },
  ],
  ST: [
    { id: "st-r9", name: "Ronaldo Nazario", position: "ST", rating: 94, trait: "phenomenal finishes", tier: "legend" },
    { id: "st-pele", name: "Pele", position: "ST", rating: 95, trait: "eternal king", tier: "legend" },
    { id: "st-cruyff", name: "Johan Cruyff", position: "ST", rating: 94, trait: "turn and shot maestro", tier: "legend" },
    { id: "st-mbappe", name: "Kylian Mbappé", position: "ST", rating: 91, trait: "frightening pace", tier: "elite" },
    { id: "st-suarez", name: "Luis Suárez", position: "ST", rating: 91, trait: "unpredictable goals", tier: "elite" },
    { id: "st-van-basten", name: "Marco van Basten", position: "ST", rating: 93, trait: "spectacular volleys", tier: "legend" },
    { id: "st-haaland", name: "Erling Haaland", position: "ST", rating: 90, trait: "unstoppable power", tier: "elite" },
    { id: "st-henry", name: "Thierry Henry", position: "ST", rating: 92, trait: "pace and finesse", tier: "legend" },
    { id: "st-poacher", name: "Local target man", position: "ST", rating: 71, trait: "strong in box", tier: "solid" },
    { id: "st-untested", name: "Reserves", position: "ST", rating: 55, trait: "raw but off target", tier: "chaos" },
  ],
  RW: [
    { id: "rw-messi", name: "Lionel Messi", position: "RW", rating: 95, trait: "left-footed magician", tier: "legend" },
    { id: "rw-garrincha", name: "Garrincha", position: "RW", rating: 92, trait: "joy of the people", tier: "legend" },
    { id: "rw-robben", name: "Arjen Robben", position: "RW", rating: 90, trait: "trademark cut-in", tier: "elite" },
    { id: "rw-best", name: "George Best", position: "RW", rating: 92, trait: "flawless dribbles", tier: "legend" },
    { id: "rw-figo", name: "Luís Figo", position: "RW", rating: 90, trait: "precise stepovers", tier: "elite" },
    { id: "rw-salah-rw", name: "Mohamed Salah", position: "RW", rating: 89, trait: "cutting edge speed", tier: "elite" },
    { id: "rw-beckham", name: "David Beckham", position: "RW", rating: 89, trait: "crosses and freekicks", tier: "elite" },
    { id: "rw-speedy", name: "Local sprinter", position: "RW", rating: 72, trait: "drives directly", tier: "solid" },
    { id: "rw-amateur", name: "Rookie sub", position: "RW", rating: 60, trait: "poor execution", tier: "chaos" },
  ],
};

const slotNames: Record<Position, string> = {
  GK: "Goalkeeper",
  LB: "Left Back",
  CB: "Centre Back",
  RB: "Right Back",
  CDM: "Defensive Mid",
  CM: "Centre Mid",
  CAM: "Attacking Mid",
  LW: "Left Wing",
  ST: "Striker",
  RW: "Right Wing",
};

const setupDefaults: SetupState = {
  mode: "ai",
  difficulty: "tactical",
  p1Style: "alchemist",
  p2Style: "pragmatist",
  playerOneName: "You",
  playerTwoName: "Player 2",
};

function randomFrom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function formatRating(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function getSideName(side: Side, setup: SetupState) {
  if (setup.mode === "ai") {
    return side === 1 ? setup.playerOneName || "You" : "AI Mastermind";
  }
  return side === 1 ? setup.playerOneName || "Player 1" : setup.playerTwoName || "Player 2";
}

function pickMystery(position: Position, takenIds: string[]) {
  const available = mysteryPools[position].filter((player) => !takenIds.includes(player.id));
  if (!available.length) return randomFrom(mysteryPools[position]);

  const highTier = available.filter((p) => p.tier === "legend" || p.tier === "elite");
  const midTier = available.filter((p) => p.tier === "solid");
  const lowTier = available.filter((p) => p.tier === "chaos");

  const rand = Math.random();
  if (rand < 0.35 && highTier.length > 0) {
    return randomFrom(highTier);
  } else if (rand < 0.70 && midTier.length > 0) {
    return randomFrom(midTier);
  } else if (lowTier.length > 0) {
    return randomFrom(lowTier);
  }
  return randomFrom(available);
}

function getTakenIds(squads: Squads) {
  return [...squads[1], ...squads[2]].map((pick) => pick.player.id);
}

function lineAverage(picks: DraftPick[], positions: Position[]) {
  const ratings = picks.filter((pick) => positions.includes(pick.slot)).map((pick) => pick.player.rating);
  return ratings.length ? average(ratings) : 0;
}

function applyStyleModifiers(profile: TeamProfile, style: ManagerStyle) {
  if (style === "pragmatist") {
    profile.defense = clamp(profile.defense + 5, 0, 99);
    profile.attack = clamp(profile.attack - 4, 0, 99);
  } else if (style === "entertainer") {
    profile.attack = clamp(profile.attack + 6, 0, 99);
    profile.flair = clamp(profile.flair + 8, 0, 99);
    profile.defense = clamp(profile.defense - 4, 0, 99);
  } else if (style === "alchemist") {
    profile.chemistry = clamp(profile.chemistry + 8, 40, 100);
    profile.overall = clamp(profile.overall - 1.5, 0, 99);
  } else if (style === "gambler") {
    profile.momentum = clamp(profile.momentum + (Math.random() > 0.45 ? 8 : -6), 35, 100);
  }
}

function calculateProfile(picks: DraftPick[], style: ManagerStyle): TeamProfile {
  const overall = average(picks.map((pick) => pick.player.rating));
  const attack = lineAverage(picks, ["LW", "CAM", "ST", "RW"]);
  const midfield = lineAverage(picks, ["CDM", "CM", "CAM"]);
  const defense = lineAverage(picks, ["GK", "LB", "CB", "RB", "CDM"]);
  const flair = average(picks.filter((pick) => ["LW", "RW", "CAM", "ST"].includes(pick.slot)).map((pick) => pick.player.rating));
  const legends = picks.filter((pick) => pick.player.tier === "legend" || pick.player.tier === "elite").length;
  const weakLinks = picks.filter((pick) => pick.player.rating < 68).length;
  const balancePenalty = Math.abs(attack - defense) + Math.abs(midfield - overall);
  const chemistry = clamp(70 + legends * 1.8 - weakLinks * 4 - balancePenalty * 0.12, 40, 98);
  const momentum = clamp((overall + chemistry + flair) / 3 + (Math.random() * 12 - 6), 40, 99);

  const profile: TeamProfile = { overall, attack, midfield, defense, chemistry, flair, momentum };
  applyStyleModifiers(profile, style);
  return profile;
}

function sampleGoals(lambda: number) {
  const limit = Math.exp(-lambda);
  let goals = 0;
  let product = 1;
  do {
    goals += 1;
    product *= Math.random();
  } while (product > limit && goals < 9);
  return goals - 1;
}

function decideAiChoice(position: Position, featured: Player, squads: Squads, setup: SetupState) {
  const team = squads[2];
  const profile = calculateProfile(team, setup.p2Style);
  const pool = mysteryPools[position];
  const avgMystery = average(pool.map((p) => p.rating));

  const needBoost = clamp((82 - profile.overall) / 8 + (82 - profile.chemistry) / 10, -3, 5);
  const featuredScore = featured.rating + (featured.tier === "legend" ? 3 : 1) + needBoost;
  const mysteryScore = avgMystery + (setup.difficulty === "god_mode" ? 3.5 : 1.2) - needBoost * 0.45;

  const jitter = Math.random() * 2.5 - 1.25;
  return mysteryScore + jitter > featuredScore ? "mystery" : "featured";
}

function buildMatchResult(squads: Squads, setup: SetupState): MatchResult {
  const left = calculateProfile(squads[1], setup.p1Style);
  const right = calculateProfile(squads[2], setup.p2Style);

  if (setup.difficulty === "god_mode") {
    right.overall = clamp(right.overall + 3.0, 0, 100);
    right.chemistry = clamp(right.chemistry + 4, 0, 100);
    right.attack = clamp(right.attack + 3, 0, 100);
    right.defense = clamp(right.defense + 3, 0, 100);
  }

  const leftXg = clamp(1.1 + (left.attack - right.defense) * 0.045 + (left.overall - right.overall) * 0.035 + (left.chemistry - right.chemistry) * 0.015 + left.momentum * 0.022, 0.2, 5.0);
  const rightXg = clamp(1.1 + (right.attack - left.defense) * 0.045 + (right.overall - left.overall) * 0.035 + (right.chemistry - left.chemistry) * 0.015 + right.momentum * 0.022, 0.2, 5.0);

  const lGoals = sampleGoals(leftXg);
  const rGoals = sampleGoals(rightXg);
  const score: [number, number] = [lGoals, rGoals];
  let winner: Side = score[0] >= score[1] ? 1 : 2;
  let tiebreak: string | undefined;

  if (score[0] === score[1]) {
    const leftPenalty = left.overall + left.chemistry * 0.35 + Math.random() * 15;
    const rightPenalty = right.overall + right.chemistry * 0.35 + Math.random() * 15;
    winner = leftPenalty >= rightPenalty ? 1 : 2;
    tiebreak = `Shootout decider: ${getSideName(winner, setup)} advanced in style.`;
  }

  const goals: GoalEvent[] = [];
  const lScorers = [...squads[1]]
    .filter((pick) => ["LW", "ST", "RW", "CAM", "CM"].includes(pick.slot))
    .map((p) => p.player.name);
  const rScorers = [...squads[2]]
    .filter((pick) => ["LW", "ST", "RW", "CAM", "CM"].includes(pick.slot))
    .map((p) => p.player.name);

  for (let i = 0; i < lGoals; i++) {
    const minute = Math.floor(Math.random() * 85) + 3;
    const scorer = lScorers.length ? randomFrom(lScorers) : "Own Goal";
    goals.push({ minute, player: scorer, side: 1 });
  }

  for (let i = 0; i < rGoals; i++) {
    const minute = Math.floor(Math.random() * 85) + 3;
    const scorer = rScorers.length ? randomFrom(rScorers) : "Own Goal";
    goals.push({ minute, player: scorer, side: 2 });
  }

  goals.sort((a, b) => a.minute - b.minute);

  const mvpLeft = [...squads[1]].sort((a, b) => b.player.rating - a.player.rating)[0]?.player;
  const mvpRight = [...squads[2]].sort((a, b) => b.player.rating - a.player.rating)[0]?.player;

  const headline =
    winner === 1
      ? `${getSideName(1, setup)} won the high-suspense clash, ${score[0]}-${score[1]}!`
      : `${getSideName(2, setup)} executed their tactical gameplan perfectly to take it, ${score[1]}-${score[0]}!`;

  const report = [
    left.attack > right.defense
      ? `${getSideName(1, setup)} found dangerous attacking pockets easily.`
      : `${getSideName(2, setup)} maintained defensive solidity against top threats.`,
    right.attack > left.defense
      ? `${getSideName(2, setup)} bypassed defensive traps on numerous occasions.`
      : `${getSideName(1, setup)} handled incoming crosses with ease.`,
    left.chemistry > right.chemistry
      ? `${getSideName(1, setup)} was much more synergistic than the opponent.`
      : `${getSideName(2, setup)} showcased world-class teamwork.`,
  ];

  return {
    score,
    winner,
    profile: { 1: left, 2: right },
    xg: [leftXg, rightXg],
    report,
    headline,
    goals,
    mvp: { 1: mvpLeft, 2: mvpRight },
    tiebreak,
  };
}

function ratingTone(rating: number) {
  if (rating >= 92) return "text-emerald-200";
  if (rating >= 84) return "text-lime-200";
  if (rating >= 74) return "text-amber-200";
  return "text-rose-200";
}

function getEventMessage(turn: number): string {
  const messages = [
    "",
    "Sponsor Bonus: The mystery player adds +3 momentum if drafted.",
    "Bidding War: Taking featured adds +2 defense chemistry.",
    "Injury Alarm: The featured player carries -2 fatigue rating this turn.",
    "Scout Hint: Mystery is confirmed to be a higher-tier pick.",
    "Tough Pitch: Balanced tactical setups will be rewarded heavily.",
    "Oracle Whisper: The hidden wildcard has serious rating spikes.",
    "Rival Traps: AI Mastermind will block your next favorite tier if possible.",
    "Attack Boost: Forwards drafted next receive an elite offensive powerup.",
    "Form Surge: Both drafted players gain immediate form modifiers.",
    "Draft Climax: The mystery gamble yields maximum chemistry points!",
  ];
  return messages[turn] || "Perfect execution expected.";
}

const pitchNodes = [
  { x: 50, y: 12 },
  { x: 18, y: 28 },
  { x: 40, y: 28 },
  { x: 60, y: 28 },
  { x: 82, y: 28 },
  { x: 50, y: 49 },
  { x: 28, y: 54 },
  { x: 50, y: 54 },
  { x: 72, y: 54 },
  { x: 38, y: 78 },
  { x: 62, y: 78 },
];

function screenTitle(mode: Mode) {
  return mode === "ai" ? "VS AI" : "2 Local Players";
}

function ModeButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative overflow-hidden rounded-[1.8rem] border p-5 text-left transition duration-300 ${
        active
          ? "border-emerald-200/70 bg-emerald-300/15 shadow-[0_0_0_1px_rgba(167,243,208,0.2),0_20px_80px_rgba(0,0,0,0.25)]"
          : "border-white/12 bg-white/[0.05] hover:border-white/25 hover:bg-white/[0.08]"
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent opacity-70" />
      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-2xl font-black tracking-tight text-white">{title}</h3>
          <span
            className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.22em] ${
              active ? "bg-emerald-200 text-emerald-950" : "bg-white/10 text-white/70"
            }`}
          >
            {active ? "Active" : "Select"}
          </span>
        </div>
        <p className="mt-3 max-w-sm text-sm leading-6 text-white/62">{description}</p>
      </div>
    </button>
  );
}

function MetricBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-white/60">
        <span>{label}</span>
        <span>{formatRating(value)}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-emerald-300 transition-all duration-500"
          style={{ width: `${clamp(value, 0, 100)}%` }}
        />
      </div>
    </div>
  );
}

function PitchField({
  picks,
  title,
  subtitle,
  highlightIndex,
  accent = "from-emerald-300 via-lime-300 to-teal-300",
}: {
  picks: DraftPick[];
  title: string;
  subtitle: string;
  highlightIndex?: number;
  accent?: string;
}) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/12 bg-black/20 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.3em] text-emerald-200/80">{title}</p>
          <h3 className="mt-1 text-lg font-black text-white">{subtitle}</h3>
        </div>
        <div className="rounded-full bg-white/10 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.22em] text-white/70">
          {picks.length}/11 locked
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[1.8rem] border border-white/10 p-3 bg-gradient-to-b from-[#093920] to-[#051c11]">
        <div className="pitch-field relative aspect-[16/10] overflow-hidden rounded-[1.5rem] border border-white/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_45%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_28%,transparent_72%,rgba(255,255,255,0.05))]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_calc(50%-1px),rgba(255,255,255,0.14)_calc(50%-1px),rgba(255,255,255,0.14)_calc(50%+1px),transparent_calc(50%+1px))]" />
          <div className="absolute inset-x-[17%] top-[25%] h-[1px] bg-white/12" />
          <div className="absolute inset-x-[17%] bottom-[25%] h-[1px] bg-white/12" />
          <div className="absolute left-1/2 top-[17%] h-[66%] w-[66%] -translate-x-1/2 rounded-full border border-white/12" />
          <div className="absolute left-1/2 top-[18%] h-[64%] w-[1px] -translate-x-1/2 bg-white/12" />
          <div className="absolute left-[10%] top-[31%] h-[38%] w-[10%] rounded-[1rem] border border-white/10" />
          <div className="absolute right-[10%] top-[31%] h-[38%] w-[10%] rounded-[1rem] border border-white/10" />

          {pitchNodes.map((node, index) => {
            const pick = picks[index];
            const active = highlightIndex === index;
            const isLocked = Boolean(pick);
            return (
              <div
                key={`${title}-${index}`}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
              >
                <div
                  className={`absolute rounded-full blur-xl transition-all duration-500 ${
                    active ? "h-24 w-24 bg-emerald-300/35" : isLocked ? "h-16 w-16 bg-white/10" : "h-12 w-12 bg-black/20"
                  }`}
                />
                <div
                  className={`relative grid h-14 w-14 place-items-center rounded-full border text-center transition-all duration-300 ${
                    active
                      ? "border-emerald-200 bg-emerald-300 text-emerald-950 shadow-[0_0_0_8px_rgba(167,243,208,0.18)]"
                      : isLocked
                        ? `border-white/20 bg-black/35 text-white`
                        : "border-white/10 bg-black/20 text-white/40"
                  }`}
                >
                  <span className="text-[0.65rem] font-black leading-none">
                    {pick ? initials(pick.player.name) : draftPlan[index]}
                  </span>
                  {pick && (
                    <span
                      className={`absolute -bottom-5 whitespace-nowrap text-[0.6rem] font-bold ${
                        active ? "text-white" : "text-white/65"
                      }`}
                    >
                      {pick.player.rating}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-sm text-white/64">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-r ${accent}`} />
          <span>Formational blueprint</span>
        </div>
        <span className="text-xs uppercase tracking-[0.2em] text-white/45">Tactical setup</span>
      </div>
    </section>
  );
}

function DraftCard({
  label,
  player,
  hidden,
  active,
  onChoose,
}: {
  label: string;
  player: Player;
  hidden?: boolean;
  active: boolean;
  onChoose: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onChoose}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={`group relative overflow-hidden rounded-[2rem] border p-5 text-left shadow-2xl shadow-black/20 backdrop-blur-xl transition duration-300 ${
        active ? "border-emerald-200/60 bg-white/[0.1]" : "border-white/12 bg-white/[0.05]"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_45%)] opacity-80" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.67rem] font-black uppercase tracking-[0.3em] text-emerald-200/80">{label}</p>
          <h3 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
            {hidden ? "Mystery player" : player.name}
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-white/64">
            {hidden ? "A roll of the dice: can reveal an amazing legend or an average amateur." : player.trait}
          </p>
        </div>
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-black/30 ring-1 ring-white/12">
          <span className={`text-xl font-black ${hidden ? "text-white/50" : ratingTone(player.rating)}`}>
            {hidden ? "?" : player.rating}
          </span>
        </div>
      </div>
      <div className="relative mt-6 flex items-center justify-between text-sm text-white/70">
        <span>{slotNames[player.position]}</span>
        <span className="rounded-full bg-white/10 px-3 py-1 font-black text-white/84">
          {hidden ? "Roll dice" : "Pick safe"}
        </span>
      </div>
    </motion.button>
  );
}

function RevealPanel({
  reveal,
  onContinue,
  currentTurn,
  totalTurns,
  labels,
}: {
  reveal: RevealState;
  onContinue: () => void;
  currentTurn: number;
  totalTurns: number;
  labels: Record<Side, string>;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="rounded-[2rem] border border-emerald-200/25 bg-emerald-300/10 p-5 shadow-2xl shadow-black/25 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.3em] text-emerald-200">Reveal</p>
          <h3 className="mt-2 text-lg font-black text-white">
            {labels[reveal.chooser]} selected the {reveal.choice === "featured" ? "star" : "gamble"}
          </h3>
        </div>
        <div className="rounded-full border border-white/12 bg-black/20 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-white/70">
          {currentTurn}/{totalTurns}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <RevealTile
          title={`${labels[reveal.chooser]} receives`}
          player={reveal.chooserPick}
          accent={reveal.choice === "featured" ? "from-emerald-300 to-lime-300" : "from-amber-300 to-orange-300"}
        />
        <RevealTile
          title={`${labels[reveal.otherSide]} receives`}
          player={reveal.otherPick}
          accent={reveal.choice === "featured" ? "from-amber-300 to-orange-300" : "from-emerald-300 to-lime-300"}
        />
      </div>

      <p className="mt-4 text-sm leading-6 text-white/70">{reveal.note}</p>

      <button
        type="button"
        onClick={onContinue}
        className="mt-5 w-full rounded-full bg-white px-5 py-4 text-sm font-black text-emerald-950 transition hover:scale-[1.01]"
      >
        {currentTurn === totalTurns ? "Complete draft" : "Next turn"}
      </button>
    </motion.section>
  );
}

function RevealTile({ title, player, accent }: { title: string; player: Player; accent: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 ring-1 ring-white/6">
      <p className="text-sm text-white/56">{title}</p>
      <div className={`mt-3 h-1.5 rounded-full bg-gradient-to-r ${accent}`} />
      <h4 className="mt-4 text-2xl font-black text-white">{player.name}</h4>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className={`text-3xl font-black ${ratingTone(player.rating)}`}>{player.rating}</p>
        <p className="text-xs uppercase tracking-[0.2em] text-white/45">{slotNames[player.position]}</p>
      </div>
      <p className="mt-2 text-sm text-white/60">{player.trait}</p>
    </div>
  );
}

function SetupScreen({
  setup,
  setSetup,
  onStart,
}: {
  setup: SetupState;
  setSetup: (next: SetupState) => void;
  onStart: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto grid min-h-screen max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-8"
    >
      <div className="relative overflow-hidden rounded-[2.5rem] border border-white/12 bg-white/[0.06] p-6 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-8 lg:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(167,243,208,0.18),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.12),transparent_42%)]" />
        <div className="absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 opacity-40 motion-drift" />

        <div className="relative flex h-full flex-col justify-between gap-8">
          <div className="max-w-2xl">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.34em] text-emerald-200">
              Balanced Risk & Suspense Draft
            </p>
            <h1 className="mt-4 text-5xl font-black tracking-tighter text-white sm:text-7xl">Mystery XI</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/68 sm:text-lg">
              Featured players are highly balanced. Every draft turn has an oracle hint, tactical style modifications, and deep simulation physics.
            </p>
          </div>

          <div className="grid gap-4 text-white/82 sm:grid-cols-3">
            <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200/80">
                New Strategy
              </p>
              <p className="mt-2 text-lg font-black text-white">Manager styles</p>
              <p className="mt-1 text-sm text-white/60">Choose tactical frameworks that tweak your team profiles directly.</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200/80">AI Mastermind</p>
              <p className="mt-2 text-lg font-black text-white">Advanced modes</p>
              <p className="mt-1 text-sm text-white/60">AI reads the board perfectly. Mastermind mode adds extreme competition.</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200/80">Draft events</p>
              <p className="mt-2 text-lg font-black text-white">Specialized turns</p>
              <p className="mt-1 text-sm text-white/60">Every draft turn brings a custom prompt/intel to challenge your strategy.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <section className="rounded-[2.1rem] border border-white/12 bg-white/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.34em] text-emerald-200">Mode selector</p>
          <div className="mt-4 grid gap-3">
            <ModeButton
              active={setup.mode === "ai"}
              title="VS AI"
              description="Challenge a calculating strategic coach. Perfect for testing high-variance drafts."
              onClick={() => setSetup({ ...setup, mode: "ai" })}
            />
            <ModeButton
              active={setup.mode === "local"}
              title="Local pass-and-play"
              description="Compete in turn-by-turn local action with specialized manager adjustments."
              onClick={() => setSetup({ ...setup, mode: "local" })}
            />
          </div>
        </section>

        {setup.mode === "ai" && (
          <section className="rounded-[2.1rem] border border-white/12 bg-white/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.34em] text-emerald-200">AI Challenge tier</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSetup({ ...setup, difficulty: "tactical" })}
                className={`rounded-2xl border p-4 text-left font-black transition ${
                  setup.difficulty === "tactical"
                    ? "border-emerald-200/70 bg-emerald-300/10 text-white"
                    : "border-white/12 bg-white/[0.03] text-white/60 hover:bg-white/5"
                }`}
              >
                Tactical AI
                <p className="mt-1 text-xs font-normal text-white/55">Scans choices rationally</p>
              </button>
              <button
                type="button"
                onClick={() => setSetup({ ...setup, difficulty: "god_mode" })}
                className={`rounded-2xl border p-4 text-left font-black transition ${
                  setup.difficulty === "god_mode"
                    ? "border-emerald-200/70 bg-emerald-300/10 text-white"
                    : "border-white/12 bg-white/[0.03] text-white/60 hover:bg-white/5"
                }`}
              >
                God Mode AI
                <p className="mt-1 text-xs font-normal text-white/55">+3 Match ratings & smarter drafting</p>
              </button>
            </div>
          </section>
        )}

        <section className="rounded-[2.1rem] border border-white/12 bg-white/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.34em] text-emerald-200">Coaches identity</p>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-white/80">
                {setup.mode === "ai" ? "Your name" : "Player 1"}
              </span>
              <input
                value={setup.playerOneName}
                onChange={(e) => setSetup({ ...setup, playerOneName: e.target.value })}
                placeholder="Manager 1"
                className="w-full rounded-[1.1rem] border border-white/10 bg-black/25 px-4 py-3 text-white outline-none ring-0 placeholder:text-white/30 focus:border-emerald-200/60"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-white/80">Tactical style</span>
              <select
                value={setup.p1Style}
                onChange={(e) => setSetup({ ...setup, p1Style: e.target.value as ManagerStyle })}
                className="w-full rounded-[1.1rem] border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-emerald-200/60"
              >
                <option value="pragmatist">The Pragmatist (+5 Defense, -4 Attack)</option>
                <option value="entertainer">The Entertainer (+6 Attack, +8 Flair, -4 Defense)</option>
                <option value="alchemist">The Alchemist (+8 Chemistry, -1.5 Overall)</option>
                <option value="gambler">The Gambler (Drastic Momentum Spikes)</option>
              </select>
            </label>

            {setup.mode === "local" && (
              <>
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-white/80">Player 2</span>
                  <input
                    value={setup.playerTwoName}
                    onChange={(e) => setSetup({ ...setup, playerTwoName: e.target.value })}
                    placeholder="Manager 2"
                    className="w-full rounded-[1.1rem] border border-white/10 bg-black/25 px-4 py-3 text-white outline-none ring-0 placeholder:text-white/30 focus:border-emerald-200/60"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-white/80">Player 2 Tactical Style</span>
                  <select
                    value={setup.p2Style}
                    onChange={(e) => setSetup({ ...setup, p2Style: e.target.value as ManagerStyle })}
                    className="w-full rounded-[1.1rem] border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-emerald-200/60"
                  >
                    <option value="pragmatist">The Pragmatist (+5 Defense, -4 Attack)</option>
                    <option value="entertainer">The Entertainer (+6 Attack, +8 Flair, -4 Defense)</option>
                    <option value="alchemist">The Alchemist (+8 Chemistry, -1.5 Overall)</option>
                    <option value="gambler">The Gambler (Drastic Momentum Spikes)</option>
                  </select>
                </label>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onStart}
            className="mt-6 w-full rounded-full bg-emerald-300 px-5 py-4 text-sm font-black text-emerald-950 transition hover:scale-[1.01]"
          >
            Launch Draft
          </button>
        </section>
      </div>
    </motion.section>
  );
}

function ResultScreen({
  result,
  setup,
  squads,
  onRematch,
  onNewDraft,
}: {
  result: MatchResult;
  setup: SetupState;
  squads: Squads;
  onRematch: () => void;
  onNewDraft: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8"
    >
      <div className="rounded-[2.4rem] border border-white/12 bg-white/[0.08] p-5 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-7 lg:p-8">
        <p className="text-[0.68rem] font-black uppercase tracking-[0.34em] text-emerald-200">
          Match concluded
        </p>
        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-5xl font-black tracking-tighter text-white sm:text-7xl">
              {result.score[0]} - {result.score[1]}
            </h2>
            <p className="mt-3 max-w-2xl text-xl font-bold text-white/88 sm:text-2xl">{result.headline}</p>
            <p className="mt-2 text-sm text-white/60">
              Expected Goals: {result.xg[0].toFixed(2)} to {result.xg[1].toFixed(2)}
            </p>
            {result.tiebreak && <p className="mt-1 text-sm text-white/60">{result.tiebreak}</p>}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onRematch}
              className="rounded-full bg-white px-5 py-3 text-sm font-black text-emerald-950 transition hover:scale-105"
            >
              Rematch
            </button>
            <button
              type="button"
              onClick={onNewDraft}
              className="rounded-full border border-white/16 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
            >
              New draft
            </button>
          </div>
        </div>

        {/* Goal log timeline */}
        <div className="mt-6 rounded-[1.8rem] border border-white/10 bg-black/25 p-5">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-200">Goals Timeline</p>
          <div className="mt-4 space-y-2">
            {result.goals.length ? (
              result.goals.map((g, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-white/8 pb-2 text-sm last:border-none">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-emerald-300">{g.minute}'</span>
                    <span className="font-bold text-white/90">⚽️ {g.player}</span>
                  </div>
                  <span className="text-xs font-black uppercase tracking-[0.15em] text-white/40">
                    {getSideName(g.side, setup)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/40 font-bold italic">No goals scored during regulation time.</p>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {[1, 2].map((side) => {
            const typed = side as Side;
            const profile = result.profile[typed];
            const mvp = result.mvp[typed];
            const sideName = getSideName(typed, setup);

            return (
              <div key={side} className="rounded-[1.6rem] border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200/80">
                      {sideName}
                    </p>
                    <h3 className="mt-1 text-xl font-black text-white">
                      {typed === result.winner ? "Victory" : "Runner-up"}
                    </h3>
                  </div>
                  <div className="rounded-full bg-white/8 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-white/65">
                    xG {result.xg[side - 1].toFixed(2)}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <MetricBar label="Overall" value={profile.overall} />
                  <MetricBar label="Chemistry" value={profile.chemistry} />
                  <MetricBar label="Attack" value={profile.attack} />
                  <MetricBar label="Defense" value={profile.defense} />
                </div>

                <div className="mt-4 grid gap-3 rounded-[1.3rem] border border-white/10 bg-white/[0.04] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">MVP star</p>
                    <p className="mt-1 text-lg font-black text-white">{mvp?.name}</p>
                    <p className="text-sm text-white/60">{mvp?.trait}</p>
                  </div>
                  <div className={`text-4xl font-black ${ratingTone(mvp?.rating ?? 0)}`}>
                    {mvp?.rating}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <PitchField
            picks={squads[1]}
            title="Field view"
            subtitle={getSideName(1, setup)}
            accent="from-emerald-300 via-lime-300 to-teal-300"
          />
          <PitchField
            picks={squads[2]}
            title="Field view"
            subtitle={getSideName(2, setup)}
            accent="from-sky-300 via-cyan-300 to-emerald-300"
          />
        </div>

        <div className="mt-6 grid gap-3 text-sm text-white/68 sm:grid-cols-3">
          {result.report.map((line) => (
            <div key={line} className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
              {line}
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

export default function App() {
  const [screen, setScreen] = useState<"setup" | "draft" | "result">("setup");
  const [setup, setSetup] = useState<SetupState>(setupDefaults);
  const [squads, setSquads] = useState<Squads>({ 1: [], 2: [] });
  const [turnIndex, setTurnIndex] = useState(0);
  const [chooser, setChooser] = useState<Side>(1);
  const [mystery, setMystery] = useState(() => pickMystery(draftPlan[0], []));
  const [reveal, setReveal] = useState<RevealState | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  const draftComplete = turnIndex >= draftPlan.length;
  const currentSlot = draftPlan[Math.min(turnIndex, draftPlan.length - 1)];
  const featured = featuredPlayers[Math.min(turnIndex, featuredPlayers.length - 1)];
  const currentChooserName = getSideName(chooser, setup);
  const labels = useMemo(
    () => ({
      1: getSideName(1, setup),
      2: getSideName(2, setup),
    }),
    [setup]
  );

  function resetGame(nextScreen: "setup" | "draft" | "result" = "setup") {
    const initialMystery = pickMystery(draftPlan[0], []);
    setScreen(nextScreen);
    setSquads({ 1: [], 2: [] });
    setTurnIndex(0);
    setChooser(1);
    setMystery(initialMystery);
    setReveal(null);
    setMatchResult(null);
  }

  function startDraft() {
    resetGame("draft");
  }

  function resolveChoice(choice: Choice) {
    if (screen !== "draft" || reveal || draftComplete) return;

    const chooserPick = choice === "featured" ? featured : mystery;
    const otherPick = choice === "featured" ? mystery : featured;
    const otherSide: Side = chooser === 1 ? 2 : 1;
    const nextReveal: RevealState = {
      chooser,
      choice,
      chooserPick,
      otherPick,
      otherSide,
      autoContinue: setup.mode === "ai" && chooser === 2,
      note:
        choice === "featured"
          ? `${currentChooserName} selected the safe superstar. ${labels[otherSide]} automatically received the hidden gamble.`
          : `${currentChooserName} gambled on the hidden wildcard. ${labels[otherSide]} received the headline star.`,
    };

    setSquads((current) => ({
      1:
        chooser === 1
          ? [...current[1], { slot: currentSlot, player: chooserPick, source: choice }]
          : [...current[1], { slot: currentSlot, player: otherPick, source: choice === "featured" ? "mystery" : "featured" }],
      2:
        chooser === 2
          ? [...current[2], { slot: currentSlot, player: chooserPick, source: choice }]
          : [...current[2], { slot: currentSlot, player: otherPick, source: choice === "featured" ? "mystery" : "featured" }],
    }));

    setReveal(nextReveal);
  }

  function continueDraft() {
    if (!reveal) return;

    const nextTurn = turnIndex + 1;
    setReveal(null);

    if (nextTurn >= draftPlan.length) {
      setTurnIndex(draftPlan.length);
      setMystery(pickMystery(draftPlan[draftPlan.length - 1], getTakenIds(squads)));
      return;
    }

    setTurnIndex(nextTurn);
    setChooser((current) => (current === 1 ? 2 : 1));
    setMystery(pickMystery(draftPlan[nextTurn], getTakenIds(squads)));
  }

  function simulateMatch() {
    setMatchResult(buildMatchResult(squads, setup));
    setScreen("result");
  }

  useEffect(() => {
    if (screen !== "draft" || reveal || draftComplete || setup.mode !== "ai" || chooser !== 2) return;

    const timer = window.setTimeout(() => {
      const choice = decideAiChoice(currentSlot, featured, squads, setup);
      resolveChoice(choice);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [screen, reveal, draftComplete, setup.mode, chooser, currentSlot, featured, squads, setup]);

  useEffect(() => {
    if (!reveal?.autoContinue) return;

    const timer = window.setTimeout(() => {
      continueDraft();
    }, 1450);

    return () => window.clearTimeout(timer);
  }, [reveal]);

  const draftView = (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto grid max-w-6xl gap-5 px-4 pb-6 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8"
    >
      <div className="min-w-0">
        <div className="rounded-[2.4rem] border border-white/12 bg-white/[0.06] p-5 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[0.68rem] font-black uppercase tracking-[0.34em] text-emerald-200">
                {screenTitle(setup.mode)} active
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-tighter text-white sm:text-6xl">
                {draftComplete ? "Formation locked." : `${currentChooserName}'s move`}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/68">
                {draftComplete
                  ? "Lineups are full. Transition both teams into direct tactical match simulation."
                  : `Drafting for ${slotNames[currentSlot]}. Safe overall pick or a dramatic wildcard?`}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => resetGame("setup")}
                className="rounded-full border border-white/16 px-4 py-3 text-sm font-black text-white transition hover:bg-white/10"
              >
                Change mode
              </button>
              {draftComplete && (
                <button
                  type="button"
                  onClick={simulateMatch}
                  className="rounded-full bg-emerald-300 px-4 py-3 text-sm font-black text-emerald-950 transition hover:scale-[1.02]"
                >
                  Simulate match
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <PitchField
              picks={squads[chooser]}
              title="Formational blueprint"
              subtitle={`${currentChooserName}'s formation board`}
              highlightIndex={turnIndex}
            />

            <section className="rounded-[2rem] border border-white/12 bg-white/[0.06] p-4 shadow-2xl shadow-black/20 backdrop-blur-xl flex flex-col justify-between">
              <div>
                <p className="text-[0.68rem] font-black uppercase tracking-[0.3em] text-emerald-200/80">
                  Event status
                </p>
                <h3 className="mt-1 text-lg font-black text-white">Event active</h3>
                <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-black/22 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-white/45">
                    Turn modifier
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/68">
                    {getEventMessage(turnIndex)}
                  </p>
                </div>
              </div>
              <div className="mt-4 border-t border-white/10 pt-4 flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] text-white/45">Decision Oracle</span>
                <span className="text-sm font-bold text-white/80">{slotNames[currentSlot]}</span>
              </div>
            </section>
          </div>

          {!draftComplete && !reveal && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <DraftCard
                label="Featured superstar"
                player={featured}
                active
                onChoose={() => resolveChoice("featured")}
              />
              <DraftCard
                label="Mystery wildcard"
                player={mystery}
                hidden
                active
                onChoose={() => resolveChoice("mystery")}
              />
            </div>
          )}

          <AnimatePresence mode="wait">
            {reveal && (
              <RevealPanel
                reveal={reveal}
                onContinue={continueDraft}
                currentTurn={Math.min(turnIndex + 1, draftPlan.length)}
                totalTurns={draftPlan.length}
                labels={labels}
              />
            )}
          </AnimatePresence>

          {draftComplete && !reveal && (
            <div className="mt-6 rounded-[1.8rem] border border-white/12 bg-black/20 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-white/72">Lineup confirmed</p>
                  <p className="mt-1 text-xl font-black text-white">Your full 11-man squad is active.</p>
                </div>
                <button
                  type="button"
                  onClick={simulateMatch}
                  className="rounded-full bg-white px-5 py-3 text-sm font-black text-emerald-950 transition hover:scale-[1.02]"
                >
                  Run simulator
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <aside className="grid gap-4">
        <SquadBoard side={1} picks={squads[1]} name={labels[1]} style={setup.p1Style} />
        <SquadBoard side={2} picks={squads[2]} name={labels[2]} style={setup.p2Style} />
      </aside>
    </motion.section>
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#03150d] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(110,231,183,0.24),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.12),transparent_26%),linear-gradient(180deg,#071c12_0%,#03110a_100%)]" />
      <div className="pointer-events-none fixed inset-0 pitch-lines opacity-50" />
      <div className="pointer-events-none fixed left-1/2 top-24 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full border border-white/10 motion-drift" />

      <div className="relative">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <button type="button" onClick={() => resetGame("setup")} className="text-left">
            <p className="text-3xl font-black tracking-tighter text-white sm:text-4xl">Mystery XI</p>
            <p className="text-[0.68rem] font-black uppercase tracking-[0.34em] text-emerald-200/80">
              Challenging & Creative Draft
            </p>
          </button>
          <div className="rounded-full border border-white/12 bg-white/10 px-4 py-2 text-sm font-black backdrop-blur">
            {screen === "setup"
              ? "Draft options"
              : screen === "draft"
                ? `Turn ${Math.min(turnIndex + 1, draftPlan.length)}/${draftPlan.length}`
                : "Final match"}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {screen === "setup" && <SetupScreen key="setup" setup={setup} setSetup={setSetup} onStart={startDraft} />}

          {screen === "draft" && (
            <motion.div key="draft" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {draftView}
            </motion.div>
          )}

          {screen === "result" && matchResult && (
            <ResultScreen
              key="result"
              result={matchResult}
              setup={setup}
              squads={squads}
              onRematch={() => resetGame("draft")}
              onNewDraft={() => resetGame("setup")}
            />
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

function SquadBoard({
  side,
  picks,
  name,
  style,
}: {
  side: Side;
  picks: DraftPick[];
  name: string;
  style: ManagerStyle;
}) {
  const profile = useMemo(() => calculateProfile(picks, style), [picks, style]);

  return (
    <section className="rounded-[1.9rem] border border-white/10 bg-black/24 p-4 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.3em] text-emerald-200/80">
            Squad {side}
          </p>
          <h3 className="mt-1 text-lg font-black text-white">{name}</h3>
          <p className="text-xs text-white/50 capitalize font-bold">{style} tactician</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-white/45">Power</p>
          <p className="text-2xl font-black text-white">{profile.overall ? profile.overall.toFixed(1) : "--"}</p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-lime-300 to-teal-300"
          initial={false}
          animate={{ width: `${(picks.length / draftPlan.length) * 100}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 18 }}
        />
      </div>

      <div className="mt-4 grid gap-2">
        {draftPlan.map((slot, index) => {
          const pick = picks[index];
          return (
            <div
              key={`${side}-${slot}-${index}`}
              className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm"
            >
              <span className="w-10 shrink-0 font-black text-emerald-200/80">{slot}</span>
              <span className="min-w-0 flex-1 truncate text-white/82">{pick ? pick.player.name : "Unfilled"}</span>
              <span
                className={
                  pick ? `font-black ${ratingTone(pick.player.rating)}` : "font-black text-white/20"
                }
              >
                {pick ? pick.player.rating : "--"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
