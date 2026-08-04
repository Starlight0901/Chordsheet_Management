# HymnBook

Personal and shared hymn chord-sheet management for musicians and worship leaders.

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- Firebase Authentication (Google Sign-In)
- Cloud Firestore
- Cloudinary (unsigned browser uploads for chord-sheet images)
- React Router
- Lucide React

## What this project does **not** use

- Firebase Storage
- Firebase Cloud Functions
- Firebase Secret Manager
- Firebase Blaze / paid billing (Spark / free tier is enough for ~10–20 users)

## Getting started

```bash
npm install
cp .env.example .env
npm run dev
```

Fill in Firebase and Cloudinary values in `.env` before enabling auth, data, and image uploads.

Client Cloudinary config (unsigned upload only):

- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_UPLOAD_PRESET`

Do **not** put Cloudinary API keys/secrets in the frontend.

## Deletion (accidental-deletion barrier)

Deletion asks for a local confirmation password configured in:

`src/config/deletionConfig.ts`

This is **not** a true security boundary (the value ships in the browser bundle). It only helps trusted users avoid accidental deletes. Firestore security rules remain the real access control.

- Valid local password → delete Firestore metadata (and the signed-in user’s related personal refs)
- Invalid password → no Firestore writes
- Creating / editing / uploading / reordering / notes / favorites / tags / lists / worship plans do **not** require this password

### Cloudinary images after delete

Cloudinary assets are **not** deleted automatically when Firestore records are removed (privileged Cloudinary credentials must not live in the browser). Unused images may need **manual cleanup** in the Cloudinary dashboard. Firestore metadata stores `cloudinaryPublicId` while the record exists so assets can be identified beforehand.

## Scripts

| Command           | Description              |
| ----------------- | ------------------------ |
| `npm run dev`     | Start development server |
| `npm run build`   | Production build         |
| `npm run preview` | Preview production build |
| `npm run lint`    | Run ESLint               |
