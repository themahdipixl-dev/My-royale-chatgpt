# Changed Files — v65

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

* components/LocationBar.js — v58: fixed outside-touch dismissal using a real full-screen Pressable backdrop; redesigned popup search headers with circular close buttons; increased popup/search corner radius; fixed country header layout.
* components/PlayerRow.js — v58: increased row corner radius to match the rounded UI.
* components/RankRow.js — v58: increased row corner radius to match the rounded UI.
* components/ClanRow.js — v58: increased row corner radius to match the rounded UI.

* components/LocationBar.js — v59: vertically aligned popup search capsules with their circular close buttons, reduced capsule height, and added a clear horizontal gap between them.

* components/LocationBar.js — v60: fixed the Global country item so the globe icon and Global text stay horizontally aligned.

* components/LocationBar.js — v61: added spacing between the Global globe icon and label, and restored stable centered positioning for the 100/250/500 rank presets.

* components/LocationBar.js — v62: converted 100/250/500 rank presets into individual rounded pills with centered labels and stable spacing.

* components/LocationBar.js — v63: added the same visual separation below the search row, matched rank pill height to the search capsule, and constrained the three pills with balanced horizontal padding/gaps.

* screens/RankingsScreen.js — v64: moved the top/bottom jump button upward so it stays above the BottomNav instead of being covered by it.

* components/EntityPreviewModal.js — v65: added reusable medium player/clan preview popup infrastructure with close and expand actions.
* screens/EntityDetailsScreen.js — v65: added initial player/clan details-page shell with back navigation.
* components/RankRow.js — v65: added row press handling for player previews.
* components/ClanRow.js — v65: added row press handling for clan previews.
* screens/RankingsScreen.js — v65: connected player/clan rows to preview popup and expand-to-details navigation.
