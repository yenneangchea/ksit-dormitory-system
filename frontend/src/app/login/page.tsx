"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { authAPI } from "@/lib/api";
import type { UserRole } from "@/types";

const ROLES: { value: UserRole; label: string; description: string; color: string }[] = [
  {
    value: "admin",
    label: "Admin",
    description: "System administrator",
    color: "bg-red-100 text-red-700 hover:bg-red-200 border-red-300",
  },
  {
    value: "manager",
    label: "Manager",
    description: "Dormitory manager",
    color: "bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-300",
  },
  {
    value: "teacher",
    label: "Teacher",
    description: "Teaching staff",
    color: "bg-green-100 text-green-700 hover:bg-green-200 border-green-300",
  },
  {
    value: "student",
    label: "Student",
    description: "Dormitory resident",
    color: "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setError("");
  };

  const handleBack = () => {
    setSelectedRole(null);
    setIdentifier("");
    setPassword("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!identifier || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.login({
        identifier,
        password,
        role: selectedRole || undefined,
      });

      if (response.success && response.user) {
        // Store user data in localStorage (in production, use secure session management)
        localStorage.setItem("user", JSON.stringify(response.user));
        
        // Redirect based on role
        switch (response.user.role) {
          case "admin":
            router.push("/dashboard/admin");
            break;
          case "manager":
            router.push("/dashboard/manager");
            break;
          case "teacher":
            router.push("/dashboard/teacher");
            break;
          case "student":
            router.push("/dashboard/student");
            break;
          default:
            router.push("/dashboard");
        }
      } else {
        setError(response.error?.message || "Login failed. Please check your credentials.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-4 hover:opacity-80 transition-opacity">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-2xl">K</span>
            </div>
            <div className="text-left">
              <h1 className="font-bold text-xl leading-tight">KSIT Dormitory</h1>
              <p className="text-sm text-gray-600">Management System</p>
            </div>
          </Link>
          <h2 className="text-3xl font-bold text-gray-900 mt-6">Welcome Back</h2>
          <p className="text-gray-600 mt-2">Sign in to access your dashboard</p>
        </div>

        {/* Role Selection or Login Form */}
        {!selectedRole ? (
          <div>
            <p className="text-center text-gray-700 font-medium mb-6">Select your role to continue</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {ROLES.map((role) => (
                <Card
                  key={role.value}
                  className="cursor-pointer transition-all hover:shadow-xl hover:scale-105 border-2"
                  onClick={() => handleRoleSelect(role.value)}
                >
                  <CardHeader className="text-center pb-3">
                    <div className={`w-16 h-16 rounded-full ${role.color.split(" ")[0]} mx-auto mb-3 flex items-center justify-center`}>
                      {role.value === "admin" && (
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      )}
                      {role.value === "manager" && (
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      )}
                      {role.value === "teacher" && (
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      )}
                      {role.value === "student" && (
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <CardTitle className="text-xl">{role.label}</CardTitle>
                    <CardDescription>{role.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
                ← Back to Home
              </Link>
            </div>
          </div>
        ) : (
          <Card className="max-w-md mx-auto border-2 shadow-xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Badge className={ROLES.find((r) => r.value === selectedRole)?.color}>
                  {ROLES.find((r) => r.value === selectedRole)?.label}
                </Badge>
              </div>
              <CardTitle className="text-2xl">Sign In</CardTitle>
              <CardDescription>
                Enter your credentials to access your {selectedRole} dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="identifier">Email or Telegram ID</Label>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="email@example.com or @username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Enter your registered email address or Telegram ID
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    "Sign In"
                  )}
                </Button>

                <div className="text-center space-y-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-sm"
                    onClick={handleBack}
                    disabled={isLoading}
                  >
                    ← Change Role
                  </Button>
                </div>
              </form>

              <div className="mt-6 pt-6 border-t text-center text-sm text-gray-600">
                <p>Need help? Contact your system administrator</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
