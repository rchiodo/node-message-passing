# Tests for passing messages between threads and alternatives that might be faster

This is an attempt to see if there's a way to pass messages between threads that can
be faster than just using worker.onmessage/postmessage

### Available tasks

-   **npm run build** - Transpile TS files
-   **npm run watch** - Transpile TS files in watch mode
-   **npm run dev** - Run project
-   **npm run start** - Start `node` on transpiled files (in `./build`)
-   **npm run clean** - Remove `./build` directory
