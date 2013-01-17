hanging-with-friends-solver
===========================

A simple web app that find words that match a sequence of letters. Since there are already many of these out there, I wanted to do something a little bit different.  Whereas most web apps harness a back-end to process requests, this solution is entirely browser-based.  It uses a simple Trie (prefix tree), which loads a complete HWF dictionary in manageable segments on load.  Every subsequent request can then be solved without making any calls to the server.  There is still quite a bit of room for optimization which I hope to complete in the future, and greatly appreciate any contributions.

To customize your dictionary, simply edit the data/words.js file to fit your needs.
