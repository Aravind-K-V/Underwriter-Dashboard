# Underwriter Dashboard

A modern, React-based dashboard application designed for underwriters, featuring a responsive UI with Tailwind CSS and a Node.js/Express backend for handling authentication, customer data, and document management. The frontend is built with Vite for fast development and production builds, while the backend integrates with a PostgreSQL database and AWS S3 for document storage.

## Project Structure

- **client/**: React frontend
  - Built with Vite for fast development and bundling
  - Styled with Tailwind CSS for utility-first styling
  - Linted with ESLint for code quality and consistency
  - Key directories:
    - `src/components/`: Reusable React components
    - `src/pages/`: Page-level components for routing
    - `src/assets/`: Static assets (e.g., icons, watermark)
- **server/**: Node.js/Express backend
  - Configured with Express for API endpoints
  - Integrates with PostgreSQL for data storage
  - Uses AWS S3 for document storage and retrieval
  - Key files:
    - `server.js`: Main server file with API routes
    - `db.js`: PostgreSQL database connection configuration

## Prerequisites

- **Node.js**: Version 18.x or higher
- **npm**: Version 8.x or higher
- **PostgreSQL**: For the backend database
- **AWS Account**: For S3 integration (ensure credentials are configured securely)
- A modern web browser (e.g., Chrome, Firefox)

## Setup

### 1. Client (Frontend)
1. Navigate to the client directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://13.202.6.228:5173](http://13.202.6.228:5173) in your browser to view the application.

### 2. Server (Backend)
1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   - Create a `.env` file in the `server` directory.
   - Add sensitive information (e.g., database credentials, AWS keys) to the `.env` file.
   - Note: Never commit sensitive data to version control. Use environment variables for security.
4. Start the server:
   ```bash
   node server.js
   ```
5. The server will run on [http://13.202.6.228:5000](http://13.202.6.228:5000).

## Development

### Running the Application
- **Frontend**: Use `npm run dev` in the `client` directory to start the Vite development server.
- **Backend**: Run `node server.js` in the `server` directory to start the Express server.
- Ensure both client and server are running for full functionality (e.g., API calls for login, registration, and document retrieval).

### Linting
- Run linting in the `client` directory to ensure code quality:
  ```bash
  npm run lint
  ```
- This uses ESLint with Airbnb, React, and React Hooks rules to enforce consistent coding standards.

### Adding Components and Routes
- **Components**: Add new React components in `client/src/components/` for reusable UI elements.
- **Pages**: Add page-level components in `client/src/pages/` for top-level views.
- **Routes**: Define client-side routes in `client/src/App.jsx` using `react-router-dom`.

### Building for Production
- Build the frontend for production:
  ```bash
  cd client
  npm run build
  ```
- Preview the production build locally:
  ```bash
  npm run preview
  ```

## Security Notes
- Sensitive information (e.g., database credentials, AWS keys) is currently hardcoded in `db.js` and `server.js`. For production, move these to environment variables using a `.env` file and a package like `dotenv`.
- Ensure the PostgreSQL database is properly secured and not publicly accessible.
- Use HTTPS for API endpoints in production to secure data transmission.

## Contributing
- Create a new branch for feature development or bug fixes:
  ```bash
  git checkout -b feature/your-feature-name
  ```
- Follow the Airbnb style guide for JavaScript and React code.
- Test changes locally before submitting a pull request.
- Update this README with any new features or setup instructions.

## License
This project is private and not intended for public distribution.
