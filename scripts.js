
    const STORAGE_KEY = "hamroschool_demo_data";

    const initialData = {

      students: [],

      attendance: [],

      results: [],

      feedback: [],

      accounts: [

        {
          id: "T1001",
          password: "demo",
          role: "admin",
          name: "Teacher krishna"
        },

        {
          id: "T1002",
          password: "demo",
          role: "admin",
          name: "Teacher Radha"
        }

      ]

    };


    function clone(value) {

      return JSON.parse(
        JSON.stringify(value)
      );

    }


    function loadData() {

      try {

        const saved =
          JSON.parse(
            localStorage.getItem(STORAGE_KEY)
          );

        if (
          saved &&
          Array.isArray(saved.students) &&
          Array.isArray(saved.attendance) &&
          Array.isArray(saved.results) &&
          Array.isArray(saved.feedback) &&
          Array.isArray(saved.accounts)
        ) {

          /*
            Make sure teacher accounts still exist.
          */

          // T1001 and T1002 are the preset school administrators.
          // Migrate older versions where they were stored as teachers.
          ["T1001", "T1002"].forEach((id) => {
            const existing = saved.accounts.find(a => a.id === id);
            if (existing) {
              existing.role = "admin";
              existing.password = "demo";
              existing.name = existing.name || (id === "T1001" ? "Teacher krishna" : "Teacher Radha");
              delete existing.classTeacherClass;
            }
          });

          if (!saved.accounts.some(a => a.id === "T1001")) {
            saved.accounts.push({
              id: "T1001", password: "demo", role: "admin", name: "Teacher krishna"
            });
          }

          if (!saved.accounts.some(a => a.id === "T1002")) {
            saved.accounts.push({
              id: "T1002", password: "demo", role: "admin", name: "Teacher Radha"
            });
          }

          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(saved)
          );

          return saved;
        }

        const fresh = clone(initialData);

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(fresh)
        );

        return fresh;

      } catch (error) {

        console.error(
          "Could not load database:",
          error
        );

        return clone(initialData);

      }

    }


    let db = loadData();

    let currentUser = null;

    let loginRole = "teacher";

    let currentPage = "dashboard";


    function saveData() {

      try {

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(db)
        );

        return true;

      } catch (error) {

        alert(
          "Could not save data. Browser storage may be unavailable."
        );

        console.error(error);

        return false;

      }

    }


    const $ = id =>
      document.getElementById(id);


    function esc(value) {

      return String(value ?? "")
        .replace(/[&<>"']/g, c => ({

          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"

        })[c]);

    }


    function today() {

      const d = new Date();

      return new Date(
        d.getTime() -
        d.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 10);

    }


    /*
      Generate parent / other IDs.
    */

    function makeId(prefix) {

      let id;

      do {

        id =
          prefix +
          Date.now().toString().slice(-8) +
          Math.floor(
            Math.random() * 90 + 10
          );

      } while (
        db.accounts.some(
          a => a.id === id
        ) ||
        db.students.some(
          s => s.id === id
        )
      );

      return id;

    }


    function studentById(id) {

      return db.students.find(
        s => s.id === id
      );

    }


    function teacherClassName() {
      if (!currentUser || currentUser.role !== "teacher") return "";
      return String(currentUser.classTeacherClass || "");
    }

    function teacherStudents() {
      if (!currentUser || currentUser.role === "admin") return db.students;
      if (currentUser.role !== "teacher") return [];
      const className = teacherClassName();
      return db.students.filter(s => String(s.className) === className);
    }

    function isTeacherStudent(studentId) {
      if (!currentUser || currentUser.role === "admin") return true;
      if (currentUser.role !== "teacher") return false;
      const student = studentById(studentId);
      return !!student && String(student.className) === teacherClassName();
    }

    function teacherAttendance() {
      return db.attendance.filter(a => isTeacherStudent(a.studentId));
    }

    function teacherResults() {
      return db.results.filter(r => isTeacherStudent(r.studentId));
    }

    function teacherFeedback() {
      return db.feedback.filter(f => isTeacherStudent(f.studentId));
    }

    function classTeacherForStudent(studentId) {
      const student = studentById(studentId);
      if (!student) return null;
      return db.accounts.find(a => a.role === "teacher" && String(a.classTeacherClass) === String(student.className)) || null;
    }


    function accountById(id) {

      return db.accounts.find(
        a =>
          a.id.toLowerCase() ===
          String(id)
            .trim()
            .toLowerCase()
      );

    }


    function emptyState(message) {

      return `
        <div class="empty">
          📭<br>
          ${esc(message)}
        </div>
      `;

    }


    function heading(
      title,
      description,
      action = ""
    ) {

      return `
        <div class="page-heading">

          <div>

            <h1>
              ${esc(title)}
            </h1>

            <div class="muted">
              ${esc(description)}
            </div>

          </div>

          ${action}

        </div>
      `;

    }


    function notice(
      id,
      message,
      type = "error"
    ) {

      const el = $(id);

      if (el) {

        el.innerHTML = `
          <div class="message message-${type}">
            ${esc(message)}
          </div>
        `;

      }

    }


    /*
      ============================================================
      STUDENT ID
      ============================================================

      Class 8 + Roll 1 = 8-01
      Class 8 + Roll 12 = 8-12
      Class 10 + Roll 3 = 10-03
    */

    function generateStudentId(
      className,
      rollNumber
    ) {

      return `${className}-${String(
        rollNumber
      ).padStart(2, "0")}`;

    }


    /*
      Check whether class + roll already exists.
    */

    function studentIdExists(
      className,
      rollNumber,
      ignoreStudentId = null
    ) {

      const newId =
        generateStudentId(
          className,
          rollNumber
        );

      return db.students.some(
        s =>
          s.id === newId &&
          s.id !== ignoreStudentId
      );

    }


    function studentOptions(
      selected = "",
      studentList = db.students
    ) {

      if (!studentList.length) {

        return `
          <option value="">
            No students admitted yet
          </option>
        `;

      }

      return `
        <option value="">
          Select student
        </option>
      ` +

        studentList
          .slice()
          .sort((a, b) =>
            a.id.localeCompare(b.id, undefined, {
              numeric: true
            })
          )
          .map(s => `

            <option
              value="${esc(s.id)}"
              ${s.id === selected ? "selected" : ""}>

              ${esc(s.name)}
              (${esc(s.id)})

            </option>

          `)
          .join("");

    }


    function badge(status) {

      const cls =
        ["Present", "Passed"].includes(status)
          ? "badge-success"
          : ["Absent", "Failed"].includes(status)
            ? "badge-danger"
            : "badge-neutral";

      return `
        <span class="badge ${cls}">
          ${esc(status)}
        </span>
      `;

    }


    function percentage(
      marks,
      total
    ) {

      return Number(total) > 0
        ? Math.round(
          Number(marks) /
          Number(total) *
          100
        )
        : 0;

    }


    function gradeFor(p) {

      if (p >= 90) return "A+";
      if (p >= 80) return "A";
      if (p >= 70) return "B+";
      if (p >= 60) return "B";
      if (p >= 50) return "C";
      if (p >= 40) return "D";

      return "F";

    }


    /*
      ============================================================
      LOGIN
      ============================================================
    */

    document
      .querySelectorAll(".role-tab")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            loginRole =
              button.dataset.role;

            document
              .querySelectorAll(".role-tab")
              .forEach(b =>
                b.classList.toggle(
                  "active",
                  b === button
                )
              );

            $("loginIdLabel")
              .textContent =
              loginRole === "teacher"
                ? "Teacher / Admin ID"
                : loginRole === "student"
                  ? "Student ID"
                  : "Parent ID";

            $("loginId").placeholder =
              loginRole === "teacher"
                ? "Enter teacher or admin ID"
                : loginRole === "student"
                  ? "Enter student ID e.g. 8-01"
                  : "Enter parent ID";

            $("loginMessage").innerHTML = "";

          }
        );

      });


    $("loginForm")
      .addEventListener(
        "submit",
        e => {

          e.preventDefault();

          const account =
            accountById(
              $("loginId").value
            );

          if (
            !account ||
            account.password !==
            $("loginPassword").value ||
            (account.role !== loginRole &&
              !(loginRole === "teacher" && account.role === "admin"))
          ) {

            notice(
              "loginMessage",
              "Invalid ID or password for the selected account."
            );

            return;

          }

          currentUser = account;

          currentPage = "dashboard";

          $("loginScreen")
            .classList
            .add("hidden");

          $("appScreen")
            .classList
            .remove("hidden");

          renderApp();

        }
      );


    $("logoutBtn")
      .addEventListener(
        "click",
        () => {

          currentUser = null;

          $("appScreen")
            .classList
            .add("hidden");

          $("loginScreen")
            .classList
            .remove("hidden");

          $("loginForm").reset();

          $("loginMessage").innerHTML = "";

          loginRole = "teacher";

          document
            .querySelectorAll(".role-tab")
            .forEach(b =>
              b.classList.toggle(
                "active",
                b.dataset.role === "teacher"
              )
            );

          $("loginIdLabel")
            .textContent = "Teacher ID";

          $("loginId").placeholder =
            "Enter teacher ID";

        }
      );


    /*
      ============================================================
      NAVIGATION
      ============================================================
    */

    function navItems() {

      if (currentUser.role === "admin") {
        return [
          ["dashboard", "📊 Admin Dashboard"],
          ["students", "🎓 All Students"],
          ["admission", "➕ New Admission"],
          ["attendance", "📅 All Attendance"],
          ["results", "📝 All Results"],
          ["feedback", "💬 All Parent Feedback"],
          ["classTeachers", "👨‍🏫 Class Teachers"]
        ];
      }

      if (currentUser.role === "admin") {

        const todayPresent = db.attendance.filter(a => a.date === today() && a.status === "Present").length;
        return `
          ${heading("Admin Dashboard", "Manage all school students, class teachers and records.")}
          <div class="stats">
            <div class="stat-card"><div class="stat-label">🎓 Total Students</div><div class="stat-value">${db.students.length}</div></div>
            <div class="stat-card"><div class="stat-label">👨‍🏫 Class Teachers</div><div class="stat-value">${db.accounts.filter(a => a.role === "teacher").length}</div></div>
            <div class="stat-card"><div class="stat-label">📅 Present Today</div><div class="stat-value">${todayPresent}</div></div>
            <div class="stat-card"><div class="stat-label">💬 Parent Feedback</div><div class="stat-value">${db.feedback.length}</div></div>
          </div>
          <div class="card"><h3>Administrator access</h3><p class="muted">You can view and change all student, attendance, result and parent-feedback records. Use Class Teachers to create accounts and assign classes.</p></div>
        `;
      }

      if (currentUser.role === "teacher") {
        return [
          ["dashboard", "📊 Class Teacher Dashboard"],
          ["students", "🎓 My Class Students"],
          ["attendance", "📅 Class Attendance"],
          ["results", "📝 Class Results"],
          ["feedback", "💬 Parent Feedback"]
        ];
      }

      if (currentUser.role === "student") {
        return [
          ["dashboard", "📊 Dashboard"],
          ["myAttendance", "📅 My Attendance"],
          ["myResults", "📝 My Results"]
        ];
      }

      return [
        ["dashboard", "📊 Dashboard"],
        ["myAttendance", "📅 Student Attendance"],
        ["myResults", "📝 Student Results"],
        ["myFeedback", "💬 Feedback"]
      ];
    }

    function renderApp() {

      $("userInfo").innerHTML = `

        <strong>
          ${esc(currentUser.name)}
        </strong>

        <div class="muted small">
          ${esc(currentUser.role.toUpperCase())}
        </div>
        ${currentUser.role === "teacher" ? `<div class="muted small">Class Teacher: Class ${esc(teacherClassName())}</div>` : ""}

      `;


      $("sidebar").innerHTML =

        `<div class="sidebar-title">
          MAIN MENU
        </div>` +

        navItems()
          .map(
            ([key, label]) => `

              <button
                class="nav-btn ${key === currentPage
                ? "active"
                : ""
              }"
                data-page="${key}"
                type="button">

                ${label}

              </button>

            `
          )
          .join("");


      $("sidebar")
        .querySelectorAll("[data-page]")
        .forEach(b =>

          b.addEventListener(
            "click",
            () => {

              currentPage =
                b.dataset.page;

              renderApp();

            }
          )

        );


      renderPage();

    }


    function renderPage() {

      const pages = {

        dashboard: dashboardPage,

        classTeachers: classTeachersPage,

        students: studentsPage,

        admission: admissionPage,

        attendance: attendancePage,

        results: resultsPage,

        feedback: feedbackPage,

        myAttendance: myAttendancePage,

        myResults: myResultsPage,

        myFeedback: myFeedbackPage

      };


      $("mainContent").innerHTML =
        (
          pages[currentPage] ||
          dashboardPage
        )();


      attachEvents();

    }


    /*
      ============================================================
      DASHBOARD
      ============================================================
    */

    function dashboardPage() {

      if (currentUser.role === "teacher") {

        const classStudents = teacherStudents();
        const classAttendance = teacherAttendance();
        const classResults = teacherResults();
        const classFeedback = teacherFeedback();
        const present = classAttendance.filter(
          a => a.date === today() && a.status === "Present"
        ).length;


        return `

          ${heading(
          "Class Teacher Dashboard",
          `You are the class teacher of Class ${esc(teacherClassName())}. You can view and manage only your assigned class.`
        )}

          <div class="stats">

            <div class="stat-card">

              <div class="stat-label">
                🎓 Total Students
              </div>

              <div class="stat-value">
                ${classStudents.length}
              </div>

            </div>


            <div class="stat-card">

              <div class="stat-label">
                📅 Present Today
              </div>

              <div class="stat-value">
                ${present}
              </div>

            </div>


            <div class="stat-card">

              <div class="stat-label">
                📝 Result Records
              </div>

              <div class="stat-value">
                ${classResults.length}
              </div>

            </div>


            <div class="stat-card">

              <div class="stat-label">
                💬 Feedback
              </div>

              <div class="stat-value">
                ${classFeedback.length}
              </div>

            </div>

          </div>


          <div class="card">

            <h3>
              Quick Actions
            </h3>

            <button
              class="btn-primary"
              data-go="students">
              View My Class Students
            </button>

            <button
              class="btn-secondary"
              data-go="attendance">
              Mark Attendance
            </button>

            <button
              class="btn-secondary"
              data-go="feedback">
              Check Parent Feedback
            </button>

          </div>


          <div class="card">

            <h3>
              Getting Started
            </h3>

            <p class="muted">

              Admit students first.

              Student IDs are automatically generated
              from their class and roll number.

              Example:
              Class 8 + Roll 1 = 8-01.

            </p>

          </div>

        `;

      }


      const sid =
        currentUser.studentId;

      const student =
        studentById(sid);

      const att =
        db.attendance.filter(
          a =>
            a.studentId === sid
        );

      const res =
        db.results.filter(
          r =>
            r.studentId === sid
        );


      if (currentUser.role === "student") {

        const present =
          att.filter(
            a =>
              a.status === "Present"
          ).length;

        const rate =
          att.length
            ? Math.round(
              present /
              att.length *
              100
            )
            : 0;


        return `

          ${heading(
          "Student Dashboard",
          "Welcome, " +
          currentUser.name +
          "."
        )}

          <div class="stats">

            <div class="stat-card">

              <div class="stat-label">
                Attendance Rate
              </div>

              <div class="stat-value">
                ${rate}%
              </div>

            </div>


            <div class="stat-card">

              <div class="stat-label">
                Examinations
              </div>

              <div class="stat-value">
                ${res.length}
              </div>

            </div>


            <div class="stat-card">

              <div class="stat-label">
                Class
              </div>

              <div class="stat-value">
                ${esc(
          student?.className ||
          "—"
        )}
              </div>

            </div>


            <div class="stat-card">

              <div class="stat-label">
                Student ID
              </div>

              <div
                class="stat-value"
                style="font-size:17px">

                ${esc(sid)}

              </div>

            </div>

          </div>


          <div class="card">

            <h3>
              Latest Results
            </h3>

            ${userResultsTable(res)}

          </div>

        `;

      }


      return `

        ${heading(
        "Parent Dashboard",
        "Welcome, " +
        currentUser.name +
        "."
      )}

        <div class="grid-two">

          <div class="card">

            <h3>
              Student Information
            </h3>

            ${student
          ? `

                  <p>
                    <strong>Name:</strong>
                    ${esc(student.name)}
                  </p>

                  <p>
                    <strong>Student ID:</strong>
                    ${esc(student.id)}
                  </p>

                  <p>
                    <strong>Class:</strong>
                    ${esc(student.className)}
                  </p>

                  <p>
                    <strong>Roll Number:</strong>
                    ${esc(student.rollNumber)}
                  </p>

                  <p>
                    <strong>Section:</strong>
                    ${esc(student.section)}
                  </p>

                `
          : emptyState(
            "Student information unavailable."
          )
        }

          </div>


          <div class="card">

            <h3>
              Academic Overview
            </h3>

            <p>
              Attendance entries:
              ${att.length}
            </p>

            <p>
              Result entries:
              ${res.length}
            </p>

          </div>

        </div>

      `;

    }


    /*
      ============================================================
      ADMISSION
      ============================================================
    */

    function admissionPage() {

      if (currentUser.role !== "teacher" && currentUser.role !== "admin") {

        return dashboardPage();

      }


      return `

        ${heading(
        "New Admission",
        "Register a student and automatically create their Class-Roll login ID."
      )}


        <div class="card">

          <h3>
            Student Details
          </h3>

          <div id="admissionMessage"></div>


          <form id="admissionForm">

            <div class="form-grid">


              <div class="field">

                <label>
                  Full Name *
                </label>

                <input
                  id="studentName"
                  required
                  maxlength="100">

              </div>


              <div class="field">

                <label>
                  Gender
                </label>

                <select id="studentGender">

                  <option value="">
                    Select gender
                  </option>

                  <option>
                    Male
                  </option>

                  <option>
                    Female
                  </option>

                  <option>
                    Other
                  </option>

                  <option>
                    Prefer not to say
                  </option>

                </select>

              </div>


              <div class="field">

                <label>
                  Date of Birth
                </label>

                <input
                  id="studentDOB"
                  type="date">

              </div>


              <div class="field">

                <label>
                  Class *
                </label>

                <select
                  id="studentClass"
                  required>

                  <option value="">
                    Select class
                  </option>

                  ${(currentUser.role === "admin" ? Array.from({length: 12}, (_, i) => i + 1) : [Number(teacherClassName())]).filter(n => Number.isInteger(n) && n >= 1 && n <= 12).map(n => `<option value="${n}">Class ${n}</option>`).join("")}

                </select>

              </div>


              <div class="field">

                <label>
                  Roll Number *
                </label>

                <input
                  id="studentRoll"
                  type="number"
                  min="1"
                  max="99"
                  required
                  placeholder="Example: 1">

              </div>


              <div class="field">

                <label>
                  Student ID
                </label>

                <div
                  class="id-preview"
                  id="studentIdPreview">

                  Select class and enter roll number.

                </div>

              </div>


              <div class="field">

                <label>
                  Section *
                </label>

                <select
                  id="studentSection"
                  required>

                  <option value="">
                    Select section
                  </option>

                  ${[
          "A",
          "B",
          "C",
          "D"
        ]
          .map(
            x =>
              `<option>
                          ${x}
                        </option>`
          )
          .join("")}

                </select>

              </div>


              <div class="field">

                <label>
                  Student Phone
                </label>

                <input
                  id="studentPhone"
                  type="tel"
                  maxlength="25">

              </div>


              <div class="field">

                <label>
                  Parent / Guardian Name *
                </label>

                <input
                  id="parentName"
                  required
                  maxlength="100">

              </div>


              <div class="field">

                <label>
                  Parent Phone
                </label>

                <input
                  id="parentPhone"
                  type="tel"
                  maxlength="25">

              </div>


              <div class="field">

                <label>
                  Student Password *
                </label>

                <input
                  id="studentPassword"
                  type="password"
                  required
                  minlength="4"
                  maxlength="100">

              </div>


              <div class="field">

                <label>
                  Parent Password *
                </label>

                <input
                  id="parentPassword"
                  type="password"
                  required
                  minlength="4"
                  maxlength="100">

              </div>


              <div class="field span-two">

                <label>
                  Address
                </label>

                <textarea
                  id="studentAddress"
                  maxlength="500">
                </textarea>

              </div>


            </div>


            <button
              class="btn-primary"
              type="submit">

              Save Admission

            </button>


            <button
              class="btn-secondary"
              type="reset">

              Clear Form

            </button>


          </form>

        </div>

      `;

    }


    function updateStudentIdPreview() {

      const className =
        $("studentClass")?.value;

      const roll =
        $("studentRoll")?.value;

      const preview =
        $("studentIdPreview");


      if (!preview) return;


      if (
        !className ||
        !roll ||
        Number(roll) < 1
      ) {

        preview.innerHTML =
          "Select class and enter roll number.";

        return;

      }


      const id =
        generateStudentId(
          className,
          Number(roll)
        );


      preview.innerHTML = `

        Student Login ID:

        <strong>
          ${esc(id)}
        </strong>

      `;

    }


    function createAdmission(e) {

      e.preventDefault();


      const name =
        $("studentName")
          .value
          .trim();


      const parentName =
        $("parentName")
          .value
          .trim();


      const sp =
        $("studentPassword")
          .value;


      const pp =
        $("parentPassword")
          .value;


      const className =
        $("studentClass")
          .value;

      if (currentUser.role === "teacher" && String(className) !== teacherClassName()) {
        notice("admissionMessage", `You can only admit students into Class ${teacherClassName()}.`);
        return;
      }


      const roll =
        Number(
          $("studentRoll")
            .value
        );


      if (
        !name ||
        !parentName ||
        !className ||
        !Number.isInteger(roll) ||
        roll < 1 ||
        roll > 99 ||
        sp.length < 4 ||
        pp.length < 4
      ) {

        notice(
          "admissionMessage",
          "Enter all required details. Roll number must be between 1 and 99, and passwords must contain at least 4 characters."
        );

        return;

      }


      const sid =
        generateStudentId(
          className,
          roll
        );


      /*
        Prevent duplicate class + roll.
      */

      if (
        studentIdExists(
          className,
          roll
        )
      ) {

        notice(
          "admissionMessage",
          `Student ID ${sid} already exists. Another student already has this class and roll number.`
        );

        return;

      }


      //let pid =  makeId("PAR");
      let pid = `P${sid}`;


      while (
        pid === sid ||
        db.accounts.some(
          a => a.id === pid
        )
      ) {

        pid =
          makeId("PAR");

      }


      const student = {

        id: sid,

        name,

        gender:
          $("studentGender")
            .value,

        dob:
          $("studentDOB")
            .value,

        className,

        rollNumber: roll,

        section:
          $("studentSection")
            .value,

        phone:
          $("studentPhone")
            .value
            .trim(),

        parentName,

        parentPhone:
          $("parentPhone")
            .value
            .trim(),

        address:
          $("studentAddress")
            .value
            .trim(),

        admittedOn: today()

      };


      db.students.push(student);


      db.accounts.push(

        {
          id: sid,

          password: sp,

          role: "student",

          name,

          studentId: sid

        },

        {
          id: pid,

          password: pp,

          role: "parent",

          name: parentName,

          studentId: sid

        }

      );


      if (!saveData()) {

        db.students =
          db.students.filter(
            s => s.id !== sid
          );

        db.accounts =
          db.accounts.filter(
            a =>
              a.id !== sid &&
              a.id !== pid
          );

        return;

      }


      $("admissionForm").reset();


      $("studentIdPreview").innerHTML =
        "Select class and enter roll number.";


      notice(
        "admissionMessage",

        `Admission saved successfully. Student Login ID: ${sid}. Parent ID: ${pid}.`,

        "success"
      );

    }


    /*
      ============================================================
      STUDENTS
      ============================================================
    */

    function classTeachersPage() {
      if (!currentUser || currentUser.role !== "admin") return dashboardPage();
      const teachers = db.accounts.filter(a => a.role === "teacher");
      return `
        ${heading("Class Teachers", "Create class-teacher accounts and assign each teacher to one class.")}
        <div class="card">
          <h3>Add Class Teacher</h3>
          <form id="classTeacherForm">
            <div class="form-grid">
              <div class="field"><label>Teacher Name *</label><input id="ctName" required maxlength="100"></div>
              <div class="field"><label>Teacher Login ID *</label><input id="ctId" required maxlength="40" placeholder="Example: CT1001"></div>
              <div class="field"><label>Password *</label><input id="ctPassword" type="password" required minlength="4"></div>
              <div class="field"><label>Assigned Class *</label><select id="ctClass" required><option value="">Select class</option>${Array.from({length:12},(_,i)=>`<option value="${i+1}">Class ${i+1}</option>`).join("")}</select></div>
            </div>
            <button class="btn-primary" type="submit">Add Class Teacher</button>
          </form>
          <div id="classTeacherMessage"></div>
        </div>
        <div class="card"><h3>Class Teacher Accounts</h3>
          ${teachers.length ? `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Login ID</th><th>Class</th><th>Action</th></tr></thead><tbody>${teachers.map(t=>`<tr><td>${esc(t.name)}</td><td>${esc(t.id)}</td><td>Class ${esc(t.classTeacherClass || "—")}</td><td><button class="btn-danger btn-small" data-delete-class-teacher="${esc(t.id)}">Delete</button></td></tr>`).join("")}</tbody></table></div>` : emptyState("No class teachers added yet.")}
        </div>`;
    }

    function createClassTeacher(e) {
      e.preventDefault();
      const name = $("ctName").value.trim();
      const id = $("ctId").value.trim();
      const password = $("ctPassword").value;
      const cls = $("ctClass").value;
      if (!name || !id || password.length < 4 || !cls) { notice("classTeacherMessage", "Complete all class teacher fields."); return; }
      if (db.accounts.some(a => a.id.toLowerCase() === id.toLowerCase())) { notice("classTeacherMessage", "This login ID already exists."); return; }
      if (db.accounts.some(a => a.role === "teacher" && String(a.classTeacherClass) === String(cls))) { notice("classTeacherMessage", `Class ${cls} already has a class teacher.`); return; }
      db.accounts.push({ id, password, role: "teacher", name, classTeacherClass: String(cls) });
      if (saveData()) renderApp();
    }

    function deleteClassTeacher(id) {
      if (!currentUser || currentUser.role !== "admin") return;
      const t = db.accounts.find(a => a.id === id && a.role === "teacher");
      if (!t) return;
      if (!confirm(`Delete class teacher ${t.name}?`)) return;
      const old = db.accounts;
      db.accounts = old.filter(a => a.id !== id);
      if (!saveData()) db.accounts = old;
      renderApp();
    }

    function studentsPage() {

      if (currentUser.role !== "teacher" && currentUser.role !== "admin") {

        return dashboardPage();

      }


      return `

        ${heading(
        currentUser.role === "admin" ? "All Students" : "My Class Students",
        "View, search, edit and delete student details.",

        `<button
            class="btn-primary"
            data-go="admission">

            + New Admission

          </button>`
      )}


        <div class="card">

          <div class="field">

            <label>
              Search students
            </label>

            <input
              id="studentSearch"
              placeholder="Search name, ID, class, roll or parent">

          </div>


          <div id="studentsTable">

            ${studentsTable(
        teacherStudents()
      )}

          </div>

        </div>

      `;

    }


    function studentsTable(list) {

      if (!list.length) {

        return emptyState(
          "No students found. Add your first student using New Admission."
        );

      }


      const sorted =
        list
          .slice()
          .sort(
            (a, b) =>
              a.id.localeCompare(
                b.id,
                undefined,
                {numeric: true}
              )
          );


      return `

        <div class="table-wrap">

          <table>

            <thead>

              <tr>

                <th>
                  Student ID
                </th>

                <th>
                  Name
                </th>

                <th>
                  Class
                </th>

                <th>
                  Roll
                </th>

                <th>
                  Section
                </th>

                <th>
                  Parent
                </th>

                <th>
                  Phone
                </th>

                <th>
                  Admitted
                </th>

                <th>
                  Actions
                </th>

              </tr>

            </thead>


            <tbody>

              ${sorted
          .map(
            s => `

                    <tr>

                      <td>
                        <strong>
                          ${esc(s.id)}
                        </strong>
                      </td>

                      <td>
                        ${esc(s.name)}
                      </td>

                      <td>
                        Class ${esc(s.className)}
                      </td>

                      <td>
                        ${esc(
              s.rollNumber ||
              "—"
            )}
                      </td>

                      <td>
                        ${esc(s.section)}
                      </td>

                      <td>
                        ${esc(s.parentName)}
                      </td>

                      <td>
                        ${esc(
              s.phone ||
              "—"
            )}
                      </td>

                      <td>
                        ${esc(
              s.admittedOn ||
              "—"
            )}
                      </td>

                      <td>

                        <button
                          class="btn-primary btn-small"
                          data-edit-student="${esc(s.id)}">

                          Edit

                        </button>

                        <button
                          class="btn-danger btn-small"
                          data-delete-student="${esc(s.id)}">

                          Delete

                        </button>

                      </td>

                    </tr>

                  `
          )
          .join("")}

            </tbody>

          </table>

        </div>

      `;

    }


    /*
      ============================================================
      EDIT STUDENT
      ============================================================
    */

    function editStudent(id) {

      if (
        !currentUser ||
        currentUser.role !== "teacher" && currentUser.role !== "admin"
      ) {

        return;

      }

      if (!isTeacherStudent(id)) return;


      const s =
        studentById(id);


      if (!s) {

        alert(
          "Student not found."
        );

        return;

      }


      const studentAccount =
        db.accounts.find(
          a =>
            a.studentId === id &&
            a.role === "student"
        );


      const parentAccount =
        db.accounts.find(
          a =>
            a.studentId === id &&
            a.role === "parent"
        );


      $("mainContent").innerHTML = `

        ${heading(
        "Edit Student Details",
        "Change student information, class or roll number."
      )}


        <div class="card">

          <div id="editMessage"></div>


          <form id="editStudentForm">

            <div class="form-grid">


              <div class="field">

                <label>
                  Current Student ID
                </label>

                <input
                  value="${esc(s.id)}"
                  disabled>

              </div>


              <div class="field">

                <label>
                  New Student ID
                </label>

                <div
                  class="id-preview"
                  id="editStudentIdPreview">

                  ${esc(s.id)}

                </div>

              </div>


              <div class="field">

                <label>
                  Full Name *
                </label>

                <input
                  id="editName"
                  required
                  maxlength="100"
                  value="${esc(s.name)}">

              </div>


              <div class="field">

                <label>
                  Gender
                </label>

                <select id="editGender">

                  ${[
          "",
          "Male",
          "Female",
          "Other",
          "Prefer not to say"
        ]
          .map(
            g => `

                        <option
                          value="${esc(g)}"
                          ${s.gender === g
                ? "selected"
                : ""
              }>

                          ${esc(
                g ||
                "Select gender"
              )}

                        </option>

                      `
          )
          .join("")}

                </select>

              </div>


              <div class="field">

                <label>
                  Date of Birth
                </label>

                <input
                  id="editDOB"
                  type="date"
                  value="${esc(
            s.dob || ""
          )}">

              </div>


              <div class="field">

                <label>
                  Class *
                </label>

                <select
                  id="editClass"
                  required>

                  <option value="">
                    Select class
                  </option>

                  ${Array.from(
            {length: 12},
            (_, i) => {

              const c =
                String(i + 1);

              return `

                        <option
                          value="${c}"
                          ${String(
                s.className
              ) === c
                  ? "selected"
                  : ""
                }>

                          Class ${c}

                        </option>

                      `;

            }
          ).join("")}

                </select>

              </div>


              <div class="field">

                <label>
                  Roll Number *
                </label>

                <input
                  id="editRoll"
                  type="number"
                  min="1"
                  max="99"
                  required
                  value="${esc(
            s.rollNumber || ""
          )}">

              </div>


              <div class="field">

                <label>
                  Section *
                </label>

                <select
                  id="editSection"
                  required>

                  <option value="">
                    Select section
                  </option>

                  ${[
          "A",
          "B",
          "C",
          "D"
        ]
          .map(
            x => `

                        <option
                          value="${x}"
                          ${s.section === x
                ? "selected"
                : ""
              }>

                          ${x}

                        </option>

                      `
          )
          .join("")}

                </select>

              </div>


              <div class="field">

                <label>
                  Student Phone
                </label>

                <input
                  id="editPhone"
                  type="tel"
                  maxlength="25"
                  value="${esc(
            s.phone || ""
          )}">

              </div>


              <div class="field">

                <label>
                  Parent / Guardian Name *
                </label>

                <input
                  id="editParentName"
                  required
                  maxlength="100"
                  value="${esc(
            s.parentName || ""
          )}">

              </div>


              <div class="field">

                <label>
                  Parent Phone
                </label>

                <input
                  id="editParentPhone"
                  type="tel"
                  maxlength="25"
                  value="${esc(
            s.parentPhone || ""
          )}">

              </div>


              <div class="field">

                <label>
                  Student Password
                </label>

                <input
                  id="editStudentPassword"
                  type="password"
                  minlength="4"
                  placeholder="Leave blank to keep current password">

              </div>


              <div class="field">

                <label>
                  Parent Password
                </label>

                <input
                  id="editParentPassword"
                  type="password"
                  minlength="4"
                  placeholder="Leave blank to keep current password">

              </div>


              <div class="field span-two">

                <label>
                  Address
                </label>

                <textarea
                  id="editAddress"
                  maxlength="500">${esc(
            s.address || ""
          )}</textarea>

              </div>


            </div>


            <button
              class="btn-primary"
              type="submit">

              Save Changes

            </button>


            <button
              class="btn-secondary"
              id="cancelEdit"
              type="button">

              Cancel

            </button>


          </form>

        </div>

      `;


      function updateEditPreview() {

        const cls =
          $("editClass").value;

        const roll =
          Number(
            $("editRoll").value
          );


        if (
          !cls ||
          !Number.isInteger(roll) ||
          roll < 1
        ) {

          $("editStudentIdPreview")
            .innerHTML =
            "Select class and enter roll number.";

          return;

        }


        const newId =
          generateStudentId(
            cls,
            roll
          );


        $("editStudentIdPreview")
          .innerHTML = `

            New Student Login ID:

            <strong>
              ${esc(newId)}
            </strong>

          `;

      }


      $("editClass")
        .addEventListener(
          "change",
          updateEditPreview
        );


      $("editRoll")
        .addEventListener(
          "input",
          updateEditPreview
        );


      $("editStudentForm")
        .addEventListener(
          "submit",
          e => {

            e.preventDefault();


            const name =
              $("editName")
                .value
                .trim();


            const parentName =
              $("editParentName")
                .value
                .trim();


            const newClass =
              $("editClass")
                .value;


            const newRoll =
              Number(
                $("editRoll")
                  .value
              );


            if (
              !name ||
              !parentName ||
              !newClass ||
              !Number.isInteger(
                newRoll
              ) ||
              newRoll < 1 ||
              newRoll > 99
            ) {

              notice(
                "editMessage",
                "Enter a valid name, parent name, class and roll number."
              );

              return;

            }


            const newId =
              generateStudentId(
                newClass,
                newRoll
              );


            /*
              Prevent collision.
            */

            if (
              newId !== id &&
              db.students.some(
                x => x.id === newId
              )
            ) {

              notice(
                "editMessage",
                `Student ID ${newId} already exists. Another student has this class and roll number.`
              );

              return;

            }


            const previousDB =
              clone(db);


            /*
              Update student.
            */

            s.name =
              name;

            s.gender =
              $("editGender")
                .value;

            s.dob =
              $("editDOB")
                .value;

            s.className =
              newClass;

            s.rollNumber =
              newRoll;

            s.section =
              $("editSection")
                .value;

            s.phone =
              $("editPhone")
                .value
                .trim();

            s.parentName =
              parentName;

            s.parentPhone =
              $("editParentPhone")
                .value
                .trim();

            s.address =
              $("editAddress")
                .value
                .trim();


            /*
              IMPORTANT:

              If Class/Roll changed,
              student ID also changes.

              All attendance/results/
              feedback keep working because
              their studentId is updated too.
            */

            if (newId !== id) {

              db.attendance.forEach(
                a => {

                  if (
                    a.studentId === id
                  ) {

                    a.studentId =
                      newId;

                  }

                }
              );


              db.results.forEach(
                r => {

                  if (
                    r.studentId === id
                  ) {

                    r.studentId =
                      newId;

                  }

                }
              );


              db.feedback.forEach(
                f => {

                  if (
                    f.studentId === id
                  ) {

                    f.studentId =
                      newId;

                  }

                }
              );


              /*
                Update student account ID.
              */

              if (studentAccount) {

                studentAccount.id =
                  newId;

                studentAccount.studentId =
                  newId;

              }


              /*
                Update parent account's
                linked student ID.
              */

              if (parentAccount) {

                parentAccount.studentId =
                  newId;

              }


              /*
                Finally update student ID.
              */

              s.id =
                newId;

            }


            /*
              Update account names.
            */

            db.accounts.forEach(
              a => {

                if (
                  a.studentId ===
                  s.id &&
                  a.role === "student"
                ) {

                  a.name =
                    name;

                }


                if (
                  a.studentId ===
                  s.id &&
                  a.role === "parent"
                ) {

                  a.name =
                    parentName;

                }

              }
            );


            /*
              Change password only
              if teacher entered one.
            */

            const newStudentPassword =
              $("editStudentPassword")
                .value;


            const newParentPassword =
              $("editParentPassword")
                .value;


            const updatedStudentAccount =
              db.accounts.find(
                a =>
                  a.studentId ===
                  s.id &&
                  a.role === "student"
              );


            const updatedParentAccount =
              db.accounts.find(
                a =>
                  a.studentId ===
                  s.id &&
                  a.role === "parent"
              );


            if (
              newStudentPassword
            ) {

              if (
                newStudentPassword.length < 4
              ) {

                db = previousDB;

                notice(
                  "editMessage",
                  "Student password must contain at least 4 characters."
                );

                return;

              }

              if (
                updatedStudentAccount
              ) {

                updatedStudentAccount.password =
                  newStudentPassword;

              }

            }


            if (
              newParentPassword
            ) {

              if (
                newParentPassword.length < 4
              ) {

                db = previousDB;

                notice(
                  "editMessage",
                  "Parent password must contain at least 4 characters."
                );

                return;

              }

              if (
                updatedParentAccount
              ) {

                updatedParentAccount.password =
                  newParentPassword;

              }

            }


            if (!saveData()) {

              db =
                previousDB;

              return;

            }


            alert(
              `Student updated successfully.\n\nNew Student Login ID: ${s.id}`
            );


            currentPage =
              "students";

            renderApp();

          }
        );


      $("cancelEdit")
        .addEventListener(
          "click",
          () => {

            currentPage =
              "students";

            renderApp();

          }
        );

    }


    function deleteStudent(id) {

      if (
        currentUser.role !==
        "teacher"
      ) {

        return;

      }

      if (!isTeacherStudent(id)) return;


      const s =
        studentById(id);


      if (
        !s ||
        !confirm(
          `Delete ${s.name} and all related attendance, results, feedback and accounts?`
        )
      ) {

        return;

      }


      const old =
        clone(db);


      db.students =
        db.students.filter(
          x => x.id !== id
        );


      db.accounts =
        db.accounts.filter(
          a =>
            a.studentId !== id &&
            !(
              a.role === "student" &&
              a.id === id
            )
        );


      db.attendance =
        db.attendance.filter(
          x =>
            x.studentId !== id
        );


      db.results =
        db.results.filter(
          x =>
            x.studentId !== id
        );


      db.feedback =
        db.feedback.filter(
          x =>
            x.studentId !== id
        );


      if (!saveData()) {

        db = old;

        return;

      }


      renderApp();

    }


    /*
      ============================================================
      ATTENDANCE
      ============================================================
    */

    function attendancePage() {

      if (
        currentUser.role !== "teacher" &&
        currentUser.role !== "admin"
      ) {

        return dashboardPage();

      }


      return `

        ${heading(
        currentUser.role === "admin" ? "All Attendance" : "Class Attendance",
        currentUser.role === "admin" ? "Review and manage attendance for all students." : "Record and review attendance for your class."
      )}


        <div class="card">

          <h3>
            Record Attendance
          </h3>

          ${db.students.length

          ? `

                <form
                  id="attendanceForm">

                  <div class="form-grid">


                    <div class="field">

                      <label>
                        Student *
                      </label>

                      <select
                        id="attStudent"
                        required>

                        ${studentOptions("", teacherStudents())}

                      </select>

                    </div>


                    <div class="field">

                      <label>
                        Date *
                      </label>

                      <input
                        id="attDate"
                        type="date"
                        required
                        value="${today()}">

                    </div>


                    <div class="field">

                      <label>
                        Status *
                      </label>

                      <select id="attStatus">

                        <option>
                          Present
                        </option>

                        <option>
                          Absent
                        </option>

                        <option>
                          Late
                        </option>

                        <option>
                          Leave
                        </option>

                      </select>

                    </div>

                  </div>


                  <button
                    class="btn-primary"
                    type="submit">

                    Save Attendance

                  </button>

                </form>

              `

          : emptyState(
            "Admit a student before recording attendance."
          )

        }

        </div>


        <div class="card">

          <h3>
            Attendance Records
          </h3>

          ${attendanceTable(
          teacherAttendance(),
          true
        )}

        </div>

      `;

    }


    function attendanceTable(
      records,
      teacher = false
    ) {

      if (!records.length) {

        return emptyState(
          "No attendance records yet."
        );

      }


      return `

        <div class="table-wrap">

          <table>

            <thead>

              <tr>

                <th>
                  Date
                </th>

                <th>
                  Student
                </th>

                <th>
                  Student ID
                </th>

                <th>
                  Status
                </th>

                ${teacher
          ? "<th>Action</th>"
          : ""
        }

              </tr>

            </thead>


            <tbody>

              ${records
          .slice()
          .sort(
            (a, b) =>
              b.date.localeCompare(
                a.date
              )
          )
          .map(a => {

            const s =
              studentById(
                a.studentId
              );


            return `

                    <tr>

                      <td>
                        ${esc(a.date)}
                      </td>

                      <td>
                        ${esc(
              s?.name ||
              a.studentId
            )}
                      </td>

                      <td>
                        ${esc(
              a.studentId
            )}
                      </td>

                      <td>
                        ${badge(
              a.status
            )}
                      </td>

                      ${teacher
                ? `

                            <td>

                              <button
                                class="btn-danger btn-small"
                                data-delete-att="${esc(
                  a.id
                )}">

                                Delete

                              </button>

                            </td>

                          `
                : ""
              }

                    </tr>

                  `;

          })
          .join("")}

            </tbody>

          </table>

        </div>

      `;

    }


    function createAttendance(e) {

      e.preventDefault();


      const sid =
        $("attStudent").value;


      const date =
        $("attDate").value;


      const status =
        $("attStatus").value;


      if (
        !studentById(sid) ||
        !isTeacherStudent(sid) ||
        !date
      ) {

        alert(
          "Select a student and date."
        );

        return;

      }


      const existing =
        db.attendance.find(
          a =>
            a.studentId === sid &&
            a.date === date
        );


      if (existing) {

        if (
          !confirm(
            "Attendance already exists for this date. Update it?"
          )
        ) {

          return;

        }

        existing.status =
          status;

      } else {

        db.attendance.push({

          id:
            makeId("ATT"),

          studentId:
            sid,

          date,

          status

        });

      }


      saveData();

      renderApp();

    }


    function deleteAttendance(id) {

      const targetAttendance = db.attendance.find(a => a.id === id);
      if (!targetAttendance || !isTeacherStudent(targetAttendance.studentId)) return;

      if (
        !confirm(
          "Delete this attendance record?"
        )
      ) {

        return;

      }


      const old =
        db.attendance;


      db.attendance =
        old.filter(
          a =>
            a.id !== id
        );


      if (!saveData()) {

        db.attendance =
          old;

        return;

      }


      renderApp();

    }


    function myAttendancePage() {

      const records =
        db.attendance.filter(
          a =>
            a.studentId ===
            currentUser.studentId
        );


      return `

        ${heading(
        "Attendance Records",
        "Review attendance records."
      )}


        <div class="card">

          <h3>

            ${currentUser.role === "parent"
          ? "Your Child's Attendance"
          : "My Attendance"
        }

          </h3>

          ${attendanceTable(
          records,
          false
        )}

        </div>

      `;

    }


    /*
      ============================================================
      RESULTS
      ============================================================
    */

    function resultsPage() {

      if (
        currentUser.role !== "teacher" &&
        currentUser.role !== "admin"
      ) {

        return dashboardPage();

      }


      return `

        ${heading(
        currentUser.role === "admin" ? "All Examination Results" : "Class Examination Results",
        currentUser.role === "admin" ? "Add, edit and manage results for all students." : "Add, edit and review results for your class."
      )}


        <div class="card">

          <h3>
            Add Examination Result
          </h3>


          ${db.students.length

          ? `

                <form
                  id="resultForm">

                  <div class="form-grid">


                    <div class="field">

                      <label>
                        Student *
                      </label>

                      <select
                        id="resStudent"
                        required>

                        ${studentOptions("", teacherStudents())}

                      </select>

                    </div>


                    <div class="field">

                      <label>
                        Subject *
                      </label>

                      <input
                        id="resSubject"
                        required
                        maxlength="80">

                    </div>


                    <div class="field">

                      <label>
                        Examination *
                      </label>

                      <input
                        id="resExam"
                        required
                        maxlength="100">

                    </div>


                    <div class="field">

                      <label>
                        Date *
                      </label>

                      <input
                        id="resDate"
                        type="date"
                        required
                        value="${today()}">

                    </div>


                    <div class="field">

                      <label>
                        Marks Obtained *
                      </label>

                      <input
                        id="resMarks"
                        type="number"
                        min="0"
                        step="0.01"
                        required>

                    </div>


                    <div class="field">

                      <label>
                        Total Marks *
                      </label>

                      <input
                        id="resTotal"
                        type="number"
                        min="0.01"
                        step="0.01"
                        required>

                    </div>


                  </div>


                  <button
                    class="btn-primary"
                    type="submit">

                    Save Result

                  </button>

                </form>

              `

          : emptyState(
            "Admit a student before adding results."
          )

        }

        </div>


        <div class="card">

          <h3>
            Saved Results
          </h3>

          ${resultsTable(
          teacherResults(),
          true
        )}

        </div>

      `;

    }


    function resultsTable(
      records,
      teacher = false
    ) {

      if (!records.length) {

        return emptyState(
          "No examination results yet."
        );

      }


      return `

        <div class="table-wrap">

          <table>

            <thead>

              <tr>

                <th>
                  Date
                </th>

                <th>
                  Student
                </th>

                <th>
                  Student ID
                </th>

                <th>
                  Subject
                </th>

                <th>
                  Exam
                </th>

                <th>
                  Marks
                </th>

                <th>
                  Percentage
                </th>

                <th>
                  Grade
                </th>

                ${teacher
          ? "<th>Action</th>"
          : ""
        }

              </tr>

            </thead>


            <tbody>

              ${records
          .slice()
          .sort(
            (a, b) =>
              b.date.localeCompare(
                a.date
              )
          )
          .map(r => {

            const s =
              studentById(
                r.studentId
              );


            const p =
              percentage(
                r.marks,
                r.total
              );


            return `

                    <tr>

                      <td>
                        ${esc(r.date)}
                      </td>

                      <td>
                        ${esc(
              s?.name ||
              r.studentId
            )}
                      </td>

                      <td>
                        ${esc(
              r.studentId
            )}
                      </td>

                      <td>
                        ${esc(
              r.subject
            )}
                      </td>

                      <td>
                        ${esc(
              r.exam
            )}
                      </td>

                      <td>
                        ${esc(
              r.marks
            )}
                        /
                        ${esc(
              r.total
            )}
                      </td>

                      <td>
                        ${p}%
                      </td>

                      <td>
                        ${gradeFor(p)}
                      </td>

                      ${teacher
                ? `

                            <td>

                              <button
                                class="btn-primary btn-small"
                                data-edit-result="${esc(r.id)}">
                                Edit
                              </button>

                              <button
                                class="btn-danger btn-small"
                                data-delete-result="${esc(
                  r.id
                )}">
                                Delete
                              </button>

                            </td>

                          `
                : ""
              }

                    </tr>

                  `;

          })
          .join("")}

            </tbody>

          </table>

        </div>

      `;

    }


    function userResultsTable(
      records
    ) {

      if (!records.length) {

        return emptyState(
          "No results available yet."
        );

      }


      return resultsTable(
        records,
        false
      );

    }


    function createResult(e) {

      e.preventDefault();


      const studentId =
        $("resStudent")
          .value;


      const subject =
        $("resSubject")
          .value
          .trim();


      const exam =
        $("resExam")
          .value
          .trim();


      const date =
        $("resDate")
          .value;


      const marks =
        Number(
          $("resMarks")
            .value
        );


      const total =
        Number(
          $("resTotal")
            .value
        );


      if (
        !studentById(studentId) ||
        !isTeacherStudent(studentId) ||
        !subject ||
        !exam ||
        !date
      ) {

        alert(
          "Complete all required fields."
        );

        return;

      }


      if (
        !Number.isFinite(marks) ||
        !Number.isFinite(total) ||
        total <= 0 ||
        marks < 0 ||
        marks > total
      ) {

        alert(
          "Marks must be between zero and the total marks."
        );

        return;

      }


      db.results.push({

        id:
          makeId("RES"),

        studentId,

        subject,

        exam,

        date,

        marks,

        total

      });


      if (saveData()) {

        renderApp();

      }

    }


    function editResult(id) {
      if (!currentUser || (currentUser.role !== "teacher" && currentUser.role !== "admin")) return;
      const r = db.results.find(x => x.id === id);
      if (!r || !isTeacherStudent(r.studentId)) return;

      const subject = prompt("Subject:", r.subject);
      if (subject === null) return;
      const exam = prompt("Examination:", r.exam);
      if (exam === null) return;
      const date = prompt("Date (YYYY-MM-DD):", r.date);
      if (date === null) return;
      const marks = Number(prompt("Marks obtained:", r.marks));
      const total = Number(prompt("Total marks:", r.total));

      if (!subject.trim() || !exam.trim() || !date || !Number.isFinite(marks) || !Number.isFinite(total) || total <= 0 || marks < 0 || marks > total) {
        alert("Invalid result details.");
        return;
      }

      r.subject = subject.trim();
      r.exam = exam.trim();
      r.date = date;
      r.marks = marks;
      r.total = total;
      if (saveData()) renderApp();
    }

    function deleteResult(id) {

      const targetResult = db.results.find(r => r.id === id);
      if (!targetResult || !isTeacherStudent(targetResult.studentId)) return;

      if (
        !confirm(
          "Delete this result?"
        )
      ) {

        return;

      }


      const old =
        db.results;


      db.results =
        old.filter(
          r =>
            r.id !== id
        );


      if (!saveData()) {

        db.results =
          old;

        return;

      }


      renderApp();

    }


    function myResultsPage() {

      const records =
        db.results.filter(
          r =>
            r.studentId ===
            currentUser.studentId
        );


      return `

        ${heading(
        "Examination Results",
        "Review marks and grades."
      )}


        <div class="card">

          <h3>

            ${currentUser.role === "parent"
          ? "Your Child's Results"
          : "My Results"
        }

          </h3>

          ${userResultsTable(
          records
        )}

        </div>

      `;

    }


    /*
      ============================================================
      FEEDBACK
      ============================================================
    */

    function feedbackPage() {

      if (
        currentUser.role !== "teacher" &&
        currentUser.role !== "admin"
      ) {

        return dashboardPage();

      }


      return `

        ${heading(
        currentUser.role === "admin" ? "All Parent Feedback" : "Parent Feedback",
        currentUser.role === "admin" ? "Review feedback from all parents." : "Review feedback submitted by parents of your class."
      )}


        <div class="card">

          <h3>
            Feedback Records
          </h3>


          ${teacherFeedback().length

          ? `

                <div class="table-wrap">

                  <table>

                    <thead>

                      <tr>

                        <th>
                          Date
                        </th>

                        <th>
                          Student
                        </th>

                        <th>
                          Student ID
                        </th>

                        <th>
                          Subject
                        </th>

                        <th>
                          Related Result
                        </th>

                        <th>
                          Message
                        </th>

                        <th>
                          Action
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      ${teacherFeedback()
            .slice()
            .reverse()
            .map(
              f => `

                            <tr>

                              <td>
                                ${esc(f.date)}
                              </td>

                              <td>
                                ${esc(
                studentById(
                  f.studentId
                )?.name ||
                f.studentId
              )}
                              </td>

                              <td>
                                ${esc(
                f.studentId
              )}
                              </td>

                              <td>
                                ${esc(
                f.subject
              )}
                              </td>

                              <td>
                                ${f.resultId ? esc((db.results.find(r => r.id === f.resultId)?.exam || "Result") + " - " + (db.results.find(r => r.id === f.resultId)?.subject || "")) : "General"}
                              </td>

                              <td
                                style="
                                  white-space:normal;
                                  min-width:180px
                                ">

                                ${esc(
                f.message
              )}

                              </td>

                              <td>

                                <button
                                  class="btn-danger btn-small"
                                  data-delete-feedback="${esc(
                f.id
              )}">

                                  Delete

                                </button>

                              </td>

                            </tr>

                          `
            )
            .join("")}

                    </tbody>

                  </table>

                </div>

              `

          : emptyState(
            "No feedback submitted yet."
          )

        }

        </div>

      `;

    }


    function myFeedbackPage() {

      if (
        currentUser.role !==
        "parent"
      ) {

        return dashboardPage();

      }


      const records =
        db.feedback.filter(
          f =>
            f.studentId ===
            currentUser.studentId
        );


      return `

        ${heading(
        "Parent Feedback",
        `Send feedback to your child's Class ${esc(studentById(currentUser.studentId)?.className || "")} teacher${classTeacherForStudent(currentUser.studentId) ? ` (${esc(classTeacherForStudent(currentUser.studentId).name)})` : ""}.`
      )}


        <div class="card">

          <h3>
            Submit Feedback About Your Child
          </h3>


          <form id="feedbackForm">

            <div class="field">

              <label>
                Subject *
              </label>

              <input
                id="fbSubject"
                required
                maxlength="100">

            </div>


            <div class="field">

              <label>
                Related Result (optional)
              </label>

              <select id="fbResult">
                <option value="">General feedback</option>
                ${db.results.filter(r => r.studentId === currentUser.studentId).slice().reverse().map(r => `<option value="${esc(r.id)}">${esc(r.exam)} - ${esc(r.subject)} (${esc(r.marks)}/${esc(r.total)})</option>`).join("")}
              </select>

            </div>

            <div class="field">

              <label>
                Message *
              </label>

              <textarea
                id="fbMessage"
                required
                maxlength="2000">
              </textarea>

            </div>


            <button
              class="btn-primary"
              type="submit">

              Submit Feedback

            </button>

          </form>

        </div>


        <div class="card">

          <h3>
            Previous Feedback
          </h3>

          ${records.length

          ? records
            .slice()
            .reverse()
            .map(
              f => `

                      <div
                        style="
                          padding:12px 0;
                          border-bottom:1px solid var(--border)
                        ">

                        <strong>
                          ${esc(f.subject)}
                        </strong>

                        <div class="muted small">
                          ${esc(f.date)}
                        </div>

                        <p>
                          ${esc(f.message)}
                        </p>

                      </div>

                    `
            )
            .join("")

          : emptyState(
            "You have not submitted any feedback about your child yet."
          )
        }

        </div>

      `;

    }


    function createFeedback(e) {

      e.preventDefault();


      const subject =
        $("fbSubject")
          .value
          .trim();


      const message =
        $("fbMessage")
          .value
          .trim();


      if (
        !subject ||
        !message
      ) {

        alert(
          "Complete both feedback fields."
        );

        return;

      }


      db.feedback.push({

        id:
          makeId("FDB"),

        studentId:
          currentUser.studentId,

        subject,

        message,

        resultId: $("fbResult") ? $("fbResult").value : "",

        teacherId: classTeacherForStudent(currentUser.studentId)?.id || "",

        date:
          today()

      });


      if (saveData()) {

        renderApp();

      }

    }


    function deleteFeedback(id) {

      const targetFeedback = db.feedback.find(f => f.id === id);
      if (!targetFeedback || !isTeacherStudent(targetFeedback.studentId)) return;

      if (
        !confirm(
          "Delete this feedback record?"
        )
      ) {

        return;

      }


      const old =
        db.feedback;


      db.feedback =
        old.filter(
          f =>
            f.id !== id
        );


      if (!saveData()) {

        db.feedback =
          old;

        return;

      }


      renderApp();

    }


    /*
      ============================================================
      PAGE EVENT WIRING
      ============================================================
    */

    function attachEvents() {

      document
        .querySelectorAll("[data-go]")
        .forEach(b =>

          b.addEventListener(
            "click",
            () => {

              currentPage =
                b.dataset.go;

              renderApp();

            }
          )

        );


      if ($("classTeacherForm")) {
        $("classTeacherForm").addEventListener("submit", createClassTeacher);
      }

      if (
        $("admissionForm")
      ) {

        $("admissionForm")
          .addEventListener(
            "submit",
            createAdmission
          );


        $("studentClass")
          .addEventListener(
            "change",
            updateStudentIdPreview
          );


        $("studentRoll")
          .addEventListener(
            "input",
            updateStudentIdPreview
          );

      }


      if (
        $("attendanceForm")
      ) {

        $("attendanceForm")
          .addEventListener(
            "submit",
            createAttendance
          );

      }


      if (
        $("resultForm")
      ) {

        $("resultForm")
          .addEventListener(
            "submit",
            createResult
          );

      }


      if (
        $("feedbackForm")
      ) {

        $("feedbackForm")
          .addEventListener(
            "submit",
            createFeedback
          );

      }


      if (
        $("studentSearch")
      ) {

        $("studentSearch")
          .addEventListener(
            "input",
            () => {

              const q =
                $("studentSearch")
                  .value
                  .trim()
                  .toLowerCase();


              const filtered =
                teacherStudents().filter(
                  s =>

                    [
                      s.id,
                      s.name,
                      s.className,
                      s.rollNumber,
                      s.section,
                      s.parentName

                    ].some(
                      v =>
                        String(
                          v || ""
                        )
                          .toLowerCase()
                          .includes(q)
                    )

                );


              $("studentsTable")
                .innerHTML =
                studentsTable(
                  filtered
                );


              attachStudentActionEvents();

            }
          );

      }


      attachStudentActionEvents();


      document.querySelectorAll("[data-delete-class-teacher]").forEach(b =>
        b.addEventListener("click", () => deleteClassTeacher(b.dataset.deleteClassTeacher))
      );

      document
        .querySelectorAll(
          "[data-delete-att]"
        )
        .forEach(b =>

          b.addEventListener(
            "click",
            () =>
              deleteAttendance(
                b.dataset.deleteAtt
              )
          )

        );


      document.querySelectorAll("[data-edit-result]").forEach(b =>
        b.addEventListener("click", () => editResult(b.dataset.editResult))
      );

      document
        .querySelectorAll(
          "[data-delete-result]"
        )
        .forEach(b =>

          b.addEventListener(
            "click",
            () =>
              deleteResult(
                b.dataset.deleteResult
              )
          )

        );


      document
        .querySelectorAll(
          "[data-delete-feedback]"
        )
        .forEach(b =>

          b.addEventListener(
            "click",
            () =>
              deleteFeedback(
                b.dataset.deleteFeedback
              )
          )

        );

    }


    function attachStudentActionEvents() {

      document
        .querySelectorAll(
          "[data-edit-student]"
        )
        .forEach(b =>

          b.addEventListener(
            "click",
            () =>
              editStudent(
                b.dataset.editStudent
              )
          )

        );


      document
        .querySelectorAll(
          "[data-delete-student]"
        )
        .forEach(b =>

          b.addEventListener(
            "click",
            () =>
              deleteStudent(
                b.dataset.deleteStudent
              )
          )

        );

    }