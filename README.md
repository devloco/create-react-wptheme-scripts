It's a bit complicated to maintain a fork of Facebook/create-react-app.

So I'm going to try something a little different. Instead of maintaining branches in my fork of Facebook/create-react-app, I'm going to create a new repo for each new release that Facebook makes.

The process will be:

- When Facebook cuts a new release of `create-react-app`, I'll download the ZIP file of the release from Github.
- Fork *my* current repo with all of the `wptheme` changes in place into a new repo in Github.
- Clone the new repo.
- Overwrite the contents of the new repo with the contents of the new ZIP file.
- Then it should be easy to use Git to examine the differences, and make changes accordingly.

Which is more-or-less how I've been doing things anyway, but in a branch of my fork of `Facebook/create-react-app`.