"use client";

import { Screen } from "../components/Screen";
import type { PlaybackScreenProps } from "../types";
import { Avatar } from "@/components/Avatar";
import { NEON_COLORS } from "../constants";
import { useMemo, useState } from "react";
import type {
  PopulatedRound,
  PopulatedSubmission,
  PopulatedUser,
} from "@/lib/types";
import AlbumArt from "@/components/AlbumArt";
import { formatTime } from "./utils";
import { getPlaceString } from "@/lib/utils/getPlaces";
import { TrackInfo } from "@/databaseTypes";
import Link from "next/link";

type SummaryCard = {
  id: string;
  icon: string;
  title: string;
  subtitle?: string;
  value: string;
  color: string;
  description: string | React.ReactNode;
  moreDetailsLink?: string;
  user?: PopulatedUser;
  user2?: PopulatedUser; // For conspirators
};

export function SummaryScreen({
  playback,
  league,
  isActive,
}: PlaybackScreenProps) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const summaryCards = useMemo(() => {
    const cards: SummaryCard[] = [];

    // Your Total Points
    if (playback.userStats) {
      cards.push({
        id: "your-points",
        icon: "⭐",
        title: "Your Total Points",
        subtitle: `${getPlaceString(playback.userStats.place)} place`,
        value: `${playback.userStats.totalPoints.toString()} pts`,
        color: NEON_COLORS.Yellow,
        description:
          "Your total points accumulated across all completed rounds in this league.",
      });
    }

    // Most Noted Round (round with most comments)
    const completedRounds = league.rounds.completed;
    if (completedRounds.length > 0) {
      const roundsWithNotes = completedRounds
        .map((round) => {
          const totalNotes = round.votes.filter((v) => v.note).length;
          return { round, totalNotes };
        })
        .filter((r) => r.totalNotes > 0)
        .sort((a, b) => b.totalNotes - a.totalNotes);

      if (roundsWithNotes.length > 0) {
        const mostNotedRound = roundsWithNotes[0];
        cards.push({
          id: "most-noted-round",
          icon: "💬",
          title: "Most Discussed Round",
          value: `${mostNotedRound.totalNotes.toString()} notes`,
          color: NEON_COLORS.BrightBlue,
          subtitle: mostNotedRound.round.title,
          moreDetailsLink: getRoundLink(mostNotedRound.round, league._id),
          description: `${mostNotedRound.round.title} sparked the most conversation with ${mostNotedRound.totalNotes} comments left by voters.`,
        });
      }
    }

    // Quickest and Slowest Submission Rounds
    if (completedRounds.length > 0) {
      const roundsWithSubmissions = completedRounds
        .map((round) => {
          const submissions = round.submissions.filter(
            (s) => s.submissionDate && round.submissionStartDate
          );
          if (submissions.length === 0) return null;

          const avgTime =
            submissions.reduce(
              (sum, s) => sum + (s.submissionDate - round.submissionStartDate),
              0
            ) / submissions.length;

          return { round, avgTime, submissionCount: submissions.length };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => a.avgTime - b.avgTime);

      if (roundsWithSubmissions.length > 0) {
        const quickestRound = roundsWithSubmissions[0];
        const timeDisplay = formatTime(quickestRound.avgTime);

        const slowestRound =
          roundsWithSubmissions[roundsWithSubmissions.length - 1];
        const slowTimeDisplay = formatTime(slowestRound.avgTime);

        cards.push({
          id: "quickest-submission-round",
          icon: "⚡",
          title: "Quickest Submission Round",
          value: timeDisplay,
          color: NEON_COLORS.ElectricPurple,
          subtitle: quickestRound.round.title,
          moreDetailsLink: getRoundLink(quickestRound.round, league._id),
          description: `${quickestRound.round.title} had the fastest average submission time, with players submitting their songs in just ${timeDisplay} on average.`,
        });

        cards.push({
          id: "slowest-submission-round",
          icon: "🐢",
          title: "Slowest Submission Round",
          value: slowTimeDisplay,
          color: NEON_COLORS.DeepViolet,
          subtitle: slowestRound.round.title,
          moreDetailsLink: getRoundLink(slowestRound.round, league._id),
          description: `${slowestRound.round.title} saw the slowest average submission time, with players taking an average of ${slowTimeDisplay} to submit their songs.`,
        });
      }
    }

    // Quickest and Slowest Voting Rounds
    if (completedRounds.length > 0) {
      const roundsWithVotes = completedRounds
        .map((round) => {
          const votes = round.votes.filter(
            (v) => v.voteDate && round.votingStartDate
          );
          if (votes.length === 0) return null;

          const avgTime =
            votes.reduce(
              (sum, v) => sum + (v.voteDate - round.votingStartDate),
              0
            ) / votes.length;

          return { round, avgTime, voteCount: votes.length };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => a.avgTime - b.avgTime);

      if (roundsWithVotes.length > 0) {
        const quickestRound = roundsWithVotes[0];
        const timeDisplay = formatTime(quickestRound.avgTime);

        const slowestRound = roundsWithVotes[roundsWithVotes.length - 1];
        const slowTimeDisplay = formatTime(slowestRound.avgTime);

        cards.push({
          id: "quickest-voting-round",
          icon: "🚀",
          title: "Quickest Voting Round",
          value: timeDisplay,
          color: NEON_COLORS.YellowGreen,
          subtitle: quickestRound.round.title,
          moreDetailsLink: getRoundLink(quickestRound.round, league._id),
          description: `${quickestRound.round.title} had the fastest average voting time, with players casting their votes in just ${timeDisplay} on average.`,
        });

        cards.push({
          id: "slowest-voting-round",
          icon: "🐌",
          title: "Slowest Voting Round",
          value: slowTimeDisplay,
          color: NEON_COLORS.BrightOrange,
          subtitle: slowestRound.round.title,
          moreDetailsLink: getRoundLink(slowestRound.round, league._id),
          description: `${slowestRound.round.title} saw the slowest average voting time, with players taking an average of ${slowTimeDisplay} to cast their votes.`,
        });
      }
    }

    // Highest Scoring Song
    if (playback.allUserTopSongs.length > 0) {
      const topSong = playback.allUserTopSongs[0];
      cards.push({
        id: "top-song",
        icon: "🔥",
        title: "Highest Scoring Song",
        user: topSong.user,
        subtitle: topSong.user.userName,
        value: `${topSong.points.toString()} pts`,
        color: NEON_COLORS.BrightPink,
        moreDetailsLink: getRoundLink(topSong.round, league._id),
        description: (
          <div className="space-y-3">
            <p>
              The song that received the highest total points from all voters.
              This represents the most loved submission overall.
            </p>

            <TrackInfoDisplay
              trackInfo={topSong.trackInfo}
              round={topSong.round}
            />
          </div>
        ),
      });
    }

    // Most Round Wins
    if (playback.mostWinsUsers.length > 0) {
      const winner = playback.mostWinsUsers[0];
      // @ts-ignore
      const formatter = new Intl.ListFormat("en", {
        style: "long",
        type: "conjunction",
      });

      cards.push({
        id: "most-wins",
        icon: "🏆",
        title: "Most Round Wins",
        user: winner.user,
        subtitle: winner.user.userName,
        value: `${winner.wins.length.toString()} wins`,
        color: NEON_COLORS.BrightOrange,
        description: `The player with the most first-place finishes in ${formatter.format(
          winner.wins.map((win) => win.round.title)
        )}. Multiple victories show dominance.`,
      });
    }

    // Best Guesser
    if (playback.bestGuessers.length > 0) {
      const guesser = playback.bestGuessers[0];
      cards.push({
        id: "guesser",
        icon: "🎲",
        title: "Best Guesser",
        user: guesser.user,
        subtitle: guesser.user.userName,
        value: `${(guesser.accuracy * 100).toFixed(0)}%`,
        color: NEON_COLORS.BrightGreen,
        description:
          "The player who correctly guessed the most song submitters. They have the best intuition for matching songs to people.",
      });
    }

    // Worst Guesser (lowest accuracy at guessing submitters)
    if (playback.bestGuessers.length > 1) {
      const worstGuesser =
        playback.bestGuessers[playback.bestGuessers.length - 1];
      cards.push({
        id: "worst-guesser",
        icon: "🎭",
        title: "Most Surprised",
        user: worstGuesser.user,
        subtitle: worstGuesser.user.userName,
        value: `${(worstGuesser.accuracy * 100).toFixed(0)}%`,
        color: NEON_COLORS.VividRed,
        description:
          "The player who struggled most at guessing song submitters. Surprises around every corner!",
      });
    }

    // Fastest Submitter
    if (playback.fastestSubmitters.length > 0) {
      const fastest = playback.fastestSubmitters[0];
      cards.push({
        id: "fastest-submitter",
        icon: "⚡",
        title: "Fastest Submitter",
        user: fastest.user,
        subtitle: fastest.user.userName,
        value: formatTime(fastest.avgTime),
        color: NEON_COLORS.ElectricPurple,
        description: `The player who submits their songs the quickest on average. Speed demon of submissions!`,
      });
    }

    // Biggest Fan
    if (playback.biggestFan) {
      cards.push({
        id: "biggest-fan",
        icon: "💙",
        title: "Biggest Fan",
        user: playback.biggestFan.user,
        subtitle: playback.biggestFan.user.userName,
        value: `${playback.biggestFan.points.toString()} pts`,
        color: NEON_COLORS.LightBlue,
        description:
          "The player who gave the most points to you. True appreciation!",
      });
    }

    // Biggest Critic
    if (playback.biggestCritic) {
      cards.push({
        id: "biggest-critic",
        icon: "🔪",
        title: "Biggest Critic",
        user: playback.biggestCritic.user,
        subtitle: playback.biggestCritic.user.userName,
        value: `${playback.biggestCritic.points.toString()} pts`,
        color: NEON_COLORS.VividRed,
        description:
          "The player who gave the fewest points to you. Perhaps their musical tastes don't align.",
      });
    }

    // Biggest Surprise and Most Obvious
    if (completedRounds.length > 0) {
      const stats = completedRounds.flatMap((round) => {
        return round.submissions.flatMap((submission) => {
          const votesForSubmission = round.votes.filter(
            (v) => v.submissionId === submission._id
          );
          const userData = league.users.reduce((acc, user) => {
            acc[user._id] = {
              user,
              correctGuesses: 0,
              incorrectGuesses: 0,
              totalGuesses: 0,
              submission,
              round,
            };
            return acc;
          }, {} as Record<string, { user: PopulatedUser; correctGuesses: number; incorrectGuesses: number; totalGuesses: number; submission: PopulatedSubmission; round: PopulatedRound }>);

          votesForSubmission.forEach((vote) => {
            if (!vote.userGuessId) {
              return;
            }
            const currentUserData = userData[vote.userGuessId];
            if (!currentUserData) {
              return;
            }
            if (vote.userGuessId === submission.userId) {
              currentUserData.correctGuesses += 1;
            } else {
              currentUserData.incorrectGuesses += 1;
            }
            currentUserData.totalGuesses += 1;
          });

          return Object.values(userData);
        });
      });

      const mostObvious = [...stats].sort((a, b) => {
        if (b.correctGuesses !== a.correctGuesses) {
          return b.correctGuesses - a.correctGuesses;
        }
        if (b.totalGuesses !== a.totalGuesses) {
          return b.totalGuesses - a.totalGuesses;
        }
        return a.submission.submissionDate - b.submission.submissionDate;
      })[0];

      const biggestSurprise = [...stats].sort((a, b) => {
        if (b.incorrectGuesses !== a.incorrectGuesses) {
          return b.incorrectGuesses - a.incorrectGuesses;
        }
        if (b.totalGuesses !== a.totalGuesses) {
          return b.totalGuesses - a.totalGuesses;
        }
        return a.submission.submissionDate - b.submission.submissionDate;
      })[0];

      if (mostObvious) {
        cards.push({
          id: "most-obvious",
          icon: "🎯",
          title: "Most Obvious",
          user: mostObvious.user,
          subtitle: mostObvious.user.userName,
          value: `${mostObvious.correctGuesses}/${mostObvious.totalGuesses} correct`,
          color: NEON_COLORS.BrightGreen,
          moreDetailsLink: getRoundLink(mostObvious.round, league._id),
          description: (
            <div className="space-y-3">
              <p>
                Everyone saw this coming! {mostObvious.correctGuesses} out of{" "}
                {mostObvious.totalGuesses} voters correctly guessed who
                submitted this song.
              </p>
              <TrackInfoDisplay
                trackInfo={mostObvious.submission.trackInfo}
                round={mostObvious.round}
              />
            </div>
          ),
        });
      }

      if (biggestSurprise) {
        cards.push({
          id: "biggest-surprise",
          icon: "😲",
          title: "Biggest Surprise",
          user: biggestSurprise.user,
          subtitle: biggestSurprise.user.userName,
          value: `${biggestSurprise.incorrectGuesses}/${biggestSurprise.totalGuesses} wrong`,
          color: NEON_COLORS.VividRed,
          moreDetailsLink: getRoundLink(biggestSurprise.round, league._id),
          description: (
            <div className="space-y-3">
              <p>
                Plot twist! {biggestSurprise.incorrectGuesses} out of{" "}
                {biggestSurprise.totalGuesses} voters thought this was{" "}
                <span className="font-semibold text-white">
                  {biggestSurprise.user.userName}
                </span>
                &apos;s song, but it was actually{" "}
                <span className="font-semibold text-white">
                  {biggestSurprise.submission.userObject?.userName}
                </span>
                &apos;s!
              </p>
              <TrackInfoDisplay
                trackInfo={biggestSurprise.submission.trackInfo}
                round={biggestSurprise.round}
              />
            </div>
          ),
        });
      }
    }

    // Most Noted Song
    if (playback.mostNotedSongs.length > 0) {
      const notedSong = playback.mostNotedSongs[0];
      cards.push({
        id: "most-noted-song",
        icon: "💬",
        title: "Most Talked About",
        user: notedSong.user,
        subtitle: notedSong.user.userName,
        value: `${notedSong.notes.length.toString()} notes`,
        color: NEON_COLORS.BrightBlue,
        moreDetailsLink: getRoundLink(notedSong.round, league._id),
        description: (
          <div className="space-y-3">
            <p>
              The song that received the most comments from voters. It sparked
              the most conversation.
            </p>

            <TrackInfoDisplay
              trackInfo={notedSong.trackInfo}
              round={notedSong.round}
            />
          </div>
        ),
      });
    }

    // Conspirators (mutual point giving)
    if (playback.conspirators && playback.conspirators.length > 0) {
      const conspiracy = playback.conspirators[0];
      const user1 = league.users.find(
        (u: PopulatedUser) => u._id === conspiracy.userId1
      );
      const user2 = league.users.find(
        (u: PopulatedUser) => u._id === conspiracy.userId2
      );
      if (user1 && user2) {
        cards.push({
          id: "conspirators",
          icon: "🤝",
          title: "Mutual Appreciation",
          subtitle: `${user1.userName} & ${user2.userName}`,
          user: user1,
          user2: user2,
          value: `${conspiracy.totalPoints.toString()} pts`,
          color: NEON_COLORS.MintyGreen,
          description:
            "The pair of players who gave each other the most points. Mutual appreciation or collusion?",
        });
      }
    }

    // Fastest Voter
    if (playback.fastestVoters.length > 0) {
      const fastVoter = playback.fastestVoters[0];
      cards.push({
        id: "fastest-voter",
        icon: "🚀",
        title: "Fastest Voter",
        user: fastVoter.user,
        subtitle: fastVoter.user.userName,
        value: formatTime(fastVoter.avgTime),
        color: NEON_COLORS.YellowGreen,
        description:
          "The player who casts their votes the quickest on average. Always first to respond!",
      });
    }

    // Slowest Voter (The Procrastinator)
    if (playback.slowestVoter) {
      const slowVoter = playback.slowestVoter;
      const avgMinutes = Math.floor(slowVoter.avgTime / 1000 / 60);
      const avgSeconds = Math.floor((slowVoter.avgTime / 1000) % 60);
      const avgHours = Math.floor(avgMinutes / 60);
      const displayMinutes = avgMinutes % 60;

      let timeDisplay = "";
      if (avgHours > 0) {
        timeDisplay = `${avgHours}h ${displayMinutes}m`;
      } else {
        timeDisplay = `${avgMinutes}:${avgSeconds.toString().padStart(2, "0")}`;
      }

      cards.push({
        id: "slowest-voter",
        icon: "🐌",
        title: "The Procrastinator",
        user: slowVoter.user,
        subtitle: slowVoter.user.userName,
        value: timeDisplay,
        color: NEON_COLORS.DeepViolet,
        description:
          "The player who takes the longest to vote. Better late than never!",
      });
    }

    // Lowest Scoring Win (won with fewest points)
    if (playback.mostWinsUsers.length > 0) {
      const scrappyWin = league.rounds.completed
        .map((round) => {
          const userPointsById = league.users.reduce((acc, user) => {
            acc[user._id] = { points: 0, voters: 0, user, round };
            return acc;
          }, {} as Record<string, { points: number; voters: number; user: PopulatedUser; round: PopulatedRound }>);

          round.votes.forEach((vote) => {
            if (vote.points) {
              const submission = round.submissions.find(
                (s) => s._id === vote.submissionId
              );
              if (!submission) {
                return;
              }
              userPointsById[submission.userId].points += vote.points;
              userPointsById[submission.userId].voters += 1;
            }
          });

          const sortedData = Object.values(userPointsById).sort((a, b) => {
            if (a.points !== b.points) {
              return b.points - a.points;
            }
            if (a.voters !== b.voters) {
              return b.voters - a.voters;
            }
            return a.user.index - b.user.index;
          });

          return sortedData[0];
        })
        .sort((a, b) => {
          if (a.points !== b.points) {
            return a.points - b.points;
          }
          if (a.voters !== b.voters) {
            return a.voters - b.voters;
          }
          return a.user.index - b.user.index;
        })[0];

      if (scrappyWin) {
        cards.push({
          id: "scrappy-win",
          icon: "🥉",
          title: "Scrappy Victory",
          user: scrappyWin.user,
          subtitle: scrappyWin.user.userName,
          value: scrappyWin.points.toString(),
          color: NEON_COLORS.YellowGreen,
          moreDetailsLink: getRoundLink(scrappyWin.round, league._id),
          description:
            "The lowest scoring round victory. A tight competition where every point mattered.",
        });
      }
    }

    // Most Votes Received (most popular submitter by voter count)
    if (playback.allUserTopSongs.length > 0) {
      const mostVoters = playback.allUserTopSongs
        .filter((s) => s.voters > 0)
        .sort((a, b) => b.voters - a.voters)[0];

      if (mostVoters && mostVoters.voters > 1) {
        cards.push({
          id: "crowd-pleaser",
          icon: "👥",
          title: "Crowd Pleaser",
          user: mostVoters.user,
          subtitle: mostVoters.user.userName,
          value: `${mostVoters.voters.toString()} voters`,
          color: NEON_COLORS.LightBlue,
          description: (
            <div className="space-y-3">
              <p>
                The song that received votes from the most people. Broad appeal
                across the league.
              </p>

              <TrackInfoDisplay
                trackInfo={mostVoters.trackInfo}
                round={mostVoters.round}
              />
            </div>
          ),
        });
      }
    }

    // Comment King (most notes left on other songs)
    if (playback.mostNotedSongs.length > 0) {
      const commentsByUser = new Map<string, number>();

      league.rounds.completed.forEach((round) => {
        round.votes.forEach((vote) => {
          if (vote.note) {
            const count = commentsByUser.get(vote.userId) || 0;
            commentsByUser.set(vote.userId, count + 1);
          }
        });
      });

      if (commentsByUser.size > 0) {
        const topCommenter = Array.from(commentsByUser.entries())
          .map(([userId, count]) => ({
            user: league.users.find((u) => u._id === userId),
            count,
          }))
          .filter((c) => c.user)
          .sort((a, b) => b.count - a.count)[0];

        if (topCommenter && topCommenter.user) {
          cards.push({
            id: "comment-king",
            icon: "💭",
            title: "Comment King",
            user: topCommenter.user,
            subtitle: topCommenter.user.userName,
            value: topCommenter.count.toString(),
            color: NEON_COLORS.MintyGreen,
            description:
              "The player who left the most comments on other people's songs. Most engaged with feedback!",
          });
        }
      }
    }

    // Most Consistent Player
    if (playback.mostConsistent.length > 0) {
      const consistent = playback.mostConsistent[0];
      const mostWild =
        playback.mostConsistent[playback.mostConsistent.length - 1];

      cards.push({
        id: "consistent",
        icon: "🎯",
        title: "Most Consistent",
        user: consistent.user,
        subtitle: consistent.user.userName,
        value: `±${consistent.variance.toFixed(1)}`,
        color: NEON_COLORS.LimeGreen,
        description: (
          <div className="grid gap-2">
            <p>
              The player with the lowest variance in their round scores. They
              reliably perform well without major ups and downs.
            </p>

            <p>
              {consistent.user.userName} scored an average of{" "}
              {consistent.avgPoints.toFixed(1)} points per round with a variance
              of ±{consistent.variance.toFixed(1)}.
            </p>
          </div>
        ),
      });

      cards.push({
        id: "wildcard",
        icon: "🎲",
        title: "Most Unpredictable",
        user: mostWild.user,
        subtitle: mostWild.user.userName,
        value: `±${mostWild.variance.toFixed(1)}`,
        color: NEON_COLORS.ElectricPurple,
        description: (
          <div className="grid gap-2">
            <p>
              The player with the most unpredictable performance. Their scores
              swing dramatically from round to round.
            </p>

            <p>
              {mostWild.user.userName} scored an average of{" "}
              {mostWild.avgPoints.toFixed(1)} points per round with a variance
              of ±{mostWild.variance.toFixed(1)}.
            </p>
          </div>
        ),
      });
    }

    // Point Distribution Stats
    if (completedRounds.length > 0) {
      const userVotingPatterns = league.users
        .map((user) => {
          let totalVotesGiven = 0;

          completedRounds.forEach((round) => {
            const userVotes = round.votes.filter(
              (v) => v.userId === user._id && v.points > 0
            );
            if (userVotes.length > 0) {
              totalVotesGiven += userVotes.length;
            }
          });

          const avgVotesPerRound = totalVotesGiven / completedRounds.length;

          return {
            user,
            avgVotesPerRound,
          };
        })
        .sort((a, b) => b.avgVotesPerRound - a.avgVotesPerRound);

      if (userVotingPatterns.length > 0) {
        // Most Even Distributor (votes for most songs on average)
        const evenDistributor = userVotingPatterns[0];
        const selectiveVoter =
          userVotingPatterns[userVotingPatterns.length - 1];

        cards.push({
          id: "even-distributor",
          icon: "⚖️",
          title: "Democratic Voter",
          user: evenDistributor.user,
          subtitle: evenDistributor.user.userName,
          value: `${evenDistributor.avgVotesPerRound.toFixed(1)} songs`,
          color: NEON_COLORS.MintyGreen,
          description: `The player who spreads their points across the most songs on average. They voted for an average of ${evenDistributor.avgVotesPerRound.toFixed(
            1
          )} different songs per round, averaging ${(
            league.votesPerRound / evenDistributor.avgVotesPerRound
          ).toFixed(
            2
          )} points per song, appreciating a wide variety of submissions.`,
        });

        cards.push({
          id: "selective-voter",
          icon: "🎖️",
          title: "Selective Voter",
          user: selectiveVoter.user,
          subtitle: selectiveVoter.user.userName,
          value: `${selectiveVoter.avgVotesPerRound.toFixed(1)} songs`,
          color: NEON_COLORS.BrightOrange,
          description: `The player who concentrates their points on fewer songs. They voted for an average of ${selectiveVoter.avgVotesPerRound.toFixed(
            1
          )} different songs per round, averaging ${(
            league.votesPerRound / selectiveVoter.avgVotesPerRound
          ).toFixed(
            2
          )} points per song, reserving their points for only the best submissions.`,
        });
      }
    }

    return cards;
  }, [
    playback,
    league.users,
    league.rounds.completed,
    league._id,
    league.votesPerRound,
  ]);

  return (
    <Screen background={{ from: "#1e1b4b", via: "#7c3aed", to: "#000000" }}>
      <div className="h-full flex flex-col text-white relative overflow-hidden py-8">
        {/* Animated background */}
        {isActive && (
          <>
            {/* Sparkle elements */}
            <div
              className="absolute top-[8%] left-[5%] text-2xl opacity-15 z-0"
              style={{
                animation: "sparkle-twinkle 3s ease-in-out infinite",
              }}
            >
              ✨
            </div>
            <div
              className="absolute top-[40%] right-[8%] text-2xl opacity-10 z-0"
              style={{
                animation: "sparkle-twinkle 3s ease-in-out 1s infinite",
              }}
            >
              ✨
            </div>
            <div
              className="absolute bottom-[20%] left-[10%] text-3xl opacity-15 z-0"
              style={{
                animation: "sparkle-twinkle 3s ease-in-out 2s infinite",
              }}
            >
              ✨
            </div>
          </>
        )}

        {/* Title */}
        <div className="text-center py-3 z-10 shrink-0">
          <h2 className="text-2xl font-bold drop-shadow-lg">League Summary</h2>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 z-10">
          <div className="bg-white/10 rounded-xl border border-white/20 p-4 max-w-2xl mx-auto">
            {summaryCards.map((card, index) => (
              <div key={card.id}>
                <div
                  className={`flex items-center gap-3 py-3 cursor-pointer hover:bg-white/5 transition-colors rounded-lg px-2 -mx-2 ${
                    index < summaryCards.length - 1 &&
                    expandedCard !== card.id &&
                    expandedCard !== summaryCards[index + 1]?.id
                      ? "border-b border-white/10"
                      : ""
                  }`}
                  onClick={() =>
                    setExpandedCard(expandedCard === card.id ? null : card.id)
                  }
                >
                  {/* Icon */}
                  <div className="text-2xl shrink-0">{card.icon}</div>

                  {/* Avatar(s) */}
                  {card.user && (
                    <div className="flex gap-1 shrink-0">
                      <Avatar user={card.user} size={20} includeLink={false} />
                      {card.user2 && <Avatar user={card.user2} size={20} />}
                    </div>
                  )}

                  {/* Stat Info */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-semibold"
                      style={{ color: card.color }}
                    >
                      {card.title}
                    </div>
                    {card.subtitle && (
                      <div className="text-xs text-white/70">
                        {card.subtitle}
                      </div>
                    )}
                  </div>

                  {/* Value */}
                  <div
                    className="text-lg font-bold shrink-0"
                    style={{
                      color: card.color,
                      textShadow: `0 0 10px ${card.color}40`,
                    }}
                  >
                    {card.value}
                  </div>
                </div>

                {/* Expanded Description */}
                {expandedCard === card.id && (
                  <div className="px-2 pb-3 pt-2">
                    <div
                      className="text-xs text-white/70 bg-white/5 rounded-lg p-3 border-l-2 border-r-2 grid grid-cols-[1fr_auto] gap-2"
                      style={{
                        borderLeftColor: card.color,
                        borderRightColor: card.color,
                      }}
                    >
                      {card.description}

                      {card.moreDetailsLink && (
                        <Link
                          href={card.moreDetailsLink}
                          className="text-purple-400 hover:text-purple-300 transition-colors"
                          aria-label="View more details"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-5 h-5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                            />
                          </svg>
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {/* Border after expanded content */}
                {expandedCard === card.id &&
                  index < summaryCards.length - 1 && (
                    <div className="border-b border-white/10 mx-2 mb-2" />
                  )}
              </div>
            ))}
          </div>
        </div>

        {/* Custom animations */}
        <style jsx>{`
          @keyframes sparkle-twinkle {
            0%,
            100% {
              opacity: 0.1;
              transform: scale(1) rotate(0deg);
            }
            50% {
              opacity: 0.2;
              transform: scale(1.1) rotate(180deg);
            }
          }
        `}</style>
      </div>
    </Screen>
  );
}

function TrackInfoDisplay({
  trackInfo,
  round,
}: {
  trackInfo: TrackInfo;
  round: PopulatedRound;
}) {
  return (
    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg">
      <AlbumArt trackInfo={trackInfo} round={round} size={48} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-white truncate">
          {trackInfo.title}
        </div>
        <div className="text-xs text-white/60 truncate">
          {trackInfo.artists.join(", ")}
        </div>
      </div>
    </div>
  );
}

function getRoundLink(round: PopulatedRound, leagueId: string) {
  return `/leagues/${leagueId}/rounds/${round._id}`;
}
