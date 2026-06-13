# Doctor AI Agent

A Next.js application that provides an AI-powered medical assistant with real-time voice conversation capabilities.

## Features

- Real-time voice conversation with AI medical agents
- Speech-to-Text using AssemblyAI WebSocket API
- Text-to-Speech using Murf AI with browser TTS fallback
- AI responses powered by OpenRouter/OpenAI
- Captions for both user and AI assistant speech
- Session management and history
- Turn-taking conversation flow (listens for user input after AI speaks)
- User authentication with Clerk

  ## Video
[Click here](https://imagekit.io/player/embed/rmyd10ywi/Recording%202025-06-29%20204016.mp4?updatedAt=1751212929355&thumbnail=https%3A%2F%2Fik.imagekit.io%2Frmyd10ywi%2FRecording%25202025-06-29%2520204016.mp4%2Fik-thumbnail.jpg%3FupdatedAt%3D1751212929355&updatedAt=1751212929355)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   # API Keys
   ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
   MURF_API_KEY=your_murf_api_key_here
   OPEN_ROUTER_API_KEY=your_openrouter_api_key_here

   # Authentication (Clerk)
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
   CLERK_SECRET_KEY=your_clerk_secret_key_here
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

   # Database
   DATABASE_URL="postgresql://postgres:password@localhost:5432/doctor_ai?schema=public"

   # Other Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. Set up the database:
   ```bash
   npx prisma migrate dev
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

## Voice Conversation Flow

The application implements a natural turn-taking conversation flow:

1. **Start Call**: When you click "Start Call", the AI introduces itself
2. **AI Speaking**: While the AI is speaking, a visual indicator appears and your microphone is muted
3. **User Speaking**: After the AI finishes, your microphone is automatically activated (indicated by a green mic icon)
4. **Silence Detection**: If you pause for 2 seconds, the system assumes you've finished speaking
5. **Processing**: Your speech is converted to text, sent to the AI, and the AI responds
6. **Repeat**: This back-and-forth conversation continues until you end the call

## Troubleshooting

If you encounter issues with the voice conversation functionality:

1. **Microphone Access**: Make sure your browser has permission to access your microphone.

2. **AssemblyAI API**: 
   - Verify your AssemblyAI API key is correctly set in the `.env.local` file
   - The key should be prefixed with `NEXT_PUBLIC_` since it's used on the client side
   - Check your AssemblyAI account has sufficient credits

3. **Murf AI TTS**: If text-to-speech isn't working:
   - Check that your Murf API key is correctly set as `MURF_API_KEY` (not `MURF_AI_API_KEY`)
   - The application will automatically fall back to browser TTS if Murf AI fails
   - If you don't have a Murf API key, the system will use browser TTS

4. **Authentication Issues**:
   - Ensure your Clerk API keys are correctly set in the `.env.local` file
   - Check that all the Clerk redirect URLs are properly configured

5. **Database Errors**: If you see database connection errors:
   - Make sure your PostgreSQL database is running
   - Check that the `DATABASE_URL` in `.env.local` is correct
   - If you don't need database functionality, the app will still work with limited features

6. **Browser Compatibility**: 
   - The voice features work best in Chrome and Edge
   - Safari may have limited WebSocket support
   - Make sure your browser supports the Web Audio API

7. **No Speech Detected**:
   - Check if the microphone indicator turns green after the AI speaks
   - Try speaking louder or moving closer to your microphone
   - Check if your browser's console shows any WebSocket errors

## License

[MIT](LICENSE)
