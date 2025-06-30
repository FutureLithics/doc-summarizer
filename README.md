# DocExtract - Document Text Extraction Service

## Overview
DocExtract is a web-based service for extracting and managing text content from documents (PDF, DOCX, TXT). It features user authentication, role-based access control, and a clean web interface for document management.

## Features

### Document Processing
- **PDF Text Extraction**: Extract text content from PDF files
- **DOCX Support**: Process Microsoft Word documents  
- **TXT Files**: Handle plain text files
- **Text Summarization**: Automatic generation of document summaries
- **Status Tracking**: Monitor processing status (processing, completed, failed)

### User Management & Authentication
- **Session-based Authentication**: Secure login/logout system
- **Role-based Access Control**: Three user roles with different permissions
  - **Regular User**: Can manage their own extractions
  - **Administrator**: Can view and manage all extractions and users
  - **Super Administrator**: Full system access including extraction reassignment
- **User Registration**: Self-service account creation
- **Password Security**: Bcrypt hashing for secure password storage

### Web Interface
- **Responsive Design**: Clean, modern UI built with Tailwind CSS
- **Document Upload**: Drag-and-drop file upload interface
- **Extraction Management**: View, edit, and delete extractions
- **User Management**: Admin interface for managing system users
- **Real-time Updates**: Dynamic content updates without page refresh

## User Roles & Permissions

### 👤 Regular User
- Upload and process documents
- View their own extractions
- Edit extraction metadata (filename, summary)
- Delete their own extractions

### 👑 Administrator  
- All regular user permissions
- View all extractions in the system
- Manage system users (create, edit, delete)
- Access user management interface

### 🔥 Super Administrator
- All administrator permissions
- **Extraction Reassignment**: Transfer ownership of extractions between users
- Full system oversight and control
- Access to all administrative functions

## Super Administrator Features

The Super Administrator role provides the highest level of system access:

### Extraction Reassignment
- View current owner of each extraction in the extractions list
- Reassign any extraction to any user in the system
- Modal interface for easy user selection during reassignment
- Comprehensive validation and error handling

### Enhanced User Management
- Create users with any role (user, admin, superadmin)
- Full oversight of all user accounts and permissions
- Access to complete system statistics and user data

### Default Super Administrator Account
When seeding the database, a default superadmin account is created:
- **Email**: `superadmin@docextract.com`
- **Password**: `superadmin123`
- **⚠️ Important**: Change this password immediately after first login!

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout  
- `POST /api/auth/signup` - User registration

### Extractions
- `GET /api/extractions` - List extractions (filtered by user role)
- `POST /api/extractions/upload` - Upload document for processing
- `GET /api/extractions/:id` - Get extraction details
- `PUT /api/extractions/:id` - Update extraction metadata
- `DELETE /api/extractions/:id` - Delete extraction
- `PUT /api/extractions/:id/reassign` - **Reassign extraction (Super Admin only)**

### Users (Admin/Super Admin only)
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## Technology Stack

- **Backend**: Node.js, Express.js, TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Express sessions with secure cookie handling
- **File Processing**: PDF-parse for PDF extraction, custom DOCX processing
- **Frontend**: EJS templating, Tailwind CSS, Vanilla JavaScript
- **Testing**: Jest with Supertest for API testing, Puppeteer for UI testing
- **Documentation**: Swagger/OpenAPI for API documentation

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (running locally or connection string)
- NPM or Yarn package manager

### Quick Start
1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd docextract
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB connection string
   ```

3. **Seed the database** (creates default superadmin):
   ```bash
   npm run seed
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Access the application**:
   - Web Interface: http://localhost:3000
   - API Documentation: http://localhost:3000/api-docs

### Default Accounts
After seeding, you can log in with:
- **Super Admin**: `superadmin@docextract.com` / `superadmin123`
- **Admin**: `admin@docextract.com` / `admin123`  
- **User**: `user@docextract.com` / `user123`

## Development

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run test suite
- `npm run seed` - Seed database with default users

### Testing
The project includes comprehensive testing:
- **Unit Tests**: API endpoint testing with Jest and Supertest
- **Integration Tests**: Database operations and user workflows
- **UI Tests**: End-to-end testing with Puppeteer
- **Authentication Tests**: Session management and role-based access

Run tests with: `npm test`

## Security Features

- **Input Validation**: Comprehensive validation for all user inputs
- **XSS Protection**: Content Security Policy and input sanitization
- **Session Security**: Secure session configuration with HTTP-only cookies
- **Password Security**: Bcrypt hashing with salt rounds
- **Role-based Authorization**: Middleware-based access control
- **File Upload Security**: Type validation and size limits

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.