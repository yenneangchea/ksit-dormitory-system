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
import { QRCodeSVG } from "qrcode.react";
import { buildingsAPI, roomsAPI } from "@/lib/api";
import type { User } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

export default function BuildingsManagementPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<any | null>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modals & New entities
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [newBldg, setNewBldg] = useState({ code: "", name: "", gender_restriction: "male", total_floors: 1, description: "" });
  const [newRoom, setNewRoom] = useState({ room_number: "", floor_number: 1, capacity: 4, gender: "male", assigned_major: "", assigned_year: 1, magic_qr_code: "", status: "available" });

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
      return;
    }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== "admin" && parsedUser.role !== "manager") {
      router.push("/login");
      return;
    }
    setCurrentUser(parsedUser);
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await buildingsAPI.getAll();
      if (res.success && res.data) {
        setBuildings(res.data);
        if (res.data.length > 0) {
          // If no building is currently selected, pick the first
          const defaultBldg = selectedBuilding ? res.data.find((b: any) => b.id === selectedBuilding.id) || res.data[0] : res.data[0];
          setSelectedBuilding(defaultBldg);
          await fetchRooms(defaultBldg.id);
        }
      } else {
        setError(res.error?.message || "Failed to load buildings");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred loading buildings");
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async (bldgId: string) => {
    try {
      const res = await roomsAPI.getAll({ building_id: bldgId });
      if (res.success && res.data) {
        setRooms(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectBuilding = async (bldg: any) => {
    setSelectedBuilding(bldg);
    await fetchRooms(bldg.id);
  };

  const handleCreateBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await buildingsAPI.create({
        ...newBldg,
        total_floors: Number(newBldg.total_floors),
      });
      if (res.success) {
        setSuccess(`Building ${newBldg.code} created successfully!`);
        setShowBuildingModal(false);
        setNewBldg({ code: "", name: "", gender_restriction: "male", total_floors: 1, description: "" });
        await fetchData();
      } else {
        setError(res.error?.message || "Failed to create building");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred creating building");
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuilding) return;
    setError("");
    setSuccess("");
    try {
      const qrPayload = `QR-${newRoom.room_number.replace(/\s+/g, "")}-${new Date().getFullYear()}`;
      const res = await roomsAPI.create({
        ...newRoom,
        building_id: selectedBuilding.id,
        floor_number: Number(newRoom.floor_number),
        capacity: Number(newRoom.capacity),
        assigned_year: Number(newRoom.assigned_year),
        magic_qr_code: qrPayload,
      });

      if (res.success) {
        setSuccess(`Room ${newRoom.room_number} added successfully with Magic QR!`);
        setShowRoomModal(false);
        setNewRoom({ room_number: "", floor_number: 1, capacity: 4, gender: selectedBuilding.gender_restriction === "mixed" ? "male" : selectedBuilding.gender_restriction, assigned_major: "", assigned_year: 1, magic_qr_code: "", status: "available" });
        await fetchRooms(selectedBuilding.id);
      } else {
        setError(res.error?.message || "Failed to add room");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred creating room");
    }
  };

  const handleToggleRoomStatus = async (room: any) => {
    setError("");
    setSuccess("");
    const nextStatus = room.status === "maintenance" ? "available" : "maintenance";
    try {
      const res = await roomsAPI.update(room.id, { status: nextStatus });
      if (res.success) {
        setSuccess(`Room ${room.room_number} status updated to ${nextStatus}.`);
        await fetchRooms(selectedBuilding.id);
      } else {
        setError(res.error?.message || "Failed to update room");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50">
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => router.push(currentUser?.role === "admin" ? "/dashboard/admin" : "/dashboard/manager")}>
              ← Back
            </Button>
            <div>
              <h1 className="font-bold text-xl text-indigo-900">Dormitories & Rooms</h1>
              <p className="text-sm text-gray-600">Configure buildings, floors, and assignment filters</p>
            </div>
          </div>
          <Badge className="bg-indigo-600 capitalize">{currentUser?.role}</Badge>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {error && <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">⚠️ {error}</div>}
        {success && <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl">✨ {success}</div>}

        <div className="grid md:grid-cols-4 gap-8">
          {/* Left Sidebar: Buildings list */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Buildings</h3>
              <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-700" onClick={() => setShowBuildingModal(true)}>
                + New
              </Button>
            </div>

            <div className="space-y-3">
              {buildings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => handleSelectBuilding(b)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedBuilding?.id === b.id
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                      : "bg-white text-gray-700 hover:bg-indigo-50/50 border-gray-200"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm tracking-wider uppercase">{b.code}</span>
                    <Badge className={selectedBuilding?.id === b.id ? "bg-white/20 text-white border-none" : "bg-indigo-50 text-indigo-700 border-none capitalize"}>
                      {b.gender_restriction}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-sm line-clamp-1">{b.name}</h4>
                  <p className={`text-xs mt-2 ${selectedBuilding?.id === b.id ? "text-indigo-105" : "text-gray-500"}`}>
                    Floors: {b.total_floors}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Main Content: Rooms under building */}
          <div className="md:col-span-3">
            {selectedBuilding ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white border rounded-2xl shadow-sm">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-2xl font-black text-indigo-950">{selectedBuilding.name}</h2>
                      <Badge className="bg-indigo-100 text-indigo-805 capitalize">{selectedBuilding.gender_restriction} only</Badge>
                    </div>
                    <p className="text-gray-600 text-sm">{selectedBuilding.description || "No description provided."}</p>
                  </div>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => {
                    setNewRoom(prev => ({ ...prev, gender: selectedBuilding.gender_restriction === "mixed" ? "male" : selectedBuilding.gender_restriction }));
                    setShowRoomModal(true);
                  }}>
                    🏠 Add Room
                  </Button>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rooms.map((room) => {
                    const isFull = room.occupied_count >= room.capacity;
                    return (
                      <Card key={room.id} className={`overflow-hidden hover:shadow-md transition-all border ${room.status === 'maintenance' ? 'border-amber-200 bg-amber-50/10' : 'bg-white'}`}>
                        <CardHeader className="pb-3 border-b border-gray-150/40 bg-gray-50/50">
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-lg text-gray-900">Room {room.room_number}</span>
                            <Badge className={
                              room.status === 'maintenance' ? "bg-amber-100 text-amber-800" :
                              isFull ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                            }>
                              {room.status === 'maintenance' ? "Maintenance" : isFull ? "Full" : "Available"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-sm text-gray-700">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Beds Alloc:</span>
                            <span className="font-bold text-gray-900">{room.occupied_count} / {room.capacity} beds occupied</span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-gray-500">Floor Level:</span>
                            <span className="font-semibold text-gray-800">{room.floor_number}F</span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-gray-500">Target Segment:</span>
                            <span className="font-semibold text-indigo-700">
                              {room.assigned_major ? `${room.assigned_major} - Y${room.assigned_year}` : "Open Assignment"}
                            </span>
                          </div>

                          <div className="border-t pt-3 flex flex-col items-center">
                            <span className="text-xs text-gray-500 mb-1.5 uppercase font-bold tracking-wider">Door QR Code</span>
                            {/* Real QR code linking to the universal scan entry page */}
                            <div className="p-2 bg-white border border-gray-200 rounded-lg mb-2 cursor-pointer"
                              onClick={() => window.open(`/scan/${encodeURIComponent(room.magic_qr_code)}`, '_blank')}
                              title="Click to open scan URL">
                              <QRCodeSVG
                                value={`${API_BASE}/scan/${encodeURIComponent(room.magic_qr_code)}`}
                                size={96}
                                level="M"
                                includeMargin={false}
                              />
                            </div>
                            <code className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] mb-3 font-mono">{room.magic_qr_code}</code>

                            {/* Actions */}
                            <div className="flex gap-2 w-full">
                              <Button variant="outline" size="sm" className="flex-1 text-xs text-indigo-700 border-indigo-200" onClick={() => handleToggleRoomStatus(room)}>
                                {room.status === 'maintenance' ? 'Activate Room' : 'Set Out-of-Service'}
                              </Button>
                              <Button variant="outline" size="sm" className="text-xs text-gray-600" title="Print QR"
                                onClick={() => window.print()}>🖨️</Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {rooms.length === 0 && (
                    <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white">
                      <div className="text-gray-300 text-5xl mb-3">🏢</div>
                      <h4 className="font-bold text-gray-700 mb-1">No Rooms Added Yet</h4>
                      <p className="text-gray-500 text-sm">Add a dormitory room under this building to get started.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-24 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white">
                <div className="text-indigo-400/80 text-6xl mb-4">🏢</div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">No Buildings Selected</h3>
                <p className="text-gray-500 max-w-md mx-auto">Select a dormitory building on the left panel or register a new one to manage floor plans.</p>
              </div>
            )}
          </div>
        </div>

        {/* Building Modal */}
        {showBuildingModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md shadow-2xl bg-white">
              <CardHeader className="bg-indigo-600 text-white rounded-t-xl">
                <CardTitle>Create Dormitory Building</CardTitle>
                <CardDescription className="text-indigo-100">Add a new building template</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleCreateBuilding} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="code">Bldg Code *</Label>
                      <Input id="code" placeholder="e.g. BLDG-M3" value={newBldg.code} onChange={(e) => setNewBldg({...newBldg, code: e.target.value})} required />
                    </div>
                    <div>
                      <Label htmlFor="name">Friendly Name *</Label>
                      <Input id="name" placeholder="e.g. Male Building 3" value={newBldg.name} onChange={(e) => setNewBldg({...newBldg, name: e.target.value})} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="restriction">Gender Allow *</Label>
                      <Select value={newBldg.gender_restriction} onValueChange={(v) => v && setNewBldg(prev => ({...prev, gender_restriction: v}))}>
                        <SelectTrigger id="restriction">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male only</SelectItem>
                          <SelectItem value="female">Female only</SelectItem>
                          <SelectItem value="mixed">Mixed restrictions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="floors">Total Floors *</Label>
                      <Input id="floors" type="number" min={1} max={10} value={newBldg.total_floors} onChange={(e) => setNewBldg({...newBldg, total_floors: Number(e.target.value)})} required />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="desc">Description</Label>
                    <Input id="desc" placeholder="Details about this building layout..." value={newBldg.description} onChange={(e) => setNewBldg({...newBldg, description: e.target.value})} />
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setShowBuildingModal(false)}>Cancel</Button>
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Create Building</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Room Modal */}
        {showRoomModal && selectedBuilding && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-lg shadow-2xl bg-white">
              <CardHeader className="bg-indigo-600 text-white rounded-t-xl">
                <CardTitle>Add Room to {selectedBuilding.code}</CardTitle>
                <CardDescription className="text-indigo-100">Set capacity metrics and target grouping filters</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleCreateRoom} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="room_n">Room Code/No. *</Label>
                      <Input id="room_n" placeholder="e.g. M3-101" value={newRoom.room_number} onChange={(e) => setNewRoom({...newRoom, room_number: e.target.value})} required />
                    </div>
                    <div>
                      <Label htmlFor="floor_n">Floor Level *</Label>
                      <Input id="floor_n" type="number" min={1} value={newRoom.floor_number} onChange={(e) => setNewRoom({...newRoom, floor_number: Number(e.target.value)})} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cap">Beds Capacity *</Label>
                      <Input id="cap" type="number" min={1} max={10} value={newRoom.capacity} onChange={(e) => setNewRoom({...newRoom, capacity: Number(e.target.value)})} required />
                    </div>
                    <div>
                      <Label htmlFor="room_g">Gender Restriction *</Label>
                      <Select value={newRoom.gender} onValueChange={(v) => v && setNewRoom(prev => ({...prev, gender: v}))} disabled={selectedBuilding.gender_restriction !== "mixed"}>
                        <SelectTrigger id="room_g">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-indigo-900 uppercase tracking-widest block mb-2">Academic Placement Constraints (Optional)</h4>
                    <div className="grid grid-cols-2 gap-4 p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg">
                      <div>
                        <Label htmlFor="major_f">Assigned Major</Label>
                        <Select value={newRoom.assigned_major} onValueChange={(v) => setNewRoom(prev => ({...prev, assigned_major: v || ""}))}>
                          <SelectTrigger id="major_f">
                            <SelectValue placeholder="Any Major" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Computer Science">Computer Science</SelectItem>
                            <SelectItem value="Information Technology">Information Technology</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="year_f">Academic Year</Label>
                        <Select value={String(newRoom.assigned_year)} onValueChange={(v) => v && setNewRoom(prev => ({...prev, assigned_year: Number(v)}))}>
                          <SelectTrigger id="year_f">
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
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setShowRoomModal(false)}>Cancel</Button>
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Save Room</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
