import React from "react";
import {
  Checkbox,
  Box,
  Grid,
  TableContainer,
  Table,
  TableHead,
  TableCell,
  TableRow,
  TableBody,
  TextField,
  Tooltip,
  Button,
} from "@material-ui/core";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";
import { numberWithCommasWithoutSymbol } from "Includes/functions";
import BlankPagewithIcon from "Components/BlankPageWithIcon";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};
const exam_config = JSON.parse(localStorage.getItem("exam_configurations"))
  ? JSON.parse(localStorage.getItem("exam_configurations"))
  : {};
const is_cumulative = exam_config["cumulative_type"] == 1 ? true : false;

function ResultExamConfigWise(props) {
  const {
    markDetails,
    is_mark_result,
    onchangeSubject,
    selectedSubjectDropdown,
    searchStudent,
    selectedFilter,
    is_announced,
    currentTab,
    submitDisable,
  } = props;
  const [showCumulative, setShowCumulative] = React.useState(false);
  const [part_type, set_part_type] = React.useState({});

  const handleChangeCumulative = () => {
    setShowCumulative(() => !showCumulative);
  };

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
                  <TableCell className="selectable-table-head text-align-center">
                    {data.subject_name}
                  </TableCell>
                  {showCumulative &&
                    data.cumulative_data &&
                    data.cumulative_data.map((cum_data) => {
                      return (
                        <TableCell className="selectable-table-head text-align-center"></TableCell>
                      );
                    })}
                  {showCumulative && (
                    <TableCell className="selectable-table-head text-align-center"></TableCell>
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
        count = count + 1;
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
              {part_type[part]["list"].includes(data.subject) &&
              selectedSubjectDropdown.some(
                (key) => key.value === data.subject
              ) ? (
                <>
                  {(!is_cumulative || showCumulative) && (
                    <TableCell className="text-align-center">{`Max - ${data.configured_marks}`}</TableCell>
                  )}
                  {showCumulative &&
                    data.cumulative_data &&
                    data.cumulative_data.map((cum_data) => {
                      return (
                        <TableCell className="text-align-center">
                          {`Max - ${cum_data.configured_marks}`}
                        </TableCell>
                      );
                    })}
                  {(showCumulative || is_cumulative) && (
                    <TableCell className="text-align-center">{`Max-${data.total_configured_marks} Min-${data.total_configured_min_marks}`}</TableCell>
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
                              student.subject_list[subject.subject]
                                .obtained_marks
                            )
                          )}
                        </Box>
                      )}
                      {!Boolean(student.subject_list[subject.subject]) && (
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
                          {Boolean(student.subject_list[subject.subject]) && (
                            <Box className="marks-view-entered">
                              {numberWithCommasWithoutSymbol(
                                student.subject_list[subject.subject]
                                  .cumulative_data[cumIndex].marks
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
                          {numberWithCommasWithoutSymbol(
                            student.subject_list[subject.subject]
                              .total_obtained_marks
                          )}
                        </Box>
                      )}
                      {!Boolean(student.subject_list[subject.subject]) && (
                        <Box className="text-bold result-view-entered">
                          {`N/A`}
                        </Box>
                      )}
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

  return (
    <>
      <Grid container className="header-align">
        <Grid item md={2} xs={12}>
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
        {/* {!is_mark_result && !is_announced && currentTab !== 'examConfig' &&
                    <Grid item md={2} xs={12} className='flex-justify-center margin-top-10'>
                        <Tooltip title={!is_mark_result ? 'Update Pass/Fail' : 'View Pass/Fail'} enterDelay={400}
                            enterNextDelay={400} placement='top-start'
                            classes={{ tooltip: 'tooltip-show-data' }}>
                            <Button
                                className={is_mark_result ? 'exam-mark-absent-button' : 'exam-enter-marks-button'}
                                onClick={props.handleMarkPassOrFail}
                            >
                                <Box>Update Result</Box>
                            </Button>
                        </Tooltip>
                    </Grid>
                } */}
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
              onClick={props.handleMarkPassOrFail}
            >
              <Box>Cancel</Box>
            </Button>
          </Grid>
        )}
        <Grid item md={3} xs={12}>
          {!is_announced && !is_mark_result && (
            <Button
              className="submit margin-left-right-20"
              variant="contained"
              style={{ float: "right" }}
              disabled={submitDisable}
              onClick={(e) => props.submitAndFinalize()}
            >
              Announce Result
            </Button>
          )}
          {is_announced && (
            <Button
              className="cancel-request margin-left-right-20"
              variant="contained"
              style={{ float: "right" }}
              disabled={true}
            >
              Result Announced
            </Button>
          )}
        </Grid>
      </Grid>
      {is_cumulative && (
        <Grid container className="mt-30">
          <Grid item md={3} xs={6}>
            <Checkbox
              onChange={handleChangeCumulative}
              color="primary"
              name={"showCumulative"}
              checked={showCumulative}
              inputProps={{
                "aria-label": "primary checkbox",
              }}
            />
            <span>{`Show ${alias_names["cumulative"]}`}</span>
          </Grid>
          <Grid item md={3} xs={6}>
            <MultipleSelectDropdown
              data_list={markDetails.subject_list}
              selected_list={selectedSubjectDropdown}
              error={false}
              label={"Select Subjects"}
              onChange={(e) => onchangeSubject(e)}
            />
          </Grid>
        </Grid>
      )}
      {selectedSubjectDropdown.length === 0 && (
        <BlankPagewithIcon data="Select subjects to see the details" />
      )}
      {selectedSubjectDropdown.length > 0 && (
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
                    Result
                  </TableCell>
                  <TableCell className="selectable-table-head p-5px text-align-center">
                    Grade
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
                          {student.total_configured_marks}
                        </Box>
                      </TableCell>
                      <TableCell
                        className="mark-add-table-cell h-37px p-5px"
                        component="th"
                        scope="row"
                      >
                        <Box className="marks-view-entered">
                          {numberWithCommasWithoutSymbol(
                            student.total_obtained_marks
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
                            {student.total_result}
                          </Box>
                        )}
                      </TableCell>
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
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </>
  );
}

export default ResultExamConfigWise;
