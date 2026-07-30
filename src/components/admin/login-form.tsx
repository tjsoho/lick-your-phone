"use client";

import login from "@/server-actions/admin";
import { useState } from "react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoading(true);
    const { error } = await login(email, password);

    if (error) {
      setError(error);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-lyp-black">Admin Login</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your credentials to access the admin panel
          </p>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <form className="mt-8 space-y-6" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-lyp-black focus:outline-none focus:ring-2 focus:ring-lyp-cherry/30 focus:border-lyp-cherry sm:text-sm"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-lyp-black focus:outline-none focus:ring-2 focus:ring-lyp-cherry/30 focus:border-lyp-cherry sm:text-sm"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-lyp-cherry hover:bg-lyp-cherry/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lyp-cherry transition-colors"
            >
              {isLoading ? "Loading..." : "Login"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
