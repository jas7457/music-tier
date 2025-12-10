I'd like you to create a new feature for me. It will be similar to Spotify Wrapped. When a league is over, it will allow the user to view their "Playlist Party Playback" which will show a bunch of stats about the league. It will show some personal ones, and some general rankings for that league.

Here are some technical specs:

- Each screen takes up the full height/width of the device
- To get to the next screen, the user needs to swipe up. They cannot swipe up multiple pages at once, just a single page.
- There will be an intro screen that says "Playlist Party Playback" and it will show some type of indicator telling the user to swipe up to go to the next page.
- Each screen should have some optional spotify track to play when it becomes the "current page"
- Motion/animation should be used on almost every screen so that it is very visually interesting
- Create a new folder under components called playback and nest all of the new components under
- This hsould be easy to add to, reorganize, etc in the code itself. For example, you should implement this with an array of objects and map over that to render them

Here are some of the stats that I want to show, with each one getting its own screen

- Song with most total points - the submission that had the highest number of points across the entire league - autoplay this song when the screen is active
- Total points - the amount of points that you got in the league and what place you got in (make sure to use the "getPlaces" function that I have)
- Biggest Fan - the user who gave you the most points in that league. Show the user and how many points they gave you
- Biggest Critic - the user who gave you the least points in that league. Show the user and how many points they gave you
- User with most wins - the user who got the most 1st places across the rounds - show the user and their amount of 1st place wins
- Fastest submitter - the user who, on average, had the least amount of time between the round's submission start and when they submitted their song
- Slowest submitter - the opposite of the one above
- Fastest voter - the user who, on average, had the least amount of time between the round's voting start and when they submitted their votes
- Slowest voter - the opposite of the above
- Most consitent - the with the least variance in votes from others - show the user, their place, and their points per submission
- Conspirators - duo with the highest mutual point exchange
