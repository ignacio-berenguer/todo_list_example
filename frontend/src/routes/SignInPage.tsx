import { SignIn } from "@clerk/clerk-react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-in" />
    </div>
  );
}
