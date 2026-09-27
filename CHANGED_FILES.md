# Changed Files — v57

* components/BottomNav.js — v52: removed bottom-nav labels and converted the main bar, selected indicator, and Home orb to fully rounded/circular shapes.
* components/AppHeader.js — v53: added a smooth entrance animation.
* components/TopTabs.js — v53: added a spring-driven sliding selection indicator and entrance animation.
* components/LocationBar.js — v53: added a smooth entrance animation while preserving the existing popup animations.
* screens/HomeScreen.js — v53: added a fluid card entrance animation.
* screens/ComingSoonScreen.js — v53: added a fluid card entrance animation.
* components/RankRow.js — existing staggered row animation retained.
* components/ClanRow.js — existing staggered row animation retained.

`app.json` was not modified.

* components/LocationBar.js — v56: repaired/simplified animated row JSX to eliminate parser ambiguity.
* components/TopTabs.js — v56: removed the extra closing View tag causing the JSX parser error.


* components/AnimatedPressable.js — v57: added wrapper layout support so animated controls keep their intended flex/width positioning.
* components/BottomNav.js — v57: fixed icon slot sizing/alignment and indicator positioning.
* components/TopTabs.js — v57: fixed animated tab wrapper sizing.
* components/LocationBar.js — v57: fixed control/preset layout, restored outside-touch popup dismissal, and added explicit close buttons to country and rank popups.

`app.json` was not modified.
