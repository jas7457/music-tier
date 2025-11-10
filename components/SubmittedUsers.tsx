"use client";

import { GetUserLeagueReturnType } from "@/lib/data";
import { UsersList } from "./UsersList";
import { useMemo } from "react";

interface SubmittedUsersProps {
  submissions: NonNullable<
    GetUserLeagueReturnType[number]["rounds"]["current"]
  >["submissions"];
  users: GetUserLeagueReturnType[number]["users"];
}

export function SubmittedUsers({ submissions, users }: SubmittedUsersProps) {
  const filteredUsers = useMemo(() => {
    return users.filter((user) =>
      submissions.some((sub) => sub.userId === user._id)
    );
  }, [submissions, users]);

  return (
    <UsersList
      users={filteredUsers}
      text={{ verb: "Submitted", noun: "submissions" }}
    />
  );
}
