import { Suspense } from "react";

import { LoginForm } from "./LoginForm";

export default function AdminLoginPage() {
  return (
    <main id="main" className="flex min-h-screen items-center justify-center bg-cloud p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
