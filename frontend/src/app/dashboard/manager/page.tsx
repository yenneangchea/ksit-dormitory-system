"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/types";

export default function ManagerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== "manager") {
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <nav className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className="bg-purple-600">Manager</Badge>
            <div>
              <h1 className="font-bold text-xl">Manager Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome, {user.full_name_latin}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Available Rooms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Occupied Beds</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Pending Bills</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Maintenance Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Room Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Manage rooms and assignments</p>
              <Button>Manage Rooms</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Student Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Assign students to rooms</p>
              <Button>View Assignments</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Utility Bills</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Create and manage utility bills</p>
              <Button>Manage Bills</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Application Review</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Review student applications</p>
              <Button>Review Applications</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Maintenance Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Track and resolve maintenance issues</p>
              <Button>View Requests</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Occupancy Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">View dormitory occupancy reports</p>
              <Button>View Reports</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
