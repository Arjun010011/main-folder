import React, { Component } from "react";
import {
  Paper,
  Box,
  Button,
  Grid,
  TextField,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import LoadingGif from "Components/LoadingGif";
import { Dropdown } from "Components/DropDown";
import { getFullName, dateFormat } from "Includes/functions";
import classNames from "classnames";
import Swal from "sweetalert2";
import { DateRange } from "Components/DateRange";
import moment from "moment";

const user =
  localStorage.getItem("user") != "undefined"
    ? JSON.parse(localStorage.getItem("user"))
    : "";

class UpdateSubjectAttendance extends Component {
  constructor() {
    super();
    this.state = {
      loading: false,
      yearList: [],
      standardList: [],
      year: "",
      standard: "",
      students: [],
      subjects: [],
      selectedSubjects: [],   // subject IDs
      selectedStudents: [],
      attendanceData: {},
      attendanceRecords: {}, // Store actual records with IDs: { studentId: { subjectId: [records] } }
      tableLoading: false,
      dateRangeValue: {},
      fromDate: null,
      toDate: null,
      attendanceInputs: {}, // { studentId_subjectId: { maxAttendance: '', attendanceObtained: '' } }
      submitting: false,
    };
    this.dateRange = React.createRef();
  }

  componentDidMount() {
    this.getAcademicYearsList();
  }

  getAcademicYearsList = () => {
    const param = { is_active: true };
    getRequest(GET_URL.getacademicyear.api, param, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          let yearList = response.data.data || [];
          let year = "";
          if (yearList.length > 0) {
            // Try to get current academic year from user context if available
            year = user?.other_details?.academic_year?.id || yearList[0].id || "";
          }
          this.setState(
            {
              yearList,
              year,
            },
            () => {
              if (year) {
                this.getStandard();
              }
            }
          );
        }
      })
      .catch((error) => {
        console.error("Error fetching academic years:", error);
        Swal.fire({
          position: "top-end",
          type: "error",
          title: "Error loading academic years",
          showConfirmButton: false,
          timer: 2000,
        });
      });
  };
  getFilteredSubjects = () => {
    const { subjects, selectedSubjects } = this.state;
    if (!selectedSubjects.length) return subjects;
    return subjects.filter(s => selectedSubjects.includes(s.id));
  };
  
  getFilteredStudents = () => {
    const { students, selectedStudents } = this.state;
    if (!selectedStudents.length) return students;
    return students.filter(s => selectedStudents.includes(s.student));
  };

  getStandard = () => {
    const { year } = this.state;
    if (!year) return;

    const url = GET_URL.getstandard.api;
    const params = {
      academic_year: year,
      is_active: true,
    };

    getRequest(url, params, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          const standardList = response.data.data || [];
          this.setState({
            standardList,
            standard: "",
            students: [],
            subjects: [],
            attendanceData: {},
          });
        }
      })
      .catch((error) => {
        console.error("Error fetching standards:", error);
        Swal.fire({
          position: "top-end",
          type: "error",
          title: "Error loading standards",
          showConfirmButton: false,
          timer: 2000,
        });
      });
  };

  onChange = (e) => {
    const { name, value } = e.target;
    if (name === "year") {
      this.setState(
        {
          [name]: value,
          standard: "",
          students: [],
          subjects: [],
          attendanceData: {},
        },
        () => {
          if (value) {
            this.getStandard();
          }
        }
      );
    } else if (name === "standard") {
      this.setState(
        {
          [name]: value,
          students: [],
          subjects: [],
          attendanceData: {},
        },
        () => {
          if (value && this.state.year) {
            this.loadStudentsAndSubjects();
          }
        }
      );
    }
  };

  loadStudentsAndSubjects = () => {
    const { year, standard } = this.state;
    if (!year || !standard) return;

    this.setState({ tableLoading: true });

    // Fetch students for the selected standard
    const studentParams = {
      academic_year: year,
      standard: standard,
      is_active: true,
      subject: 1, // This will include assigned subjects
    };

    getRequest(GET_URL.getenrolledstudents.api, studentParams, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          // Handle different response structures (paginated and non-paginated)
          let studentList = [];
          if (response.data.data) {
            // Check if it's paginated response
            if (Array.isArray(response.data.data)) {
              studentList = response.data.data;
            } else if (response.data.data.student_list) {
              // Paginated response structure
              studentList = response.data.data.student_list;
            }
          } else if (response.data.student_list) {
            studentList = response.data.student_list;
          }
          
          if (!Array.isArray(studentList) || studentList.length === 0) {
            this.setState({ 
              students: [],
              subjects: [],
              tableLoading: false 
            });
            return;
          }
          
          // Get all unique subjects from all students
          const allSubjects = new Map();

          // Debug: Log first student to see structure
          if (studentList.length > 0) {
            console.log('Sample student data:', studentList[0]);
            console.log('Student keys:', Object.keys(studentList[0]));
            console.log('assigned_subject value:', studentList[0].assigned_subject);
            // Check for alternative field names
            console.log('Has subjects field?', 'subjects' in studentList[0]);
            console.log('Has subject field?', 'subject' in studentList[0]);
            console.log('Has subject_list field?', 'subject_list' in studentList[0]);
          }

          studentList.forEach((student) => {
            // Try multiple possible field names
            const subjectsArr = student.assigned_subject || 
                               student.subjects || 
                               student.subject || 
                               student.subject_list ||
                               (Array.isArray(student.subject) ? student.subject : []) ||
                               [];
          
            if (subjectsArr.length > 0) {
              console.log('Found subjects for student:', student.student, subjectsArr);
            }
          
            subjectsArr.forEach((sub) => {
              // Handle both object and primitive (ID) cases
              let subjectId = null;
              let subjectName = "Unknown Subject";
              
              if (typeof sub === 'object' && sub !== null) {
                subjectId = sub.subject_id || sub.subject || sub.id || null;
                subjectName = sub.subject_name || sub.name || sub.subject_label || sub.label || "Unknown Subject";
              } else if (typeof sub === 'number' || typeof sub === 'string') {
                // If sub is just an ID, we need to look it up or use it directly
                subjectId = sub;
                subjectName = `Subject ${sub}`;
              }
          
              if (subjectId && !allSubjects.has(subjectId)) {
                allSubjects.set(subjectId, {
                  id: Number(subjectId),
                  name: subjectName,
                });
              }
            });
          });

          const subjects = Array.from(allSubjects.values()).sort((a, b) =>
            a.name.localeCompare(b.name)
          );

          console.log('Extracted subjects:', subjects);
          console.log('Total students:', studentList.length);
          console.log('Students with assigned_subject:', studentList.filter(s => s.assigned_subject && s.assigned_subject.length > 0).length);
          console.log('Students with any subject field:', studentList.filter(s => 
            (s.assigned_subject && s.assigned_subject.length > 0) ||
            (s.subjects && s.subjects.length > 0) ||
            (s.subject && (Array.isArray(s.subject) ? s.subject.length > 0 : true)) ||
            (s.subject_list && s.subject_list.length > 0)
          ).length);

          // Fetch attendance data for all students and subjects
          this.fetchAttendanceData(studentList, subjects);
        } else {
          this.setState({ 
            students: [],
            subjects: [],
            tableLoading: false 
          });
        }
      })
      .catch((error) => {
        console.error("Error fetching students:", error);
        this.setState({ tableLoading: false });
        Swal.fire({
          position: "top-end",
          type: "error",
          title: "Error loading students",
          showConfirmButton: false,
          timer: 2000,
        });
      });
  };

  fetchAttendanceData = (studentList, subjects) => {
    const { year, fromDate, toDate } = this.state;
    if (!studentList.length || !subjects.length) {
      this.setState({
        students: studentList,
        subjects,
        tableLoading: false,
      });
      return;
    }

    // Use selected date range or academic year dates
    let fromDateToUse = fromDate;
    let toDateToUse = toDate;

    if (!fromDateToUse || !toDateToUse) {
      const yearData = this.state.yearList.find((y) => y.id === parseInt(year));
      if (yearData) {
        fromDateToUse = yearData.start_date;
        toDateToUse = yearData.end_date;
      } else {
        this.setState({
          students: studentList,
          subjects,
          tableLoading: false,
        });
        return;
      }
    }

    // Fetch attendance for each student-subject combination
    const attendancePromises = [];
    const attendanceDataMap = {};
    const attendanceRecordsMap = {};

    studentList.forEach((student) => {
      attendanceDataMap[student.student] = {};
      attendanceRecordsMap[student.student] = {};
      subjects.forEach((subject) => {
        const params = {
          student: student.student,
          subject: subject.id,
          for_date__gte: fromDateToUse,
          for_date__lte: toDateToUse,
        };

        attendancePromises.push(
          getRequest(GET_URL.subjectattendance.api, params, this.props)
            .then((response) => {
              if (response && response.status === 200) {
                const attendanceRecords = response.data.data || [];
                let present = 0;
                let absent = 0;
                let total = 0;

                // Store actual records for updating
                attendanceRecordsMap[student.student][subject.id] = attendanceRecords;

                attendanceRecords.forEach((record) => {
                  if (record.status === "present") {
                    present++;
                  } else if (record.status === "absent") {
                    absent++;
                  }
                  total++;
                });

                attendanceDataMap[student.student][subject.id] = {
                  present,
                  absent,
                  total,
                };
              }
              return null;
            })
            .catch((error) => {
              console.error(
                `Error fetching attendance for student ${student.student} subject ${subject.id}:`,
                error
              );
              attendanceDataMap[student.student][subject.id] = {
                present: 0,
                absent: 0,
                total: 0,
              };
              attendanceRecordsMap[student.student][subject.id] = [];
              return null;
            })
        );
      });
    });

    Promise.all(attendancePromises)
      .then(() => {
        this.setState({
          students: studentList,
          subjects,
          attendanceData: attendanceDataMap,
          attendanceRecords: attendanceRecordsMap,
          tableLoading: false,
        });
      })
      .catch((error) => {
        console.error("Error fetching attendance data:", error);
        this.setState({
          students: studentList,
          subjects,
          attendanceData: attendanceDataMap,
          attendanceRecords: attendanceRecordsMap,
          tableLoading: false,
        });
      });
  };

  getAttendanceForStudentSubject = (studentId, subjectId) => {
    const { attendanceData } = this.state;
    if (
      attendanceData[studentId] &&
      attendanceData[studentId][subjectId]
    ) {
      return attendanceData[studentId][subjectId];
    }
    return { present: 0, absent: 0, total: 0 };
  };

  handleDateRangeChange = (value) => {
    const { year } = this.state;
    if (!value.start || !value.end) {
      // If date range is cleared, use academic year dates
      const yearData = this.state.yearList.find((y) => y.id === parseInt(year));
      if (yearData) {
        value.start = yearData.start_date;
        value.end = yearData.end_date;
      }
    }

    this.setState(
      {
        dateRangeValue: value,
        fromDate: value.start,
        toDate: value.end,
        attendanceData: {},
        attendanceRecords: {},
        attendanceInputs: {},
      },
      () => {
        if (this.state.year && this.state.standard && value.start && value.end) {
          this.loadStudentsAndSubjects();
        }
      }
    );
  };

  handleAttendanceInputChange = (studentId, subjectId, field, value) => {
    const { attendanceInputs } = this.state;
    const key = `${studentId}_${subjectId}`;
    const currentInput = attendanceInputs[key] || {};

    this.setState({
      attendanceInputs: {
        ...attendanceInputs,
        [key]: {
          ...currentInput,
          [field]: value,
        },
      },
    });
  };

  getAttendanceInput = (studentId, subjectId, field) => {
    const { attendanceInputs } = this.state;
    const key = `${studentId}_${subjectId}`;
    return attendanceInputs[key]?.[field] || "";
  };

  handleSubmit = () => {
    const { students, subjects, attendanceInputs, fromDate, toDate, year, standard } = this.state;
    
    if (!fromDate || !toDate) {
      Swal.fire({
        position: "top-end",
        icon: "error",
        title: "Please select a date range",
        showConfirmButton: false,
        timer: 2000,
      });
      return;
    }

    // Validate inputs
    let hasData = false;
    const subjectAttendanceMap = {}; // { subjectId: { max_days, present_obtained, students: [] } }

    students.forEach((student) => {
      subjects.forEach((subject) => {
        // Check if student has this subject assigned
        const studentSubjects = student.assigned_subject || [];
        const hasSubject = studentSubjects.some(
          (sub) =>
            (sub.subject_id || sub.subject || sub.id) === subject.id
        );
        
        if (!hasSubject) return;

        const key = `${student.student}_${subject.id}`;
        const input = attendanceInputs[key];
        
        if (input && (input.maxAttendance || input.attendanceObtained)) {
          hasData = true;
          
          // Parse maxAttendance - handle empty string, null, undefined
          const maxAttendanceStr = String(input.maxAttendance || "").trim();
          const maxAttendance = maxAttendanceStr !== "" ? parseInt(maxAttendanceStr) || 0 : 0;
          
          // Parse attendanceObtained - handle empty string, null, undefined, and ensure 0 is preserved
          const attendanceObtainedStr = String(input.attendanceObtained || "").trim();
          let attendanceObtained = 0;
          if (attendanceObtainedStr !== "") {
            const parsed = parseInt(attendanceObtainedStr, 10);
            attendanceObtained = isNaN(parsed) ? 0 : parsed;
          }

          if (attendanceObtained > maxAttendance) {
            Swal.fire({
              position: "top-end",
              icon: "error",
              title: `Attendance obtained cannot be greater than maximum attendance for ${getFullName(student.student_first_name, student.student_middle_name, student.student_last_name) || student.name || "Student"} - ${subject.name}`,
              showConfirmButton: false,
              timer: 3000,
            });
            return;
          }

          // Initialize subject entry if not exists, or update if values are provided
          if (!subjectAttendanceMap[subject.id]) {
            subjectAttendanceMap[subject.id] = {
              max_days: maxAttendance,
              present_obtained: attendanceObtained,
              students: []
            };
          } else {
            // Update max_days and present_obtained if new values are provided
            // This allows the last entered value to be used for all students with the same subject
            if (maxAttendance > 0) {
              subjectAttendanceMap[subject.id].max_days = maxAttendance;
            }
            if (attendanceObtained >= 0) {
              subjectAttendanceMap[subject.id].present_obtained = attendanceObtained;
            }
          }

          // Add student to the list for this subject
          // All students for the same subject will share the same max_days and present_obtained
          if (!subjectAttendanceMap[subject.id].students.includes(parseInt(student.student))) {
            subjectAttendanceMap[subject.id].students.push(parseInt(student.student));
          }
        }
      });
    });

    if (!hasData) {
      Swal.fire({
        position: "top-end",
        icon: "warning",
        title: "Please enter attendance data",
        showConfirmButton: false,
        timer: 2000,
      });
      return;
    }

    // Get standard_section from first student
    const standardSection = students[0]?.standard_section;
    if (!standardSection) {
      Swal.fire({
        position: "top-end",
        icon: "error",
        title: "Standard section not found",
        showConfirmButton: false,
        timer: 2000,
      });
      return;
    }

    this.setState({ submitting: true });

    // Prepare data in the new format: from_date, to_date, standard_section, subject array
    // with subject_id, max_days, present_obtained, and students array
    const subjectArray = Object.keys(subjectAttendanceMap).map(subjectId => ({
      subject_id: parseInt(subjectId),
      max_days: subjectAttendanceMap[subjectId].max_days,
      present_obtained: subjectAttendanceMap[subjectId].present_obtained,
      students: subjectAttendanceMap[subjectId].students
    }));

    const postData = {
      from_date: fromDate,
      to_date: toDate,
      standard_section: standardSection,
      subject: subjectArray,
    };

    postRequest(POST_URL.subjectattendance.api, postData, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Attendance updated successfully",
            showConfirmButton: false,
            timer: 2000,
          });
          // Clear inputs and refresh attendance data
          this.setState({
            attendanceInputs: {},
            submitting: false,
            attendanceData: {},
            attendanceRecords: {},
          }, () => {
            // Refresh attendance data after state is cleared
            this.loadStudentsAndSubjects();
          });
        } else {
          throw new Error(response?.data?.Reason || "Failed to update attendance");
        }
      })
      .catch((error) => {
        console.error("Error updating attendance:", error);
        Swal.fire({
          position: "top-end",
          icon: "error",
          title: error.response?.data?.Reason || error.message || "Error updating attendance",
          showConfirmButton: false,
          timer: 3000,
        });
        this.setState({ submitting: false });
      });
  };

  render() {
    const {
      loading,
      yearList,
      standardList,
      year,
      standard,
      students,
      subjects,
      tableLoading,
      fromDate,
      toDate,
    } = this.state;

    if (loading) {
      return <LoadingGif />;
    }

    return (
      <Box>
        <Paper className={classNames("paper-background")}>
          <Grid container>
            <Grid item md={12} xs={12} className={classNames("header-align")}>
              <Box className="heading">Update Student Subject-Wise Attendance</Box>
              <Box className="sub-heading">
                View and update attendance for students by subject
              </Box>
            </Grid>
          </Grid>

          <Grid container spacing={3} style={{ marginTop: "20px" }}>
            <Grid item xs={12} md={4}>
              <Dropdown
                data={yearList}
                name="year"
                value={year}
                hideSelect={true}
                onChange={this.onChange}
                label="Academic Year"
                size="small"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Dropdown
                data={standardList}
                name="standard"
                value={standard}
                hideSelect={true}
                onChange={this.onChange}
                label="Standard"
                size="small"
                disabled={!year}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Box style={{ marginTop: "8px" }}>
                <DateRange
                  ref={this.dateRange}
                  handleChange={this.handleDateRangeChange}
                  minDate={yearList.find((y) => y.id === parseInt(year))?.start_date}
                  maxDate={yearList.find((y) => y.id === parseInt(year))?.end_date}
                  startDate={this.state.fromDate}
                  endDate={this.state.toDate}
                  label="Date Range"
                />
              </Box>
            </Grid>
          </Grid>

          {year && standard && fromDate && toDate && students.length > 0 && (
            <Grid container style={{ marginTop: "30px" }}>
              <Grid item xs={12}>
                {tableLoading ? (
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    style={{ minHeight: "200px" }}
                  >
                    <CircularProgress />
                  </Box>
                ) : (
                  <TableContainer component={Paper} style={{ marginTop: "20px" }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell
                            style={{
                              fontWeight: "bold",
                              backgroundColor: "#f5f5f5",
                              position: "sticky",
                              left: 0,
                              zIndex: 3,
                              minWidth: "200px",
                            }}
                          >
                            Student Name
                          </TableCell>
                          {subjects.map((subject) => (
                            <TableCell
                              key={subject.id}
                              align="center"
                              colSpan={3}
                              style={{
                                fontWeight: "bold",
                                backgroundColor: "#f5f5f5",
                                minWidth: "300px",
                              }}
                            >
                              {subject.name}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell
                            style={{
                              fontWeight: "bold",
                              backgroundColor: "#f5f5f5",
                              position: "sticky",
                              left: 0,
                              zIndex: 3,
                            }}
                          >
                            {/* Empty header for student name column */}
                          </TableCell>
                          {subjects.map((subject) => (
                            <React.Fragment key={subject.id}>
                              <TableCell
                                align="center"
                                style={{
                                  fontWeight: "bold",
                                  backgroundColor: "#f5f5f5",
                                  fontSize: "12px",
                                }}
                              >
                                Current Attendance
                              </TableCell>
                              <TableCell
                                align="center"
                                style={{
                                  fontWeight: "bold",
                                  backgroundColor: "#f5f5f5",
                                  fontSize: "12px",
                                }}
                              >
                                Max Attendance
                              </TableCell>
                              <TableCell
                                align="center"
                                style={{
                                  fontWeight: "bold",
                                  backgroundColor: "#f5f5f5",
                                  fontSize: "12px",
                                }}
                              >
                                Attendance Obtained
                              </TableCell>
                            </React.Fragment>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {students.map((student) => {
                          const studentName = getFullName(
                            student.student_first_name,
                            student.student_middle_name,
                            student.student_last_name
                          ) || student.name || "N/A";
                          
                          return (
                            <TableRow key={student.student}>
                              <TableCell
                                style={{
                                  position: "sticky",
                                  left: 0,
                                  backgroundColor: "#fff",
                                  zIndex: 2,
                                  fontWeight: "500",
                                }}
                              >
                                {studentName}
                              </TableCell>
                              {subjects.map((subject) => {
                                // Check if student has this subject assigned
                                const studentSubjects = student.assigned_subject || [];
                                const hasSubject = studentSubjects.some(
                                  (sub) => (sub.subject_id || sub.subject || sub.id) === subject.id
                                );
                                
                                if (!hasSubject) {
                                  return (
                                    <React.Fragment key={subject.id}>
                                      <TableCell colSpan={3} align="center">
                                        <Typography variant="caption" color="textSecondary">
                                          Not Assigned
                                        </Typography>
                                      </TableCell>
                                    </React.Fragment>
                                  );
                                }

                                const attendance = this.getAttendanceForStudentSubject(
                                  student.student,
                                  subject.id
                                );
                                const percentage =
                                  attendance.total > 0
                                    ? ((attendance.present / attendance.total) * 100).toFixed(1)
                                    : "0.0";
                                return (
                                  <React.Fragment key={subject.id}>
                                    <TableCell align="center">
                                      <Box>
                                        <Typography variant="body2" style={{ fontWeight: "bold" }}>
                                          {attendance.present}/{attendance.total}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          style={{
                                            color:
                                              parseFloat(percentage) >= 75
                                                ? "#4caf50"
                                                : parseFloat(percentage) >= 50
                                                ? "#ff9800"
                                                : "#f44336",
                                          }}
                                        >
                                          {percentage}%
                                        </Typography>
                                        <Typography variant="caption" style={{ display: "block" }}>
                                          (P: {attendance.present}, A: {attendance.absent})
                                        </Typography>
                                      </Box>
                                    </TableCell>
                                    <TableCell align="center">
                                      <TextField
                                        type="number"
                                        size="small"
                                        value={this.getAttendanceInput(student.student, subject.id, "maxAttendance")}
                                        onChange={(e) =>
                                          this.handleAttendanceInputChange(
                                            student.student,
                                            subject.id,
                                            "maxAttendance",
                                            e.target.value
                                          )
                                        }
                                        inputProps={{ min: 0, style: { textAlign: "center" } }}
                                        style={{ width: "80px" }}
                                      />
                                    </TableCell>
                                    <TableCell align="center">
                                      <TextField
                                        type="number"
                                        size="small"
                                        value={this.getAttendanceInput(student.student, subject.id, "attendanceObtained")}
                                        onChange={(e) =>
                                          this.handleAttendanceInputChange(
                                            student.student,
                                            subject.id,
                                            "attendanceObtained",
                                            e.target.value
                                          )
                                        }
                                        inputProps={{ min: 0, style: { textAlign: "center" } }}
                                        style={{ width: "80px" }}
                                      />
                                    </TableCell>
                                  </React.Fragment>
                                );
                              })}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Grid>
              
              {!tableLoading && students.length > 0 && (
                <Grid item xs={12} style={{ marginTop: "20px", textAlign: "right" }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={this.handleSubmit}
                    disabled={this.state.submitting}
                    style={{ minWidth: "150px" }}
                  >
                    {this.state.submitting ? (
                      <>
                        <CircularProgress size={20} style={{ marginRight: "10px" }} />
                        Submitting...
                      </>
                    ) : (
                      "Submit"
                    )}
                  </Button>
                </Grid>
              )}
            </Grid>
          )}

          {year && standard && fromDate && toDate && !tableLoading && students.length === 0 && (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              style={{ minHeight: "200px", marginTop: "20px" }}
            >
              <Typography variant="h6" color="textSecondary">
                No students found for the selected year and standard
              </Typography>
            </Box>
          )}

          {year && standard && (!fromDate || !toDate) && (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              style={{ minHeight: "200px", marginTop: "20px" }}
            >
              <Typography variant="h6" color="textSecondary">
                Please select a date range to view and update attendance
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    );
  }
}

export default withRouter(UpdateSubjectAttendance);
