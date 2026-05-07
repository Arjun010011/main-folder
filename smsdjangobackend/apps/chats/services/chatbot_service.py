"""
Chatbot service to provide intelligent responses to user queries with permission-based filtering
"""
import random
import re
from typing import Any, Dict, List, Optional, Set, Tuple
from apps.users.services.permissions import CustomBasePermissions, get_basename_from_url
from apps.users.services.permissions_map import permission_map


class ChatbotService:
    """
    Service class to handle chatbot queries and provide intelligent responses
    with permission-based module filtering
    """
    
    # Module to basename mapping - maps modules to basenames used in CustomBasePermissions
    MODULE_BASENAME_MAP = {
        'student': ['student', 'enrollment', 'application', 'enquiry', 'admission_student', 'general_student'],
        'exam': ['exam', 'schedule', 'schedule_exam', 'exam_marks_enter', 'exam_result'],
        'attendance': ['attendance', 'batchattendance', 'subjectattendance'],
        'fee': ['feecollection', 'fee_collection', 'feeplan', 'fee_plan', 'cashbook'],
        'timetable': ['timetable', 'period', 'periodplan', 'assigntimetable'],
        'staff': ['staff', 'general_staff', 'shift', 'assign_shift'],
        'leave': ['leave', 'leave_plan', 'apply_leave_application', 'approve_leave_application'],
        'payroll': ['payroll', 'salaryplan', 'salarypayment', 'payslip'],
        'basic': ['standard', 'section', 'subject', 'institute', 'academicyear'],
        'library': ['library', 'book'],
        'transport': ['transport', 'vehicle', 'transport_vehicle', 'transport_route'],
        'hostel': ['hostel', 'room_allocation'],
        'diary': ['diary', 'homework', 'managehomework', 'viewhomework'],
        'report': ['report', 'studentreport', 'financereport'],
        'quiz': ['quiz'],
        'certificate': ['certificate', 'study_certificate', 'character_certificate'],
        'store': ['store', 'store_inventory'],
        'expense': ['expense', 'expenses'],
        'general': ['event', 'holiday', 'holiday_calender'],
        'abacus': ['abacus', 'homework_abacus'],
        'bdu': ['bdu'],
        'biometric': ['biometric', 'biometric_machine'],
        'dashboard': ['dashboard'],
        'exam_engineer': ['exam_engineer', 'schedule_exam_engineer'],
        'feedback': ['feedbackform', 'feedback_form'],
        'survey': ['surveyform', 'survey_form'],
        'video_tutorials': ['tutorial', 'video_tutorial'],
        'visitors': ['visitor', 'school_visitor'],
        'miscellaneous': ['miscellaneous', 'miscellaneous_type', 'miscellaneous_plan'],
        'invoice': ['invoice', 'invoice_mapping'],
        'leaderboard': ['leaderboard'],
        'admin': ['formdefinition', 'customform', 'sync'],
        'permissions': ['groups', 'permissions', 'usergroups'],
        'settings': ['setting', 'settings'],
    }

    # High-priority phrases: broad “how do I use the product?” questions (answered before keyword modules)
    USAGE_NAVIGATION_PHRASES = (
        'how to use', 'how do i use', 'how can i use', 'how do you use', 'how should i use',
        'using the app', 'using this app', 'use the app', 'use this app',
        'using the application', 'use the application', 'use this application', 'using this application',
        'using the system', 'use the system', 'using the portal', 'use the portal',
        'using this software', 'how this application', 'how this app',
        'navigate the', 'navigate to', 'where do i go', 'where can i find', 'where is the menu',
        'getting started', 'new to this', 'first time using', 'help me use', 'help using',
        'how does this work', 'how does the app', 'how does this app', 'how does the system',
        'user guide', 'which menu', 'which option', 'which screen',
        'i have a doubt', 'have doubts', 'any doubt', 'learn to use',
        'what is this app', 'how to open', 'cannot find', "can't find",
        'how to access', 'where to click', 'steps to use', 'usage of',
        'explain the application', 'use edubricz', 'use the software',
    )

    USAGE_HELP_ANSWERS = [
        """**Using this School Management application**

**1. Main navigation**
- Open the **menu (☰)** on the left to see all modules your role is allowed to use (Students, Exams, Attendance, Finance, etc.).
- Items appear based on **permissions** from your administrator. If something is missing, ask your admin to grant the right *view* permission.

**2. Finding a feature**
- Scroll the menu or expand **sections** (some modules have sub-menus).
- Your school may also expose a **module search** in the menu bar—type a keyword (e.g. “fee”, “exam”) to jump to a screen.

**3. Academic year & context**
- Many screens need the correct **Academic Year** (and sometimes **branch/board**). Set these from the header or filters **before** adding data so records attach to the right year.

**4. Typical workflows**
- **Students:** Enquiry → Application → Admission / enrollment (under Student or Classes menus).
- **Exams:** Create or open an exam → **Schedule Exam** → enter marks → results / reports.
- **Fees:** Configure **Fee plan** → **Fee collection** and receipts.
- **Attendance:** Choose date, class, and mark present/absent; then use reports if you have access.

**5. This assistant**
- Ask **specific** questions like “How do I create an exam schedule?” or “How do I collect fees?” for step-by-step answers tied to your access.

**6. Problems**
- **Login / token:** Sign in again if the session expired.
- **403 / “not allowed”:** Your user group needs permission for that action—contact the school admin.

Tell me what you are trying to do (one task at a time) and I will walk you through the clicks.""",

        """**Quick start – how to work with the application**

1. **Sign in** with the credentials your school gave you.
2. Use the **left drawer menu** to open modules. Only modules you are allowed to see will show.

3. Inside most pages:
   - Pick **Academic Year** (and branch/board if shown).
   - Use **Add / Create** buttons to enter new data; use **filters** or **search** to find existing records.

4. **Good questions to ask me**
   - “How do I add a new student?”
   - “How do I create an exam schedule?”
   - “How do I mark attendance?”
   - “How do I collect fee payment?”

5. If an answer says you lack permission, your **administrator** must assign the correct role or permissions in **Groups & Permissions**.

Reply with the module you care about (e.g. exams, fees, transport) and what you want to accomplish.""",
    ]

    USAGE_HELP_ANSWERS_DIRECT = [
        """**Using this application (short):** Open the **menu (☰)** for your modules, set **Academic year** (and branch/board if shown) in the header, then use filters and **Add / Create** on each screen. Only items your role allows will appear.

Tap **With steps** below the chat for click-by-click guides, or ask a specific task (for example “collect fees”, “exam schedule”).""",
        """**Quick orientation:** Sign in → **left menu** → pick a module → choose **Academic Year** → search or filter records.

Use **With steps** when you want numbered instructions; use **Direct answer** for short pointers.""",
    ]

    # Comprehensive knowledge base for all modules
    KNOWLEDGE_BASE = {
        'student': {
            'keywords': ['student', 'add student', 'new student', 'enroll', 'enrollment', 'admission', 'admit', 'application', 'enquiry'],
            'permission_keywords': ['view_student', 'add_student', 'view_enrollment', 'view_application', 'view_enquiry'],
            'answers': [
                """**Adding a New Student:**

1. Go to **Student Management → Student Forms → Admission**
2. Click on **"Add New Student"** or **"New Admission"**
3. Fill in the required details:
   - Basic Information (name, date of birth, gender, etc.)
   - Parent/Guardian Details
   - Contact Information
   - Address Details
   - Previous School Information (if applicable)
4. Upload student photo and documents if required
5. Complete the enrollment by assigning to a Standard/Section
6. Click **"Save"** to create the student record

**Fast Enrollment:**
- Use **Classes → Fast Enrollment** for quick bulk student addition
- Select multiple students and assign them to sections at once

**Student Application Process:**
1. **Enquiry** → **Application** → **Admission**
2. First create an enquiry, then convert to application, then to admission""",
                
                """**Student Enrollment:**

1. Navigate to **Classes → Enrollment**
2. Select the **Academic Year**
3. Choose the **Standard** and **Section**
4. Select students from the list (or add new ones)
5. Assign subjects to students if needed
6. Click **"Enroll"** to complete enrollment

**Promote Students:**
- Use **Classes → Promote Student** to move students to next class
- Can promote individual or bulk students
- Automatically updates academic year and standard

**Shuffle Students:**
- Use **Classes → Shuffle Student** to move students between sections
- Maintains enrollment data while changing sections"""
            ]
        },
        
        'exam': {
            'keywords': ['exam', 'examination', 'schedule exam', 'exam schedule', 'marks', 'result', 'hall ticket', 'question paper'],
            'permission_keywords': ['view_exam', 'add_exam', 'view_examschedule', 'add_examschedule', 'view_exammarks'],
            'answers': [
                """**Creating an Exam Schedule:**

1. Go to **Exam Management → Schedule Exam**
2. Click **"Add New Schedule"**
3. Fill in the details:
   - Select **Exam Type** (Unit Test, Mid-term, Final, etc.)
   - Choose **Academic Year**
   - Select **Standards** and **Subjects**
   - Set **Exam Dates** and **Time Slots**
   - Assign **Exam Halls** if needed
   - Set **Duration** for each exam
4. Configure optional settings:
   - Grading system
   - Passing marks
   - Optional subjects
5. Click **"Save"** to create the schedule

**Copy from Previous Exam:**
- Use **"Copy Schedule"** button to copy from previous exams
- Only dates will be updated, rest of the configuration remains same

**Exam Approval:**
- After creating, exam schedules may need approval
- Go to **Exam Management → Approve Exam Schedule** to approve""",
                
                """**Entering Exam Marks:**

1. Navigate to **Exam Management → Enter Marks**
2. Select the **Exam Schedule**
3. Choose **Subject** and **Standard/Section**
4. Enter marks for each student:
   - Theory marks
   - Practical marks (if applicable)
   - Internal marks
   - Total marks
5. You can also:
   - Use **Bulk Upload** via Excel
   - Import marks from previous exams
   - Copy marks from another section
6. Click **"Save"** to save the marks

**Viewing Results:**
- Go to **Exam Management → Results**
- Select exam schedule and view:
  - Individual student results
  - Class-wise results
  - Subject-wise performance
  - Generate report cards

**Hall Tickets:**
- Generate hall tickets from **Exam Management → Hall Ticket Generator**
- Select exam schedule and generate for all students"""
            ]
        },
        
        'attendance': {
            'keywords': [
                'attendance',
                'mark attendance',
                'present',
                'absent',
                'absentee',
                'absentees',
                'attendance report',
                'batch attendance',
            ],
            'permission_keywords': ['view_attendance', 'add_attendance', 'view_batchattendance', 'add_batchattendance'],
            'direct_answers': [
                """**Mark attendance (short):** **Student Attendance → Mark Attendance** → choose **date**, **standard**, **section** → use **P / A / L / H** → **Save**.

**Batch:** **Student Attendance → Batch Attendance** for several classes at once.""",
                """**Attendance reports (short):** **Student Attendance → Reports** → pick report type → set dates and class filters → **Generate** (print/export if available).""",
            ],
            'answers': [
                """**Marking Student Attendance:**

**Daily Attendance:**
1. Go to **Student Attendance → Mark Attendance**
2. Select **Date**, **Standard**, and **Section**
3. Mark each student as:
   - **P** = Present
   - **A** = Absent
   - **L** = Leave
   - **H** = Holiday
4. Click **"Save Attendance"**

**Subject-wise Attendance:**
1. Navigate to **Student Attendance → Subject Attendance**
2. Select date, standard, section, and subject
3. Mark attendance for that specific subject class
4. Save the attendance

**Batch Attendance:**
1. Go to **Student Attendance → Batch Attendance**
2. Select multiple standards/sections at once
3. Mark attendance for all selected classes
4. Useful for marking attendance for entire school or multiple classes together""",
                
                """**Attendance Reports:**

1. Navigate to **Student Attendance → Reports**
2. Select report type:
   - **Daily Attendance Report**
   - **Monthly Attendance Report**
   - **Subject-wise Attendance**
   - **Student-wise Attendance Summary**
3. Apply filters:
   - Date range
   - Standard/Section
   - Individual student
4. Click **"Generate Report"**
5. View, print, or export to Excel/PDF

**Attendance Configuration:**
- Set up attendance rules in **Student Attendance → Configuration**
- Configure working days, holidays, and attendance policies"""
            ]
        },
        
        'fee': {
            'keywords': ['fee', 'fees', 'fee collection', 'fee receipt', 'payment', 'generate receipt', 'fee plan', 'concession'],
            'permission_keywords': ['view_feecollection', 'add_feecollection', 'view_feeplan', 'add_feeplan', 'view_cashbook'],
            'answers': [
                """**Fee Collection Process:**

**Step 1: Create Fee Plan**
1. Go to **Finance → Fee Plan**
2. Click **"Create Fee Plan"**
3. Select **Academic Year** and **Standard**
4. Choose **Fee Types** and **Fee Terms**
5. Set amounts for each fee type
6. Save the fee plan

**Step 2: Collect Fees**
1. Navigate to **Finance → Fee Collection**
2. Search for student by:
   - Admission Number
   - Student Name
   - Roll Number
3. Select the student
4. Choose **Fee Term** and **Fee Types**
5. Enter **Payment Amount**
6. Select **Payment Mode**:
   - Cash
   - Cheque (enter cheque details)
   - Online/UPI
   - Bank Transfer
7. Click **"Collect Fee"** and generate receipt

**Bulk Fee Collection:**
- Use **Finance → Bulk Fee Collection** for multiple students
- Select students and collect fees together""",
                
                """**Fee Receipts and Reports:**

**Generate Receipt:**
1. Go to **Finance → Fee Collection**
2. Find the student's payment record
3. Click **"View Receipt"** or **"Print Receipt"**
4. Receipt includes:
   - Student details
   - Fee breakdown
   - Payment details
   - Receipt number

**Fee Reports:**
- **Fee Collection Report**: View all fee collections
- **Pending Fee Report**: See students with pending fees
- **Fee Concession Report**: View fee concessions given
- **Cashbook**: Track all financial transactions

**Fee Concession:**
1. Go to **Finance → Fee Concession**
2. Select student and fee type
3. Enter concession amount or percentage
4. Approve the concession
5. Concession will be applied to fee collection"""
            ]
        },
        
        'timetable': {
            'keywords': ['timetable', 'time table', 'schedule', 'period', 'class schedule', 'create timetable', 'period plan'],
            'permission_keywords': ['view_timetable', 'add_timetable', 'view_periodplan', 'add_periodplan'],
            'answers': [
                """**Creating a Timetable - Complete Guide:**

**STEP 1: Set Up Period Plan (MUST DO FIRST)**
1. Go to **Timetable Management → Period Plan**
2. Click **"Add Period Plan"**
3. Enter plan name (e.g., "Morning Shift Plan")
4. Define periods:
   - Click **"Add Period"**
   - Enter period name (Period 1, Period 2, etc.)
   - For each period, set time slots for each day:
     * Select day (Monday, Tuesday, etc.)
     * Set **Start Time** and **End Time**
     * Mark as **Break** if it's a break period (Lunch, Recess)
5. Save the Period Plan

**STEP 2: Create Timetable**
1. Go to **Timetable Management → Create Timetable**
2. Select:
   - **Academic Year**
   - **Date Range** (when timetable is effective)
   - **Period Plan** (created in Step 1)
   - **Standard** and **Section**
3. For each period slot:
   - Assign **Subject**
   - Assign **Teacher/Staff**
   - Time slots are automatically taken from Period Plan
4. Click **"Save Timetable"**

**Auto-Generate Timetable:**
- Use **Auto-Timetable Generator** for automatic creation
- Considers teacher availability and constraints
- Generates optimized timetable""",
                
                """**Timetable Management:**

**View Timetables:**
1. Go to **Timetable Management → View Timetable**
2. Select Academic Year, Standard, Section
3. View complete weekly schedule

**Additional Features:**
- **Teacher-wise Timetable**: See all classes for a teacher
- **Subject-wise Timetable**: View schedule for a subject
- **Copy Timetable**: Copy from previous academic year
- **Bulk Assignment**: Assign timetable to multiple sections
- **Export**: Download as PDF or Excel

**Important Notes:**
- Period Plan must be created before any timetable
- One Period Plan can be used for multiple timetables
- You can have different Period Plans for different shifts"""
            ]
        },
        
        'staff': {
            'keywords': ['staff', 'teacher', 'add staff', 'staff management', 'hr', 'shift', 'assign teacher'],
            'permission_keywords': ['view_staff', 'add_staff', 'view_shift', 'add_shift'],
            'answers': [
                """**Adding Staff/Teacher:**

1. Go to **HR Management → Staff → Add Staff**
2. Fill in staff details:
   - **Personal Information**: Name, DOB, Gender, etc.
   - **Contact Details**: Phone, Email, Address
   - **Employment Details**: Designation, Department, Joining Date
   - **Login Credentials**: Username, Password (if needed)
3. **Assign Subjects** (for teachers):
   - Go to **HR Management → Assign Subject**
   - Select staff member
   - Choose subjects they teach
4. **Assign to Standards** (if class teacher):
   - Go to **HR Management → Assign Teacher**
   - Link teacher to standard/section
5. Save the staff record

**Staff Shift Management:**
1. Go to **HR Management → Shift Management**
2. Create shift types (Morning, Evening, etc.)
3. Assign shifts to staff members
4. Set shift timings and working hours""",
                
                """**Staff Management Features:**

**Staff Attendance:**
- Mark staff attendance in **HR Management → Staff Attendance**
- Track daily attendance, late arrivals, early departures

**Assign Subjects to Staff:**
1. Go to **HR Management → Assign Subject**
2. Select staff member
3. Choose subjects and standards they teach
4. Set teaching hours per week

**Staff Reports:**
- View staff list and details
- Staff attendance reports
- Teaching load reports
- Staff performance reports"""
            ]
        },
        
        'leave': {
            'keywords': ['leave', 'apply leave', 'leave application', 'leave management', 'approve leave', 'leave plan'],
            'permission_keywords': ['view_leave', 'add_leave', 'view_leaveplan', 'add_leaveplan'],
            'answers': [
                """**Leave Management:**

**Applying for Leave:**
1. Go to **Leave Management → Apply Leave**
2. Click **"New Leave Application"**
3. Fill in details:
   - Select **Leave Type** (Sick, Casual, Earned, etc.)
   - Choose **Date Range** (from and to dates)
   - Enter **Reason** for leave
   - Upload documents if required (medical certificate, etc.)
4. Click **"Submit Application"**
5. Application will be sent for approval

**Approving Leave:**
1. Go to **Leave Management → Approve Leave**
2. View pending leave applications
3. Review application details
4. Click **"Approve"** or **"Reject"**
5. Add comments if rejecting

**Leave Plan:**
1. Go to **Leave Management → Leave Plan**
2. Set leave allocation for staff:
   - Casual Leave days
   - Sick Leave days
   - Earned Leave days
   - Other leave types
3. Leave balance is tracked automatically""",
                
                """**Leave Reports:**

- **Leave Application Report**: View all leave applications
- **Leave Balance Report**: See remaining leave balance for each staff
- **Leave Summary**: Monthly/Yearly leave summary
- **Absentee Report**: Staff who are on leave

**Leave Types:**
- Casual Leave
- Sick Leave
- Earned Leave
- Compensatory Leave
- Maternity/Paternity Leave
- Other custom leave types"""
            ]
        },
        
        'payroll': {
            'keywords': ['payroll', 'salary', 'payslip', 'salary payment', 'salary plan', 'salary component'],
            'permission_keywords': ['view_payroll', 'add_payroll', 'view_salaryplan', 'add_salaryplan'],
            'answers': [
                """**Payroll Management:**

**Step 1: Create Salary Components**
1. Go to **Payroll → Salary Components**
2. Define components:
   - **Earnings**: Basic Salary, HRA, DA, Allowances, etc.
   - **Deductions**: PF, ESI, TDS, Loans, etc.
3. Set calculation rules for each component

**Step 2: Create Salary Plan**
1. Navigate to **Payroll → Salary Plan**
2. Click **"Create Salary Plan"**
3. Select staff member
4. Assign salary components:
   - Set amounts for earnings
   - Set deduction percentages/amounts
5. Save the salary plan

**Step 3: Process Salary**
1. Go to **Payroll → Salary Payment**
2. Select **Pay Period** (month and year)
3. Select staff members
4. System calculates:
   - Gross Salary
   - Deductions
   - Net Salary
5. Process payment and generate payslips""",
                
                """**Payslip Generation:**

1. Go to **Payroll → Payslip**
2. Select staff member and pay period
3. View or generate payslip
4. Payslip includes:
   - Earnings breakdown
   - Deductions breakdown
   - Net salary
   - Payment details

**Payroll Reports:**
- **Salary Payment Report**: All salary payments
- **Payslip Report**: Generate payslips for multiple staff
- **Salary Summary**: Monthly/Yearly salary summary
- **TDS Report**: Tax deduction reports"""
            ]
        },
        
        'basic': {
            'keywords': ['standard', 'section', 'subject', 'academic year', 'basic details', 'school details', 'class'],
            'permission_keywords': ['view_standard', 'add_standard', 'view_section', 'add_section', 'view_subject', 'view_institute'],
            'answers': [
                """**Basic Details Setup:**

**Academic Year:**
1. Go to **Basic Details → Academic Year**
2. Click **"Add Academic Year"**
3. Enter:
   - Year name (e.g., "2024-25")
   - Start Date and End Date
4. Set as current academic year if needed
5. Save

**Standards/Classes:**
1. Navigate to **Basic Details → Standards**
2. Click **"Add Standard"**
3. Enter standard name (1st, 2nd, 10th, etc.)
4. Set standard order/number
5. Save

**Sections:**
1. Go to **Basic Details → Sections**
2. Click **"Add Section"**
3. Select Standard
4. Enter section name (A, B, C, etc.)
5. Set section capacity (max students)
6. Save

**Subjects:**
1. Navigate to **Basic Details → Subjects**
2. Click **"Add Subject"**
3. Enter:
   - Subject name
   - Subject code
   - Subject type (Theory, Practical, Both)
   - Maximum marks
4. Save""",
                
                """**School Details:**

1. Go to **Basic Details → School Details**
2. Update:
   - School name and logo
   - Address and contact information
   - Affiliation details
   - Other school information
3. Save changes

**Subject Categories:**
- Create subject categories in **Basic Details → Subject Categories**
- Group related subjects together

**School Buildings:**
- Add school buildings in **Basic Details → School Buildings**
- Useful for multi-building schools"""
            ]
        },
        
        'library': {
            'keywords': ['library', 'book', 'issue book', 'return book', 'library management'],
            'permission_keywords': ['view_library', 'add_library', 'view_book', 'add_book'],
            'answers': [
                """**Library Management:**

**Adding Books:**
1. Go to **Library → Add Book**
2. Enter book details:
   - Book Title, Author, Publisher
   - ISBN, Book Number
   - Category, Language
   - Number of copies
3. Save the book

**Issuing Books:**
1. Navigate to **Library → Issue Book**
2. Search for book by title/author/ISBN
3. Select the book
4. Search for student/staff member
5. Set issue date and due date
6. Click **"Issue Book"**

**Returning Books:**
1. Go to **Library → Return Book**
2. Search by:
   - Student/Staff name
   - Book title
   - Issue ID
3. Select the issued book
4. Check for damages or fines
5. Click **"Return Book"**

**Library Reports:**
- Books issued report
- Books due/overdue report
- Library stock report
- Fine collection report"""
            ]
        },
        
        'transport': {
            'keywords': ['transport', 'vehicle', 'route', 'driver', 'transport fee', 'assign vehicle'],
            'permission_keywords': ['view_transport', 'add_transport', 'view_vehicle', 'add_vehicle'],
            'answers': [
                """**Transport Management:**

**Adding Vehicles:**
1. Go to **Transport → Vehicle Management**
2. Click **"Add Vehicle"**
3. Enter:
   - Vehicle number, type (Bus, Van, etc.)
   - Capacity, Driver details
   - Route information
4. Save

**Creating Routes:**
1. Navigate to **Transport → Route Management**
2. Create route with:
   - Route name
   - Pickup and drop points
   - Distance and timing
3. Assign vehicle to route

**Assigning Students:**
1. Go to **Transport → Assign Vehicle**
2. Search for student
3. Select vehicle and route
4. Set pickup and drop points
5. Assign transport fee plan
6. Save

**Transport Fee:**
1. Go to **Transport → Transport Fee Plan**
2. Create fee plans based on:
   - Route distance
   - Vehicle type
3. Assign to students"""
            ]
        },
        
        'hostel': {
            'keywords': ['hostel', 'room', 'hostel management', 'allocate room', 'hostel fee'],
            'permission_keywords': ['view_hostel', 'add_hostel'],
            'answers': [
                """**Hostel Management:**

**Setting Up Hostels:**
1. Go to **Hostel Management → Hostel Setup**
2. Create hostel:
   - Hostel name
   - Address and facilities
   - Capacity
3. Add rooms:
   - Room number
   - Room type (Single, Double, Dormitory)
   - Capacity per room
4. Save

**Allocating Rooms:**
1. Navigate to **Hostel Management → Allocate Room**
2. Search for student
3. Select hostel and room
4. Set allocation date
5. Assign roommates if shared room
6. Save allocation

**Hostel Fee:**
- Create hostel fee plans
- Collect monthly/annual hostel fees
- Track fee payments"""
            ]
        },
        
        'diary': {
            'keywords': ['diary', 'homework', 'assignment', 'evaluate homework', 'submit homework'],
            'permission_keywords': ['view_diary', 'add_diary', 'view_homework', 'add_homework'],
            'answers': [
                """**Diary/Homework Management:**

**Creating Homework:**
1. Go to **Diary → Create Homework**
2. Select:
   - Standard and Section
   - Subject
   - Due Date
3. Enter:
   - Homework title
   - Description/Instructions
   - Attach files if needed
4. Click **"Create Homework"**

**Student Submission:**
- Students can submit homework through their portal
- Upload files and add comments
- Submit before due date

**Evaluating Homework:**
1. Navigate to **Diary → Evaluate Homework**
2. View submitted homeworks
3. Review student submissions
4. Assign marks/grades
5. Add feedback comments
6. Mark as evaluated

**Homework Reports:**
- View all homeworks
- Pending submissions
- Evaluation status"""
            ]
        },
        
        'report': {
            'keywords': ['report', 'reports', 'generate report', 'view report', 'export report'],
            'permission_keywords': ['view_report', 'view_studentreport', 'view_financereport', 'view_attendance_report'],
            'answers': [
                """**Available Reports:**

**Student Reports:**
- Student List Report
- Student Attendance Report
- Student Academic Report
- Student Fee Report
- Student Performance Report

**Finance Reports:**
- Fee Collection Report
- Pending Fee Report
- Cashbook Report
- Fee Concession Report
- Financial Summary

**Attendance Reports:**
- Daily Attendance Report
- Monthly Attendance Report
- Subject-wise Attendance
- Student-wise Attendance Summary

**Exam Reports:**
- Exam Results Report
- Marks Report
- Hall Ticket Report
- Performance Analysis

**Staff Reports:**
- Staff List Report
- Staff Attendance Report
- Staff Leave Report
- Payroll Report

**How to Generate:**
1. Go to **Reports** section
2. Select report type
3. Apply filters (date, standard, section, etc.)
4. Click **"Generate Report"**
5. View, print, or export to Excel/PDF"""
            ]
        },
        
        'quiz': {
            'keywords': ['quiz', 'test', 'online test', 'create quiz', 'quiz result'],
            'permission_keywords': ['view_quiz', 'add_quiz'],
            'answers': [
                """**Quiz Management:**

**Creating a Quiz:**
1. Go to **Quiz → Create Quiz**
2. Enter quiz details:
   - Quiz name and description
   - Standard and Section
   - Subject
   - Duration
   - Total marks
3. Add questions:
   - Question text
   - Options (for MCQ)
   - Correct answer
   - Marks per question
4. Set quiz settings:
   - Start date and time
   - End date and time
   - Passing marks
5. Save and publish quiz

**Taking Quiz:**
- Students access quiz from their portal
- Answer questions within time limit
- Submit quiz before deadline

**Viewing Results:**
1. Go to **Quiz → Quiz Results**
2. Select quiz
3. View:
   - Individual student results
   - Class performance
   - Question-wise analysis"""
            ]
        },
        
        'certificate': {
            'keywords': ['certificate', 'tc', 'transfer certificate', 'character certificate', 'study certificate'],
            'permission_keywords': ['view_certificate', 'add_certificate'],
            'answers': [
                """**Certificate Management:**

**Generating Certificates:**
1. Go to **Certificates → Certificate List**
2. Select certificate type:
   - Transfer Certificate (TC)
   - Character Certificate
   - Study Certificate
   - Admission Abstract
3. Search for student
4. Fill in certificate details
5. Generate and print certificate

**Certificate Types:**
- **TC (Transfer Certificate)**: When student leaves school
- **Character Certificate**: For good conduct
- **Study Certificate**: Proof of study
- **Admission Abstract**: Admission details certificate"""
            ]
        },
        
        'store': {
            'keywords': ['store', 'inventory', 'stock', 'item', 'store management'],
            'permission_keywords': ['view_store', 'add_store'],
            'answers': [
                """**Store Management:**

**Adding Items:**
1. Go to **Store Management → Add Item**
2. Enter item details:
   - Item name and code
   - Category
   - Unit of measurement
   - Stock quantity
   - Price
3. Save item

**Stock Management:**
- Add stock (purchases)
- Issue stock (usage)
- View stock reports
- Low stock alerts"""
            ]
        },
        
        'expense': {
            'keywords': ['expense', 'expenditure', 'add expense', 'expense report'],
            'permission_keywords': ['view_expense', 'add_expense'],
            'answers': [
                """**Expense Management:**

**Adding Expenses:**
1. Go to **Expenses → Add Expense**
2. Enter:
   - Expense category
   - Amount
   - Date
   - Description
   - Payment mode
3. Attach bills/receipts if needed
4. Save expense

**Expense Reports:**
- Category-wise expenses
- Monthly/Yearly expense summary
- Expense vs Budget analysis"""
            ]
        },
        
        'general': {
            'keywords': ['event', 'holiday', 'calendar', 'general', 'school event'],
            'permission_keywords': ['view_event', 'add_event', 'view_holiday', 'add_holiday'],
            'answers': [
                """**General Management:**

**Events:**
1. Go to **General → Events**
2. Click **"Add Event"**
3. Enter:
   - Event name and description
   - Date and time
   - Venue
   - Participants
4. Save event

**Holiday Calendar:**
1. Navigate to **General → Holiday Calendar**
2. Add holidays:
   - Holiday name
   - Date(s)
   - Holiday type
3. Save to calendar"""
            ]
        },
        
        'abacus': {
            'keywords': ['abacus', 'abacus homework', 'abacus assignment', 'abacus evaluation'],
            'permission_keywords': ['view_abacus', 'add_abacus'],
            'answers': [
                """**Abacus Homework Management:**

**Creating Abacus Homework:**
1. Go to **Abacus → Manage Homework**
2. Click **"Add New Homework"**
3. Fill in details:
   - Select Standard and Section
   - Enter homework title and description
   - Set due date
   - Add abacus-specific instructions
4. Save the homework

**Student Submission:**
- Students submit abacus homework through their portal
- Can upload files and add calculations

**Evaluating Abacus Homework:**
1. Navigate to **Abacus → Evaluate Homework**
2. View submitted homeworks
3. Review student work
4. Assign marks and provide feedback
5. Mark as evaluated"""
            ]
        },
        
        'bdu': {
            'keywords': ['bdu', 'bulk data upload', 'data upload', 'bulk upload', 'excel upload'],
            'permission_keywords': ['view_bdu', 'add_bdu'],
            'answers': [
                """**BDU (Bulk Data Upload):**

**Uploading Data:**
1. Go to **BDU → Upload Data**
2. Download the template Excel file
3. Fill in the data according to the template format
4. Upload the Excel file
5. System validates the data
6. Review any errors or warnings
7. Confirm and import the data

**Viewing Upload History:**
- Go to **BDU → Upload List** to see all uploads
- View upload status (Success, Failed, Partial)
- Check error reports for failed uploads
- Download error files to fix and re-upload

**Supported Data Types:**
- Student data
- Staff data
- Fee plans
- Attendance data
- And more..."""
            ]
        },
        
        'biometric': {
            'keywords': ['biometric', 'biometric machine', 'fingerprint', 'attendance machine', 'biometric attendance'],
            'permission_keywords': ['view_biometric', 'add_biometric'],
            'answers': [
                """**Biometric Machine Management:**

**Adding Biometric Machine:**
1. Go to **Biometric → Machine Management**
2. Click **"Add Machine"**
3. Enter machine details:
   - Machine name/ID
   - IP address
   - Location
   - Machine type
4. Configure connection settings
5. Save the machine

**Syncing Biometric Data:**
1. Navigate to **Biometric → Sync Data**
2. Select the machine
3. Click **"Sync"** to fetch attendance data
4. System automatically syncs attendance records
5. View synced attendance in attendance reports

**Mapping Users:**
- Map students/staff to biometric machine IDs
- Link fingerprint data to user accounts
- Enable automatic attendance marking"""
            ]
        },
        
        'dashboard': {
            'keywords': ['dashboard', 'home', 'main page', 'overview', 'statistics'],
            'permission_keywords': ['view_dashboard'],
            'answers': [
                """**Dashboard Overview:**

The Dashboard provides a comprehensive overview of your school management system:

**Key Features:**
- **Statistics Cards**: Quick view of students, staff, fees, attendance
- **Charts and Graphs**: Visual representation of data
- **Recent Activities**: Latest updates and activities
- **Quick Actions**: Fast access to common tasks
- **Notifications**: Important alerts and reminders

**Customization:**
- You can customize dashboard widgets
- Arrange cards as per your preference
- Filter data by date range, standard, etc.

**Reports on Dashboard:**
- Student enrollment statistics
- Fee collection summary
- Attendance overview
- Exam performance metrics
- Staff attendance summary"""
            ]
        },
        
        'exam_engineer': {
            'keywords': ['exam engineer', 'engineer exam', 'schedule exam engineer', 'exam engineer marks'],
            'permission_keywords': ['view_exam_engineer', 'add_exam_engineer'],
            'answers': [
                """**Exam Engineer Module:**

**Creating Engineer Exam Schedule:**
1. Go to **Exam Engineer → Schedule Exam**
2. Click **"Add New Schedule"**
3. Select:
   - Exam Type
   - Academic Year
   - Standards and Subjects
   - Exam Dates and Times
4. Configure engineer-specific settings
5. Save the schedule

**Entering Engineer Exam Marks:**
1. Navigate to **Exam Engineer → Enter Marks**
2. Select exam schedule
3. Choose subject and standard
4. Enter marks for each student
5. Save the marks

**Engineer Exam Reports:**
- View engineer exam results
- Generate performance reports
- Export data for analysis"""
            ]
        },
        
        'feedback': {
            'keywords': ['feedback', 'feedback form', 'create feedback', 'feedback form', 'student feedback'],
            'permission_keywords': ['view_feedbackform', 'add_feedbackform'],
            'answers': [
                """**Feedback Form Management:**

**Creating Feedback Form:**
1. Go to **Feedback Form → Create Form**
2. Enter form details:
   - Form title and description
   - Select target audience (Students/Staff)
   - Set start and end dates
   - Choose academic year
3. Add questions:
   - Multiple choice questions
   - Text questions
   - Rating questions
   - Yes/No questions
4. Customize form appearance (colors, confirmation message)
5. Finalize and publish the form

**Viewing Responses:**
1. Navigate to **Feedback Form → View Responses**
2. Select the form
3. View individual responses
4. Generate summary reports
5. Export responses to Excel

**Form Settings:**
- Set time limit for completion
- Enable/disable anonymous responses
- Configure response visibility"""
            ]
        },
        
        'survey': {
            'keywords': ['survey', 'survey form', 'create survey', 'survey form', 'online survey'],
            'permission_keywords': ['view_surveyform', 'add_surveyform'],
            'answers': [
                """**Survey Form Management:**

**Creating Survey Form:**
1. Go to **Survey Form → Create Survey**
2. Enter survey details:
   - Survey title and description
   - Select target audience
   - Set start and end dates
   - Choose academic year and subject (if applicable)
3. Add questions:
   - Multiple choice
   - Text input
   - Rating scales
   - Video-based questions
4. Configure settings:
   - Time limit
   - Automatic evaluation
   - Question order (before/after video)
5. Finalize and publish survey

**Video Survey:**
- Create surveys with video content
- Questions can appear before or after video
- Students watch video and answer questions

**Viewing Survey Results:**
1. Navigate to **Survey Form → View Results**
2. Select the survey
3. View individual responses
4. Generate summary reports
5. Analyze response data"""
            ]
        },
        
        'video_tutorials': {
            'keywords': ['video tutorial', 'tutorial', 'video', 'online tutorial', 'video lesson'],
            'permission_keywords': ['view_tutorial', 'add_tutorial'],
            'answers': [
                """**Video Tutorials Management:**

**Adding Video Tutorial:**
1. Go to **Video Tutorials → Add Tutorial**
2. Enter tutorial details:
   - Title and description
   - Select subject and standard
   - Upload video file or add video URL
   - Set visibility and permissions
3. Organize in folders/categories
4. Assign to specific standards/sections
5. Save the tutorial

**Student Access:**
- Students access tutorials from their portal
- Can watch videos and take notes
- Track viewing progress

**Tutorial Permissions:**
- Set standard-wise permissions
- Section-wise access control
- Public or private tutorials
- Group-based access"""
            ]
        },
        
        'visitors': {
            'keywords': ['visitor', 'school visitor', 'visitor management', 'add visitor', 'visitor entry'],
            'permission_keywords': ['view_visitor', 'add_visitor'],
            'answers': [
                """**School Visitor Management:**

**Registering a Visitor:**
1. Go to **School Visitors → Add Visitor**
2. Enter visitor details:
   - Visitor name
   - Contact information
   - Purpose of visit
   - Person to meet
   - Entry time
3. Generate visitor pass/ID
4. Save visitor record

**Visitor Check-out:**
1. Navigate to **School Visitors → Visitor List**
2. Find the visitor
3. Record exit time
4. Update visitor status

**Visitor Reports:**
- Daily visitor list
- Visitor history
- Visitor statistics
- Reports by date range"""
            ]
        },
        
        'miscellaneous': {
            'keywords': ['miscellaneous', 'miscellaneous collection', 'miscellaneous type', 'miscellaneous plan'],
            'permission_keywords': ['view_miscellaneous', 'add_miscellaneous'],
            'answers': [
                """**Miscellaneous Management:**

**Creating Miscellaneous Type:**
1. Go to **Miscellaneous → Miscellaneous Type**
2. Click **"Add Type"**
3. Enter type name and description
4. Save the type

**Creating Miscellaneous Plan:**
1. Navigate to **Miscellaneous → Miscellaneous Plan**
2. Select miscellaneous type
3. Choose academic year and standard
4. Set amount
5. Save the plan

**Miscellaneous Collection:**
1. Go to **Miscellaneous → Collection**
2. Search for student
3. Select miscellaneous type
4. Enter collection amount
5. Generate receipt
6. Save collection"""
            ]
        },
        
        'invoice': {
            'keywords': ['invoice', 'invoice mapping', 'generate invoice', 'invoice template'],
            'permission_keywords': ['view_invoice', 'add_invoice'],
            'answers': [
                """**Invoice Management:**

**Invoice Mapping:**
1. Go to **Invoices → Invoice Mapping**
2. Configure invoice templates
3. Map invoice fields to data sources
4. Set invoice format and layout
5. Save mapping

**Generating Invoices:**
1. Navigate to **Invoices → Generate Invoice**
2. Select invoice type
3. Choose students/items
4. Generate invoices
5. Preview and print invoices

**Invoice Templates:**
- Customize invoice layout
- Add school logo and details
- Configure invoice fields
- Set numbering format"""
            ]
        },
        
        'leaderboard': {
            'keywords': ['leaderboard', 'ranking', 'top students', 'student ranking', 'performance ranking'],
            'permission_keywords': ['view_leaderboard'],
            'answers': [
                """**Leaderboard Management:**

**Viewing Leaderboard:**
1. Go to **Leaderboard**
2. Select:
   - Academic Year
   - Standard/Section
   - Ranking criteria (Marks, Attendance, etc.)
3. View ranked students
4. See top performers

**Leaderboard Types:**
- Academic Performance Leaderboard
- Attendance Leaderboard
- Subject-wise Rankings
- Overall Performance Rankings

**Features:**
- Real-time rankings
- Historical leaderboard data
- Export rankings to Excel
- Print leaderboard reports"""
            ]
        },
        
        'admin': {
            'keywords': ['admin', 'form definition', 'custom form', 'sync', 'form builder'],
            'permission_keywords': ['view_formdefinition', 'add_formdefinition', 'view_customform'],
            'answers': [
                """**Admin Module - Form Definition & Custom Forms:**

**Form Definition:**
1. Go to **Admin → Form Definition**
2. Create or edit form definitions
3. Define form fields and structure
4. Set validation rules
5. Configure form permissions
6. Save form definition

**Custom Forms:**
1. Navigate to **Admin → Custom Forms**
2. Click **"Create Form"**
3. Use form builder to add fields:
   - Text fields
   - Dropdowns
   - Checkboxes
   - File uploads
4. Configure form settings
5. Assign to specific modules
6. Save and publish form

**Data Sync:**
1. Go to **Admin → Sync Page**
2. Select data to sync
3. Configure sync settings
4. Initiate synchronization
5. Monitor sync status"""
            ]
        },
        
        'permissions': {
            'keywords': ['permission', 'permissions', 'user group', 'assign permission', 'role', 'access control'],
            'permission_keywords': ['view_groups', 'add_groups', 'view_permissions'],
            'answers': [
                """**Groups & Permissions Management:**

**Creating User Groups:**
1. Go to **Groups & Permissions → Groups**
2. Click **"Add Group"**
3. Enter group name and description
4. Save the group

**Assigning Permissions:**
1. Navigate to **Groups & Permissions → Assign Permissions**
2. Select user group
3. Choose module/screen
4. Set permissions:
   - View
   - Add/Create
   - Edit/Update
   - Delete
5. Save permissions

**User Group Management:**
- Assign users to groups
- Copy permissions from one group to another
- View group permissions
- Manage group members

**Permission Types:**
- Screen-level permissions
- Action-level permissions
- Data-level permissions"""
            ]
        },
        
        'settings': {
            'keywords': ['settings', 'configuration', 'system settings', 'app settings', 'preferences'],
            'permission_keywords': ['view_setting', 'change_setting'],
            'answers': [
                """**System Settings:**

**Accessing Settings:**
1. Go to **Settings**
2. Navigate through different setting categories

**Available Settings:**
- **General Settings**: School information, academic year
- **Notification Settings**: Email, SMS, Push notifications
- **Theme Settings**: Color scheme, appearance
- **Integration Settings**: Third-party integrations
- **Security Settings**: Password policies, session timeout
- **Display Settings**: Language, date format, timezone

**Configuring Settings:**
1. Select the setting category
2. Modify values as needed
3. Click **"Save"** to apply changes
4. Some settings may require system restart

**Important Notes:**
- Some settings affect the entire system
- Changes may impact all users
- Review changes before saving"""
            ]
        },
        
        'general_help': {
            'keywords': [
                'help', 'how to', 'what is', 'where is', 'how can', 'guide', 'tutorial', 'features',
                'use ', ' using', 'navigate', 'dashboard', 'menu', 'sidebar', 'software', 'portal',
                'doubt', 'doubts', 'assist', 'support', 'hello',
            ],
            'permission_keywords': [],
            'answers': [
                """**I'm your School Management System Assistant!**

I can help you with:

**Student Management:**
- Adding students and admissions
- Enrollment and promotion
- Student information management

**Academic Management:**
- Exam schedules and marks entry
- Timetable creation
- Subject and standard management

**Attendance:**
- Marking daily attendance
- Batch attendance
- Attendance reports

**Finance:**
- Fee collection and receipts
- Fee plans and concessions
- Financial reports

**Staff Management:**
- Adding staff/teachers
- Leave management
- Payroll and salary

**And much more!**

Just ask me a specific question like:
- "How do I add a new student?"
- "How do I create an exam schedule?"
- "How do I mark attendance?"
- "How do I generate a fee receipt?"

I'll provide step-by-step guidance! 🎓""",
                
                """**Quick Help Guide:**

Ask me about any of these modules:

📚 **Student Management** - Admissions, enrollment, student records
📝 **Exam Management** - Schedules, marks, results, hall tickets
✅ **Attendance** - Daily marking, batch attendance, reports
💰 **Finance** - Fee collection, receipts, fee plans
📅 **Timetable** - Period plans, class schedules
👨‍🏫 **Staff/HR** - Staff management, leave, payroll
📊 **Reports** - Various reports and analytics
📖 **Library** - Book management, issue/return
🚌 **Transport** - Vehicle and route management
🏠 **Hostel** - Room allocation and management
📝 **Diary/Homework** - Assignments and evaluation
🧪 **Quiz** - Online tests and assessments
📜 **Certificates** - TC, Character, Study certificates
🧮 **Abacus** - Abacus homework and evaluation
📤 **BDU** - Bulk data upload via Excel
👆 **Biometric** - Biometric machine and attendance
📊 **Dashboard** - System overview and statistics
🔧 **Exam Engineer** - Engineer exam management
💬 **Feedback Forms** - Create and manage feedback forms
📋 **Survey Forms** - Online surveys and assessments
🎥 **Video Tutorials** - Educational video content
👥 **School Visitors** - Visitor management
📦 **Miscellaneous** - Miscellaneous collections
🧾 **Invoices** - Invoice generation and mapping
🏆 **Leaderboard** - Student rankings and performance
⚙️ **Admin** - Form definitions and custom forms
🔐 **Permissions** - User groups and access control
⚙️ **Settings** - System configuration

Just type your question and I'll help you! 😊"""
            ]
        }
    }
    
    @classmethod
    def check_permission_for_basename(cls, user, basename: str, method: str = 'GET') -> bool:
        """
        Check if user has permission for a basename using CustomBasePermissions logic
        
        Args:
            user: Django User object
            basename: Basename to check (e.g., 'student', 'exam', 'attendance')
            method: HTTP method ('GET', 'POST', 'PUT', 'DELETE')
            
        Returns:
            True if user has permission, False otherwise
        """
        if not user or not user.is_authenticated:
            return False
        
        # Superuser or admin groups (1, 2) have all permissions
        if user.is_superuser or any(
            item in user.groups.all().values_list('id', flat=True) for item in [1, 2]
        ):
            return True
        
        # Use CustomBasePermissions logic
        perms_map = {
            'GET': 'view_%(basename)s',
            'POST': 'add_%(basename)s',
            'PUT': 'change_%(basename)s',
            'PATCH': 'change_%(basename)s',
            'DELETE': 'delete_%(basename)s',
        }
        
        if method not in perms_map:
            return False
        
        api_codename = perms_map[method] % {'basename': basename}
        
        # Check user permissions against permission_map
        for permission in user.get_all_permissions():
            permission_codename = permission.split('.')[1]
            if permission_codename not in permission_map:
                continue
            if api_codename in permission_map[permission_codename]:
                return True
        
        return False
    
    @classmethod
    def get_user_modules(cls, user) -> Set[str]:
        """
        Get modules user has access to based on CustomBasePermissions
        
        Args:
            user: Django User object
            
        Returns:
            Set of module categories user can access
        """
        if not user or not user.is_authenticated:
            return {'general_help'}
        
        modules = set()
        
        # Check each module's basenames
        for module, basenames in cls.MODULE_BASENAME_MAP.items():
            # Check if user has view permission for any basename in this module
            for basename in basenames:
                if cls.check_permission_for_basename(user, basename, 'GET'):
                    modules.add(module)
                    break  # Found one permission, module is accessible
        
        # Always allow general help
        modules.add('general_help')
        
        return modules
    
    @classmethod
    def check_module_permission(cls, user, module: str) -> bool:
        """
        Check if user has permission to access a specific module
        
        Args:
            user: Django User object
            module: Module name (e.g., 'student', 'exam', 'attendance')
            
        Returns:
            True if user has permission, False otherwise
        """
        if not user or not user.is_authenticated:
            return False
        
        # Superuser or admin groups have all permissions
        if user.is_superuser or any(
            item in user.groups.all().values_list('id', flat=True) for item in [1, 2]
        ):
            return True
        
        # General help is always available
        if module == 'general_help':
            return True
        
        # Check if module exists in mapping
        if module not in cls.MODULE_BASENAME_MAP:
            return False
        
        # Check if user has view permission for any basename in this module
        for basename in cls.MODULE_BASENAME_MAP[module]:
            if cls.check_permission_for_basename(user, basename, 'GET'):
                return True
        
        return False

    @classmethod
    def _is_usage_navigation_question(cls, q: str) -> bool:
        """True when the user is asking how to use / navigate the product (not a single feature keyword)."""
        q = q.strip().lower()
        if any(phrase in q for phrase in cls.USAGE_NAVIGATION_PHRASES):
            return True
        # “how …” + product words
        if re.search(r'\bhow\b', q) and re.search(
            r'\b(app|application|system|software|portal|website|program)\b', q
        ):
            if re.search(r'\b(use|using|access|open|login|navigate|find|start|works)\b', q):
                return True
        if re.search(r"\b(confused|lost|dont know|don't know)\b", q) and re.search(
            r'\b(app|application|system|menu)\b', q
        ):
            return True
        return False

    @classmethod
    def _normalize_response_style(cls, raw: Optional[str]) -> str:
        """UI sends response_style: 'direct' (default) or 'steps' for numbered help."""
        if not raw:
            return 'direct'
        s = str(raw).strip().lower()
        if s in ('steps', 'step', 'detailed', 'verbose', 'full', 'with_steps'):
            return 'steps'
        return 'direct'

    @classmethod
    def _attendance_direct_for_query(cls, query_lower: str) -> Optional[str]:
        if not re.search(r'\b(absentees?|absents?|absence)\b', query_lower):
            return None
        if re.search(r'\b(today|this\s+day|right\s+now)\b', query_lower):
            return (
                "**Today's absentees:** **Student Attendance → Reports → Daily Attendance Report** → set **date to today** "
                "→ filter or list **Absent** → **Generate** (export if available).\n\n"
                "_Class-by-class:_ **Mark Attendance** → same date, standard, section — **A** = absent."
            )
        return (
            "**Absentees:** **Student Attendance → Reports** → **Daily** (or **Monthly**) **Attendance Report** "
            "→ set **date range** and class filters → **Generate**.\n\n"
            "**Update marks:** **Student Attendance → Mark Attendance**."
        )

    @classmethod
    def _kb_direct_fallback(cls, long_text: str) -> str:
        """Shorten long numbered KB answers when no direct_answers exist."""
        m = re.search(r'\n\s*1\.\s', long_text)
        if m:
            snippet = long_text[: m.start()].strip()
            if len(snippet) > 40:
                return (
                    f"{snippet}\n\n"
                    "_Switch to **With steps** below the chat for the full numbered procedure._"
                )
        parts = long_text.strip().split('\n\n')
        snippet = parts[0] if parts else long_text.strip()
        if len(snippet) > 520:
            snippet = snippet[:520].rstrip() + '…'
        return f"{snippet}\n\n_Switch to **With steps** for the complete guide._"

    @classmethod
    def _pick_knowledge_base_answer(
        cls,
        best_match: Dict,
        matched_module: Optional[str],
        query_lower: str,
        response_style: str,
    ) -> str:
        if response_style == 'steps':
            return random.choice(best_match['answers'])
        if matched_module == 'attendance':
            spec = cls._attendance_direct_for_query(query_lower)
            if spec:
                return spec
        direct_list = best_match.get('direct_answers')
        if direct_list:
            return random.choice(direct_list)
        return cls._kb_direct_fallback(random.choice(best_match['answers']))
    
    @classmethod
    def get_response_payload(
        cls,
        query: str,
        user=None,
        academic_year=None,
        exam_id=None,
        response_style: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Same as get_response but returns a dict suitable for the API, including optional UI hints
        (e.g. exam picker for rank questions). Always includes keys: response, message, query, structured.
        """
        structured = None
        style = cls._normalize_response_style(response_style)
        if not query or not query.strip():
            text = "I'm here to help! Please ask me a question about the School Management System."
            return {
                'response': text,
                'message': text,
                'query': query or '',
                'structured': None,
                'response_style': style,
            }

        query_lower = query.lower().strip()

        if cls._is_usage_navigation_question(query_lower):
            if style == 'steps':
                text = random.choice(cls.USAGE_HELP_ANSWERS)
            else:
                text = random.choice(cls.USAGE_HELP_ANSWERS_DIRECT)
            return {'response': text, 'message': text, 'query': query.strip(), 'structured': None, 'response_style': style}

        from apps.chats.services.chatbot_exam_insights import try_answer_exam_rank_query

        exam_tuple = try_answer_exam_rank_query(
            query, user, academic_year=academic_year, exam_id=exam_id
        )
        if exam_tuple:
            text, structured = exam_tuple[0], exam_tuple[1]
            return {
                'response': text,
                'message': text,
                'query': query.strip(),
                'structured': structured,
                'response_style': style,
            }

        from apps.chats.services.chatbot_student_facts import try_answer_student_fact_query

        fact_reply = try_answer_student_fact_query(
            query, user, academic_year=academic_year, exam_id=exam_id
        )
        if fact_reply:
            return {
                'response': fact_reply,
                'message': fact_reply,
                'query': query.strip(),
                'structured': None,
                'response_style': style,
            }

        user_modules = cls.get_user_modules(user) if user else set(cls.KNOWLEDGE_BASE.keys())
        best_match, matched_module = cls._find_best_match(query_lower, user_modules)

        if best_match:
            if matched_module and user:
                if not cls.check_module_permission(user, matched_module):
                    text = cls._get_permission_denied_message(matched_module)
                    return {
                        'response': text,
                        'message': text,
                        'query': query.strip(),
                        'structured': None,
                        'response_style': style,
                    }

            text = cls._pick_knowledge_base_answer(best_match, matched_module, query_lower, style)
            return {
                'response': text,
                'message': text,
                'query': query.strip(),
                'structured': None,
                'response_style': style,
            }

        text = cls._get_generic_response(query, user_modules)
        return {
            'response': text,
            'message': text,
            'query': query.strip(),
            'structured': None,
            'response_style': style,
        }

    @classmethod
    def get_response(cls, query: str, user=None, academic_year=None, exam_id=None, response_style=None) -> str:
        """
        Get intelligent response based on user query and permissions using CustomBasePermissions

        Args:
            query: User's question/query
            user: Django User object (optional, for permission checking)
            academic_year: Optional academic year id (from the app header) to filter marks/attendance facts
            exam_id: Optional exam id (from UI) to disambiguate marks/rank answers

        Returns:
            Response string with helpful answer or permission denied message
        """
        return cls.get_response_payload(
            query, user, academic_year, exam_id, response_style=response_style
        )['response']
    
    @classmethod
    def _find_best_match(cls, query: str, user_modules: Set[str]) -> Tuple[Optional[Dict], Optional[str]]:
        """
        Find the best matching knowledge base entry for the query
        
        Args:
            query: Lowercase query string
            user_modules: Set of modules user has access to
            
        Returns:
            Tuple of (best matching knowledge base entry or None, matched module name or None)
        """
        best_match = None
        matched_module = None
        max_score = 0
        
        for category, data in cls.KNOWLEDGE_BASE.items():
            # Skip if user doesn't have access to this module
            if category not in user_modules:
                continue
            
            score = 0
            for keyword in data['keywords']:
                if keyword in query:
                    # Best single keyword wins (avoids one module beating another by summing many weak hits)
                    score = max(score, len(keyword))
            
            if score > max_score:
                max_score = score
                best_match = data
                matched_module = category
        
        # Short words like "fee" (3) should still match; long phrases dominate when present
        if max_score >= 3:
            return (best_match, matched_module)
        
        return (None, None)
    
    @classmethod
    def _get_permission_denied_message(cls, module: str) -> str:
        """
        Get permission denied message based on CustomBasePermissions
        
        Args:
            module: Module name that user doesn't have access to
            
        Returns:
            Permission denied message
        """
        module_names = {
            'student': 'Student Management',
            'exam': 'Exam Management',
            'attendance': 'Attendance',
            'fee': 'Finance & Fees',
            'timetable': 'Timetable Management',
            'staff': 'Staff Management',
            'leave': 'Leave Management',
            'payroll': 'Payroll',
            'basic': 'Basic Details',
            'library': 'Library',
            'transport': 'Transport',
            'hostel': 'Hostel',
            'diary': 'Diary/Homework',
            'report': 'Reports',
            'quiz': 'Quiz',
            'certificate': 'Certificates',
            'store': 'Store Management',
            'expense': 'Expenses',
            'general': 'General/Events',
            'abacus': 'Abacus',
            'bdu': 'BDU (Bulk Data Upload)',
            'biometric': 'Biometric',
            'dashboard': 'Dashboard',
            'exam_engineer': 'Exam Engineer',
            'feedback': 'Feedback Forms',
            'survey': 'Survey Forms',
            'video_tutorials': 'Video Tutorials',
            'visitors': 'School Visitors',
            'miscellaneous': 'Miscellaneous',
            'invoice': 'Invoices',
            'leaderboard': 'Leaderboard',
            'admin': 'Admin',
            'permissions': 'Groups & Permissions',
            'settings': 'Settings',
        }
        
        module_name = module_names.get(module, module)
        
        return f"""**Permission Denied**

You don't have permission to access **{module_name}** module based on your user permissions.

Please contact your administrator to grant you the necessary permissions to access this module.

**Note:** This permission check is based on CustomBasePermissions system. You need the appropriate view permissions for the related basenames to access this module's features."""
    
    @classmethod
    def _get_generic_response(cls, query: str, user_modules: Set[str]) -> str:
        """
        Get a generic helpful response when no specific match is found
        
        Args:
            query: User's query
            user_modules: Set of modules user has access to
            
        Returns:
            Generic helpful response
        """
        # Build list of accessible modules for the user
        module_names = {
            'student': 'Student Management',
            'exam': 'Exam Management',
            'attendance': 'Attendance',
            'fee': 'Finance & Fees',
            'timetable': 'Timetable',
            'staff': 'Staff Management',
            'leave': 'Leave Management',
            'payroll': 'Payroll',
            'basic': 'Basic Details',
            'library': 'Library',
            'transport': 'Transport',
            'hostel': 'Hostel',
            'diary': 'Diary/Homework',
            'report': 'Reports',
            'quiz': 'Quiz',
            'certificate': 'Certificates',
            'store': 'Store Management',
            'expense': 'Expenses',
            'general': 'General/Events',
        }
        
        accessible_modules = [module_names.get(m, m) for m in user_modules if m in module_names]
        
        if accessible_modules:
            modules_text = '\n• '.join(accessible_modules)
            return (
                f"I understand you're asking about “{query}”. I don't have an exact step for that wording yet.\n\n"
                f"**Try one of these:**\n"
                f"• Ask **how to use this application** for navigation and menus.\n"
                f"• Ask a concrete task, e.g. **How do I collect fees?** or **How do I create an exam schedule?**\n"
                f"• Pick a topic you have access to:\n\n• {modules_text}\n\n"
                f"Or use a **suggested question** below the chat."
            )
        return (
            f"I'm here to help you use the School Management System.\n\n"
            f"For “{query}”, try: **How do I use this application?** or name a task (fees, exams, attendance). "
            f"If you see few menus, your administrator may need to grant permissions."
        )
