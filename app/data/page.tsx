import { redirect } from 'next/navigation';
import { verifySessionToken } from '@/lib/auth';
import { getUserLeagues } from '@/lib/data';

export default async function DataPage() {
  const payload = await verifySessionToken();
  if (!payload) redirect('/');

  const leagues = await getUserLeagues(payload.userId);

  type Row = {
    leagueName: string;
    roundName: string;
    artists: string;
    title: string;
    submittedBy: string;
    roundStartDate: number;
    submissionDate: number;
  };

  const rows: Row[] = [];

  for (const league of leagues) {
    for (const round of league.rounds.completed) {
      for (const submission of round.submissions) {
        const user = submission.userObject;
        const submittedBy = user
          ? `${user.firstName} ${user.lastName}`
          : 'Unknown';

        rows.push({
          leagueName: league.title,
          roundName: round.title,
          artists: submission.trackInfo.artists.join(', '),
          title: submission.trackInfo.title,
          submittedBy,
          roundStartDate: round.submissionStartDate,
          submissionDate: submission.submissionDate,
        });
      }
    }
  }

  rows.sort((a, b) => a.submissionDate - b.submissionDate);

  const columns = [
    'League',
    'Round',
    'Submitted By',
    'Artist',
    'Song Title',
    'Submission Date',
  ];

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-lg">All Submissions</h1>

      {/* A Details-view list: bevelled column headers over a white well. */}
      <div className="w98-paper overflow-x-auto">
        <table className="w-full text-sm border-collapse whitespace-nowrap">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="text-left font-normal px-2 py-0.5 bg-w98-face shadow-w98-out-thin sticky top-0"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 1 ? 'bg-[#eceef2]' : undefined}>
                <td className="px-2 py-0.5">{row.leagueName}</td>
                <td className="px-2 py-0.5">{row.roundName}</td>
                <td className="px-2 py-0.5">{row.submittedBy}</td>
                <td className="px-2 py-0.5">{row.artists}</td>
                <td className="px-2 py-0.5">{row.title}</td>
                <td className="px-2 py-0.5 tabular-nums">
                  {new Date(row.submissionDate).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-4 text-center">No completed rounds found.</p>
        )}
      </div>

      <div className="w98-statusbar">
        <div className="w98-statusbar-cell grow">
          {rows.length} object(s) found
        </div>
        <div className="w98-statusbar-cell">{leagues.length} league(s)</div>
      </div>
    </div>
  );
}
