"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usersAPI } from "@/lib/api";
import type { User } from "@/types";

export default function StudentProfilePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Users fields
  const [userForm, setUserForm] = useState({
    full_name_khmer: "",
    full_name_latin: "",
    phone: "",
    email: "",
  });

  // Academic Profile fields
  const [acadForm, setAcadForm] = useState({
    student_id_card: "",
    major: "Computer Science",
    academic_year: 1,
    class_section: "",
    father_name: "",
    father_phone: "",
    mother_name: "",
    mother_phone: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    address_details: "",
  });

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
    setCurrentUser(parsedUser);
    fetchProfileData(parsedUser.id);
  }, [router]);

  const fetchProfileData = async (userId: string) => {
    try {
      setLoading(true);
      setError("");

      const userRes = await usersAPI.getById(userId);
      const acadRes = await usersAPI.getMyAcademicProfile();

      if (userRes.success && userRes.user) {
        setUserForm({
          full_name_khmer: userRes.user.full_name_khmer || "",
          full_name_latin: userRes.user.full_name_latin || "",
          phone: userRes.user.phone || "",
          email: userRes.user.email || "",
        });
      }

      if (acadRes.success && acadRes.data) {
        setAcadForm({
          student_id_card: acadRes.data.student_id_card || "",
          major: acadRes.data.major || "Computer Science",
          academic_year: Number(acadRes.data.academic_year) || 1,
          class_section: acadRes.data.class_section || "",
          father_name: acadRes.data.father_name || "",
          father_phone: acadRes.data.father_phone || "",
          mother_name: acadRes.data.mother_name || "",
          mother_phone: acadRes.data.mother_phone || "",
          emergency_contact_name: acadRes.data.emergency_contact_name || "",
          emergency_contact_phone: acadRes.data.emergency_contact_phone || "",
          address_details: acadRes.data.address_details || "",
        });
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred loading profile metadata");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      // 1. Save general user info
      const uRes = await usersAPI.update(currentUser.id, userForm);
      // 2. Save academic profile info
      const aRes = await usersAPI.updateMyAcademicProfile(acadForm);

      if (uRes.success && aRes.success) {
        setSuccess("Profile settings updated successfully!");
        // Update localstorage user
        const updatedLocalUser = { ...currentUser, ...userForm };
        localStorage.setItem("user", JSON.stringify(updatedLocalUser));
      } else {
        setError(uRes.error?.message || aRes.error?.message || "Failed to update profile info");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred preserving profiles");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50">
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => router.push("/dashboard/student")}>
              ← Dashboard
            </Button>
            <div>
              <h1 className="font-bold text-xl text-indigo-950">My Profile</h1>
              <p className="text-sm text-gray-600">Update academic records and parental contact logs</p>
            </div>
          </div>
          <Badge className="bg-indigo-600">Student Role</Badge>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {error && <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">⚠️ {error}</div>}
        {success && <div className="mb-6 p-4 bg-emerald-50 border border-emerald-250 text-emerald-805 rounded-xl">✨ {success}</div>}

        <form onSubmit={handleSaveProfile} className="space-y-8">
          {/* Section 1: User Account details */}
          <Card className="bg-white border shadow-sm">
            <CardHeader className="bg-indigo-600 text-white rounded-t-xl">
              <CardTitle className="text-base font-black">Personal Account Identity</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="khmer_n">Full Name (Khmer) *</Label>
                  <Input
                    id="khmer_n"
                    value={userForm.full_name_khmer}
                    onChange={(e) => setUserForm({...userForm, full_name_khmer: e.target.value})}
                    required
                    className="bg-gray-50/50"
                  />
                </div>
                <div>
                  <Label htmlFor="latin_n">Full Name (Latin) *</Label>
                  <Input
                    id="latin_n"
                    value={userForm.full_name_latin}
                    onChange={(e) => setUserForm({...userForm, full_name_latin: e.target.value})}
                    required
                    className="bg-gray-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Contact *</Label>
                  <Input
                    id="phone"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({...userForm, phone: e.target.value})}
                    required
                    className="bg-gray-50/50"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                    required
                    className="bg-gray-50/50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Academic Program Information */}
          <Card className="bg-white border shadow-sm">
            <CardHeader className="bg-indigo-600 text-white rounded-t-xl">
              <CardTitle className="text-base font-black">Academic Enrollment</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="card_id">Official Student Card ID *</Label>
                  <Input
                    id="card_id"
                    placeholder="e.g. KSIT-2025-0042"
                    value={acadForm.student_id_card}
                    onChange={(e) => setAcadForm({...acadForm, student_id_card: e.target.value})}
                    required
                    className="bg-gray-50/50"
                  />
                </div>
                <div>
                  <Label htmlFor="class_sec">Class Section / Group *</Label>
                  <Input
                    id="class_sec"
                    placeholder="e.g. CS1"
                    value={acadForm.class_section}
                    onChange={(e) => setAcadForm({...acadForm, class_section: e.target.value})}
                    required
                    className="bg-gray-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="major_sel">Academic Major *</Label>
                  <Select
                    value={acadForm.major}
                    onValueChange={(v) => setAcadForm({...acadForm, major: v || "Computer Science"})}
                  >
                    <SelectTrigger id="major_sel" className="bg-gray-50/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Computer Science">Computer Science</SelectItem>
                      <SelectItem value="Information Technology">Information Technology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="year_sel">Academic Year *</Label>
                  <Select
                    value={String(acadForm.academic_year)}
                    onValueChange={(v) => setAcadForm({...acadForm, academic_year: Number(v) || 1})}
                  >
                    <SelectTrigger id="year_sel" className="bg-gray-50/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Year 1</SelectItem>
                      <SelectItem value="2">Year 2</SelectItem>
                      <SelectItem value="3">Year 3</SelectItem>
                      <SelectItem value="4">Year 4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Parental contact logs */}
          <Card className="bg-white border shadow-sm">
            <CardHeader className="bg-indigo-600 text-white rounded-t-xl">
              <CardTitle className="text-base font-black">Parental & Emergency Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="f_name">Father's Full Name</Label>
                  <Input
                    id="f_name"
                    value={acadForm.father_name}
                    onChange={(e) => setAcadForm({...acadForm, father_name: e.target.value})}
                    className="bg-gray-50/50"
                  />
                </div>
                <div>
                  <Label htmlFor="f_phone">Father's Phone No</Label>
                  <Input
                    id="f_phone"
                    value={acadForm.father_phone}
                    onChange={(e) => setAcadForm({...acadForm, father_phone: e.target.value})}
                    className="bg-gray-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="m_name">Mother's Full Name</Label>
                  <Input
                    id="m_name"
                    value={acadForm.mother_name}
                    onChange={(e) => setAcadForm({...acadForm, mother_name: e.target.value})}
                    className="bg-gray-50/50"
                  />
                </div>
                <div>
                  <Label htmlFor="m_phone">Mother's Phone No</Label>
                  <Input
                    id="m_phone"
                    value={acadForm.mother_phone}
                    onChange={(e) => setAcadForm({...acadForm, mother_phone: e.target.value})}
                    className="bg-gray-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t text-sm">
                <div>
                  <Label htmlFor="e_name">Emergency Contact Name *</Label>
                  <Input
                    id="e_name"
                    value={acadForm.emergency_contact_name}
                    onChange={(e) => setAcadForm({...acadForm, emergency_contact_name: e.target.value})}
                    required
                    className="bg-gray-50/50"
                  />
                </div>
                <div>
                  <Label htmlFor="e_phone">Emergency Contact Phone *</Label>
                  <Input
                    id="e_phone"
                    value={acadForm.emergency_contact_phone}
                    onChange={(e) => setAcadForm({...acadForm, emergency_contact_phone: e.target.value})}
                    required
                    className="bg-gray-50/50"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="addr">Permanent Address Details</Label>
                <Input
                  id="addr"
                  placeholder="e.g. Village 3, Sangkat Stung Meanchey, Phnom Penh"
                  value={acadForm.address_details}
                  onChange={(e) => setAcadForm({...acadForm, address_details: e.target.value})}
                  className="bg-gray-50/50"
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold" disabled={saving}>
            {saving ? "Saving Changes..." : "💾 Save Changes & Academic Profiles"}
          </Button>
        </form>
      </div>
    </div>
  );
}
