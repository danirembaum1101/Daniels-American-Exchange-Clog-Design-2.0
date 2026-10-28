# Omnis Removable Inner Sock Clog – Product Page Mockup

A product page mockup for the Omnis Removable Inner Sock Clog concept, built for the American Exchange Group slipper design pitch by Daniel Rembaum. The page has a product image gallery, lifestyle images, a process and feature set, and an interactive 3D viewer for the full clog, the inner sock and the outer clog.

It's a static site: plain HTML, CSS and JavaScript with no build step.

## Folder structure

```
.
├── index.html                  Page markup
├── css/
│   └── styles.css              All page styles (includes the 3D viewer)
├── js/
│   ├── main.js                 Gallery, sizes, lightboxes, menus, newsletter
│   ├── viewer.js               3D model viewer (ES module)
│   └── vendor/three/           three.js r169 (MIT), bundled locally
├── assets/
│   ├── images/
│   │   ├── gallery/            13 product listing images (+ thumbs/)
│   │   ├── lifestyle/          3 lifestyle images
│   │   └── features/           9 feature set panels (1200 px and 2400 px)
│   └── models/                 3D models (.glb): all, sock, clog
├── .nojekyll                   Lets GitHub Pages serve every file as-is
└── .gitignore
```

## Upload to GitHub

**In the browser (no command line):**

1. Create a new repository on GitHub.
2. On the repository page, choose **Add file → Upload files**.
3. Unzip this folder and drag **everything inside it** (not the folder itself) into the upload area, including the `.nojekyll` file. On a Mac, press **Cmd + Shift + .** in Finder to see hidden files.
4. Choose **Commit changes**.

**With Git:**

```bash
cd omnis-clog-product-page
git init
git add .
git commit -m "Add Omnis product page mockup"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## Publish with GitHub Pages

1. In the repository, go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to *Deploy from a branch*, choose `main` and `/ (root)`, then **Save**.
3. After a minute the page is live at `https://<your-username>.github.io/<your-repo>/`.

## Preview on your computer

The 3D viewer loads its model files with JavaScript modules, and browsers block those when a page is opened straight from the file (`file://`). Start a small local server in this folder instead:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. (macOS comes with Python 3. With Node.js installed, `npx serve` also works.)

## Updating content

| To change | Edit |
|---|---|
| Product title, price, sizes, lifestyle copy | `index.html` |
| Gallery images | Replace the files in `assets/images/gallery/` (and `thumbs/`), keeping the names, or edit the `LISTING_IMAGES` list near the bottom of `index.html` |
| Lifestyle images | `assets/images/lifestyle/` |
| Feature set panels | `assets/images/features/` (each panel has a 1200 px and a 2400 px version) |
| 3D models | `assets/models/` (the file names are referenced in `index.html` under `MV_SOURCES`) |
| Colors, fonts, spacing | `css/styles.css` |

## Credits

- Font: [Poppins](https://fonts.google.com/specimen/Poppins), loaded from Google Fonts (SIL Open Font License).
- 3D rendering: [three.js](https://threejs.org) r169, MIT License (see `js/vendor/three/LICENSE`).
- The page layout recreates a White Mountain Shoes product page for pitch purposes. The White Mountain name and logo belong to their owner.
