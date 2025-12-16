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
import { memo } from "react";

export const PLAYBACK_SCREENS: PlaybackScreen[] = [
  {
    key: "intro",
    component: memo(IntroScreen),
  },
  {
    key: "total-points",
    component: memo(TotalPointsScreen),
  },
  {
    key: "top-song",
    component: memo(TopSongScreen),
  },
  {
    key: "biggest-fan",
    component: memo(BiggestFanScreen),
  },
  {
    key: "biggest-critic",
    component: memo(BiggestCriticScreen),
  },
  {
    key: "user-top-song",
    component: memo(UserTopSongScreen),
  },
  {
    key: "most-wins",
    component: memo(MostWinsScreen),
  },
  {
    key: "fastest-submitter",
    component: memo(FastestSubmitterScreen),
  },
  {
    key: "fastest-voter",
    component: memo(FastestVoterScreen),
  },
  {
    key: "most-consistent",
    component: memo(MostConsistentScreen),
  },
  {
    key: "best-guesser",
    component: memo(BestGuesserScreen),
  },
  {
    key: "most-noted-song",
    component: memo(MostNotedSongScreen),
  },
  {
    key: "conspirators",
    component: memo(ConspiratorsScreen),
  },
  {
    key: "all-user-top-songs-carousel",
    component: memo(AllUserTopSongsCarouselScreen),
  },
  {
    key: "summary",
    component: memo(SummaryScreen),
  },
];
