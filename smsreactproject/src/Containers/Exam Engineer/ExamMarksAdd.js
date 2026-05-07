import React, { Component } from "react";
import {
  Paper,
  Box,
  Button,
  Grid,
  TableContainer,
  Table,
  TableHead,
  TableCell,
  CircularProgress,
  TableRow,
  TableBody,
  TextField,
  Select,
  MenuItem,
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import Skeleton from "@material-ui/lab/Skeleton";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import { DropDownWithSearchAndAddApi } from "Components/DropDownWithSearchAndAddApi";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";
import Swal from "sweetalert2";
import {
  Alert,
  getUrlParam,
  getFullName,
} from "Includes/functions";
import { Actions } from "Constants/permissions";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { floatNumberWithTwoDecimalRegex } from "Constants/regularExpression";
import "./styles.scss";

class ExamMarksAdd extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedExam: null,
      selectedTerm: null,
      selectedYear: null,
      selectedStandard: null,
      standard_section_id: null,
      standard_name: "",
      section_name: "",
      year_name: "",
      term_name: "",
      exam_name: "",
      subjectOptions: [],
      selectedSubjectOption: null,
      selectedSubjectId: null,
      sLoadingDownload: false,

      show_manual_attendance_in_schedule: isFormDefinitionEnabled(
        "exam_configurations",
        "show_manual_attendance_in_schedule",
        1
      ),
      show_remarks_in_marks_entry: isFormDefinitionEnabled(
        "exam_configurations",
        "show_remarks_in_marks_entry",
        1
      ),
      loading: false,
      loadingExam: false,
      markDetails: {},
      questionList: [],
      qCells: {},
      deletable_list: [],
      students: [],
      reasonLoading: false,
      reasonList: [],
      fieldError: {},
      fieldDetails: {},

      is_approved: false,
    };
  }

  async componentDidMount() {
    const {
      selectedExam,
      selectedTerm,
      selectedYear,
      selectedStandard,
      standard_section_id,
      standard_name,
      section_name,
      year_name,
      term_name,
      exam_name,
    } = getUrlParam();

    const routeState = this.props.location?.state || {};
    const subjectList = Array.isArray(routeState.subjectList)
      ? routeState.subjectList
      : [];

    const subjectOptions = subjectList.map((s) => ({
      id: s.subject ?? s.id,
      name: s.subject_name ?? s.name,
      value: s.subject ?? s.id,
    }));

    this.setState({
      selectedExam,
      selectedTerm,
      selectedYear,
      selectedStandard,
      standard_section_id,
      standard_name,
      section_name,
      year_name,
      term_name,
      exam_name,
      subjectOptions,
    });
  }

  clampNumber = (val, min, max) => {
    if (val === "" || val == null) return "";
    const n = Number(val);
    if (Number.isNaN(n)) return "";
    if (min != null && n < Number(min)) return Number(min);
    if (max != null && n > Number(max)) return Number(max);
    return n;
  };

  onchangeSubject = (newValue) => {
    let value = newValue;
    if (Array.isArray(value)) value = value[0];
    if (value && typeof value === "object") {
      value = value.id ?? value.value ?? value.subject ?? null;
    }
    this.setState(
      { selectedSubjectId: value, selectedSubjectOption: newValue },
      () => value && this.getexamquestionData()
    );
  };

  getexamquestionData = () => {
    const { selectedExam, standard_section_id, selectedSubjectId } = this.state;
    if (!selectedExam || !standard_section_id || !selectedSubjectId) return;

    this.setState({ loadingExam: true });

    const url = GET_URL.questionwisemarksentry.api;
    const params = {
      is_active: true,
      exam_id: selectedExam,
      standard_section_id: standard_section_id,
      subject_id: selectedSubjectId,
    };

    getRequest(url, params, { ...this.props, return_error_message: true })
      .then((response) => {
        if (!(response && response.status === 200)) throw new Error(response);
        const data = response?.data?.data ?? {};
        const questionList = (data.question_list || []).map((q) => ({
          id: q.id,
          label: `Q${q.question_number}${q.sub_question_number ? `(${q.sub_question_number})` : ""}`,
          max_marks: q.max_marks ?? null,
          min_marks: q.min_marks ?? null,
        }));
        const students = (data.student_list || []).map((s) => ({
          ...s,
          student_name: getFullName(s.first_name, s.middle_name, s.last_name),
        }));
        const qCells = {};
        students.forEach((stu) => {
          qCells[stu.student] = {};
          questionList.forEach((q) => {
            qCells[stu.student][q.id] = {
              marks: "",
              attendance_status: "Present",
              id: null,
            };
          });
          (stu.question_list || []).forEach((item) => {
            const qId = item.exam_schedule_question_mapping ?? item.id;
            if (qId && qCells[stu.student][qId]) {
              qCells[stu.student][qId] = {
                marks: item.marks ?? "",
                attendance_status: item.attendance_status ?? "Present",
                id: item.id ?? null,
              };
            }
          });
        });

        this.setState({
          markDetails: data,
          questionList,
          students,
          qCells,
          is_approved: String(data.approval_status) === "1",
          loadingExam: false,
        });
      })
      .catch((err) => {
        this.setState({
          markDetails: {},
          questionList: [],
          students: [],
          qCells: {},
          loadingExam: false,
        });
      });
  };

  handleQMarkChange = (studentId, q, raw) => {
    this.setState((prev) => {
      const qCells = { ...prev.qCells };
      const row = { ...(qCells[studentId] || {}) };
      const cell = { ...(row[q.id] || { marks: "", attendance_status: "Present", id: null }) };

      const val = this.clampNumber(raw, q.min_marks, q.max_marks);
      const clearing = cell.id && (val === "" || val == null);
      if (clearing) {
        const deletable = new Set(prev.deletable_list || []);
        deletable.add(cell.id);
        cell.id = null;
        row[q.id] = { ...cell, marks: val };
        qCells[studentId] = row;
        return { qCells, deletable_list: Array.from(deletable) };
      }

      row[q.id] = { ...cell, marks: val };
      qCells[studentId] = row;
      return { qCells };
    });
  };

  handleQAttendanceChange = (studentId, q, newStatus) => {
    this.setState((prev) => {
      const qCells = { ...prev.qCells };
      const row = { ...(qCells[studentId] || {}) };
      const cell = { ...(row[q.id] || { marks: "", attendance_status: "Present", id: null }) };

      if (newStatus === "Absent") {
        if (cell.id) {
          const deletable = new Set(prev.deletable_list || []);
          deletable.add(cell.id);
          prev.deletable_list = Array.from(deletable);
          cell.id = null;
        }
        cell.marks = "";
      }
      cell.attendance_status = newStatus;

      row[q.id] = cell;
      qCells[studentId] = row;
      return { qCells, deletable_list: prev.deletable_list };
    });
  };

  handleChangeNoDaysAttendance = (e, stIndex) => {
    const { value } = e.target;
    this.setState((prev) => {
      const markDetails = { ...(prev.markDetails || {}) };
      const list = Array.isArray(markDetails.student_list) ? [...markDetails.student_list] : [];
      if (list[stIndex]) list[stIndex].marked_attendance_days = value;
      markDetails.student_list = list;
      return { markDetails };
    });
  };

  handleRemarkChange = (newValue, stIndex) => {
    this.setState((prev) => {
      const markDetails = { ...(prev.markDetails || {}) };
      const list = Array.isArray(markDetails.student_list) ? [...markDetails.student_list] : [];
      if (list[stIndex]) list[stIndex].remark = newValue;
      markDetails.student_list = list;
      return { markDetails };
    });
  };

  goToViewPage = () => {
    const { selectedExam, selectedTerm, selectedYear } = this.state;
    let sectionInformation = {
      selectedExam: selectedExam,
      selectedTerm: selectedTerm,
      selectedYear: selectedYear,
    };
    let searchParam = "?" + new URLSearchParams(sectionInformation).toString();
    this.props.history.push({
      pathname: Actions.exam_engineer_marks_enter.view.url,
      search: searchParam,
    });
  };

  postData = () => {
    const {
      qCells,
      questionList,
      markDetails,
      deletable_list,
      standard_section_id,
    } = this.state;

    const safeNumber = (v) => {
      if (v === "" || v == null) return null;
      if (String(v).trim().toLowerCase() === "ab") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const question_mark_details = (markDetails?.student_list ?? []).map((stu) => {
      const subject_list = [];
      for (const q of questionList) {
        const cell = qCells?.[stu.student]?.[q.id];
        if (!cell) continue;

        const attendance = cell.attendance_status || "Present";
        const marks = attendance === "Absent" ? null : safeNumber(cell.marks);
        const shouldSend = !!cell.id || attendance === "Absent" || marks !== null;
        if (!shouldSend) continue;

        const row = {
          exam_schedule_question_mapping: q.id,
          marks,
          attendance_status: attendance,
        };
        subject_list.push(row);
      }

      return { student: stu.student, subject_list };
    })
      .filter(s => (s.subject_list && s.subject_list.length > 0));

    return {
      deletable_list: Array.from(new Set((deletable_list ?? []).filter(Boolean))),
      question_mark_details,
      standard_section: String(standard_section_id ?? ""),
    };
  };

  submitMarks = async () => {
    const payload = this.postData();
    await postRequest(POST_URL.questionwisemarksentry.api, payload, this.props);
    Swal.fire({
      position: "top-end",
      type: "success",
      title: "Your Data has been saved",
      showConfirmButton: false,
      timer: 1500,
    });
    this.goToViewPage();
  };

   handleDownloadMarks = () => {
      const {
        standard_name,
        section_name,
        selectedExam,
        selectedTerm,
        standard_section_id,
        selectedSubjectId
      } = this.state;
      this.setState({
        isLoadingDownload: true,
      });
      const url = GET_URL.marksreportamrita.api;
      let param = {
        is_active: true,
        exam_id: selectedExam,
        standard_section_id: standard_section_id,
        subject_id: selectedSubjectId
      };
      let prop = { ...this.props };
      prop.responseType = "blob";
      getRequest(url, param, prop).then((response) => {
        this.setState({ isLoadingDownload: false });
        if (response && response.status === 200) {
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute(
            "download",
            `Cons - [${standard_name} - ${section_name}].xlsx`
          );
          document.body.appendChild(link);
          link.click();
        }
      });
    };

  renderQuestionWiseTable = () => {
    const {
      questionList,
      markDetails,
      qCells,
      loadingExam,
      show_manual_attendance_in_schedule,
      show_remarks_in_marks_entry,
      reasonLoading,
      reasonList,
      fieldError,
      fieldDetails,
    } = this.state;

    if (loadingExam) {
      return (
        <Box display="flex" justifyContent="center" p={2}>
          <CircularProgress size={24} />
        </Box>
      );
    }

    if (!questionList.length) {
      return <BlankPagewithIcon description="No questions configured for this selection." />;
    }

    return (
      <TableContainer className="mark-enter-bg header-align m-b-60px">
        <Table size="small" aria-label="question-wise" className="exam-mark-row-table">
          <TableHead>
            <TableRow>
              <TableCell className="selectable-table-head text-align-center">
                Student
              </TableCell>

              {show_manual_attendance_in_schedule && (
                <TableCell className="selectable-table-head text-align-center">
                  Attendance
                </TableCell>
              )}
              {show_remarks_in_marks_entry && (
                <TableCell className="selectable-table-head text-align-center">
                  Remark
                </TableCell>
              )}

              {questionList.map((q) => (
                <TableCell
                  key={q.id}
                  className="selectable-table-head text-align-center"
                >
                  {q.label}
                </TableCell>
              ))}
            </TableRow>

            <TableRow>
              <TableCell className=""></TableCell>

              {show_manual_attendance_in_schedule && (
                <TableCell className="text-align-center">
                  {`Max-${markDetails?.max_no_of_days_attendance ?? "-"} Days`}
                </TableCell>
              )}

              {show_remarks_in_marks_entry && (
                <TableCell className="text-align-center">Reason</TableCell>
              )}

              {questionList.map((q) => (
                <TableCell key={`${q.id}-mm`} className="text-align-center">
                  {`Max-${q.max_marks ?? "-"} Min-${q.min_marks ?? "-"}`}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody className="selectable-row-table-body">
            {(markDetails.student_list || []).map((student, stIndex) => {
              const studentId = student.student;
              return (
                <TableRow key={studentId} className="selectable-row-table-row">
                  <TableCell className="mark-add-table-cell" component="th" scope="row">
                    {student.student_name}
                  </TableCell>

                  {show_manual_attendance_in_schedule && (
                    <TableCell>
                      <TextField
                        type="text"
                        autoComplete="off"
                        name="marked_attendance_days"
                        value={student.marked_attendance_days || ""}
                        className="schedule-exam-marks-text"
                        onChange={(e) => this.handleChangeNoDaysAttendance(e, stIndex)}
                        inputProps={{ max: 200, min: 0 }}
                        helperText={fieldError[`marked_attendance_days${stIndex}`]}
                        error={Boolean(fieldError[`marked_attendance_days${stIndex}`])}
                      />
                    </TableCell>
                  )}

                  {show_remarks_in_marks_entry && (
                    <TableCell>
                      {reasonLoading ? (
                        <div>
                          <Skeleton variant="rect" className="drop-down-skeleton m-t-10px" />
                          <div>...Loading Reason List</div>
                        </div>
                      ) : (
                        <DropDownWithSearchAndAddApi
                          options={reasonList}
                          value={student.remark}
                          onChange={(e, newValue) => this.handleRemarkChange(newValue, stIndex)}
                          name="remark"
                          label=""
                          size="small"
                          optionValue="name"
                          className="width-200-px"
                          helperText={fieldError[`remark${stIndex}`]}
                          error={Boolean(fieldError[`remark${stIndex}`])}
                          fieldDetails={fieldDetails}
                          postUrl={POST_URL.reason.api}
                          variant="standard"
                          updatePostFormat={(v) => v}
                          updateType={(v) => v}
                        />
                      )}
                    </TableCell>
                  )}

                  {questionList.map((q) => {
                    const cell = qCells?.[studentId]?.[q.id] || {
                      marks: "",
                      attendance_status: "Present",
                    };
                    const isAbsent = cell.attendance_status === "Absent";

                    return (
                      <TableCell
                        key={`${studentId}-${q.id}`}
                        className="mark-add-table-cell"
                        component="th"
                        scope="row"
                        align="center"
                      >
                        <Grid container spacing={1} alignItems="center" justify="center">
                          <Grid item xs={7}>
                            <TextField
                              type="text"
                              autoComplete="off"
                              name="marks"
                              value={isAbsent ? "Ab" : cell.marks}
                              disabled={isAbsent}
                              className="schedule-exam-marks-text"
                              onChange={(e) => this.handleQMarkChange(studentId, q, e.target.value)}
                              onBlur={(e) => this.handleQMarkChange(studentId, q, e.target.value)}
                              inputProps={{
                                inputMode: "decimal",
                                pattern: floatNumberWithTwoDecimalRegex.source,
                                style: { textAlign: "center" },
                              }}
                              placeholder="-"
                              size="small"
                              helperText={fieldError[`qmarks_${studentId}_${q.id}`] || ""}
                              error={Boolean(fieldError[`qmarks_${studentId}_${q.id}`])}
                            />
                          </Grid>
                          <Grid item xs={5}>
                            <Select
                              value={cell.attendance_status || "Present"}
                              onChange={(e) =>
                                this.handleQAttendanceChange(studentId, q, e.target.value)
                              }
                              variant="standard"
                              className="width-100-px"
                            >
                              <MenuItem value="Present">Present</MenuItem>
                              <MenuItem value="Absent">Absent</MenuItem>
                            </Select>
                          </Grid>
                        </Grid>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}

            {(markDetails.student_list || []).length === 0 && (
              <tr className="text-center font-weight-bold">No Data Found</tr>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  render() {
    const {
      loading,
      year_name,
      term_name,
      exam_name,
      standard_name,
      section_name,
      subjectOptions,
      selectedSubjectOption,
      isLoadingDownload
    } = this.state;

    if (loading) {
      return (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <Paper className="paper-background">
        <Grid container>
          <Grid item md={6} xs={12} className="header-align">
            <Box className="heading">Exam Marks (Question-wise)</Box>
          </Grid>
          <Grid item md={6} xs={12}>
            <Box className="header-align end-flex-prop">
              <Button
                variant="contained"
                onClick={this.goToViewPage}
                className="editbutton-view"
              >
                <VisibilityOutlinedIcon className="visibility-icon" />
                {" "}
                View
              </Button>
            </Box>
          </Grid>
        </Grid>
        <Box className="md-down-justify-start md-up-justify-start mb-y-20">
          <Box className="year-std-box mr-40">
            <Box className="academic-std-head">Academic Year</Box>
            <Box className="exam-mark-add-heading-bg">{year_name}</Box>

            <Box className="exam-mark-heading-box">Term</Box>
            <Box className="exam-mark-add-heading-bg">{term_name}</Box>

            <Box className="exam-mark-heading-box">Exam</Box>
            <Box className="exam-mark-add-heading-bg">{exam_name}</Box>

            <Box className="exam-mark-add-heading-bg">{standard_name}</Box>
            <Box className="exam-mark-add-heading-bg">{section_name}</Box>
          </Box>
        </Box>
        <Grid container className="header-align">
          <Grid item md={3} xs={12} className="margin-top-10">
            <DropDownWithSearch
              options={subjectOptions}
              label="Select Subject"
              name="subject"
              value={selectedSubjectOption}
              onChange={(_, newValue) => this.onchangeSubject(newValue)}
              hideClearIcon
              size="small"
              style={{ width: "100%" }}
            />
          </Grid>
        </Grid>
<div className="d-flex mt-10">
                              {isLoadingDownload && (
                                <CircularProgress className="height-width-25px" />
                              )}
                              <Button
                                className="custom-button height-fit-content ml-10"
                                onClick={
                                  isLoadingDownload ? "" : this.handleDownloadMarks
                                }
                                disabled={isLoadingDownload}
                              >
                                Download Marks
                              </Button>
                            </div>
        <Box mt={2}>{this.renderQuestionWiseTable()}</Box>
        <Button
          variant="contained"
          style={{ float: "right" }}
          onClick={(e) => this.submitMarks()}
        >
          Submit
        </Button>
      </Paper>
    );
  }
}

export default withRouter(ExamMarksAdd);
