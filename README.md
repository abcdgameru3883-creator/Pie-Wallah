# Pie Wallah - Educational Platform

## Project Overview

Pie Wallah is a modern educational platform built with React, TypeScript, and Tailwind CSS. It provides students with access to video lectures, study materials, notes, and interactive learning features.

**🚀 Live Demo**: [https://piewallah.vercel.app/]
**📦 Repository**: [https://github.com/satyamrojhax/piewallahapp](https://github.com/satyamrojhax/pie-wallah)

**Key Features:**
- 🎥 Advanced video player with Shaka Player integration
- 📚 Comprehensive study materials and notes
- 📅 Interactive schedule and timeline
- 📱 Fully responsive mobile design
- 🔐 Secure authentication system
- 🎯 Topic-wise content organization
- 🌐 Cross-origin video streaming support
- ⚡ Optimized performance and loading

## Development Setup

**Prerequisites**
- Node.js (v18 or higher)
- npm or yarn package manager

**Local Development**

Follow these steps to set up the project locally:

```sh
# Step 1: Clone the repository
git clone https://github.com/satyamrojhax/piewallahapp.git

# Step 2: Navigate to the project directory
cd piewallahapp

# Step 3: Install dependencies
npm install

# Step 4: Start the development server
npm run dev

# Step 5: Open your browser and navigate to http://localhost:5173
```

**Available Scripts**

```sh
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
npm run type-check # Run TypeScript type checking
```

## Technology Stack

This project is built with modern web technologies:

### Frontend Framework
- **React 18** - UI framework with hooks and concurrent features
- **TypeScript** - Type-safe JavaScript for better development experience
- **Vite** - Fast build tool and development server

### UI & Styling
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern, accessible UI components
- **Radix UI** - Low-level UI primitives
- **Lucide React** - Beautiful icon library

### Video & Media
- **Shaka Player** - Advanced video player with DRM support
- **HLS.js** - HTTP Live Streaming support
- **Cross-origin utilities** - Secure video playback

### State Management & Data
- **React Query (TanStack Query)** - Server state management
- **React Router** - Client-side routing
- **Axios** - HTTP client with interceptors

### Development Tools
- **ESLint** - Code linting and formatting
- **Prettier** - Code formatting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixes

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── ShakaPlayer.tsx # Video player component
│   └── MobileSidebar.tsx # Mobile navigation
├── pages/              # Page components
│   ├── VideoPlayer.tsx # Main video player page
│   ├── Study.tsx       # Study materials page
│   └── TopicDetails.tsx # Topic details page
├── services/           # API service functions
│   ├── contentService.ts # Content API calls
│   ├── topicService.ts   # Topic API calls
│   └── batchService.ts   # Batch API calls
├── lib/                # Utility libraries
│   ├── apiConfig.ts    # API configuration
│   ├── auth.ts         # Authentication utilities
│   └── utils.ts        # General utilities
├── hooks/              # Custom React hooks
│   └── use-toast.ts    # Toast notifications
└── types/              # TypeScript type definitions
```

## Deployment

### Production Build

```sh
# Build the project for production
npm run build

# Preview the production build locally
npm run preview
```

### Environment Variables

Create environment variables for your deployment:

```env
# API Configuration (Contact development team for values)
VITE_API_BASE_URL=your_api_base_url
VITE_VIDEO_API_BASE_URL=your_video_api_base_url
VITE_VIDEO_API_PROXY_BASE_URL=your_proxy_base_url

# Application (Optional)
VITE_APP_NAME=Pie Wallah
VITE_APP_VERSION=1.0.0
```

### Deployment Platforms

**Vercel (Recommended)**
- Connect your GitHub repository to Vercel
- Set environment variables in Vercel dashboard
- Automatic deployments on push to main branch

**Netlify**
- Build command: `npm run build`
- Publish directory: `dist`
- Set environment variables in Netlify dashboard

**Docker**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## API Integration

### Authentication
The application uses secure token-based authentication with proper header management. All API requests are handled through secure service layers with built-in authentication.

### Security Features
- Token-based authentication system
- Secure header management
- CORS protection
- Rate limiting support

## Quick Start

### One-Click Setup
```bash
# Clone and setup in one command
git clone https://github.com/satyamrojhax/piewallahapp.git && cd piewallahapp && npm install && npm run dev
```

### Docker Quick Start
```bash
# Build and run with Docker
docker build -t piewallah .
docker run -p 3000:3000 piewallah
```

## Contributing

We welcome contributions! Here's how to get started:

1. **Fork the Repository**
   ```bash
   # Fork on GitHub and clone your fork
   git clone https://github.com/your-username/piewallahapp.git
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make Changes**
   - Follow the existing code style
   - Add tests if applicable
   - Update documentation

4. **Submit Pull Request**
   ```bash
   git commit -m 'Add amazing feature'
   git push origin feature/amazing-feature
   # Open PR on GitHub
   ```

### Development Guidelines
- Use TypeScript for all new code
- Follow the existing component structure
- Test on mobile and desktop
- Ensure video playback works
- Update documentation for new features

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and inquiries:
- **Developer**: Satyam RojhaX
- **Email**: epowerxlabs@gmail.com
- **Website**: https://piewallah.vercel.app/
- **Social**: [@satyamrojhax](https://instagram.com/satyamrojha.dev)

---

Built with ❤️ by [Satyam RojhaX](https://instagram.com/satyamrojha.dev)
