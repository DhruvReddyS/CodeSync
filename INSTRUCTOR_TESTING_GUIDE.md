# Testing Guide - Instructor Dashboard

## Prerequisites
- Both frontend and backend servers running
- An instructor account (or create one via register endpoint)
- JWT token in sessionStorage after login

---

## Manual Testing Steps

### 1. **Students Management** (`/instructor/students`)

#### Test Add Student
```
1. Click "Add Student" button
2. Fill in form:
   - Full Name: "John Doe"
   - Roll Number: "21CS001"
   - College Email: "john@college.edu"
   - Branch: "Computer Science"
   - Section: "A"
   - Year: "2"
3. Click "Add Student"
4. Verify success message and student appears in list
```

#### Test Filters
```
1. From Branch dropdown → Select "Computer Science"
   - Verify only CS students show
2. From Year dropdown → Select "Year 2"
   - Verify only year 2 students show
3. From Section dropdown → Select "A"
   - Verify only section A students show
4. In search box → Type student name
   - Verify search filters correctly
```

#### Test Sorting
```
1. Click "CodeSync Score" button
   - Verify students sorted by score descending
2. Click "Problems Solved" button
   - Verify students sorted by problems descending
3. Click "Name" button
   - Verify students sorted alphabetically
```

#### Test Delete
```
1. Click delete icon on any student row
2. Verify deletion modal appears with warning
3. Click "Cancel" → Modal closes
4. Click delete again
5. Click "Delete" button
6. Verify student removed from list
```

---

### 2. **Analytics** (`/instructor/analytics`)

#### Visual Inspection
```
✓ Check Key Metrics display correctly:
  - Total Students (should show number)
  - Average Score (should be 0-100)
  - Top Performer (should show name)

✓ Check all 4 charts render:
  - Score Distribution (Bar chart with ranges)
  - Weekly Progress (Line chart trending up)
  - Platform Engagement (Horizontal bar chart)
  - Branch Comparison (Pie chart with colors)

✓ Check Top Performers list:
  - Shows top 5 students ranked
  - Each has badge, name, score
```

#### Chart Interaction
```
1. Hover over any chart element
   - Should see tooltip with values
2. Click legend items (if available)
   - Charts should respond appropriately
```

---

### 3. **Settings** (`/instructor/settings`)

#### Change Password
```
1. Fill in form:
   - Current Password: (your password)
   - New Password: "NewPass123"
   - Confirm: "NewPass123"
2. Click "Change Password"
3. Verify success message
4. Wait 3 seconds
5. Success message should fade out
6. Try logging out and logging in with new password
```

#### Notification Preferences
```
1. Toggle "Email Notifications" ON/OFF
2. Toggle "Push Notifications" ON/OFF
3. Select "Daily Digest" from frequency
4. Click "Save Notification Settings"
5. Verify success toast/message
```

#### Delete Account
```
1. Scroll to "Danger Zone"
2. Click "Delete My Account"
3. Modal appears asking to type "DELETE"
4. Type "DELETE" in input
5. Click "Delete Account"
6. Verify:
   - Account deleted from Firestore
   - Redirected to login page
   - Previous account can't login
```

---

## API Testing (curl/Postman)

### Get Students
```bash
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:5000/api/instructor/students?branch=CSE&section=A&year=2"
```
**Expected:** 200 OK with students array

### Add Student
```bash
curl -X POST \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Jane Doe",
    "rollNumber": "21CS002",
    "branch": "CSE",
    "section": "A",
    "yearOfStudy": 2,
    "collegeEmail": "jane@college.edu"
  }' \
  "http://localhost:5000/api/instructor/students"
```
**Expected:** 200 OK with success message

### Get Analytics
```bash
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:5000/api/instructor/analytics"
```
**Expected:** 200 OK with analytics object containing:
- scoreDistribution
- platformStats
- weeklyProgress
- branchComparison
- totalStudents
- avgScore
- topPerformers

### Change Password
```bash
curl -X POST \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "oldpass",
    "newPassword": "newpass123"
  }' \
  "http://localhost:5000/api/auth/change-password"
```
**Expected:** 200 OK

### Delete Student
```bash
curl -X DELETE \
  -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:5000/api/instructor/students/<STUDENT_ID>"
```
**Expected:** 200 OK with success message

---

## Error Cases to Test

### Invalid Input
```
1. Try adding student without full name
   → Should show error "Full name is required"
2. Try changing password with wrong current password
   → Should show error "Current password is incorrect"
3. Try password < 6 characters
   → Should show error "Password must be at least 6 characters"
```

### Missing Auth
```
1. Call API endpoints without Bearer token
   → Should get 401 Unauthorized
2. Call with invalid/expired token
   → Should get 401 Unauthorized
```

### Delete Confirmation
```
1. Try deleting account without typing "DELETE"
   → Button should remain disabled
2. Type "delete" (lowercase)
   → Button should remain disabled
3. Type "DELETE" exactly
   → Button becomes enabled
```

---

## Performance Checks

### Load Time
- [ ] Students list loads in < 2 seconds
- [ ] Analytics page loads in < 3 seconds
- [ ] Settings page loads instantly (< 1 second)

### Responsiveness
- [ ] Mobile view (375px) - all elements visible
- [ ] Tablet view (768px) - properly spaced
- [ ] Desktop view (1920px) - full width optimal

### Loading States
- [ ] Add student shows spinner while submitting
- [ ] Delete shows spinner while deleting
- [ ] Analytics shows loading spinner
- [ ] Password change shows spinner

---

## Checklist for Full Deployment

- [ ] All TypeScript errors resolved
- [ ] All API endpoints tested
- [ ] Database queries optimized
- [ ] Error messages user-friendly
- [ ] Loading states implemented
- [ ] Mobile responsive design verified
- [ ] Authorization checks in place
- [ ] Password hashing working
- [ ] Notifications collection created in Firestore
- [ ] Analytics calculations correct
- [ ] Chart colors matching theme
- [ ] Search/filter functionality working
- [ ] Add/delete modals functional
- [ ] Authentication middleware protecting routes
- [ ] Environment variables set correctly

---

## Common Issues & Solutions

### "Failed to load students"
- [ ] Check network tab for API call
- [ ] Verify `/instructor/students` endpoint exists
- [ ] Ensure instructor is authenticated
- [ ] Check Firestore rules allow read

### Charts not rendering
- [ ] Verify Recharts is installed
- [ ] Check browser console for errors
- [ ] Ensure analytics data structure is correct
- [ ] Verify ResponsiveContainer has parent height

### Password change fails
- [ ] Verify current password is correct
- [ ] Check new password is 6+ characters
- [ ] Confirm passwords match exactly
- [ ] Ensure JWT is valid

### Account deletion stuck
- [ ] Check user has exactly typed "DELETE"
- [ ] Verify instructor doc exists in Firestore
- [ ] Check Firebase rules allow delete
- [ ] Ensure token is still valid

---

## Success Criteria

✅ All instructor pages load without errors
✅ Students can be added, viewed, filtered, and deleted
✅ Analytics show correct data in all charts
✅ Password can be changed successfully
✅ Account can be deleted with confirmation
✅ Notifications settings save properly
✅ Mobile and desktop layouts responsive
✅ All animations smooth and performant
✅ Error messages clear and helpful
✅ Loading states visible during async operations

