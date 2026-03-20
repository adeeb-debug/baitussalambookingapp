# Baitus Salam Booking Portal
[![Ask DeepWiki](https://devin.ai/assets/askdeepwiki.png)](https://deepwiki.com/adeeb-debug/baitussalambookingapp)

This is a web application for requesting and managing facility bookings at the Baitus Salam Mosque. Built with React and Firebase, it provides a seamless experience for both users requesting space and administrators managing the bookings.

## Key Features

*   **User Authentication:** Secure sign-in using Google or Microsoft accounts.
*   **Role-Based Access:** Differentiated views and permissions for regular users, subscribers, and administrators.
*   **Dynamic Booking Form:** An intuitive form for requesting bookings, with real-time validation and location availability checks based on the selected date and time.
*   **Booking Management:**
    *   **Admin Dashboard:** A comprehensive list of all bookings with filtering (by status, location, date) and search functionality. Admins can approve, reject, or delete requests.
    *   **My Bookings:** A personalized page for users to track the status of their own booking requests.
*   **Calendar View:** A visual calendar displaying all approved and pending bookings for easy scheduling reference.
*   **User Management:** An admin-only panel to add, remove, and manage user roles (Admin, User, Subscriber).
*   **Automated Email Notifications:** The system automatically sends emails for:
    *   Booking request acknowledgements to users.
    *   New booking alerts to administrators.
    *   Final decision (approved/rejected) notifications to the user and relevant subscribers.

## Technology Stack

*   **Frontend:**
    *   React
    *   Material-UI (MUI) for component styling
    *   React Router for navigation
    *   FullCalendar for the bookings calendar view
    *   Day.js for date and time manipulation
*   **Backend & Database:**
    *   Firebase Authentication
    *   Firestore (NoSQL Database)
    *   Firebase Hosting
*   **Email Service:**
    *   Firebase "Trigger Email" Extension

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

*   Node.js and npm (or yarn) installed on your machine.
*   A Firebase project.

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/adeeb-debug/baitussalambookingapp.git
    cd baitussalambookingapp
    ```

2.  **Install NPM packages:**
    ```sh
    npm install
    ```

3.  **Set up Firebase credentials:**
    *   Create a `.env` file in the root of the project.
    *   Add your Firebase project's configuration keys to the `.env` file. You can find these in your Firebase project settings.

    ```.env
    REACT_APP_FIREBASE_API_KEY=your_api_key
    REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
    REACT_APP_FIREBASE_PROJECT_ID=your_project_id
    REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
    REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
    REACT_APP_FIREBASE_APP_ID=your_app_id
    ```

4.  **Configure Firebase Backend:**
    *   In your Firebase project, enable **Authentication** with the **Google** and **Microsoft** sign-in providers.
    *   Set up a **Firestore Database**.
    *   Deploy the Firestore rules and indexes located in the root of this repository:
        *   `firestore.rules`
        *   `firestore.indexes.json`
    *   Install the [Trigger Email](https://firebase.google.com/products/extensions/firebase-mail) extension to enable automated email notifications. Configure it to watch the `mail` collection.

5.  **Run the application:**
    ```sh
    npm start
    ```
    The app will open in development mode at `http://localhost:3000`.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in development mode.
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### `npm test`

Launches the test runner in interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder. It correctly bundles React in production mode and optimizes the build for the best performance. Your app is ready to be deployed!

## Firebase Data Structure

The application relies on the following Firestore collections:

*   `bookings`: Stores individual booking records for each requested location. Documents in this collection are grouped by a `groupId`.
*   `users`: Stores user information, including their email and role (`admin`, `user`, `subscriber`).
*   `mail`: Watched by the Trigger Email extension. Adding a document to this collection sends an email.
*   `counters`: Used to generate sequential, human-readable booking IDs (e.g., `2024-0001`).