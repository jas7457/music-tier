'use client';

import { UsersList } from './UsersList';
import { useMemo } from 'react';
import { PopulatedSubmission, PopulatedUser } from '@/lib/types';
import { formatDateWithTime } from '@/lib/utils/formatDate';

interface SubmittedUsersProps {
  submissions: PopulatedSubmission[];
  users: PopulatedUser[];
  showOnEmpty?: boolean;
}

export function SubmittedUsers({
  submissions,
  users,
  showOnEmpty = true,
}: SubmittedUsersProps) {
  const filteredUsers = useMemo(() => {
    return users
      .map((user, index) => ({ ...user, index }))
      .filter((user) => submissions.some((sub) => sub.userId === user._id));
  }, [submissions, users]);
  if (filteredUsers.length === 0 && !showOnEmpty) {
    return null;
  }

  return (
    <UsersList
      users={filteredUsers}
      text={{ verb: 'Submitted', noun: 'submissions' }}
      tooltipText={(user) => {
        const submission = submissions.find((sub) => sub.userId === user._id);
        if (!submission) {
          return user.userName;
        }
        return `${user.userName} submitted on ${formatDateWithTime(
          submission.submissionDate,
        )}`;
      }}
    />
  );
}

export function UnsubmittedUsers({
  submissions,
  users,
  showOnEmpty = false,
}: SubmittedUsersProps) {
  const filteredUsers = useMemo(() => {
    return users
      .map((user, index) => ({ ...user, index }))
      .filter((user) => !submissions.some((sub) => sub.userId === user._id));
  }, [submissions, users]);
  if (filteredUsers.length === 0 && !showOnEmpty) {
    return null;
  }

  return (
    <UsersList
      users={filteredUsers}
      text={{ verb: 'Not submitted', noun: 'submissions' }}
    />
  );
}
