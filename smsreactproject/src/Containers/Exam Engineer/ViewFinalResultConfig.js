import React from "react";
import {
  Paper,
  Box,
  Button,
  Grid,
  Tooltip,
  TableContainer,
  Table,
  TableHead,
  TableCell,
  TableRow,
  TableBody,
  CircularProgress,
} from "@material-ui/core";
import { Dropdown } from "Components/DropDown";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import loadingBar from "images/loading.gif";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import { Actions } from "Constants/permissions";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import { withRouter } from "react-router-dom";
import {
  isUserHasPermission,
  dateFormat,
  timeFormat,
  Alert,
  getAcademicYear,
  SetAcademicYear,
  getStandard,
  getKeyValueMap,
  getUrlParam,
  SetStandard,
} from "Includes/functions";
import ExpandMoreOutlinedIcon from "@material-ui/icons/ExpandMoreOutlined";
import ExpandLessOutlinedIcon from "@material-ui/icons/ExpandLessOutlined";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};
const exam_config = JSON.parse(localStorage.getItem("exam_configurations"))
  ? JSON.parse(localStorage.getItem("exam_configurations"))
  : {};
const is_cumulative = exam_config["cumulative_type"] == 1 ? true : false;

function ViewFinalResultConfig(props) {
  const [yearList, setYearList] = React.useState([]);
  const [selectedYear, setSelectedYear] = React.useState("");
  const [selectedStandard, setSelectedStandard] = React.useState("");
  const [fieldError, setFieldError] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [isBlankPage, setIsBlankPage] = React.useState(false);
  const [blankData, setBlankData] = React.useState("");
  const [loadingExam, setLoadingExam] = React.useState(false);
  const [examStandardList, setExamStandardList] = React.useState([]);
  const [standardList, setStandardList] = React.useState([]);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [termList, setTermList] = React.useState([]);

  React.useEffect(() => {
    getAcademicYearList();
    if (getAcademicYear()) {
      setSelectedYear(() => getAcademicYear());
      getStandardList(getAcademicYear());
    }
  }, []);

  const getAcademicYearList = () => {
    const url = GET_URL.getacademicyear.api;
    const param = { is_active: true };
    getRequest(url, param, props).then((response) => {
      if (response && response.status === 200) {
        setYearList(() => response.data.data);
      }
      if (getAcademicYear()) {
        setSelectedYear(() => getAcademicYear());
      } else {
        setLoading(() => false);
        setIsBlankPage(() => true);
        setBlankData(() => "Select Academic Year");
      }
    });
  };

  const getStandardList = (year) => {
    let yearId = selectedYear;
    if (year) {
      yearId = year;
    }
    const url = GET_URL.getstandardandsection.api;
    const param = { is_active: true, academic_year: yearId };
    getRequest(url, param, props).then((response) => {
      if (response && response.status === 200) {
        setStandardList(() => response.data.data);
        if (getStandard()) {
          setSelectedStandard(getStandard());
          getExamStandardList(yearId, getStandard());
        } else {
          setLoading(() => false);
          setIsBlankPage(() => true);
          setBlankData(() => "Select Standard");
        }
      }
    });
  };

  const handleChange = (e) => {
    const { value, name } = e.target;
    if (name === "selectedYear") {
      setSelectedYear(() => value);
      getStandardList(value);
      setSelectedStandard(() => "");
      setExamStandardList(() => []);
      setIsBlankPage(() => false);
      SetAcademicYear(value)
    } else {
      setIsBlankPage(() => false);
      setExamStandardList(() => []);
      setLoadingExam(() => true);
      setSelectedStandard(() => value);
      getExamStandardList(selectedYear, value);
      SetStandard(value)
    }
  };

  const getExamStandardList = (yearId, standardId) => {
    let url = GET_URL.examfinalresultconfiguration.api;
    let param = {
      is_active: true,
      academic_year: yearId,
      standard: standardId,
    };
    let prop = { ...props };
    prop["return_error_message"] = true;
    getRequest(url, param, prop).then((response) => {
      if (response && response.status === 200) {
        if (response.data.data.standard_data.length > 0) {
          setExamStandardList(() => response.data.data.standard_data);
          setTermList(() => response.data.data.exam_term_list);
          setIsBlankPage(() => false);
          setLoading(() => false);
          setLoadingExam(() => false);
        } else {
          setLoadingExam(() => false);
          setLoading(() => false);
          setIsBlankPage(() => true);
          setBlankData(() => "No Exams Are Scheduled For Standards");
        }
      } else {
        setLoadingExam(() => false);
        setLoading(() => false);
        setIsBlankPage(() => true);
        setBlankData(() => response);
      }
    });
  };

  const getSubjectNameFormat = () => {
    return (
      <>
        {termList &&
          termList.map((data) => {
            return <TableCell className="">{data.name}</TableCell>;
          })}
      </>
    );
  };

  const getSubjectTotal = (section) => {
    return (
      <>
        {termList.map((subject) => {
          return (
            <TableCell className="" component="th" scope="row">
              <Tooltip
                title={
                  section.term_mark_mapping[subject.id]?.is_finalized
                    ? "Finalized"
                    : "Not Finalized"
                }
                enterDelay={400}
                enterNextDelay={400}
                placement="top-start"
                classes={{ tooltip: "tooltip-show-data" }}
              >
                <div className="mui-table-custom-value-left-align d-flex pointer">
                  <Box
                    className={
                      section.term_mark_mapping[subject.id]?.is_finalized
                        ? "application-student-list-admitted"
                        : "application-student-list-not-admitted"
                    }
                  ></Box>
                  <div>
                    {section.term_mark_mapping[subject.id].configured_marks}
                  </div>
                </div>
              </Tooltip>
            </TableCell>
          );
        })}
      </>
    );
  };

  const handleClickEnter = (standard, section) => {
    let year_key_value = getKeyValueMap(yearList, "id", "name");
    let sectionInformation = {
      selectedYear: selectedYear,
      standard_section_id: section.standard_section,
      standard_name: standard.standard_name,
      section_name: section.section_name,
      year_name: year_key_value[selectedYear],
    };
    let searchParam = "?" + new URLSearchParams(sectionInformation).toString();
    let pathName = Actions.final_result_config.create.url;
    props.history.push({
      pathname: pathName,
      search: searchParam,
    });
  };

  return (
    <>
      {loading && (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      )}
      {!loading && (
        <Paper className="paper-background">
          <Grid container>
            <Grid item md={6} xs={12} className="header-align">
              <Box className="heading">Final Result Configuration</Box>
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid item md={3} xs={12} className="margin-top-20">
              <Dropdown
                data={yearList}
                name="selectedYear"
                style="width-100"
                value={selectedYear}
                onChange={handleChange}
                label="Academic Year"
                error={fieldError.selectedYear}
                hideSelect={true}
              />
            </Grid>
            <Grid item md={3} xs={12} className="margin-top-20">
              <Dropdown
                data={standardList}
                name="selectedStandard"
                style="width-100"
                value={selectedStandard}
                onChange={handleChange}
                label="Standard"
                error={fieldError.selectedStandard}
                hideSelect={true}
              />
            </Grid>
          </Grid>
          {loadingExam && (
            <div className="loading">
              <CircularProgress />
            </div>
          )}
          {!loadingExam && (
            <Grid container spacing={2}>
              {examStandardList.map((standard, stIndex) => {
                return (
                  <Grid item xl={8} md={12} xs={12}>
                    <Paper className="schedule-add-paper" elevation={2}>
                      <Box className="schedule-add-standard-outer-box">
                        <Box className="schedule-add-standard-name">
                          {standard.standard_name}
                        </Box>
                      </Box>
                      <TableContainer className="schedule-exam-overflow">
                        <Table
                          size="small"
                          aria-label="simple table"
                          className=""
                        >
                          <TableHead>
                            <TableRow className="">
                              <TableCell className="">Section</TableCell>
                              {getSubjectNameFormat(standard)}
                              {isUserHasPermission(
                                "exam_result_config",
                                "create"
                              ) && (
                                <TableCell className="text-align-center">
                                  Action
                                </TableCell>
                              )}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {standard.section_list &&
                              standard.section_list.map((section, secIndex) => {
                                return (
                                  <TableRow
                                    key={secIndex}
                                    className={
                                      isExpanded !== stIndex && secIndex > 2
                                        ? "display-none"
                                        : "schedule-exam-subject-name-box"
                                    }
                                  >
                                    <TableCell
                                      className=""
                                      component="th"
                                      scope="row"
                                    >
                                      <Box>{section.section_name}</Box>
                                    </TableCell>
                                    {getSubjectTotal(section)}
                                    {isUserHasPermission(
                                      "exam_result_config",
                                      "create"
                                    ) && (
                                      <TableCell
                                        classNa ="text-align-center"
                                        component="th"
                                        scope="row"
                                      >
                                        <Button
                                          onClick={() =>
                                            handleClickEnter(standard, section)
                                          }
                                        >
                                          Configure Marks
                                        </Button>
                                      </TableCell>
                                    )}
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                          {isExpanded !== stIndex &&
                            standard.section_list.length > 3 && (
                              <Tooltip
                                title="Expand More"
                                enterDelay={400}
                                enterNextDelay={400}
                                placement="top-start"
                                classes={{ tooltip: "tooltip-show-data" }}
                              >
                                <Box className="view-exam-expand-icon-box">
                                  <ExpandMoreOutlinedIcon
                                    className="view-exam-expand-icon"
                                    onClick={() =>
                                      this.handleClickMore(stIndex)
                                    }
                                  />
                                </Box>
                              </Tooltip>
                            )}
                          {isExpanded === stIndex &&
                            standard.section_list.length > 3 && (
                              <Tooltip
                                title="Expand Less"
                                enterDelay={400}
                                enterNextDelay={400}
                                placement="top-start"
                                classes={{ tooltip: "tooltip-show-data" }}
                              >
                                <Box className="view-exam-expand-icon-box">
                                  <ExpandLessOutlinedIcon
                                    className="view-exam-expand-icon"
                                    onClick={() => this.handleClickLess()}
                                  />
                                </Box>
                              </Tooltip>
                            )}
                        </Table>
                      </TableContainer>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
          {isBlankPage && <BlankPagewithIcon data={blankData} />}
        </Paper>
      )}
    </>
  );
}

export default withRouter(ViewFinalResultConfig);
