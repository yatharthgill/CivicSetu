# CivicSetu Frontend

This is the frontend application for **CivicSetu**, a civic engagement platform that empowers citizens to report issues and track their resolution. Built with Next.js and Tailwind CSS.

## Features

-   **User Dashboard**: View and manage reported issues.
-   **Report Submission**: Submit new reports with location, images, and descriptions.
-   **Admin Dashboard**: Manage users and reports (admin access required).
-   **Interactive Maps**: Visualize report locations using Leaflet maps.
-   **Real-time Updates**: Track the status of submitted reports.
-   **Authentication**: Secure login and registration flows.

## Tech Stack

-   **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
-   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
-   **State Management**: [React Query](https://tanstack.com/query/latest) & React Context
-   **Maps**: [Leaflet](https://leafletjs.com/) & [React Leaflet](https://react-leaflet.js.org/)
-   **HTTP Client**: [Axios](https://axios-http.com/)
-   **Icons**: [Lucide React](https://lucide.dev/)

## Prerequisites

-   Node.js (v18 or higher recommended)
-   npm or yarn

## Installation & Setup

1.  **Clone the repository** (if you haven't already):
    ```bash
    git clone https://github.com/priyanshu3301/CivicSetu.git
    cd CivicSetu/frontend
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Configuration**:
    Create a `.env.local` file in the root of the `frontend` directory and add the following variables:

    ```env
    NEXT_PUBLIC_API_URL=http://localhost:5000/api
    ```
    *Note: Update the API URL if your backend is running on a different port or host.*

4.  **Run the development server**:
    ```bash
    npm run dev
    ```

    The application will be available at [http://localhost:5173](http://localhost:5173).

## Scripts

-   `npm run dev`: Starts the development server on port 5173.
-   `npm run build`: Builds the application for production.
-   `npm run start`: Starts the production server.
-   `npm run lint`: Runs ESLint to check for code quality issues.

## Folder Structure

```
src/
├── app/          # Next.js App Router pages and layouts
├── components/   # Reusable UI components
├── context/      # React Context providers (e.g., AuthContext)
├── hooks/        # Custom React hooks
├── services/     # API service functions (Axios setup)
└── utils/        # Utility functions
```

## Contributing

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/YourFeature`).
3.  Commit your changes (`git commit -m 'Add some feature'`).
4.  Push to the branch (`git push origin feature/YourFeature`).
5.  Open a Pull Request.
