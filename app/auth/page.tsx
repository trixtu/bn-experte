"use client";

import { useState } from "react";

export default function AuthClientPage() {
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSocialAuth = async (provider: "google" | "github") => {
    setIsLoading(true);
    setError("");

    try {
      console.log("Logged in with", provider);
    } catch (error) {
      setError(
        `Error authentication with ${provider}: ${
          error instanceof Error ? error.message : "Unknow error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (isSignIn) {
        console.log("Signed in");
      } else {
        console.log("Signed up");
      }
    } catch (error) {
      setError(
        `Authentication error: ${
          error instanceof Error ? error.message : "Unknow error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex items-center justify-center p-4 pt-20">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isSignIn ? "Welcome Back" : "Create Account"}
            </h1>
            <p>
              {isSignIn
                ? "Sign in to your account to continue"
                : "Sign up to get started"}
            </p>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0"></div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              className="w-full flex items-center justify-center px-4 py-3 border"
              disabled={isLoading}
              onClick={() => handleSocialAuth("google")}
            >
              google
            </button>
            <button
              className="w-full flex items-center justify-center px-4 py-3 border"
              disabled={isLoading}
              onClick={() => handleSocialAuth("github")}
            >
              github
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gradient-to-br from-blue-50 to-indigo-100">
                Or continue with
              </span>
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {!isSignIn && (
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required={!isSignIn}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border text-black border-gray-300 rounded-lg"
                  placeholder="Enter your full name"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border text-black border-gray-300 rounded-lg"
                placeholder="Enter email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="password"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border text-black border-gray-300 rounded-lg"
                placeholder="Enter password"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border"
            >
              {isLoading ? <div className="flex items-center"></div> : ""}
              Create Account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
