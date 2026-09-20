# Make-ard

Make-ard is a web app for creating aesthetic cards from 3D printing files.

Upload a **G-code file or an image**, customize the appearance, and generate a clean card with information and a preview of your model.

## Features

- Upload G-code files
- Upload images
- Generate aesthetic cards for 3D prints
- Customize card themes
- Choose different model views
- Adjust the preview zoom
- Crop uploaded images
- Extract basic information from G-code files
- Generate a shareable visual card

## Built With

- Astro
- TypeScript
- JavaScript
- Three.js
- GCodePreview
- CSS

## Getting Started

Clone the repository:

```bash
git clone https://github.com/byronjvh/make-ard.git
cd make-ard
```

Install the dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Then open the local URL shown in the terminal.

## How It Works

Make-ard processes G-code files directly in the browser to generate a visual preview that is used inside the card.

Images can also be uploaded directly and used as the card preview.

The application does **not** provide an interactive G-code viewer. The G-code processing is used to generate the visual preview for the card.

## Project

Make-ard is a small project focused on making 3D printing files easier to present and share in a clean and aesthetic format.

Made with ☕ and code.