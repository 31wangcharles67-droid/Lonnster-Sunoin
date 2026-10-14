# Lonnster Sonion Notes

## How to run it

Open `index.html` in a modern web browser. The game uses Phaser 3 from a CDN, so the browser needs an internet connection the first time it loads. A simple local server also works, for example:

```text
python -m http.server
```

Then visit `http://localhost:8000`.

## Where it is published

It is currently a local prototype in this project folder. It is not published online yet.

## What is done

- One short racing level with a 30-second core loop.
- Keyboard controls: left/right arrows and space boost.
- Phone controls: left, right, and boost touch buttons.
- Colored-shape player car, cones, puddles, and rival cars.
- Finish screen with current time, top score, and Play Again.
- Best time saved in the browser with local storage.
- All tuning numbers are together in the `CONFIG` object at the top of `game.js`.

## What is next

- Playtest the difficulty and adjust the tuning numbers.
- Add sound effects and music.
- Replace colored shapes with original art.
- Add more tracks only after Version 1 feels fun.
- Publish the finished prototype to a web host.
