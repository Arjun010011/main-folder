import React from "react";
import {
  Checkbox,
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
  FormControl,
  NativeSelect,
  Tooltip,
  TextField,
  Tab,
} from "@material-ui/core";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";
import { numberWithCommasWithoutSymbol } from "Includes/functions";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import {
  isFormDefinitionEnabled,
} from "Includes/CheckFormDefinition";

import ReactExport from "react-export-excel";
import * as XLSX from "xlsx";
import { GET_URL } from "Includes/urls";
import { getRequest } from "Includes/api/apicall";
import { useLocation } from "react-router-dom";

const ExcelFile = ReactExport.ExcelFile;
const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};
const exam_config = JSON.parse(localStorage.getItem("exam_configurations"))
  ? JSON.parse(localStorage.getItem("exam_configurations"))
  : {};
const is_cumulative = exam_config["cumulative_type"] == 1 ? true : false;

function ResultExamWiseIndividual(props) {
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);

  const {
    markDetails,
    is_mark_result,
    handleChange,
    onchangeSubject,
    selectedSubjectDropdown,
    searchStudent,
    selectedFilter,
    is_announced,
    currentTab,
    submitDisable,
    handleIsAnnouncedChangePerStudent
  } = props;
  const [showCumulative, setShowCumulative] = React.useState(false);
  const [part_type, set_part_type] = React.useState({});
  const [isLoadingDownload, setIsLoadingDownload] = React.useState(false);
  const [hide_pass_or_fail]=React.useState(isFormDefinitionEnabled(
    "exam_configurations",
    "hide_pass_or_fail",
    1
  ))
  const handleChangeCumulative = () => {
    setShowCumulative(() => !showCumulative);
  };
  const { isAnnouncedUpdates, setIsAnnouncedUpdates } = props;

  React.useEffect(() => {
    let part_type_temp = {};
    if (markDetails.part_type_list) {
      markDetails.part_type_list.map((data) => {
        part_type_temp[data["id"]] = {
          list: [],
          id: data["id"],
          name: data["name"],
        };
      });
    }
    markDetails.subject_list.map((subData, subIndex) => {
      Object.keys(part_type_temp).map((part_key) => {
        if (
          subData.subject_part_type_id == part_key &&
          !part_type_temp[part_key].list.includes(subData.subject)
        ) {
          part_type_temp[part_key].list.push(subData.subject);
        }
      });
    });
    Object.keys(part_type_temp).map((part_key) => {
      if (part_type_temp[part_key].list.length === 0) {
        delete part_type_temp[part_key];
      }
    });
    set_part_type(() => part_type_temp);
  }, [markDetails]);

  const getSubjectNameFormat = (part) => {
    return (
      <>
        {markDetails.subject_list.map((data) => {
          return (
            <>
              {part_type[part].list.includes(data.subject) &&
              selectedSubjectDropdown.some(
                (key) => key.value === data.subject
              ) ? (
                <>
                  <TableCell className="selectable-table-head p-5px text-align-center">
                    {data.subject_name}
                  </TableCell>
                  {showCumulative &&
                    data.cumulative_data &&
                    data.cumulative_data.map((cum_data) => {
                      return (
                        <TableCell className="selectable-table-head p-5px text-align-center"></TableCell>
                      );
                    })}
                  {showCumulative && (
                    <TableCell className="selectable-table-head p-5px text-align-center"></TableCell>
                  )}
                  {showCumulative ? (
                    <TableCell className="selectable-table-head p-5px text-align-center"></TableCell>
                  ) : (
                    <TableCell className="selectable-table-head p-5px text-align-center">
                      Grade
                    </TableCell>
                  )}
                </>
              ) : (
                ""
              )}
            </>
          );
        })}
      </>
    );
  };

  const getCountSubjects = (part) => {
    let count = -1;
    markDetails.subject_list.map((data) => {
      if (
        part_type[part].list.includes(data.subject) &&
        selectedSubjectDropdown.some((key) => key.value === data.subject)
      ) {
        count = count + 2;
        if (showCumulative) {
          count = count + 1;
          data.cumulative_data &&
            data.cumulative_data.map((cum_data) => {
              count = count + 1;
            });
        }
      }
    });
    return count;
  };

  const getCumNameFormat = (part) => {
    return (
      <>
        {markDetails.subject_list.map((data) => {
          return (
            <>
              {part_type[part].list.includes(data.subject) &&
              selectedSubjectDropdown.some(
                (key) => key.value === data.subject
              ) ? (
                <>
                  <TableCell className="cumulative-head text-align-center">
                    {alias_names["written"]}
                  </TableCell>
                  {showCumulative &&
                    data.cumulative_data &&
                    data.cumulative_data.map((cum_data) => {
                      return (
                        <TableCell className="cumulative-head text-align-center">
                          {cum_data.names}
                        </TableCell>
                      );
                    })}
                  <TableCell className="cumulative-head text-align-center">
                    Total
                  </TableCell>
                  <TableCell className="cumulative-head text-align-center">
                    Grade
                  </TableCell>
                </>
              ) : (
                ""
              )}
            </>
          );
        })}
      </>
    );
  };

  const getMinMaxMarksFormat = (part) => {
    return (
      <>
        {markDetails.subject_list.map((data) => {
          return (
            <>
              {part_type[part].list.includes(data.subject) &&
              selectedSubjectDropdown.some(
                (key) => key.value === data.subject
              ) ? (
                <>
                  {(!is_cumulative || showCumulative) && (
                    <TableCell className="">{`Max-${data.max_marks} Min-${data.min_marks}`}</TableCell>
                  )}
                  {showCumulative &&
                    data.cumulative_data &&
                    data.cumulative_data.map((cum_data) => {
                      return (
                        <TableCell className="">
                          {`Max-${cum_data.max_marks} Min-${cum_data.min_marks}`}
                        </TableCell>
                      );
                    })}
                  {(showCumulative || is_cumulative) && (
                    <TableCell className="">{`Max-${data.total_max_marks} Min-${data.total_min_marks}`}</TableCell>
                  )}
                  <TableCell className=""></TableCell>
                </>
              ) : (
                ""
              )}
            </>
          );
        })}
      </>
    );
  };

  const handleDownloadMarks = async () => {
    const selectedExam = searchParams.get("selectedExam");
    const selectedTerm = searchParams.get("selectedTerm");
    const standard_section_id = searchParams.get("standard_section_id");
    const standard_name = searchParams.get("standard_name");
    const section_name = searchParams.get("section_name");

    if (!selectedExam || !selectedTerm || !standard_section_id) {
      console.error("Missing parameters for download");
      return;
    }

    try {
      setIsLoadingDownload(true);

      const url = GET_URL.studentmark.api;
      const param = {
        is_active: true,
        print_consolidated_marks: 1,
        print_consolidated_marks_new:1,
        exam: selectedExam,
        term: selectedTerm,
        standard_section: standard_section_id,
      };
      const propObj = { responseType: "blob" };

      const response = await getRequest(url, param, propObj);

      if (response && response.status === 200) {
        const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = blobUrl;
        link.setAttribute(
          "download",
          `Cons - [${standard_name ?? ""} - ${section_name ?? ""}].xlsx`
        );
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(blobUrl);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingDownload(false);
    }
  };

  const getStudentMarks = (student, part) => {
    return (
      <>
        {markDetails.subject_list.map((subject, subIndex) => {
          return (
            <>
              {part_type[part].list.includes(subject.subject) &&
              selectedSubjectDropdown.some(
                (key) => key.value === subject.subject
              ) ? (
                <>
                  {(!is_cumulative || showCumulative) && (
                    <TableCell
                      className="mark-add-table-cell h-37px p-5px"
                      component="th"
                      scope="row"
                    >
                      {Boolean(student.subject_list[subject.subject]) && (
                        <Box className="result-view-entered">
                          {student.subject_list[subject.subject]
                            .attendance_status == "Absent" ? (
                            <Box className="text-red">Ab</Box>
                          ) : (
                            numberWithCommasWithoutSymbol(
                              student.subject_list[subject.subject].marks
                            )
                          )}
                        </Box>
                      )}
                      {!Boolean(student.subject_list?.[subject.subject]) && (
                        <Box className="result-view-entered">{`N/A`}</Box>
                      )}
                    </TableCell>
                  )}
                  {showCumulative &&
                    subject.cumulative_data &&
                    subject.cumulative_data.map((cum_data, cumIndex) => {
                      return (
                        <TableCell
                          className="mark-add-table-cell h-37px"
                          component="th"
                          scope="row"
                        >
                          {!Boolean(student.subject_list[subject.subject]) && (
                            <Box className="text-bold result-view-entered">
                              {`N/A`}
                            </Box>
                          )}
                          {Boolean(student.subject_list?.[subject.subject]) && (
                            <Box className="marks-view-entered">
                              {numberWithCommasWithoutSymbol(
                                student.subject_list?.[subject.subject]
                                  .cumulative_data?.[cumIndex].marks
                              )}
                            </Box>
                          )}
                        </TableCell>
                      );
                    })}
                  {(showCumulative || is_cumulative) && (
                    <TableCell
                      className="mark-add-table-cell h-37px"
                      component="th"
                      scope="row"
                    >
                      {Boolean(student.subject_list[subject.subject]) && (
                        <Box className="text-bold marks-view-entered">
                          {student.subject_list[subject.subject]
                            ?.cumulative_data ? (
                            student.subject_list[subject.subject]
                              ?.cumulative_data.length > 0 &&
                            student.subject_list[subject.subject]
                              ?.total_marks ? (
                              numberWithCommasWithoutSymbol(
                                student.subject_list[subject.subject]
                                  ?.total_marks ?? 0
                              )
                            ) : student.subject_list[subject.subject]
                                .attendance_status == "Absent" ? (
                              <Box className="text-red">Ab</Box>
                            ) : (
                              numberWithCommasWithoutSymbol(
                                student.subject_list[subject.subject]
                                  ?.total_marks ?? 0
                              )
                            )
                          ) : (
                            ""
                          )}
                        </Box>
                      )}
                      {!Boolean(student.subject_list[subject.subject]) && (
                        <Box className="text-bold marks-view-entered">
                          {`N/A`}
                        </Box>
                      )}
                    </TableCell>
                  )}
                  <TableCell
                    className="mark-add-table-cell h-37px"
                    component="th"
                    scope="row"
                  >
                    {Boolean(student.subject_list[subject.subject]) && (
                      <Box className="text-bold marks-view-entered">
                        {student.subject_list[subject.subject].grade}
                      </Box>
                    )}
                    {!Boolean(student.subject_list[subject.subject]) && (
                      <Box className="text-bold marks-view-entered">
                        {`N/A`}
                      </Box>
                    )}
                  </TableCell>
                </>
              ) : (
                ""
              )}
            </>
          );
        })}
      </>
    );
  };

  const handleIsAnnouncedChange = (value, stIndex) => {
    const updatedValue = value === "Yes" ? 1 : 0;
    const student = markDetails.student_list[stIndex];
    student.is_announced = updatedValue;
  
    setIsAnnouncedUpdates((prev) => ({
      ...prev,
      [student.student]: {
        'is_announced' : updatedValue,
        'student_id': student.student,
      },
    }));
  
    handleIsAnnouncedChangePerStudent &&
      handleIsAnnouncedChangePerStudent(value, stIndex);
  };
  
 

  return (
    <>
      <Grid container className="header-align">
        <Grid item md={3} xs={12}>
          <Box className="result-section-view-filter-outer-box">
            <label onChange={() => props.onChangeFilter("all")}>
              <input
                type="radio"
                value="all"
                name="selectedFilter"
                checked={selectedFilter == "all"}
                defaultChecked={selectedFilter == "all"}
              />{" "}
              All
            </label>
            <label onChange={() => props.onChangeFilter("pass")}>
              <input
                type="radio"
                value="pass"
                name="selectedFilter"
                checked={selectedFilter == "pass"}
                defaultChecked={selectedFilter == "pass"}
              />{" "}
              Passed
            </label>

            <label onChange={() => props.onChangeFilter("fail")}>
              <input
                type="radio"
                value="fail"
                name="selectedFilter"
                checked={selectedFilter == "fail"}
                defaultChecked={selectedFilter == "fail"}
              />{" "}
              Failed
            </label>
          </Box>
        </Grid>
        {/* {!is_mark_result && !is_announced && currentTab !== "examConfig" && (
          <Grid
            item
            md={2}
            xs={12}
            className="flex-justify-center margin-top-10"
          >
            <Tooltip
              title={!is_mark_result ? "Update Pass/Fail" : "View Pass/Fail"}
              enterDelay={400}
              enterNextDelay={400}
              placement="top-start"
              classes={{ tooltip: "tooltip-show-data" }}
            >
              <Button
                className={
                  is_mark_result
                    ? "exam-mark-absent-button"
                    : "exam-enter-marks-button"
                }
                onClick={() => props.handleMarkPassOrFail()}
              >
                <Box>Update Result</Box>
              </Button>
            </Tooltip>
          </Grid>
        )} */}
        {is_mark_result && !is_announced && (
          <Grid
            item
            md={2}
            xs={12}
            className="flex-justify-center margin-top-10"
          >
            <Button
              className={
                is_mark_result
                  ? "exam-mark-absent-button"
                  : "exam-enter-marks-button"
              }
              onClick={() => props.handleMarkPassOrFail()}
            >
              <Box>Cancel</Box>
            </Button>
          </Grid>
        )}
        {!is_announced && !is_mark_result && (
          <Grid item md={9} xs={12}>
            <Button
              className="submit"
              variant="contained"
              style={{ float: "right" }}
              disabled={submitDisable}
              onClick={(e) => props.submitAndFinalize()}
            >
              Announce Result
            </Button>
          </Grid>
        )}
        {is_announced && (
          <Grid item md={9} xs={12}>
            <Button
              className="result-announced-exam"
              variant="contained"
              style={{ float: "right" }}
              disabled={true}
            >
              Result Announced
            </Button>
          </Grid>
        )}
      </Grid>

      {selectedSubjectDropdown.length === 0 && (
        <BlankPagewithIcon data="Select subject to see the details" />
      )}
      {selectedSubjectDropdown.length > 0 && (
        <>
          <Grid container className="mt-20">
            <Grid item md={3} xs={12}>
              <TextField
                id="outlined-name"
                value={searchStudent}
                placeholder=""
                label="Search Student"
                name="searchStudent"
                onChange={(e) => {
                  props.handleFilter(e);
                }}
              />
            </Grid>
            {is_cumulative && (
              <Grid item lg={3} md={3} xs={12}>
                <Checkbox
                  onChange={handleChangeCumulative}
                  color="primary"
                  name={"showCumulative"}
                  checked={showCumulative}
                  defaultChecked={showCumulative}
                  value={showCumulative}
                  inputProps={{
                    "aria-label": "primary checkbox",
                  }}
                />
                <span>{`Show ${alias_names["cumulative"]}`}</span>
              </Grid>
            )}
            <Grid item lg={3} md={6} xs={12}>
              <MultipleSelectDropdown
                data_list={markDetails.subject_list}
                selected_list={selectedSubjectDropdown}
                error={false}
                label={"Select Subjects"}
                onChange={(e) => onchangeSubject(e)}
                size="small"
              />
            </Grid>
            <Grid item lg={3} md={6} xs={12}>
              <Box className="end-flex-prop">
              <Button
                className="custom-button height-fit-content ml-10"
                onClick={isLoadingDownload ? undefined : handleDownloadMarks}
                disabled={isLoadingDownload}
              >
                {isLoadingDownload ? "Downloading..." : "Download Marks"}
              </Button>
                {/* <ExcelFile
                  element={
                    <Button className="custom-button">Download Marks</Button>
                  }
                >
                  <ExcelSheet
                    data={props.download_details.values}
                    name="Employees"
                  >
                    {props.download_details.columns.map((day_data) => {
                      return (
                        <ExcelColumn
                          label={day_data}
                          value={day_data}
                          style={{
                            alignment: { horizontal: "center" },
                          }}
                        />
                      );
                    })}
                  </ExcelSheet>
                </ExcelFile> */}
              </Box>
            </Grid>
          </Grid>

          <Box display="flex">
            <TableContainer className="result-view-bg header-align ">
              <Table
                size="small"
                aria-label="simple table"
                className="exam-mark-row-table"
              >
                <TableHead>
                  {Object.keys(part_type).length > 1 && (
                    <TableRow className="">
                      <TableCell className="part-type-table-head"></TableCell>
                      {Object.keys(part_type).map((part_key) => {
                        return (
                          part_type[part_key].list.length > 0 && (
                            <>
                              <TableCell className="part-type-table-head text-align-center">
                                {part_type[part_key]["name"]}
                              </TableCell>
                              {getCountSubjects(part_key) > 0 && (
                                <TableCell
                                  className="part-type-table-head"
                                  colSpan={getCountSubjects(part_key)}
                                ></TableCell>
                              )}
                            </>
                          )
                        );
                      })}
                    </TableRow>
                  )}
                  <TableRow className="">
                    <TableCell className="selectable-table-head">
                      Student
                    </TableCell>
                    {Object.keys(part_type).map((part_key) => {
                      return getSubjectNameFormat(part_key);
                    })}
                  </TableRow>
                </TableHead>
                <TableHead>
                  {showCumulative && (
                    <TableRow className="">
                      <TableCell className="cumulative-head text-align-center"></TableCell>
                      {Object.keys(part_type).map((part_key) => {
                        return getCumNameFormat(part_key);
                      })}
                    </TableRow>
                  )}
                  <TableRow className="">
                    <TableCell className=""></TableCell>
                    {Object.keys(part_type).map((part_key) => {
                      return getMinMaxMarksFormat(part_key);
                    })}
                  </TableRow>
                </TableHead>
                <TableBody className="selectable-row-table-body">
                  {markDetails.student_list.map((student, stIndex) => {
                    return (
                      <TableRow className="selectable-row-table-row">
                        <TableCell
                          className="mark-add-table-cell h-37px p-5px result-view-student-name"
                          component="th"
                          scope="row"
                        >
                          {student.student_name}
                        </TableCell>
                        {Object.keys(part_type).map((part_key) => {
                          return getStudentMarks(student, part_key);
                        })}
                        <TableCell className="mark-add-table-cell h-37px p-5px"></TableCell>
                      </TableRow>
                    );
                  })}
                  {markDetails.student_list.length === 0 && (
                    <tr className="text-center font-weight-bold">
                      No Data Found
                    </tr>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TableContainer className="result-view-bg header-align ">
              <Table
                size="small"
                aria-label="simple table"
                className="exam-mark-row-table"
              >
                <TableHead>
                  {Object.keys(part_type).length > 1 && (
                    <TableRow className="">
                      <TableCell className="">{`--`}</TableCell>
                      <TableCell className="part-type-table-head"></TableCell>
                      <TableCell className="part-type-table-head"></TableCell>
                      <TableCell className="part-type-table-head"></TableCell>
                      <TableCell className="part-type-table-head"></TableCell>
                    </TableRow>
                  )}
                  <TableRow className="">
                    <TableCell></TableCell>
                    <TableCell className="selectable-table-head p-5px text-align-center">
                      Total Marks
                    </TableCell>
                    <TableCell className="selectable-table-head p-5px text-align-center">
                      Obtained Marks
                    </TableCell>
                    <TableCell className="selectable-table-head p-5px text-align-center">
                      %
                    </TableCell>
                    {!hide_pass_or_fail && 
                      <TableCell className="selectable-table-head p-5px text-align-center">
                        Result
                      </TableCell>
                    }
                    <TableCell className="selectable-table-head p-5px text-align-center">
                      Grade
                    </TableCell>
                    <TableCell className="selectable-table-head p-5px text-align-center">
                      Announced
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableHead>
                  <TableRow className="">
                    <TableCell></TableCell>
                    <TableCell className="h-37px p-5px"></TableCell>
                    <TableCell className="h-37px p-5px"></TableCell>
                  </TableRow>
                  {showCumulative && (
                    <TableRow className="">
                      <TableCell></TableCell>
                      <TableCell className="h-37px p-5px"></TableCell>
                      <TableCell className="h-37px p-5px"></TableCell>
                    </TableRow>
                  )}
                </TableHead>
                <TableBody className="selectable-row-table-body">
                  {markDetails.student_list.map((student, stIndex) => {
                    return (
                      <TableRow className="selectable-row-table-row">
                        <TableCell className="mark-add-table-cell h-37px p-5px"></TableCell>
                        <TableCell
                          className="mark-add-table-cell h-37px p-5px"
                          component="th"
                          scope="row"
                        >
                          <Box className="marks-view-entered">
                            {student.total_marks}
                          </Box>
                        </TableCell>
                        <TableCell
                          className="mark-add-table-cell h-37px p-5px"
                          component="th"
                          scope="row"
                        >
                          <Box className="marks-view-entered">
                            {numberWithCommasWithoutSymbol(
                              student.total_summary.total_obtained_marks
                            )}
                          </Box>
                        </TableCell>
                        <TableCell
                          className="mark-add-table-cell h-37px p-5px"
                          component="th"
                          scope="row"
                        >
                          {!is_mark_result && (
                            <Box
                              className={
                                student.total_result == "pass"
                                  ? "marks-view-entered result-pass-text"
                                  : "result-fail-text marks-view-entered"
                              }
                            >
                              {student.total_summary.percentage
                                ? Math.round(student?.total_summary?.percentage * 10) / 10
                                : ""}
                            </Box>
                          )}
                        </TableCell>
                        {!hide_pass_or_fail && (
                          <TableCell
                            className="mark-add-table-cell h-37px p-5px"
                            component="th"
                            scope="row"
                          >
                            {!is_mark_result && (
                              <Box
                                className={
                                  student.total_result === "pass"
                                    ? "result-pass-text marks-view-entered"
                                    : "result-fail-text marks-view-entered"
                                }
                              >
                                {student.total_result}
                              </Box>
                            )}
                            {is_mark_result && (
                              <FormControl>
                                <NativeSelect
                                  value={student.total_result}
                                  onChange={(e) => handleChange(e, stIndex)}
                                  name="total_result"
                                >
                                  <option value="pass">Pass</option>
                                  <option value="fail">Fail</option>
                                </NativeSelect>
                              </FormControl>
                            )}
                          </TableCell>
                        )}
                        <TableCell
                          className="mark-add-table-cell h-37px p-5px"
                          component="th"
                          scope="row"
                        >
                          <Box
                            style={{
                              color: "#4680FF",
                              fontWeight: "bolder",
                              fontSize: "15px",
                              textAlign: "center",
                            }}
                          >
                            {student.grade}
                          </Box>
                        </TableCell>
                        <TableCell
                          className="mark-add-table-cell h-37px p-5px"
                          component="th"
                          scope="row"
                        >
                          <FormControl>
                            <NativeSelect
                              value={student.is_announced ? "Yes" : "No"}
                              onChange={(e) =>
                                handleIsAnnouncedChangePerStudent(e.target.value, stIndex)
                              }
                              name="is_announced"
                              style={{height:"20px"}}
                            >
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </NativeSelect>
                          </FormControl>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            {Object.keys(isAnnouncedUpdates).length > 0 && (
              <Box className="submt-button-float-bottom" mt={3}>
                <Button
                  className="submit"
                  variant="contained"
                  style={{ float: "right" }}
                  onClick={() => props.submitIsAnnouncedUpdates(isAnnouncedUpdates)}
                  disabled={submitDisable}
                >
                  Submit
                </Button>
              </Box>
            )}
          </Box>
        </>
      )}
    </>
  );
}

export default ResultExamWiseIndividual;
