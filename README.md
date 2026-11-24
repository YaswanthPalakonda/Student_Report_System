# 🎓 Student Report System

A modern, responsive, web-based Student Report System built using **React.js and Vite**. The application helps manage student academic performance, attendance, grading, teacher feedback, and role-based access through a simple and user-friendly interface.

The system provides separate portals for Administrators, Teachers, and Students, with browser Local Storage used for managing application data and authentication state.

---

## 🚀 Project Overview

The Student Report System provides three separate portals:

* 👨‍💼 Administrator
* 👨‍🏫 Teacher
* 👨‍🎓 Student

The Administrator manages users, class and subject assignments, grading policies, and academic reports.

Teachers manage student academic records, marks, attendance, and feedback.

Students can view their profiles, academic performance, attendance, grades, and digital report cards.

---

## ✨ Key Features

### 🔐 Authentication

* Role-based login system
* Automatic role detection
* Role-based dashboard redirection
* Admin-managed Teacher and Student accounts
* Password show/hide option
* Remember Me functionality
* Protected dashboard access
* Logout functionality
* Local Storage-based authentication

> There is no public Signup page. All Teacher and Student accounts are created and managed by the Administrator.

---

## 👨‍💼 Admin Portal

### Dashboard

* Total student count
* Total teacher count
* Overall class average
* System overview

### User Management

* Add students
* Add teachers
* Edit user information
* View user information
* Delete users
* Search users
* Filter users by role

### Class & Subject Management

* Assign teachers to classes
* Assign subjects
* Manage teacher assignments
* Remove assignments

### Reports

* View student reports
* Search reports
* Filter reports
* Delete reports
* Monitor academic performance

### Grading Policy

* Configure grading ranges
* Configure pass marks
* Manage grading rules

---

## 👨‍🏫 Teacher Portal

### Student Management

* View assigned class roster
* View student information
* Select students for report entry

### Marks Management

* Enter test marks
* Enter examination marks
* Automatic total calculation
* Automatic percentage calculation
* Automatic grade calculation
* Pass/Fail calculation

### Attendance

* Record attendance
* Present
* Absent
* Late
* Attendance percentage calculation

### Teacher Feedback

* Add student remarks
* Add academic feedback
* Update existing reports

---

## 👨‍🎓 Student Portal

### Student Dashboard

* Personal profile
* Class and section information
* Overall academic performance
* GPA
* Average marks
* Attendance percentage

### Digital Report Card

* Subject-wise marks
* Percentage
* Grade
* Attendance
* Teacher remarks
* Pass/Fail status

### Performance Visualization

* Subject performance progress bars
* Academic performance overview

### Report Printing

* Print report card
* Save report card as PDF using browser print functionality

---

## 🎨 UI & Design

* Modern responsive interface
* Dark Mode and Light Mode
* Theme persistence
* CSS Grid and Flexbox
* Dashboard cards
* Interactive tables
* Status badges
* Progress indicators
* Responsive navigation
* Separate role-specific dashboards

---

## 💾 Data Management

The application currently uses browser `localStorage` to manage:

* User accounts
* Authentication/session state
* Student records
* Teacher records
* Academic reports
* Attendance
* Teacher assignments
* Grading policies
* Theme preferences

**Note:** Local Storage is browser-specific. Data created in one browser or device is not automatically shared with other users or devices. Clearing browser storage may also remove application data.

---

## 🛠️ Technologies Used

### Frontend

* React.js
* JavaScript 
* HTML5
* CSS3

### Build Tool

* Vite

### Routing

* React Router DOM

### Data Storage

* Browser Local Storage

### Development Tools

* Visual Studio Code
* Node.js
* npm
* Git and GitHub

### Deployment

* Vercel

---

## 📁 Project Structure

```text
Student_Report_System/
│
├── public/
│
├── src/
│   ├── components/
│   │   ├── Admin/
│   │   │   ├── Admin.jsx
│   │   │   └── Admin.css
│   │   │
│   │   ├── Student/
│   │   │   ├── Student.jsx
│   │   │   └── Student.css
│   │   │
│   │   ├── Teacher/
│   │   │   ├── Teacher.jsx
│   │   │   └── Teacher.css
│   │   │
│   │   └── Auth/
│   │       ├── Login.jsx
│   │       └── Auth.css
│   │
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
│
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

---

## ⚙️ Installation and Setup

### Prerequisites

* Node.js
* npm
* Git

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

### 2. Navigate to the Project Directory

```bash
cd Student_Report_System
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start the Development Server

```bash
npm run dev
```

### 5. Build for Production

```bash
npm run build
```

The production-ready files will be generated inside the `dist` folder.

---

## 🌐 Deployment

The application is deployed using **Vercel**

---

## 🔮 Future Enhancements

* Cloud database integration
* Centralized user authentication
* Shared student and teacher records across devices
* Improved data security
* Advanced academic analytics
* Export reports in PDF format

---

## 🎯 Project Objective

The main objective of this project is to develop a simple and efficient academic management system that allows administrators, teachers, and students to manage and access academic information through a role-based web application.

---
