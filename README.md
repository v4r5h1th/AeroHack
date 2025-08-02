Rubik's Cube Solver
This is a web-based application designed to solve a Rubik's Cube using AI. The application provides a virtual representation of a 3x3 cube and can generate the steps needed to solve it from any given state.

Getting Started
Follow these steps to set up and run the project on your local machine.

1. Environment Variables
Create a new file named .env.local in the root directory of the project. This file will store your API keys. Add the following lines to the file, and make sure to replace the placeholders with your actual API keys.

NEXT_PUBLIC_GEMINI_API_KEY=your_public_api_key_here
GEMINI_API_KEY=your_api_key_here

2. Install Dependencies
Install the project dependencies by running the following command in your terminal. The --legacy-peer-deps flag is included to handle potential dependency conflicts.

npm install --legacy-peer-deps

3. Run the Development Server
Start the application in development mode with this command:

npm run dev

The application will now be running on your local machine and you can access it in your web browser.
