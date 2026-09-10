# Personal site template

A single-page, no-build personal site: one `index.html`, one `styles.css`,
one `script.js`. No frameworks, no npm install — just plain files you can
edit directly and host on GitHub Pages for free.

It borrows two ideas from the sites you shared:
- a quiet, generative background (a small flocking simulation, like
  nickfrosst.com), with the three control sliders tucked into a corner
  panel instead of always on screen
- a plain, unadorned list-based layout for the "work" section, closer to
  a cargo.site portfolio than a card-based grid

## The intro animation

The very top of the page is a full-screen animated explainer (`intro.js` +
the `<section id="intro">` markup in `index.html`), looping through:
transcription from the hU6 Pol3 promoter → folding into the "cuffed"
loop → AGO2–RISC cleavage at the miRT site → loading into Cas9 → a brief
hold, then a fade back to the start.

It's independent of the ambient background field (`script.js`) — safe to
delete the `<section id="intro">` block and the `<script src="intro.js">`
line if you'd rather the page open straight on your content.

Things worth tuning, all near the top of `intro.js`:
- `DUR` — how long each stage takes, in ms
- `ICOLORS` — the color of each RNA domain and the supporting sprites
- `DOMAINS` / `CUT_INDEX` — how many sample points make up each domain,
  and where within the miRT domain the cut lands
- `CAS9_PIXEL` — how chunky the Cas9 sprite's pixels are

## Editing content

Everything you're likely to want to change lives in `index.html`, marked
with `<!-- EDIT ME -->` comments:
- your name and one-line role, near the top
- the "About" paragraphs
- the "Work" list — each project is one `<li>`, with a title, short
  description, link, and year
- the "Contact" links

## Editing the look

Open `styles.css` and look at the `:root` block at the top — that's every
color, font, and spacing value in one place:

```css
:root {
  --bg: #050505;       /* background color */
  --fg: #ededea;       /* main text color */
  --fg-dim: #8a8a86;   /* secondary/muted text */
  --font: "IBM Plex Mono", ...;
  --max-width: 640px;  /* how wide the text column is */
}
```

Change `--bg` to a light color and `--fg` to a dark one if you'd rather
have a light site. To turn off the background animation entirely, delete
the `<canvas id="flock">` element and the `.panel` div from `index.html`
(and optionally the flocking code in `script.js` — it's all in one clearly
marked section).

To change the number of agents in the background simulation, edit
`BOID_COUNT` near the top of the flocking section in `script.js`.

## Fonts

The template loads no external font — it falls back to whatever
monospace font is installed on the visitor's machine. If you'd like the
exact look shown, add this to the `<head>` of `index.html`, above the
`<link rel="stylesheet">` line:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

## Deploying on GitHub Pages

1. Create a new repository on GitHub (or use an existing one).
2. Add these three files (`index.html`, `styles.css`, `script.js`) to the
   root of the repository — or to a `/docs` folder, your choice.
3. Push to GitHub.
4. In the repo, go to **Settings → Pages**.
5. Under **Build and deployment**, set **Source** to "Deploy from a
   branch," pick your branch (usually `main`), and the folder (`/` or
   `/docs`, matching step 2).
6. Save. GitHub will give you a URL like
   `https://yourusername.github.io/yourrepo/` within a minute or two.

If you want it at a custom domain (like `yourname.com`), add a `CNAME`
file to the same folder containing just your domain name, and point your
domain's DNS at GitHub Pages per
[GitHub's custom domain docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

## Accessibility notes already baked in

- The background animation respects `prefers-reduced-motion` — it will
  draw one static frame instead of animating for visitors who have that
  system setting on.
- All interactive elements (nav links, panel toggle, project links) are
  real `<a>`/`<button>` elements, so they work with keyboards and screen
  readers out of the box.
