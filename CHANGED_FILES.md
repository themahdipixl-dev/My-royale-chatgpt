# Changed Files — v50

* App.js — added app-level navigation state and mounted the new five-item bottom navigation.
* components/BottomNav.js — added the animated Material You bottom navigation bar with five destinations and a prominent center Home action.
* screens/HomeScreen.js — added the initial Home destination.
* screens/ComingSoonScreen.js — added lightweight placeholder destinations for Clans, Cards, and Profile until their actual screens are built.
* screens/RankingsScreen.js — adjusted safe-area handling and list bottom padding so the ranking list works correctly with the fixed bottom navigation.

`app.json` was not modified.

* components/BottomNav.js — redesigned the bottom navigation with a shared sliding indicator, spring transitions, animated labels, and a smoother elevated Home interaction.
