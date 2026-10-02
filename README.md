# 🎓 Student Report System

A modern, responsive web-based Student Report System designed to manage
student academic performance, attendance, grading, teacher feedback, and
role-based access through a simple and user-friendly interface.

The system is developed using only HTML, CSS, and vanilla JavaScript.
All application data and authentication state are managed using the
browser's Local Storage, making the project suitable for an academic
frontend project without requiring a backend server or database.

---

## 🚀 Project Overview

The Student Report System provides separate portals for:

- 👨‍💼 Administrator
- 👨‍🏫 Teacher
- 👨‍🎓 Student

The administrator manages users, teachers, students, class/subject
assignments, grading policies, and reports.

Teachers can manage student academic records, marks, attendance, and
remarks.

Students can view their profile, academic performance, attendance,
grades, and digital report card.

---

## ✨ Key Features

### 🔐 Authentication

- Role-based login system
- Automatic role detection
- Automatic redirection to the appropriate dashboard
- Admin-managed Teacher and Student credentials
- Password show/hide option
- Remember Me functionality
- Protected dashboard access
- Logout functionality
- Local Storage based authentication

> There is no public Signup page. User accounts are created and managed
> by the Administrator.

---

## 👨‍💼 Admin Portal

The Admin Portal provides complete system management capabilities.

### Dashboard
- Total student count
- Total teacher count
- Overall class average
- System overview

### User Management
- Add students
- Add teachers
- Edit user information
- View user information
- Delete users
- Search users
- Filter users by role

### Class & Subject Management
- Assign teachers to classes
- Assign subjects
- Manage teacher assignments
- Remove assignments

### Reports
- View student reports
- Search reports
- Filter reports
- Delete reports
- Monitor academic performance

### Grading Policy
- Configure grading ranges
- Configure pass marks
- Manage grading rules

---

## 👨‍🏫 Teacher Portal

Teachers can manage academic information for their assigned students.

### Student Management
- View assigned class roster
- View student information
- Select students for report entry

### Marks Management
- Enter test marks
- Enter examination marks
- Automatic total calculation
- Automatic percentage calculation
- Automatic grade calculation
- Pass/Fail calculation

### Attendance
- Record attendance
- Present
- Absent
- Late
- Attendance percentage calculation

### Teacher Feedback
- Add student remarks
- Add academic feedback
- Update existing reports

---

## 👨‍🎓 Student Portal

Students can access their academic information through a personalized
dashboard.

### Student Dashboard
- Personal profile
- Class and section information
- Overall academic performance
- GPA
- Average marks
- Attendance percentage

### Digital Report Card
- Subject-wise marks
- Percentage
- Grade
- Attendance
- Teacher remarks
- Pass/Fail status

### Performance Visualization
- Subject performance progress bars
- Academic performance overview

### Report Printing
- Print report card
- Save report card as PDF using the browser's print functionality

---

## 🎨 UI & Design

The system includes a modern responsive interface with:

- Dark Mode
- Light Mode
- Theme persistence
- Responsive layouts
- CSS Grid
- Flexbox
- Modern dashboard cards
- Interactive tables
- Status badges
- Progress indicators
- Responsive navigation
- Clean role-specific dashboards

---

## 💾 Data Management

The project uses browser `localStorage` for:

- User accounts
- Authentication/session state
- Student records
- Teacher records
- Academic reports
- Attendance
- Teacher assignments
- Grading policy
- Theme preference

No backend database is required.

---

## 🛠️ Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)
- Browser Local Storage
- CSS Grid
- CSS Flexbox

### No Frameworks

This project intentionally does not use:

- React
- Angular
- Vue
- Bootstrap
- Tailwind CSS
- jQuery
- External UI frameworks
- Backend databases

---

## 📁 Project Structure

```text
Student_Report_System/
│
├── Admin/
│   ├── admin.html
│   ├── admin.css
│   └── admin.js
│
├── Teacher/
│   ├── teacher.html
│   ├── teacher.css
│   └── teacher.js
│
├── Student/
│   ├── student.html
│   ├── student.css
│   └── student.js
│
├── login.html
├── login.css
├── login.js
│
└── README.md