"use client";

import { UsersList } from "./UsersList";
import { useMemo } from "react";
import { PopulatedSubmission, PopulatedUser } from "@/lib/types";

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
      text={{ verb: "Submitted", noun: "submissions" }}
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
      text={{ verb: "Not submitted", noun: "submissions" }}
    />
  );
}
