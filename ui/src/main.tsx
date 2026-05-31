import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import { getGoogleClientId } from "./auth/googleClientId";
import "./styles/global.css";
import "./styles/landing.css";
import "./styles/chat.css";

const googleClientId = getGoogleClientId();

const app = (
  <StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>
        <App />
      </GoogleOAuthProvider>
    ) : (
      <App />
    )}
  </StrictMode>
);

createRoot(document.getElementById("root")!).render(app);
