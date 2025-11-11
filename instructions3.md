Now I want you to add the ability to submit a SongSubmission. I updated the databaseTypes.ts file slightly to show the shape of this.

If the user has already submitted their song for this round, it will show what they have submitted by grabbing the data from the spotify api and show the song title, the artist, and the artwork.

If the user has not submitted yet, it will allow them to do so. For now, let's make it so you can only pass in a link to the song and then we will look up the spotify song id for them in the background. An example link would look like https://open.spotify.com/track/42T2QQv3xgBlpQxaSP7lnK?si=c9ae54dbd56e4d70

- Once they submit it, we will add an entry to the "songSubmissions" collection with the appropriate data. Then, the view will refresh with this info
