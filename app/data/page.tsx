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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">All Submissions</h1>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="pb-2 pr-4">League</th>
            <th className="pb-2 pr-4">Round</th>
            <th className="pb-2 pr-4">Submitted By</th>
            <th className="pb-2 pr-4">Artist</th>
            <th className="pb-2 pr-4">Song Title</th>
            <th className="pb-2">Submission Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="py-2 pr-4">{row.leagueName}</td>
              <td className="py-2 pr-4">{row.roundName}</td>
              <td className="py-2 pr-4">{row.submittedBy}</td>
              <td className="py-2 pr-4">{row.artists}</td>
              <td className="py-2 pr-4">{row.title}</td>
              <td className="py-2">
                {new Date(row.submissionDate).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="text-gray-500 mt-4">No completed rounds found.</p>
      )}
    </div>
  );
}
