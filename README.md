# doc-summarizer

A TypeScript-based REST API for document processing and text extraction. This application provides endpoints for uploading documents (PDF, TXT, DOCX), extracting their content, and generating summaries.

## Features

- Document upload and processing
- Text extraction and summarization
- Swagger API documentation
- Authentication system
- Unit testing suite
- TypeScript support

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
MONGODB_URI=mongodb://127.0.0.1:27017/modern-express-api
FRONTEND_URL=http://localhost:5173
```

## Quick Start

1. Start the development server:

```bash
npm run dev
```

2. Access the API documentation at `http://localhost:3000/api-docs`

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