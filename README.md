# Blog Backend API

A robust backend API for a blog application built with Express.js, MongoDB, and enhanced security features. This project provides comprehensive functionality for user authentication, post management, comments, media uploads, and administrative controls.

## Repository

**GitHub Repository:** [https://github.com/sushilnamberdar/blog-backend.git](https://github.com/sushilnamberdar/blog-backend.git)

## Features

- **User Authentication & Authorization**: JWT-based authentication with role-based access control (admin, author, user).
- **Post Management**: Create, read, update, delete posts with soft delete (trash system) and permanent delete options.
- **Comments System**: Full CRUD operations for comments and replies, including like/unlike functionality.
- **Media Uploads**: Secure file uploads to Cloudinary with size and type restrictions.
- **Admin Panel**: Administrative functions including post review, restoration, and republishing.
- **Security Enhancements**: Helmet for security headers, CORS configuration, rate limiting, input validation, and sanitization.
- **Auto Cleanup**: Scheduled job to remove unused images from Cloudinary every 3 hours.
- **Email Integration**: Password reset via email with OTP and token-based options.
- **Search Functionality**: Search posts by title, content, or tags.
- **Profile Management**: User profile retrieval and updates.

## API Endpoints

### Authentication Routes (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `POST /forget-password` - Request password reset (rate limited: 3 requests per 2 hours)
- `POST /reset-password/:token` - Reset password with token
- `POST /reset-password-otp` - Reset password with OTP
- `GET /me` - Get current user info (authenticated)
- `GET /logout` - Logout user
- `GET /check` - Check authentication status
- `GET /last-login-details` - Get last login details (authenticated)
- `GET /refresh` - Refresh access token

### User Routes (`/api/users`)
- `GET /profile` - Get user profile (authenticated)
- `PUT /profile` - Update user profile (authenticated)

### Post Routes (`/api/posts`)
- `GET /search` - Search posts (public)
- `GET /` - Get all posts (public)
- `GET /my-posts` - Get user's own posts (author/admin)
- `GET /trash/all` - Get all trashed posts (admin/author)
- `GET /trash/mine` - Get user's trashed posts (author)
- `GET /:id` - Get specific post (public)
- `POST /` - Create new post (admin/author)
- `PUT /:id` - Update post (admin/author)
- `PUT /:id/like` - Toggle like on post (authenticated)
- `DELETE /:id` - Soft delete post (admin/author)
- `PUT /:id/restore` - Restore trashed post (author)
- `DELETE /:id/user-permanent` - Permanent delete by user (transfers to anonymous) (author)
- `DELETE /:id/admin-permanent` - Permanent delete by admin (removes from DB) (admin)

### Comment Routes (`/api/comments`)
- `GET /post/:postId` - Get all comments for a post (public)
- `POST /post/:postId` - Create new comment (authenticated)
- `PUT /:id` - Update comment (authenticated)
- `DELETE /:id` - Delete comment (authenticated)
- `POST /:commentId/reply` - Reply to a comment (authenticated)
- `PUT /:commentId/like` - Toggle like on comment (authenticated)

### Media Routes (`/api/media`)
- `POST /upload` - Upload file to Cloudinary (authenticated, images/documents only, 5MB limit)

### Admin Routes (`/api/admin`)
- `GET /stats` - Get admin statistics (admin)
- `GET /posts/under-review` - Get posts under review (admin)
- `PUT /posts/:id/restore` - Restore post (admin)
- `PUT /posts/:id/republish` - Republish post (admin)

### Upload Routes (`/api/upload`)
- `POST /image` - Upload single image (authenticated)
- `POST /images` - Upload multiple images (up to 5) (authenticated)

## Security Measures

- **Helmet**: Sets various HTTP headers for security.
- **CORS**: Configured to allow requests from specified client URL with credentials.
- **Rate Limiting**: General API rate limit (100 requests per 15 minutes), specific limits for sensitive operations.
- **JWT Authentication**: Secure token-based authentication with refresh tokens.
- **Role-Based Authorization**: Different access levels (admin, author, user).
- **Input Validation**: Comprehensive validation using express-validator.
- **File Upload Security**: Multer with file type and size restrictions (5MB max, images only for some routes).
- **HTML Sanitization**: Prevents XSS attacks on user inputs.
- **Password Hashing**: bcryptjs for secure password storage.
- **Environment Variables**: Sensitive data stored in environment variables.

## Rate Limiting

- **General API Limit**: 100 requests per 15 minutes per IP.
  - Production: Uses MongoDB store for persistence.
  - Development: In-memory store.
- **Forgot Password Limit**: 3 requests per 2 hours per IP.
- **Storage**: Rate limit data stored in MongoDB collection 'rateLimits' with 15-minute TTL in production.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sushilnamberdar/blog-backend.git
   cd blog-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the required environment variables (see below).

4. Start the server:
   ```bash
   npm start
   # or for development with nodemon
   npx nodemon server.js
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
NODE_ENV=development # or production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/blogdb
CLIENT_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CLOUDINARY_FOLDER=post_images
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
```

## Usage

The server will start on the specified PORT (default 5000). Use tools like Postman or curl to interact with the API endpoints.

Example API call:
```bash
curl -X GET http://localhost:5000/api/posts
```

## Dependencies

- **express**: Web framework
- **mongoose**: MongoDB ODM
- **cors**: Cross-origin resource sharing
- **helmet**: Security middleware
- **express-rate-limit**: Rate limiting
- **rate-limit-mongo**: MongoDB store for rate limiting
- **jsonwebtoken**: JWT authentication
- **bcryptjs**: Password hashing
- **multer**: File uploads
- **cloudinary**: Cloud storage for media
- **nodemailer**: Email sending
- **express-validator**: Input validation
- **sanitize-html**: HTML sanitization
- **slugify**: URL slug generation
- **morgan**: HTTP request logger
- **node-cron**: Scheduled tasks
- **cookie-parser**: Cookie parsing
- **dotenv**: Environment variables

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

ISC
# blog-backend
# blog-backend
