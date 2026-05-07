import React, { useEffect, useState } from "react";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { withRouter } from "react-router-dom";
import {
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
} from "@material-ui/core";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import './StudentMarksCard.css';

function StudentMarksCard({ studentId }) {
  const [standardList, setStandardList] = useState([]);
  const [selectedExamKey, setSelectedExamKey] = useState(null);
  const [subjectDetails, setSubjectDetails] = useState({});

  const getExamMarkDetails = async (examId, standardSection, key) => {
    const url = GET_URL.studentmark.api;
    const params = {
      is_active: true,
      student: studentId,
      exam: examId,
      standard_section: standardSection,
    };

    try {
      const response = await getRequest(url, params, {
        return_error_message: true,
      });
      if (
        response.status === 200 &&
        Array.isArray(response.data.data?.student_list)
      ) {
        const studentData = response.data.data.student_list.find(
          (student) => student.student === studentId
        );
        const summary = studentData?.total_summary;
        if (studentData) {
          const subjects = studentData.subject_list;

          if (subjects && Object.keys(subjects).length > 0) {
            const formattedSubjects = Object.values(subjects).map((subject) => ({
              subject_name: subject.subject_name,
              marks: subject.marks,
              min_marks: subject.min_marks,
              max_marks: subject.max_marks,
              result: subject.result,
              total_obtained_marks: subject.total_obtained_marks,
              attendance_status: subject.attendance_status,
              cumulative_id_mark_mapping: subject.cumulative_id_mark_mapping || {},
              summary:subject.total_summary || {},              
            }));


            setSubjectDetails((prev) => ({
              ...prev,
              [key]: {
                subjects: formattedSubjects,
                summary: studentData.total_summary || {},
              },
            }));
             
            setSelectedExamKey((prev) => (prev === key ? null : key));
          } else {
            console.error("No subjects found for this student.");
          }
        } else {
          console.error("Student not found with ID.");
        }
      } else {
        console.error("Invalid response format or no student list found.");
      }
    } catch (err) {
      console.error("Error fetching detailed marks.");
    }
  };

  useEffect(() => {
    const fetchStandardData = async () => {
      if (!studentId) return;
  
      const standardUrl = GET_URL.getmystandard1.api;
      try {
        const response = await getRequest(standardUrl, {
          student_id: studentId,
        });
        if (response?.status === 200) {
          const standardData = response.data?.data || [];
  
          const withExams = await Promise.all(
            standardData.map(async (item) => {
              const examUrl = `${GET_URL.studentexammarkssummary.api}?student_id=${studentId}&academic_year=${item.academic_year}`;
              try {
                const examResponse = await getRequest(examUrl);
                const exams = Array.isArray(examResponse.data)
                  ? examResponse.data
                  : [];
  
                const grouped = {};
                exams.forEach((exam) => {
                  const termKey = `${exam.exam__term}-${exam.term_name}`;
                  if (!grouped[termKey]) {
                    grouped[termKey] = {
                      term_name: exam.term_name,
                      term_id: exam.exam__term,
                      exams: [],
                    };
                  }
                  grouped[termKey].exams.push(exam);
                });
  
                const termsWithSummary = Object.values(grouped).map((term) => {
                  const totalObtained = term.exams.reduce(
                    (sum, exam) => sum + (exam.total_obtained_marks || 0),
                    0
                  );
                  const totalMarks = term.exams.reduce(
                    (sum, exam) => sum + (exam.total_marks || 0),
                    0
                  );
                  const avgPercent = totalMarks > 0 ? ((totalObtained / totalMarks) * 100).toFixed(2) : "0.00";
  
                  return {
                    ...term,
                    total_obtained: totalObtained,
                    total_marks: totalMarks,
                    average_percentage: avgPercent,
                  };
                });
  
                return {
                  ...item,
                  terms: termsWithSummary,
                };
              } catch (err) {
                console.error("Exam fetch failed", err);
                return { ...item, terms: [] };
              }
            })
          );
  
          setStandardList(withExams);
        }
      } catch (err) {
        console.error("Standard fetch failed", err);
      }
    };
  
    fetchStandardData();
  }, [studentId]);
  

  return (
    <Box mt={2} width="100%">
      {standardList.length > 0 ? (
        standardList.reverse().map((stdItem, idx) => (
          <Accordion key={idx}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon style={{ color: "#fff" }} />}
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.12)",
                color: "black",
              }}
            >
              <Typography variant="h6">{stdItem.standard_name}</Typography>
            </AccordionSummary>
            <AccordionDetails style={{ display: "block" }} >
              {stdItem.terms.length > 0 && (
                <>
                  <Typography variant="body1" style={{ marginBottom: "8px" , paddingLeft: "15px"}}>
                    <strong>Term Summary:</strong>
                  </Typography>
                  {stdItem.terms.map((term, tIdx) => (
                    <Box key={tIdx} mt={1} style={{ paddingLeft: "15px", marginBottom: "15px" }}> 
                      <Typography variant="body2">
                        <strong>{term.term_name}</strong>
                      </Typography>
                      <Typography>
                        Obtained Marks: {term.total_obtained}
                      </Typography>
                      <Typography>
                        Total Marks: {term.total_marks}
                      </Typography>
                      <Typography>
                      Average: {term.average_percentage}%
                      </Typography>
                    </Box>
                  ))}
                </>
              )}
  
              {stdItem.terms.length > 0 ? (
                stdItem.terms.map((term, tIdx) => (
                  <Accordion
                    key={tIdx}
                    style={{ marginLeft: "16px", marginBottom: "8px" }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>
                        <strong>{term.term_name}</strong>
                      </Typography>
                    </AccordionSummary>
  
                    <AccordionDetails style={{ display: "block" }}>
                      {term.exams.length > 0 ? (
                        term.exams.map((exam, eIdx) => {
                          const key = `${stdItem.standard_section}_${exam.exam}`;
                          const subjectsData = subjectDetails[key] || {};
                          const subjects = subjectsData.subjects || [];
                          const summary = subjectsData.summary || {};

                          const cumulativeTypes = Array.from(
                                                        new Set(
                                                          subjects.flatMap((subj) =>
                                                            Object.keys(subj.cumulative_id_mark_mapping || {})
                                                          )
                                                        )
                                                      );
  
                          return (
                            <Accordion
                              key={eIdx}
                              style={{
                                marginLeft: "16px",
                                marginBottom: "4px",
                              }}
                            >
                              <AccordionSummary
                                expandIcon={<ExpandMoreIcon style={{ color: "#fff" }} />}
                                style={{
                                  backgroundColor: "rgba(0, 0, 0, 0.12)",
                                  color: "black",
                                }}
                              >
                                <Typography>{exam.exam_name}</Typography>
                              </AccordionSummary>
                              <AccordionDetails style={{ display: "block", paddingLeft: "16px" }}>
                                <Typography>
                                  <strong>Exam:</strong> {exam.exam_name}
                                </Typography>
                                <Typography>
                                  <strong>Obtained Marks:</strong> {exam.total_obtained_marks}
                                </Typography>
                                <Typography>
                                  <strong>Total Marks:</strong> {exam.total_marks}
                                </Typography>
                                <Typography>
                                  <strong>Result:</strong> {exam.final_result}
                                </Typography>
  
                                <Box mt={2}>
                                  <Button
                                    variant="contained"
                                    style={{ backgroundColor: "#3f51b5", color: "#fff" }}
                                    onClick={() =>
                                      getExamMarkDetails(
                                        exam.exam,
                                        stdItem.standard_section,
                                        key
                                      )
                                    }
                                  >
                                    {selectedExamKey === key ? "Hide Marks" : "View Marks"}
                                  </Button>
                                </Box>
  
                                {selectedExamKey === key && subjects.length > 0 && (
                                  <Box mt={2}>
                                    <table>
                                      <thead>
                                        <tr>
                                          <th>Type</th>
                                          {subjects.map((subject, idx) => (
                                            <th key={idx}>{subject.subject_name}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                      <tr style={{ fontWeight: "bolder" }}>
                                          <td style={{ fontWeight: "bolder" }}>Marks</td>
                                          {subjects.map((subject, idx) => (
                                            <td
                                              key={idx}
                                              style={{
                                                color: subject.attendance_status === "Absent" ? "red" : "inherit",
                                                fontWeight: subject.attendance_status === "Absent" ? "bolder" : "bolder",
                                              }}
                                            >
                                              {subject.attendance_status === "Absent" ? "Ab" : subject.marks}
                                            </td>
                                          ))}
                                        </tr>
                                        <tr>
                                          <td>Min Marks</td>
                                          {subjects.map((subj, idx) => (
                                            <td key={idx}>{subj.min_marks}</td>
                                          ))}
                                        </tr>
                                        <tr>
                                          <td>Max Marks</td>
                                          {subjects.map((subj, idx) => (
                                            <td key={idx}>{subj.max_marks}</td>
                                          ))}
                                        </tr>
                                        {cumulativeTypes.map((type) => (
                                          <React.Fragment key={type}>
                                            <tr style={{ fontWeight: "bolder" }}>
                                                <td style={{ fontWeight: "bolder" }}>{type} Marks</td>
                                                {subjects.map((subj, idx) => (
                                                  <td 
                                                    key={idx}
                                                    style={{
                                                      color: subj.attendance_status === "Absent" ? "red" : "inherit",
                                                      fontWeight: subj.attendance_status === "Absent" ? "bolder" : "bolder",
                                                    }}
                                                  >
                                                    {subj.attendance_status === "Absent"
                                                      ? "Ab"
                                                      : subj.cumulative_id_mark_mapping?.[type]?.marks ?? "-"}
                                                  </td>
                                                ))}
                                              </tr>
                                            <tr>
                                              <td>{type} Min</td>
                                              {subjects.map((subj, idx) => (
                                                <td key={idx}>
                                                  {subj.cumulative_id_mark_mapping?.[type]?.exam_cumulative__min_marks ?? "-"}
                                                </td>
                                              ))}
                                            </tr>
                                            <tr>
                                              <td>{type} Max</td>
                                              {subjects.map((subj, idx) => (
                                                <td key={idx}>
                                                  {subj.cumulative_id_mark_mapping?.[type]?.exam_cumulative__max_marks ?? "-"}
                                                </td>
                                              ))}
                                            </tr>
                                          </React.Fragment>
                                        ))}
                                         <tr style={{ fontWeight: "bolder" }}>
                                          <td>Total</td>
                                          {subjects.map((subj, idx) => (
                                            <td key={idx}>{subj.total_obtained_marks}</td>
                                          ))}
                                        </tr>
                                        <tr>
                                            <td><strong>Result</strong></td>
                                            {subjects.map((subj, idx) => (
                                              <td
                                                key={idx}
                                                style={{
                                                  fontWeight: "bolder",
                                                  color:
                                                    subj.result?.toLowerCase() === "pass"
                                                      ? "green"
                                                      : subj.result?.toLowerCase() === "fail"
                                                      ? "red"
                                                      : "inherit",
                                                }}
                                              >
                                                {subj.result}
                                              </td>
                                            ))}
                                          </tr>
                                      </tbody>
                                    </table>
  
                                    {summary && Object.keys(summary).length > 0 && (
                                      <Box mt={3} p={2} id="total-summary-box">
                                        <table >
                                          <tbody>
                                            <tr>
                                              <th>Total Marks</th>
                                              <td>{summary.total_marks}</td>
                                            </tr>
                                            <tr>
                                              <th>Obtained Marks</th>
                                              <td>{summary.total_obtained_marks}</td>
                                            </tr>
                                            <tr>
                                              <th>Minimum Marks</th>
                                              <td>{summary.total_min_marks}</td>
                                            </tr>
                                            <tr>
                                              <th>Percentage</th>
                                              <td>{summary.percentage?.toFixed(2)}%</td>
                                            </tr>
                                            <tr>
                                                <th>Result</th>
                                                <td
                                                  style={{
                                                    color:
                                                      summary.total_result?.toLowerCase() === "pass"
                                                        ? "green"
                                                        : summary.total_result?.toLowerCase() === "fail"
                                                        ? "red"
                                                        : "inherit",
                                                    fontWeight: "bolder",
                                                  }}
                                                >
                                                  {summary.total_result}
                                                </td>
                                              </tr>
                                          </tbody>
                                        </table>
                                      </Box>
                                    )}
                                  </Box>
                                )}
                              </AccordionDetails>
                            </Accordion>
                          );
                        })
                      ) : (
                        <Typography>No exams for this term.</Typography>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))
              ) : (
                <Typography>No terms found for this standard.</Typography>
              )}
            </AccordionDetails>
          </Accordion>
        ))
      ) : (
        <Typography>No standard data available.</Typography>
      )}
    </Box>
  );  
}

export default withRouter(StudentMarksCard);