# Quick Start - Instructor Dashboard

## 🚀 Start Both Servers

```bash
# Terminal 1 - Frontend (port 5173)
cd frontend
npm run dev

# Terminal 2 - Backend (port 5000)
cd backend
npm run dev
```

## 🔐 Login

Visit: `http://localhost:5173`

**Instructor Login:**
- Email: `instructor@example.com`
- Password: `password`

(Or use credentials you registered with)

## 📍 Dashboard Routes

After login, you have access to 4 instructor pages:

### 1. **Students** 
`/instructor/students`
- View all students
- Add new students
- Delete students
- Filter by: Branch, Section, Year
- Search by: Name, Email, Roll Number
- Sort by: Score, Problems Solved, Name

### 2. **Analytics**
`/instructor/analytics`
- Score distribution chart
- Weekly progress trend
- Platform engagement stats
- Branch comparison
- Top 5 performers list
- Key metrics (total, average, top)

### 3. **Settings**
`/instructor/settings`
- Change password
- Notification preferences
- Delete account (irreversible)

### 4. **Dashboard** (Home)
`/instructor` or `/instructor/dashboard`
- Overview of cohort
- Quick stats
- Recent activity (existing page)

---

## 📝 Common Tasks

### Add a Student
1. Go to **Students** page
2. Click **"Add Student"** button (top right)
3. Fill in the form:
   - Full Name (required)
   - Roll Number
   - College Email
   - Personal Email
   - Branch
   - Section
   - Year of Study
4. Click **"Add Student"**
5. ✅ Student appears in list

### View Analytics
1. Go to **Analytics** page
2. See 3 metric cards at top
3. Scroll down for 4 interactive charts:
   - Bar chart (score distribution)
   - Line chart (weekly trend)
   - Horizontal bar (platform engagement)
   - Pie chart (branch comparison)
4. Scroll down for top performers ranked list

### Filter Students
1. Go to **Students** page
2. Use dropdowns to filter:
   - All Branches → select branch
   - All Years → select year
   - All Sections → select section
3. Results update instantly

### Search Students
1. Go to **Students** page
2. Type in search box:
   - Student name
   - Email address
   - Roll number
3. Results filter as you type

### Change Password
1. Go to **Settings** page
2. Enter current password
3. Enter new password (6+ chars)
4. Confirm new password
5. Click **"Change Password"**
6. ✅ "Password changed successfully!" message appears

### Delete Account
1. Go to **Settings** page
2. Scroll to **"Danger Zone"**
3. Click **"Delete My Account"**
4. Modal opens asking for confirmation
5. Type **"DELETE"** exactly
6. Click **"Delete Account"**
7. ⚠️ Account permanently deleted
8. Redirected to login page

---

## 🔍 Understanding the Data

### Student Scores
- **CodeSync Score**: Normalized 0-100 score from all coding platforms
- **Elite**: 85-100 (top tier)
- **Strong**: 70-84 (very good)
- **Growing**: 50-69 (improving)
- **Starter**: 0-49 (beginner)

### Platforms Tracked
- LeetCode
- Codeforces
- CodeChef
- HackerRank
- GitHub
- AtCoder

### Analytics Calculations
- **Score Distribution**: Counts students in each score range
- **Weekly Progress**: Average score trend over past 5 weeks
- **Platform Engagement**: % of students with profile on each platform
- **Branch Comparison**: Average score compared across branches
- **Top Performers**: Top 5 students by CodeSync score

---

## ❌ Troubleshooting

### Can't login
- [ ] Check email/password are correct
- [ ] Verify instructor account exists in Firestore
- [ ] Check browser console for errors

### Students not loading
- [ ] Verify `/instructor/students` endpoint works
- [ ] Check Firestore has students collection
- [ ] Check network tab in DevTools
- [ ] Try refreshing page

### Charts not showing
- [ ] Check browser console for JS errors
- [ ] Verify analytics endpoint returns data
- [ ] Ensure Recharts library is installed
- [ ] Try hard refresh (Ctrl+Shift+R)

### Password change fails
- [ ] Verify current password is correct
- [ ] Check new password is 6+ characters
- [ ] Ensure both password fields match
- [ ] Check JWT token is valid

### Add student modal not opening
- [ ] Check browser console for errors
- [ ] Verify instructor is authenticated
- [ ] Try refreshing page
- [ ] Clear browser cache

### Delete not working
- [ ] Verify you typed "DELETE" exactly
- [ ] Check network tab for API call
- [ ] Ensure student ID is valid
- [ ] Check Firestore rules allow delete

---

## 🔐 Security Notes

- Passwords are never stored in plain text (bcrypt hashed)
- JWT tokens expire after login (check token validity)
- Instructors can only see/manage their own cohort
- Student deletion is permanent (no recovery)
- Password changes require verification
- Account deletion requires typing "DELETE" to confirm

---

## 📱 Mobile Access

The dashboard works on mobile devices:
- Responsive design adapts to screen size
- Touch-friendly buttons and modals
- Charts scale appropriately
- All features available on mobile

Access on mobile:
```
http://<your-ip>:5173/instructor/students
```

---

## 🐛 Report Issues

If something isn't working:
1. Check browser console (F12 → Console tab)
2. Check network requests (F12 → Network tab)
3. Verify both servers are running
4. Check Firestore is connected
5. Review INSTRUCTOR_TESTING_GUIDE.md for detailed tests

---

## ✅ You're All Set!

Everything is ready to use. Start the servers and begin managing your student cohort! 🎉

