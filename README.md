# Document Extraction Service

A comprehensive TypeScript-based web application for document processing and text extraction. This application provides a full-featured interface for uploading documents (PDF, TXT, DOCX), extracting their content, generating summaries, and managing users with role-based authentication.

## Features

- 📄 **Document Processing**: Upload and extract text from PDF, TXT, and DOCX files
- 🤖 **Text Summarization**: Automatic summary generation from extracted content
- 🔐 **Authentication System**: User registration, login, and session management
- 👑 **Role-Based Access**: Admin and user roles with different permissions
- 🎨 **Modern Web Interface**: Responsive web UI with Tailwind CSS
- 📚 **API Documentation**: Interactive Swagger documentation
- 🧪 **Comprehensive Testing**: Unit and integration test suite
- 🔧 **TypeScript**: Full TypeScript support for better development experience

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd doc-summarizer
```

2. Install dependencies:

```bash 
npm install
```

3. Create a `.env` file in the root directory:

```bash
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/document-extraction
SESSION_SECRET=your-secure-session-secret-here
```

4. Ensure MongoDB is running on your system

## Quick Start

1. Build the CSS and compile TypeScript:

```bash
npm run build
```

2. Seed the database with an admin user:

```bash
npm run seed
```

3. Start the development server:

```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

5. Access the API documentation at `http://localhost:3000/api-docs`

## Authentication & Admin Setup

### Default Admin Account

After running the database seeder (`npm run seed`), you'll have an admin account:

- **Email**: `admin@docextract.com`
- **Password**: `admin123`
- **Role**: `admin`

⚠️ **Important**: Change the admin password immediately after first login!

### User Roles

**Regular User (`user`)**:
- Create account and login
- Upload and manage documents
- View extraction results
- Edit document names and summaries

**Administrator (`admin`)**:
- All user permissions
- Admin badge in navigation
- Future: User management capabilities
- Future: System administration features

### Authentication Flow

1. **Public Access**: Home page only
2. **Protected Routes**: All other pages require authentication
3. **Session-Based**: Users stay logged in until logout or session expires
4. **Automatic Redirects**: Unauthenticated users redirected to login with return URL

## Testing

### Running Unit Tests

```bash
npm test
```

The test suite includes:
- Document upload validation
- Text extraction processing
- API response format validation
- Authentication flow

### Manual Testing

1. Upload a document:

```bash
curl -X POST http://localhost:3000/api/extractions/upload \
-F "file=@/path/to/your/document.pdf"
```

2. Get all extractions:

```bash
curl http://localhost:3000/api/extractions
```

3. Get specific extraction:

```bash
curl http://localhost:3000/api/extractions/{id}
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user
- `POST /api/auth/login` - Authenticate user

### Extractions
- `GET /api/extractions` - List all extractions
- `POST /api/extractions/upload` - Upload new document
- `GET /api/extractions/:id` - Get specific extraction

## Supported File Types
- PDF (.pdf)
- Plain Text (.txt)
- Word Document (.docx)