"use client";

import { UsersList } from "./UsersList";
import { useMemo } from "react";
import { PopulatedSubmission, PopulatedUser } from "@/lib/types";

interface SubmittedUsersProps {
  submissions: PopulatedSubmission[];
  users: PopulatedUser[];
}

export function SubmittedUsers({ submissions, users }: SubmittedUsersProps) {
  const filteredUsers = useMemo(() => {
    return users
      .map((user, index) => ({ ...user, index }))
      .filter((user) => submissions.some((sub) => sub.userId === user._id));
  }, [submissions, users]);

  return (
    <UsersList
      users={filteredUsers}
      text={{ verb: "Submitted", noun: "submissions" }}
    />
  );
}

export function UnsubmittedUsers({ submissions, users }: SubmittedUsersProps) {
  const filteredUsers = useMemo(() => {
    return users
      .map((user, index) => ({ ...user, index }))
      .filter((user) => !submissions.some((sub) => sub.userId === user._id));
  }, [submissions, users]);

  return (
    <UsersList
      users={filteredUsers}
      text={{ verb: "Not submitted", noun: "submissions" }}
    />
  );
}
