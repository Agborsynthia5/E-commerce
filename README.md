# E-commerce App

An Angular storefront for browsing and managing football jerseys.

## Requirements

- Node.js and npm

## Run locally

From the project directory, install the dependencies and start the development server:

```bash
npm install
npm run start
```

Open [http://localhost:4200](http://localhost:4200). The app reloads when you change source files.

## Product persistence

Products added or changed in store management are saved to IndexedDB in the current browser and device. The app migrates existing product data from `localStorage` the first time it opens the new store. A product save completes before the form closes, and the form reports storage errors instead of showing a successful save. Clearing the browser's site data will still remove locally saved products; sharing inventory between devices requires a server-side database.

## Build and tests

```bash
npm run build
npm test
```

The project does not currently have an end-to-end testing framework configured.

## Add a product picture

1. Copy the image into `public/assets/jerseys/`, for example:
   `public/assets/jerseys/my-jersey.jpg`.
2. Open `src/app/data/mock-data.ts` and set that product's `imageUrl` to the path relative to `public`:

   ```ts
   imageUrl: 'assets/jerseys/my-jersey.jpg',
   ```

3. If the product has a gallery, add the same path there too:

   ```ts
   gallery: [{ label: 'Front', url: 'assets/jerseys/my-jersey.jpg' }],
   ```

Use forward slashes in the URL, even on Windows. The `public` folder is copied to the app's public root, so do not include `public/` in `imageUrl`. The image can then be loaded in the app at `/assets/jerseys/my-jersey.jpg`.

## Add a picture to this README

1. Create a `docs/images` folder in the project and copy your screenshot or other picture into it, for example `docs/images/store-home.png`.
2. Add this Markdown where you want the picture to appear:

   ```md
   ![Store home page](docs/images/store-home.png)
   ```

The path is relative to this README. Commit both the image file and the README change so the picture also appears on GitHub.
