# Next implementation milestones

1. Add admin authentication and role-based access.
2. Add team registration with configurable team size and event capacity.
3. Add checkpoint token generation; store only token hashes in PostgreSQL.
4. Implement server-side answer checking, level eligibility and idempotent scoring transactions.
5. Add randomized routes so teams do not converge on the same checkpoint.
6. Add a live leaderboard sourced from committed database records.
7. Add admin controls for opening/closing levels and exporting results.
8. Add offline-safe participant UI and reconciliation of queued submissions.
9. Load-test with the expected number of phones and the actual campus network.

Do not use client-side state as the authoritative source for scores, level eligibility or winners.
