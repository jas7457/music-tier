import type { PlaybackScreen } from "./types";
import { IntroScreen } from "./screens/IntroScreen";
import { TopSongScreen } from "./screens/TopSongScreen";
import { UserTopSongScreen } from "./screens/UserTopSongScreen";
import { TotalPointsScreen } from "./screens/TotalPointsScreen";
import { BiggestFanScreen } from "./screens/BiggestFanScreen";
import { BiggestCriticScreen } from "./screens/BiggestCriticScreen";
import { MostWinsScreen } from "./screens/MostWinsScreen";
import { FastestSubmitterScreen } from "./screens/FastestSubmitterScreen";
import { SlowestSubmitterScreen } from "./screens/SlowestSubmitterScreen";
import { FastestVoterScreen } from "./screens/FastestVoterScreen";
import { SlowestVoterScreen } from "./screens/SlowestVoterScreen";
import { MostConsistentScreen } from "./screens/MostConsistentScreen";
import { BestGuesserScreen } from "./screens/BestGuesserScreen";
import { WorstGuesserScreen } from "./screens/WorstGuesserScreen";
import { MostNotedSongScreen } from "./screens/MostNotedSongScreen";
import { ConspiratorsScreen } from "./screens/ConspiratorsScreen";
import { SummaryScreen } from "./screens/SummaryScreen";

export const PLAYBACK_SCREENS: PlaybackScreen[] = [
  {
    key: "intro",
    component: IntroScreen,
    background: { from: "#1e1b4b", via: "#7c3aed", to: "#000000" }, // indigo to purple to black
  },
  {
    key: "top-song",
    component: TopSongScreen,
    trackInfo: (playback) => playback.topSong?.trackInfo || null,
    background: { from: "#7c3aed", via: "#ec4899", to: "#1e1b4b" }, // purple to pink to indigo
  },
  {
    key: "total-points",
    component: TotalPointsScreen,
    background: { from: "#d946ef", via: "#f59e0b", to: "#ec4899" }, // fuchsia to amber to pink
  },
  {
    key: "biggest-fan",
    component: BiggestFanScreen,
    background: { from: "#f59e0b", via: "#ef4444", to: "#d946ef" }, // amber to red to fuchsia
  },
  {
    key: "biggest-critic",
    component: BiggestCriticScreen,
    background: { from: "#ef4444", via: "#8b5cf6", to: "#f59e0b" }, // red to violet to amber
  },
  {
    key: "user-top-song",
    component: UserTopSongScreen,
    trackInfo: (playback) => playback.userTopSong?.trackInfo || null,
    background: { from: "#ec4899", via: "#d946ef", to: "#7c3aed" }, // pink to fuchsia to purple
  },
  {
    key: "most-wins",
    component: MostWinsScreen,
    background: { from: "#8b5cf6", via: "#06b6d4", to: "#ef4444" }, // violet to cyan to red
  },
  {
    key: "fastest-submitter",
    component: FastestSubmitterScreen,
    trackInfo: (playback) => playback.fastestSubmitter?.fastestSong.trackInfo || null,
    background: { from: "#06b6d4", via: "#10b981", to: "#8b5cf6" }, // cyan to emerald to violet
  },
  {
    key: "slowest-submitter",
    component: SlowestSubmitterScreen,
    background: { from: "#10b981", via: "#3b82f6", to: "#06b6d4" }, // emerald to blue to cyan
  },
  {
    key: "fastest-voter",
    component: FastestVoterScreen,
    trackInfo: (playback) => playback.fastestVoter?.fastestSong.trackInfo || null,
    background: { from: "#3b82f6", via: "#a855f7", to: "#10b981" }, // blue to purple to emerald
  },
  {
    key: "slowest-voter",
    component: SlowestVoterScreen,
    background: { from: "#a855f7", via: "#ec4899", to: "#3b82f6" }, // purple to pink to blue
  },
  {
    key: "most-consistent",
    component: MostConsistentScreen,
    background: { from: "#ec4899", via: "#f97316", to: "#a855f7" }, // pink to orange to purple
  },
  {
    key: "best-guesser",
    component: BestGuesserScreen,
    background: { from: "#f97316", via: "#10b981", to: "#ec4899" }, // orange to emerald to pink
  },
  {
    key: "worst-guesser",
    component: WorstGuesserScreen,
    background: { from: "#10b981", via: "#ef4444", to: "#f97316" }, // emerald to red to orange
  },
  {
    key: "most-noted-song",
    component: MostNotedSongScreen,
    trackInfo: (playback) => playback.mostNotedSong?.trackInfo || null,
    background: { from: "#f97316", via: "#a855f7", to: "#10b981" }, // orange to purple to emerald
  },
  {
    key: "conspirators",
    component: ConspiratorsScreen,
    background: { from: "#a855f7", via: "#1e1b4b", to: "#f97316" }, // purple to indigo to orange
  },
  {
    key: "summary",
    component: SummaryScreen,
    background: { from: "#1e1b4b", via: "#7c3aed", to: "#000000" }, // indigo to purple to black
  },
];
