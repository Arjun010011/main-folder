import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Grid,
  Paper,
  Button,
  IconButton,
  TextField
} from "@material-ui/core";
import { AddCircleOutline, DeleteOutline } from "@material-ui/icons";
import { GET_URL, POST_URL } from "Includes/urls";
import { getRequest, postRequest } from "Includes/api/apicall";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import Swal from "sweetalert2";
import { Actions } from "Constants/permissions";
import { MuiPickersUtilsProvider, KeyboardDatePicker } from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import BlankPagewithIcon from "Components/BlankPageWithIcon";

const asArray = (val) => (Array.isArray(val) ? val : val ? [val] : []);

const ExamSchedulePage = (props) => {
  const [academicYears, setAcademicYears] = useState([]);
  const [examTerms, setExamTerms] = useState([]);
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [coList, setCoList] = useState([]);
  const [academicYear, setAcademicYear] = useState(null);
  const [examTerm, setExamTerm] = useState(null);
  const [exam, setExam] = useState(null);
  const [subject, setSubject] = useState(null);
  const [blankData, setBlankData] = useState("Select Academic Year, Term, Exam and Subject");
  const [loading, setLoading] = useState({ year: false, term: false, exam: false, subject: false });
  const [questions, setQuestions] = useState([
    {
      question_number: "",
      sub_question_number: "",
      description: "",
      co: null,
      max_marks: "",
      min_marks: "",
      sequence: "",
      option_question: "",
    },
  ]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const fetchAcademicYears = useCallback(async () => {
    setLoading((s) => ({ ...s, year: true }));
    try {
      const res = await getRequest(GET_URL.getacademicyear.api, {}, props);
      const raw = res?.data?.data ?? res?.data ?? [];
      const list = asArray(raw)
        .map((d) => ({ id: d?.id, name: d?.name }))
        .filter((x) => x.id && x.name);
      setAcademicYears(list);
    } finally {
      setLoading((s) => ({ ...s, year: false }));
    }
  }, [props]);

  const fetchExamTerms = useCallback(
    async (academicYearId) => {
      setLoading((s) => ({ ...s, term: true }));
      try {
        const res = await getRequest(GET_URL.examterms.api, { academic_year: academicYearId }, props);
        const raw = res?.data?.data ?? res?.data ?? [];
        const list = asArray(raw)
          .map((d) => ({ id: d?.id, name: d?.exam_name ?? d?.name }))
          .filter((x) => x.id && x.name);
        setExamTerms(list);
      } finally {
        setLoading((s) => ({ ...s, term: false }));
      }
    },
    [props]
  );

  const fetchExams = useCallback(
    async (academicYearId, examTermId) => {
      setLoading((s) => ({ ...s, exam: true }));
      try {
        const res = await getRequest(
          GET_URL.exam.api,
          { academic_year: academicYearId, term: examTermId },
          props
        );
        const raw = res?.data?.data ?? res?.data ?? [];
        const list = asArray(raw)
          .map((d) => ({ id: d?.id, name: d?.exam_type_name ?? d?.name }))
          .filter((x) => x.id && x.name);
        setExams(list);
      } finally {
        setLoading((s) => ({ ...s, exam: false }));
      }
    },
    [props]
  );

  const fetchSubjects = useCallback(
    async (academicYearId, examTermId, examId) => {
      setLoading((s) => ({ ...s, subject: true }));
      try {
        const res = await getRequest(
          GET_URL.staffsubjectcoursedesign.api,
          { academic_year: academicYearId, term: examTermId, exam: examId, is_active: true },
          props
        );
        const raw = res?.data?.data ?? res?.data ?? [];
        const list = asArray(raw)
          .map((d) => ({
            id: d?.subject_id ?? d?.subject?.id ?? d?.id,
            name: d?.subject_name ?? d?.subject?.name ?? d?.name,
          }))
          .filter((x) => x.id && x.name);
        setSubjects(list);
      } finally {
        setLoading((s) => ({ ...s, subject: false }));
      }
    },
    [props]
  );

  const fetchCOList = useCallback(
    async (academicYearId, subjectId) => {
      const res = await getRequest(
        GET_URL.staffsubjectcoursedesign.api,
        { academic_year: academicYearId, subject_id: subjectId },
        props
      );
      const raw = res?.data?.data ?? res?.data ?? [];
      const rows = asArray(raw);
      const coItems = rows.flatMap((r) => (Array.isArray(r?.co) ? r.co : []));
      const list = coItems
        .map((d) => ({
          id: d?.id ?? d?.course_outcome,
          name: d?.course_outcome__name ?? `CO${d?.course_outcome ?? ""}`,
          description: d?.description ?? "",
        }))
        .filter((x) => x.id);
      setCoList(list);
    },
    [props]
  );

  useEffect(() => {
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  useEffect(() => {
    setBlankData(
      academicYear && examTerm && exam && subject
        ? ""
        : "Select Academic Year, Term, Exam and Subject"
    );
  }, [academicYear, examTerm, exam, subject]);


  const onAcademicYearChange = async (_e, newVal) => {
    setAcademicYear(newVal);
    setExamTerm(null);
    setExam(null);
    setSubject(null);
    setCoList([]);
    setExamTerms([]);
    setExams([]);
    setSubjects([]);
    if (newVal?.id) {
      await fetchExamTerms(newVal.id);
    }
  };

  const onExamTermChange = async (_e, newVal) => {
    setExamTerm(newVal);

    setExam(null);
    setSubject(null);
    setCoList([]);
    setExams([]);
    setSubjects([]);

    if (academicYear?.id && newVal?.id) {
      await fetchExams(academicYear.id, newVal.id);
    }
  };

  const onExamChange = async (_e, newVal) => {
    setExam(newVal);

    setSubject(null);
    setCoList([]);
    setSubjects([]);

    if (academicYear?.id && examTerm?.id && newVal?.id) {
      await fetchSubjects(academicYear.id, examTerm.id, newVal.id);
    }
  };

  const onSubjectChange = async (_e, newVal) => {
    setSubject(newVal);
    setCoList([]);
    if (academicYear?.id && newVal?.id) {
      await fetchCOList(academicYear.id, newVal.id);
    }
  };

  const addQuestion = () => {
    setQuestions((qs) => [
      ...qs,
      {
        question_number: "",
        sub_question_number: "",
        description: "",
        co: null,
        max_marks: "",
        min_marks: "",
        sequence: "",
        option_question: "",
      },
    ]);
  };

  const updateQuestion = (index, field, value) => {
    setQuestions((qs) => {
      const copy = [...qs];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const removeQuestion = (index) => {
    setQuestions((qs) => qs.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!academicYear || !examTerm || !exam || !subject) {
      Swal.fire("Missing", "Please select Year, Term, Exam and Subject.", "warning");
      return;
    }

    const payload = {
      academic_year: academicYear.id,
      exam_id: exam.id,
      subject_id: subject.id,
      fordate: selectedDate ? selectedDate.toISOString().split("T")[0] : null,
      start_time: startTime || null,
      end_time: endTime || null,
      question_list: questions.map((q) => ({
        question_number: q.question_number,
        sub_question_number: q.sub_question_number,
        description: q.description,
        sequence: q.sequence,
        max_marks: q.max_marks !== "" && q.max_marks != null ? parseInt(q.max_marks, 10) : null,
        min_marks: q.min_marks !== "" && q.min_marks != null ? parseInt(q.min_marks, 10) : null,
        option_question: q.option_question || null,
        co: Array.isArray(q.co)
              ? q.co.map(item => item.course_outcome).filter(v => v != null) // ✅ only course_outcome IDs
              : q.co?.course_outcome ?? null,
        ...(q.id ? { id: q.id } : {}),
      })),
    };

    const res = await postRequest(POST_URL.examschedulequestionmapping.api, payload, props);
    if (res && res.status === 200) {
      Swal.fire({
        position: "top-end",
        icon: "success",
        title: "Your Data has been saved",
        showConfirmButton: false,
        timer: 1500,
      });
      props.history.push(Actions.course_design.view.url);
    }
  };

  return (
    <Paper className="paper-background">
      <Grid container>
        <Grid item md={6} xs={12} className="header-align">
          <Box className="heading">Create Questions</Box>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item md={3} xs={12} className="margin-top-20">
          <DropDownWithSearch
            options={academicYears}
            label={"Academic Year"}
            name="academicYear"
            value={academicYear}
            onChange={onAcademicYearChange}
            hideClearIcon
            size="small"
            style="width-100"
          />
        </Grid>

        <Grid item md={3} xs={12} className="margin-top-20">
          <DropDownWithSearch
            options={examTerms}
            label={"Exam Term"}
            name="examTerm"
            value={examTerm}
            onChange={onExamTermChange}
            hideClearIcon
            size="small"
            style="width-100"
            disabled={!academicYear}
          />
        </Grid>

        <Grid item md={3} xs={12} className="margin-top-20">
          <DropDownWithSearch
            options={exams}
            label={"Exam"}
            name="exam"
            value={exam}
            onChange={onExamChange}
            hideClearIcon
            size="small"
            style="width-100"
            disabled={!academicYear || !examTerm}
          />
        </Grid>

        <Grid item md={3} xs={12} className="margin-top-20">
          <DropDownWithSearch
            options={subjects}
            label={"Subject"}
            name="subject"
            value={subject}
            onChange={onSubjectChange}
            hideClearIcon
            size="small"
            style="width-100"
            disabled={!academicYear || !examTerm || !exam}
          />
        </Grid>
      </Grid>

      {!(academicYear && examTerm && exam && subject) ? (
        <BlankPagewithIcon data={blankData} />
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Box mb={2} className="fs-18 form-left-heading">Questions</Box>

            {questions.map((q, index) => (
              <Paper key={index} className="p-20px">
                <Grid container spacing={2}>
                  <Grid item md={3} xs={12}>
                    <TextField
                      label="Q. No."
                      variant="outlined"
                      size="small"
                      fullWidth
                      value={q.question_number}
                      onChange={(e) => updateQuestion(index, "question_number", e.target.value)}
                    />
                  </Grid>

                  <Grid item md={3} xs={12}>
                    <TextField
                      label="Sub Q."
                      variant="outlined"
                      size="small"
                      fullWidth
                      value={q.sub_question_number}
                      onChange={(e) => updateQuestion(index, "sub_question_number", e.target.value)}
                    />
                  </Grid>

                  <Grid item md={6} xs={12}>
                    <TextField
                      label="Description"
                      variant="outlined"
                      size="small"
                      fullWidth
                      value={q.description}
                      onChange={(e) => updateQuestion(index, "description", e.target.value)}
                    />
                  </Grid>

                  <Grid item md={4} xs={12}>
                    <DropDownWithSearch
                      options={coList}
                      label="CO"
                      name={`co-${index}`}
                      value={q.co}
                      onChange={(_e, v) => updateQuestion(index, "co", v)}
                      hideClearIcon
                      size="small"
                      style={{ width: "100%" }}
                      disabled={coList.length === 0}
                    />
                  </Grid>

                  <Grid item md={4} xs={12}>
                    <TextField
                      type="number"
                      label="Max Marks"
                      variant="outlined"
                      size="small"
                      fullWidth
                      value={q.max_marks}
                      onChange={(e) => updateQuestion(index, "max_marks", e.target.value)}
                    />
                  </Grid>

                  <Grid item md={4} xs={12}>
                    <TextField
                      type="number"
                      label="Min Marks"
                      variant="outlined"
                      size="small"
                      fullWidth
                      value={q.min_marks}
                      onChange={(e) => updateQuestion(index, "min_marks", e.target.value)}
                    />
                  </Grid>

                  <Grid item md={4} xs={12}>
                    <TextField
                      label="Seq."
                      variant="outlined"
                      size="small"
                      fullWidth
                      value={q.sequence}
                      onChange={(e) => updateQuestion(index, "sequence", e.target.value)}
                    />
                  </Grid>

                  <Grid item md={4} xs={12}>
                    <TextField
                      label="Optional Q."
                      variant="outlined"
                      size="small"
                      fullWidth
                      value={q.option_question || ""}
                      onChange={(e) => updateQuestion(index, "option_question", e.target.value)}
                    />
                  </Grid>

                  <Grid item md={4} xs={12}>
                    <IconButton color="error" onClick={() => removeQuestion(index)}>
                      <DeleteOutline />
                    </IconButton>
                  </Grid>
                </Grid>
              </Paper>
            ))}

            <Box mt={4}>
              <Button variant="outlined" startIcon={<AddCircleOutline />} onClick={addQuestion}>
                Add Question
              </Button>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box mb={2} className="fs-18 form-left-heading">Exam Schedule</Box>
            <Paper className="p-20px">
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <MuiPickersUtilsProvider utils={DateFnsUtils}>
                    <KeyboardDatePicker
                      variant="inline"
                      inputVariant="outlined"
                      format="dd-MM-yyyy"
                      label="Exam Date"
                      value={selectedDate}
                      onChange={(date) => setSelectedDate(date)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </MuiPickersUtilsProvider>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    type="time"
                    label="Start Time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ step: 300 }}
                    variant="outlined"
                    fullWidth
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    type="time"
                    label="End Time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ step: 300 }}
                    variant="outlined"
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Box mt={3} ml={2} mb={4}>
            <Button variant="contained" color="primary" onClick={handleSubmit}>
              Save Exam Schedule
            </Button>
          </Box>
        </Grid>
      )}
    </Paper>
  );
};

export default ExamSchedulePage;
