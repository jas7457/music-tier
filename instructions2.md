That seems to be working. Next, I'd like you to write some database initializer functions. They should only be ran if the tables they are working on are empty.

Look at databaseTypes.ts to see their shape. Create some mock data for me for each of the types _except_ the users collection, as I have already made that. I have one user with \_id of "6910bc2b15868f07eb6ab63a" (which is a mongo ObjectId) already.

Create a league, a round, and a vote for that round for the user id that I gave you. This should be some type of node script that I can run to seed some data.
