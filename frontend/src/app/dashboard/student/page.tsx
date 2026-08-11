"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { User } from "@/types";

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== "student") {
      router.push("/login");
      return;
    }

    setUser(parsedUser);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <nav className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-xl">Student Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome, {user.full_name_latin}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>My Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Name (Latin):</strong> {user.full_name_latin}</p>
                <p><strong>Name (Khmer):</strong> {user.full_name_khmer}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Phone:</strong> {user.phone}</p>
                <p><strong>Gender:</strong> {user.gender}</p>
                <p><strong>Role:</strong> <span className="capitalize">{user.role}</span></p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Room</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Room assignment information will appear here</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Utility Bills</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Your monthly bills will appear here</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Your attendance record will appear here</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Maintenance Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Submit and track maintenance requests</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dormitory Application</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">View or submit your dormitory application</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
