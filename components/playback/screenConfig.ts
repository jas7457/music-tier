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
import { LeagueChampionScreen } from "./screens/LeagueChampionScreen";
import { RacingScreen } from "./screens/RacingScreen";
import { memo } from "react";

export const PLAYBACK_SCREENS: PlaybackScreen[] = [
  {
    key: "intro",
    component: memo(IntroScreen),
    viewType: "IntroScreen",
  },
  {
    key: "racing",
    component: memo(RacingScreen),
    viewType: "CustomScreen",
  },
  {
    key: "league-champion",
    component: memo(LeagueChampionScreen),
    viewType: "CustomScreen",
  },
  {
    key: "total-points",
    component: memo(TotalPointsScreen),
    viewType: "CustomScreen",
  },
  {
    key: "top-song",
    component: memo(TopSongScreen),
    viewType: "SongScreen",
  },
  {
    key: "biggest-fan",
    component: memo(BiggestFanScreen),
    viewType: "UserScreen",
  },
  {
    key: "biggest-critic",
    component: memo(BiggestCriticScreen),
    viewType: "UserScreen",
  },
  {
    key: "most-wins",
    component: memo(MostWinsScreen),
    viewType: "UserScreen",
  },
  {
    key: "user-top-song",
    component: memo(UserTopSongScreen),
    viewType: "SongScreen",
  },
  {
    key: "fastest-submitter",
    component: memo(FastestSubmitterScreen),
    viewType: "UserScreen",
  },
  {
    key: "fastest-voter",
    component: memo(FastestVoterScreen),
    viewType: "UserScreen",
  },
  {
    key: "conspirators",
    component: memo(ConspiratorsScreen),
    viewType: "CustomScreen",
  },
  {
    key: "most-consistent",
    component: memo(MostConsistentScreen),
    viewType: "UserScreen",
  },
  {
    key: "most-noted-song",
    component: memo(MostNotedSongScreen),
    viewType: "SongScreen",
  },
  {
    key: "best-guesser",
    component: memo(BestGuesserScreen),
    viewType: "UserScreen",
  },
  {
    key: "all-user-top-songs-carousel",
    component: memo(AllUserTopSongsCarouselScreen),
    viewType: "SongScreen",
  },
  {
    key: "summary",
    component: memo(SummaryScreen),
    viewType: "SummaryScreen",
  },
];
