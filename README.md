# **UCode: Realtime Code Editor**

A powerful real-time collaborative code editor built using **React**, **Firebase**, **Socket.IO**, and **Firestore**. This app allows multiple users to edit code collaboratively, supports multiple programming languages, and enables session management with customizable sharing options.

---

## **Features**

- **Real-Time Code Collaboration:**
  Collaborate with other users in real time, with seamless code updates across all devices.
- **Multiple Programming Languages:**
  Supports popular languages like JavaScript, Python, Java, C++, HTML, and CSS.

- **Session Management:**
  Each user gets a default session, and sessions can be shared securely with others using unique session IDs.

- **Approval-Based Session Joining:**
  Users can request to join a session, and hosts can approve or reject requests.

- **User Authentication:**
  Secure login and session tracking using Firebase Authentication.

- **Language and Code Syncing:**
  Language changes and code updates are reflected instantly for all connected users.

- **Pending Requests Management:**
  Hosts can manage and approve pending requests from users who wish to join their sessions.

---

## **Tech Stack**

### **Frontend**

- **React**: UI library for building the web app.
- **Monaco Editor**: Code editor for syntax highlighting and a great editing experience.
- **React Toastify**: For displaying toast notifications.

### **Backend**

- **Node.js**: Backend runtime environment.
- **Socket.IO**: Real-time bidirectional communication.
- **Firebase**: Authentication and Firestore for session and user data storage.

### **Database**

- **Firestore**: NoSQL database for storing session data and managing shared state.

---

## **Getting Started**

### Prerequisites

1. Install **Node.js** and **npm**.
2. Create a **Firebase project** and set up Firestore and Authentication.

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Abhi181818/UCode.git
   cd repo-name
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up Firebase:

   - Add your Firebase config to a `firebase.js` file:

     ```javascript
     import { initializeApp } from "firebase/app";

     const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_AUTH_DOMAIN",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_STORAGE_BUCKET",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID",
     };

     const app = initializeApp(firebaseConfig);

     export const auth = getAuth(app);
     export const db = getFirestore(app);
     ```

4. Run the app:

   ```bash
   npm run dev
   ```

5. Start the backend server:
   Before starting the server download the firebase service account file(json), and keep it at same level as server.js file.
   ```bash
   node server.js
   ```

---

## **Usage**

### **Create a New Session**

- Log in with your email.
- A default session is automatically created for you.

### **Share a Session**

- Copy the session ID using the "Share Session ID" button and share it with collaborators.

### **Join a Session**

- Enter the session ID and request to join.
- Wait for the host to approve your request.

### **Collaborate**

- Edit code together in real time.
- Any changes made by a user will reflect instantly for all connected users.

---
