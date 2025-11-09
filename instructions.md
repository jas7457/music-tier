# Intro

We are going to refactor this repo so that is essentially a clone of the Music League app.

I have created a mongodb database with some empty collections for "leagues", "rounds", "users", and "votes". The db connection is in `.env.local` using the MONGO_DB_URI variable. I also have their expected types in databaseTypes.ts. For these changes, I don't want you to change the existing TierListMaker.tsx file yet, but you may need to change when it is rendered.

# General guidelines

- All communication with the spotify api should go through api routes, but the actual functions to interact with spotify should be in the lib/spotify.ts file which already exists, so you may not need to create everything from scratch.

# Landing Page

The first thing I want you to change is the landing page for this app. Instead of the TierListMaker, you should check if the user is logged in to my database. Keep in mind that all of my collections are empty in my mongodb database to start with.

- If the user is logged in and authenticated to spotify, show a new Home.tsx file that simply shows their first name, last name, user name, and spotify id.
- If the user is not logged in, have them create an account. They will first need to authenticate with the spotify api. They should enter their first name, last name, and user name. If this can be pulled from the spotify api, you should. Then, when they submit the form, we will save that data to the users collection. We will also need their spotify id so we can correlate things later. After this is done, reroute them to the Home like in the above.

This is a good start, let's just do this bit for now.
