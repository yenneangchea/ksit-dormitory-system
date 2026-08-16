# Waterfall Auto-Assignment Algorithm

## 📋 Overview

The Waterfall Algorithm intelligently assigns students to dormitory rooms based on multiple criteria to optimize room occupancy and student grouping.

## 🎯 Objectives

1. **Maximize Room Utilization** - Fill rooms to capacity before moving to the next room
2. **Group Similar Students** - Place students with same major and academic year together
3. **Respect Gender Restrictions** - Ensure gender-appropriate room assignments
4. **Fair Distribution** - Process students in a fair, predictable order

## 🔄 Algorithm Flow

```
┌─────────────────────────────────────────────────────────┐
│  1. Fetch Approved Applications (by academic year)      │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│  2. Separate by Gender (Male / Female)                  │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│  3. Sort Students by:                                   │
│     - Academic Year (1 → 4)                            │
│     - Major (alphabetically)                            │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│  4. For Each Student, Find Best Room (Waterfall):      │
│                                                          │
│     Priority 1: Room with Same Major AND Year           │
│     Priority 2: Room with Same Major                    │
│     Priority 3: Room with Same Year                     │
│     Priority 4: Any Available Room                      │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│  5. Assign Bed Number (sequential within room)          │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│  6. Update Room Metadata (major, year if not set)      │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│  7. Bulk Insert Assignments & Update Applications       │
└─────────────────────────────────────────────────────────┘
```

## 🏗️ Detailed Algorithm Steps

### Step 1: Fetch Applications

```sql
SELECT * FROM room_applications
WHERE academic_year_applied = '2025-2026'
  AND status = 'approved'
```

Only processes applications that have been reviewed and approved by Admin/Manager.

### Step 2: Gender Separation

```javascript
const maleStudents = applications.filter(app => app.user.gender === 'male');
const femaleStudents = applications.filter(app => app.user.gender === 'female');
```

**Why?** Gender-segregated dormitories require separate processing streams.

### Step 3: Student Sorting

```javascript
students.sort((a, b) => {
  // First by academic year (Year 1 students first)
  if (a.academic_profile.academic_year !== b.academic_profile.academic_year) {
    return a.academic_profile.academic_year - b.academic_profile.academic_year;
  }
  // Then by major (alphabetically)
  return a.academic_profile.major.localeCompare(b.academic_profile.major);
});
```

**Priority Order:**
1. Year 1 Computer Science
2. Year 1 Information Technology
3. Year 2 Computer Science
4. Year 2 Information Technology
5. ... and so on

### Step 4: Room Matching (Waterfall Priority)

For each student, the algorithm tries to find the best room using these priorities:

#### Priority 1: Same Major AND Same Year ⭐⭐⭐⭐
```javascript
room.assigned_major === 'Computer Science' &&
room.assigned_year === 2 &&
room.occupied_count < room.capacity
```

**Example:** Year 2 CS student → Room M1-101 (already has Year 2 CS students)

#### Priority 2: Same Major ⭐⭐⭐
```javascript
room.assigned_major === 'Computer Science' &&
room.occupied_count < room.capacity
```

**Example:** Year 2 CS student → Room M1-102 (has Year 1 or 3 CS students)

#### Priority 3: Same Year ⭐⭐
```javascript
room.assigned_year === 2 &&
room.occupied_count < room.capacity
```

**Example:** Year 2 CS student → Room M1-103 (has Year 2 IT students)

#### Priority 4: Any Available Room ⭐
```javascript
room.occupied_count < room.capacity
```

**Example:** Year 2 CS student → Room M1-104 (has any mix of students)

### Step 5: Bed Assignment

```javascript
bedNumber = roomOccupancy[room.id] + 1;
```

Beds are assigned sequentially:
- First student: Bed 1
- Second student: Bed 2
- Third student: Bed 3
- Fourth student: Bed 4 (if capacity = 4)

### Step 6: Room Metadata Update

```javascript
if (!room.assigned_major) {
  room.assigned_major = student.major; // 'Computer Science'
}
if (!room.assigned_year) {
  room.assigned_year = student.academic_year; // 2
}
```

**Why?** First student assigned to a room sets the room's "identity" for future matching.

### Step 7: Bulk Operations

```javascript
// Insert all assignments at once
await supabase.from('room_assignments').insert(assignments);

// Update all application statuses
await supabase.from('room_applications')
  .update({ status: 'assigned' })
  .in('id', applicationIds);
```

**Performance Optimization:** Batch operations instead of individual inserts.

## 📊 Example Scenario

### Input: 12 Approved Applications

| Student | Gender | Major | Year |
|---------|--------|-------|------|
| Alice | Female | CS | 2 |
| Bob | Male | CS | 2 |
| Carol | Female | CS | 2 |
| David | Male | IT | 2 |
| Eve | Female | IT | 1 |
| Frank | Male | CS | 1 |
| Grace | Female | CS | 3 |
| Henry | Male | IT | 3 |
| Ivy | Female | IT | 2 |
| Jack | Male | CS | 2 |
| Kelly | Female | CS | 1 |
| Leo | Male | IT | 1 |

### Available Rooms (Capacity: 4 each)

**Male Rooms:**
- M1-101 (empty)
- M1-102 (empty)
- M1-103 (empty)

**Female Rooms:**
- F1-101 (empty)
- F1-102 (empty)
- F1-103 (empty)

### Algorithm Output

**Male Assignments:**


| Room | Bed | Student | Major | Year | Match Reason |
|------|-----|---------|-------|------|--------------|
| M1-101 | 1 | Frank | CS | 1 | First CS-Y1 (Priority 4) |
| M1-101 | 2 | Bob | CS | 2 | Same Major (Priority 2) |
| M1-101 | 3 | Jack | CS | 2 | Same Major+Year (Priority 1) |
| M1-102 | 1 | Leo | IT | 1 | First IT-Y1 (Priority 4) |
| M1-102 | 2 | David | IT | 2 | Same Major (Priority 2) |
| M1-102 | 3 | Henry | IT | 3 | Same Major (Priority 2) |

