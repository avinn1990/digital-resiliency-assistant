import type { AuthUser } from "../../auth/types";
import { LandingPage } from "../landing/LandingPage";

type Props = {
  onSignedIn: (token: string, user: AuthUser) => void;
};

export function SplashAuthPage({ onSignedIn }: Props) {
  return <LandingPage onSignedIn={onSignedIn} />;
}
