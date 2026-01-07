# Sheaolein

## Inventory SKU Updater (React)

This project provides a React-based interface to upload a BigCommerce inventory sheet,
preview it, and increment the **Current Stock Level** for a searched **Product Code/SKU**.

### Features

- Upload `.csv`, `.xlsx`, or `.xls` inventory files
- Preview the first 200 rows of the sheet
- Search for a SKU and increment its stock level
- Highlight the updated row for quick verification

## Project setup

This project uses Vite + React.

### Install dependencies

```bash
npm install
```

### Run locally (development)

```bash
npm run dev
```

Then open the URL printed in the terminal (usually `http://localhost:5173`).

### Build for production

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

> Note: The app reads the file in the browser only; it does not modify your original file on disk.
