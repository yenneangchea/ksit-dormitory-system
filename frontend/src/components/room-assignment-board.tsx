'use client';

import { useMemo, useState } from 'react';
import type { AssignmentBoard } from '@/lib/api';

function firstProfile(value: { major?: string; academic_year?: number } | { major?: string; academic_year?: number }[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function firstApplication<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type AssignmentBoardProps = {
  board: AssignmentBoard | null;
  selectedApplicationId: string | null;
  isWorking: boolean;
  onSelect: (applicationId: string | null) => void;
  onMove: (applicationId: string, targetRoomId: string) => Promise<void>;
};

export function RoomAssignmentBoard({ board, selectedApplicationId, isWorking, onSelect, onMove }: AssignmentBoardProps) {
  const [draggedApplicationId, setDraggedApplicationId] = useState<string | null>(null);
  const allStudents = useMemo(() => {
    if (!board) return [];
    return [
      ...board.unassigned_students,
      ...board.rooms.flatMap((room) => room.residents.map((resident) => firstApplication(resident.room_applications)).filter(Boolean)),
    ];
  }, [board]);
  const selectedStudent = allStudents.find((student) => student?.id === (draggedApplicationId || selectedApplicationId));

  if (!board) return <section className="ksit-card mt-6 p-6"><p className="text-sm text-[#68736c]">Loading the live assignment board…</p></section>;

  const labelFor = (student: AssignmentBoard['unassigned_students'][number]) => student.users?.full_name_latin || student.users?.full_name_khmer || student.users?.email || 'Student';
  const canPlace = (room: AssignmentBoard['rooms'][number]) => Boolean(selectedStudent && room.status !== 'maintenance' && room.residents.length < room.capacity && room.gender === selectedStudent.users?.gender);
  const placeSelected = async (roomId: string) => {
    const applicationId = draggedApplicationId || selectedApplicationId;
    if (!applicationId) return;
    await onMove(applicationId, roomId);
    setDraggedApplicationId(null);
  };

  return <section className="mt-6 space-y-5"><div className="flex flex-col gap-3 rounded-2xl border border-[#d5e6d7] bg-[#f3faf4] p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold text-[#193925]">Manual room placement</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[#55705d]">Drag an approved student to an available compatible room. You can also select a student, then use “Place here” for touch devices. Moving a resident between room cards transfers the active assignment.</p></div><span className="inline-flex w-fit rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#1c6b37]">{board.unassigned_students.length} awaiting placement</span></div>
    <div className="ksit-card overflow-hidden"><div className="border-b border-[#edf0ed] p-5"><h3 className="font-bold">Approved students without a room</h3><p className="mt-1 text-sm text-[#68736c]">Drag from this pool into a room, or select one for tap-to-place.</p></div><div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">{board.unassigned_students.length === 0 ? <p className="col-span-full px-2 py-3 text-sm text-[#68736c]">All approved students currently have active room assignments.</p> : board.unassigned_students.map((student) => <StudentMoveCard key={student.id} student={student} selected={selectedApplicationId === student.id} onDragStart={() => setDraggedApplicationId(student.id)} onDragEnd={() => setDraggedApplicationId(null)} onSelect={() => onSelect(selectedApplicationId === student.id ? null : student.id)} />)}</div></div>
    <div className="grid gap-4 xl:grid-cols-2">{board.rooms.map((room) => { const compatible = canPlace(room); const isFull = room.residents.length >= room.capacity; return <article key={room.id} onDragOver={(event) => { if (compatible) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); if (compatible) void placeSelected(room.id); }} className={`rounded-2xl border bg-white p-5 ${compatible ? 'border-[#54a56a] ring-2 ring-[#d6f1db]' : room.status === 'maintenance' ? 'border-[#f0d8d2] bg-[#fffaf8]' : 'border-[#dfe5df]'}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#5d7765]">{room.buildings?.code || 'Residence'} · Floor {room.floor_number}</p><h3 className="mt-1 text-xl font-extrabold text-[#20342a]">Room {room.room_number}</h3><p className="mt-1 text-sm text-[#68736c]">{room.gender} · {room.residents.length} / {room.capacity} beds · {room.status}</p></div><button disabled={isWorking || !compatible} onClick={() => void placeSelected(room.id)} className="min-h-11 rounded-lg bg-[#0b5c2c] px-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-[#c9d4ca]">{selectedStudent ? compatible ? 'Place here' : isFull ? 'Room full' : 'Not compatible' : 'Select student'}</button></div><div className="mt-4 min-h-20 space-y-2 rounded-xl border border-dashed border-[#cbdacc] bg-[#fbfdfb] p-3">{room.residents.length === 0 ? <p className="py-2 text-sm text-[#78867c]">Drop an approved compatible student here.</p> : room.residents.map((resident) => { const student = firstApplication(resident.room_applications); if (!student) return null; return <div key={resident.id} draggable={!isWorking} onDragStart={() => setDraggedApplicationId(student.id)} onDragEnd={() => setDraggedApplicationId(null)} className={`flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3 py-2 ${selectedApplicationId === student.id ? 'border-[#0b5c2c] bg-[#eaf6ec]' : 'border-[#e0e8e1] bg-white'}`}><button type="button" onClick={() => onSelect(selectedApplicationId === student.id ? null : student.id)} className="min-h-9 min-w-0 flex-1 text-left text-sm font-semibold text-[#27372d]"><span className="mr-2 text-xs font-bold text-[#0b5c2c]">Bed {resident.bed_number}</span>{labelFor(student)}</button><span className="text-[11px] text-[#708076]">Move</span></div>; })}</div></article>; })}</div>
  </section>;
}

function StudentMoveCard({ student, selected, onDragStart, onDragEnd, onSelect }: { student: AssignmentBoard['unassigned_students'][number]; selected: boolean; onDragStart: () => void; onDragEnd: () => void; onSelect: () => void }) {
  const profile = firstProfile(student.academic_profiles);
  const name = student.users?.full_name_latin || student.users?.full_name_khmer || student.users?.email || 'Student';
  return <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd} className={`rounded-xl border p-3 ${selected ? 'border-[#0b5c2c] bg-[#eaf6ec]' : 'border-[#e1e8e1] bg-white'}`}><button type="button" onClick={onSelect} className="min-h-11 w-full text-left"><p className="font-semibold text-[#26372d]">{name}</p><p className="mt-1 text-xs text-[#68736c]">{student.users?.gender || '—'} · {profile?.major || 'Major pending'} · Year {profile?.academic_year || '—'}</p></button><p className="mt-2 text-[11px] font-semibold text-[#498158]">Drag or select to place</p></div>;
}
