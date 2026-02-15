# Multi-Agent Frontend

React frontend for the Multi-Agent AI Workflow System.

## Environment Setup

Create a `.env` file in this directory:

```
VITE_API_URL=https://multi-agent-fkgd.onrender.com
```

For local development, use:

```
VITE_API_URL=http://localhost:8000
```

## Development

```bash
npm install
npm run dev
```

The app runs on http://localhost:5173

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` folder.

## Deploy to Vercel

1. Push your code to GitHub
2. Import the project to Vercel
3. Set the **Root Directory** to `frontend`
4. Add environment variable:
   - `VITE_API_URL` = `https://multi-agent-fkgd.onrender.com`
5. Deploy

Vercel will automatically detect the Vite configuration and build settings.

## Technology Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS 4.1
- Server-Sent Events (SSE)