**Female Assignments:**

| Room | Bed | Student | Major | Year | Match Reason |
|------|-----|---------|-------|------|--------------|
| F1-101 | 1 | Kelly | CS | 1 | First CS-Y1 (Priority 4) |
| F1-101 | 2 | Alice | CS | 2 | Same Major (Priority 2) |
| F1-101 | 3 | Carol | CS | 2 | Same Major+Year (Priority 1) |
| F1-101 | 4 | Grace | CS | 3 | Same Major (Priority 2) |
| F1-102 | 1 | Eve | IT | 1 | First IT-Y1 (Priority 4) |
| F1-102 | 2 | Ivy | IT | 2 | Same Major (Priority 2) |

**Result:** 12 students assigned, 0 failed, rooms efficiently filled!

## 🎯 Benefits

### 1. Optimal Room Utilization
- Fills rooms to capacity before moving to next room
- Reduces number of partially occupied rooms
- Maximizes dormitory efficiency

### 2. Student Compatibility
- Same major students can study together
- Same year students share similar schedules
- Reduces conflicts and improves social cohesion

### 3. Predictable & Fair
- Clear priority system
- Deterministic results (same input = same output)
- Transparent assignment logic

### 4. Flexible Room Metadata
- Rooms adapt to first assigned student
- Future assignments optimize around existing occupants
- No rigid pre-assignment of rooms

## 🚨 Edge Cases Handled

### Case 1: Insufficient Room Capacity
**Scenario:** More approved applications than available beds

**Handling:**
```javascript
if (!assignedRoom) {
  failed.push({
    student_id: student.user_id,
    student_name: student.user.full_name_latin,
    reason: 'No available room found'
  });
}
```

**Result:** Student remains unassigned, reported in failed array

### Case 2: Mixed Majors in Same Room
**Scenario:** Room with CS students, new IT student needs assignment

**Handling:** Algorithm tries Priority 1-3 first, falls back to Priority 4 (any available room)

**Result:** IT student may be placed in CS room if no better option exists

### Case 3: Gender Mismatch
**Scenario:** Male student, only female rooms available

**Handling:** Gender filter applied before room search

**Result:** Student cannot be assigned, added to failed array

### Case 4: Room at Full Capacity
**Scenario:** Room has 4/4 students, new student arrives

**Handling:**
```javascript
room.occupied_count < room.capacity
```

**Result:** Room is skipped, algorithm tries next room

## 📈 Performance Considerations

### Time Complexity
- **Student Sorting:** O(n log n)
- **Room Matching:** O(n × m) where n = students, m = rooms
- **Overall:** O(n log n + n×m)

**For typical case (100 students, 30 rooms):**
- Sorting: ~664 operations
- Matching: ~3,000 operations
- **Total: ~3,700 operations** (completes in milliseconds)

### Space Complexity
- O(n + m) for storing students, rooms, and assignments
- Minimal memory footprint

### Database Optimization
1. **Batch Insert:** Single transaction for all assignments
2. **Batch Update:** Single query to update application statuses
3. **Indexed Queries:** Uses indexed columns (gender, status, etc.)

## 🔧 Configuration

### Modifying Priority Weights
To change the matching priorities, edit `processGenderGroup()` in `assignments.controller.js`:

```javascript
// Example: Prioritize year over major
// Change the order of priority checks:

// NEW Priority 1: Same Year (most important)
assignedRoom = rooms.find(room =>
  room.assigned_year === year &&
  roomOccupancy[room.id] < room.capacity
);

// NEW Priority 2: Same Major
assignedRoom = rooms.find(room =>
  room.assigned_major === major &&
  roomOccupancy[room.id] < room.capacity
);
```

### Adjusting Sort Order
To process students in different order:

```javascript
// Example: Prioritize Year 4 (graduating students) first
students.sort((a, b) => {
  // Descending year order (4 → 1)
  if (a.academic_profile.academic_year !== b.academic_profile.academic_year) {
    return b.academic_profile.academic_year - a.academic_profile.academic_year;
  }
  return a.academic_profile.major.localeCompare(b.academic_profile.major);
});
```

## 🧪 Testing the Algorithm

### API Endpoint
```
POST /api/assignments/auto-assign
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "academic_year": "2025-2026"
}
```

### Expected Response
```json
{
  "success": true,
  "message": "Auto-assignment completed: 45 assigned, 3 failed",
  "assigned": 45,
  "failed": 3,
  "failedDetails": [
    {
      "student_id": "...",
      "student_name": "John Doe",
      "reason": "No available room found"
    }
  ]
}
```

### Prerequisites
1. Applications must be in 'approved' status
2. Students must have academic profiles
3. Rooms must not be in 'maintenance' status
4. Sufficient room capacity for students

## 📖 Usage in Frontend

```typescript
import { assignmentsAPI } from '@/lib/api';

const handleAutoAssign = async () => {
  const response = await assignmentsAPI.autoAssign('2025-2026');

  if (response.success) {
    alert(`Assigned ${response.assigned} students!`);
    if (response.failed > 0) {
      console.warn('Failed assignments:', response.failedDetails);
    }
  }
};
```

## 🔐 Authorization

**Required Role:** Admin or Manager

Only authorized staff can trigger auto-assignment to prevent accidental or unauthorized room assignments.

---

**Algorithm Status:** ✅ Production-Ready
**Last Updated:** August 11, 2026
**Version:** 1.0
**Complexity:** O(n log n + n×m)
