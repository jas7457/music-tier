import type { PlaybackScreen } from "./types";
import { IntroScreen } from "./screens/IntroScreen";
import { TopSongScreen } from "./screens/TopSongScreen";
import { UserTopSongScreen } from "./screens/UserTopSongScreen";
import { TotalPointsScreen } from "./screens/TotalPointsScreen";
import { BiggestFanScreen } from "./screens/BiggestFanScreen";
import { BiggestCriticScreen } from "./screens/BiggestCriticScreen";
import { MostWinsScreen } from "./screens/MostWinsScreen";
import { FastestSubmitterScreen } from "./screens/FastestSubmitterScreen";
import { FastestVoterScreen } from "./screens/FastestVoterScreen";
import { MostConsistentScreen } from "./screens/MostConsistentScreen";
import { BestGuesserScreen } from "./screens/BestGuesserScreen";
import { MostNotedSongScreen } from "./screens/MostNotedSongScreen";
import { ConspiratorsScreen } from "./screens/ConspiratorsScreen";
import { AllUserTopSongsCarouselScreen } from "./screens/AllUserTopSongsCarouselScreen";
import { SummaryScreen } from "./screens/SummaryScreen";

export const PLAYBACK_SCREENS: PlaybackScreen[] = [
  {
    key: "intro",
    component: IntroScreen,
  },
  {
    key: "total-points",
    component: TotalPointsScreen,
  },
  {
    key: "top-song",
    component: TopSongScreen,
  },
  {
    key: "biggest-fan",
    component: BiggestFanScreen,
  },
  {
    key: "biggest-critic",
    component: BiggestCriticScreen,
  },
  {
    key: "user-top-song",
    component: UserTopSongScreen,
  },
  {
    key: "most-wins",
    component: MostWinsScreen,
  },
  {
    key: "fastest-submitter",
    component: FastestSubmitterScreen,
  },
  {
    key: "fastest-voter",
    component: FastestVoterScreen,
  },
  {
    key: "most-consistent",
    component: MostConsistentScreen,
  },
  {
    key: "best-guesser",
    component: BestGuesserScreen,
  },
  {
    key: "most-noted-song",
    component: MostNotedSongScreen,
  },
  {
    key: "conspirators",
    component: ConspiratorsScreen,
  },
  {
    key: "all-user-top-songs-carousel",
    component: AllUserTopSongsCarouselScreen,
  },
  {
    key: "summary",
    component: SummaryScreen,
  },
];
