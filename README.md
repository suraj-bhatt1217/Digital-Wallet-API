# Digital Wallet API 💳

A secure and scalable digital wallet API that enables users to manage their finances, make transactions, and track expenses with ease. Built with modern technologies to ensure reliability, security, and performance.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-brightgreen)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB)](https://reactjs.org/)

## ✨ Features

- 🔐 Secure user authentication and authorization
- 💸 Send and receive money instantly
- 📊 Transaction history and analytics
- 🏦 Virtual wallet management
- 🔄 Real-time balance updates
- 🛡️ End-to-end encryption
- 📱 Responsive web interface

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (with Mongoose ODM)
- **Authentication**: JWT (JSON Web Tokens)
- **API Documentation**: Swagger/OpenAPI
- **Testing**: Jest, Supertest
- **Validation**: Joi

### Frontend
- **Framework**: React.js
- **State Management**: React Context API
- **Styling**: Tailwind CSS
- **Type Safety**: TypeScript
- **Build Tool**: Vite
- **UI Components**: Shadcn UI

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher) or yarn
- MongoDB (local or Atlas)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/suraj-bhatt1217/Digital-Wallet-API.git
   cd Digital-Wallet-API
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the backend directory with the following variables:
   ```
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   NODE_ENV=development
   ```

4. **Start the development servers**
   ```bash
   # Start backend server
   cd backend
   npm run dev
   
   # In a new terminal, start frontend
   cd frontend
   npm run dev
   ```

## 📚 API Documentation

API documentation is available at `http://localhost:5000/api-docs` when the backend server is running.

## 🧪 Testing

Run tests for the backend:
```bash
cd backend
npm test
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👏 Acknowledgments

- [Shadcn UI](https://ui.shadcn.com/) for the beautiful components
- [Vite](https://vitejs.dev/) for the amazing development experience
- [MongoDB](https://www.mongodb.com/) for the database
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework

## 📧 Contact

Suraj Bhatt - [@your_twitter](https://twitter.com/your_twitter) - surajbhatt@example.com

Project Link: [https://github.com/suraj-bhatt1217/Digital-Wallet-API](https://github.com/suraj-bhatt1217/Digital-Wallet-API)
