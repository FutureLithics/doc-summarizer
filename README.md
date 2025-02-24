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

Add to Composer⌘I
Add to Chat⇧⌘L
⌘K to generate a command
⌘K to generate a command
Now getting

The error occurs because we're trying to test with a non-existent file. Let's create a mock invalid file and update the test:
This creates a mock file buffer instead of trying to read a non-existent file. The test should now pass.
Now getting

The error occurs because multer's error handling isn't properly configured. Let's update the multer configuration in extractions.ts:
This change:
Properly handles multer errors
Returns 400 status for invalid file types
Provides better error messages
The test should now pass with the expected 400 status code.
For the extractions, let's store the file name as a property on the return. I would also like to set up basic functionality for summarizing text from the files

Let's update the Extraction interface and add basic text summarization:
22 hidden lines
57 hidden lines
3 hidden lines
Update the Swagger documentation for the response:
This implementation:
Stores the original filename
Adds basic text extraction based on file type
Implements a simple summarization algorithm
Stores both summary and original text
Returns filename in the upload response
In a production environment, you'd want to:
Use proper libraries for file parsing (pdf-parse, mammoth.js, etc.)
Implement more sophisticated summarization algorithms
Handle larger files with streams
Add error handling for corrupt files
Would you like me to add any specific summarization features or file handling improvements?
Getting  in the console

Let's fix the TypeScript error by adding a type guard for req.file in the promise chain:
Or better yet, let's store the file data before starting async processing:
4 hidden lines
This second approach is better because:
Stores file data immediately
Avoids potential race conditions
Makes TypeScript happy about types
More readable code structure
in the get all extractions endpoint, I'd like to limit the returns to id, status, createdAt, filename, documentType, and summary

Let's modify the getExtractions endpoint to return only the specified fields:
81 hidden lines
Also update the Swagger documentation:
This will ensure the response only includes the specified fields and properly documents the API response structure.
Responses are now failing

Let's update the getExtractionById endpoint to use the same response format and update its Swagger documentation:
This ensures both endpoints return the same fields and format. The tests should now pass.
The response for the extractions is returning empty array

The empty array response is likely because we're not properly handling the test files in our test cases. Let's update the test file to include proper test data and verify the extraction process:
The key changes:
Added test for checking extractions after upload
Using a simple text buffer for testing
Added small delay to allow for processing
Checking for specific properties in the response
This should now show the extractions properly in both tests and actual usage.
In the readme file, I would like to add a quickstart and installation section, as well as a section summarizing what the app is and how to both physically test it and test it using the unit tests

Here's a comprehensive README.md:
:
bash
git clone <repository-url>
cd document-extraction-api
:
bash
npm install
:
env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/modern-express-api
FRONTEND_URL=http://localhost:5173
:
bash
npm run dev
:
bash
npm run build
:
bash
npm start
:
bash
curl -X POST http://localhost:3000/api/extractions/upload \
-F "file=@/path/to/your/document.pdf"
:
bash
curl http://localhost:3000/api/extractions
:
bash
curl http://localhost:3000/api/extractions/{id}
:
bash
Sign up
curl -X POST http://localhost:3000/api/auth/signup \
-H "Content-Type: application/json" \
-d '{"email":"test@example.com","password":"password123"}'
Login
curl -X POST http://localhost:3000/api/auth/login \
-H "Content-Type: application/json" \
-d '{"email":"test@example.com","password":"password123"}'
:
bash
npm test
)
This README provides:
Clear project description
Installation steps
Quick start guide
Testing instructions (both manual and automated)
API endpoint documentation
Development information
Would you like me to expand any section or add additional information?
For some reason the docs in the README file canceled

Let me provide the README content again:
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

git clone <repository-url>
cd doc-summarizer

2. Install dependencies:

npm install

3. Create a `.env` file in the root directory:

NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/modern-express-api
FRONTEND_URL=http://localhost:5173

## Quick Start

1. Start the development server:

npm run dev

2. Access the API documentation at `http://localhost:3000/api-docs`

## Testing

### Running Unit Tests

npm test

The test suite includes:
- Document upload validation
- Text extraction processing
- API response format validation
- Authentication flow

### Manual Testing

1. Upload a document:

curl -X POST http://localhost:3000/api/extractions/upload \
-F "file=@/path/to/your/document.pdf"

2. Get all extractions:

curl http://localhost:3000/api/extractions

3. Get specific extraction:

curl http://localhost:3000/api/extractions/{id}


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