import React, { Component } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  CircularProgress,
  Tooltip,
} from "@material-ui/core";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import InfiniteScroll from "react-infinite-scroller";
import GetAppRoundedIcon from "@material-ui/icons/GetAppRounded";

import { getRequest, postRequest, putRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL, PUT_URL } from "Includes/urls";
import { getFullName } from "Includes/functions";
import "./styles.scss";

export default class index extends Component {
  constructor(props) {
    super(props);

    this.state = {
      expanded: {},
      standardList: [],
      limitValue: {},
      selectedExamCurrent: "",
      updateStandardList: this.updateStandardList.bind(this),
    };
  }

  componentDidMount = () => {
    const { selectedExam } = this.props;
    if (selectedExam) {
      this.updateStandardList();
    }
  };

  updateStandardList = () => {
    const { academicYear, getStandardList, selectedExam } = this.props;
    if (getStandardList) {
      this.setState({
        standardList: getStandardList,
        academicYear: academicYear,
        selectedExamCurrent: selectedExam,
        expanded: {},
      });
    } else {
      this.getStandardList(academicYear);
    }
  };

  getStandardList = (year) => {
    const url = GET_URL.getstandardandsection.api;
    const params = { academic_year: year, is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.map((standard) => {
          standard.sections.map((section) => {
            section["section"] = section["standard_section"];
            section["section_name"] = section["name"];
          });
          standard["section_list"] = standard["sections"];
        });
        this.setState({
          standardList: response.data.data,
          academicYear: year,
        });
      }
    });
  };

  handleChangeCollapse = (
    name,
    standardIndex,
    standardId,
    sectionIndex,
    sectionId
  ) => {
    let { expanded } = this.state;
    let value = "";
    if (name === "standard" && expanded[name] !== standardIndex) {
      value = standardIndex;
    } else if (
      name === "section" &&
      expanded[name] !== `${standardIndex}${sectionIndex}`
    ) {
      value = `${standardIndex}${sectionIndex}`;
      this.getStudentList(standardIndex, standardId, sectionIndex, sectionId);
    }
    expanded[name] = value;
    this.setState({
      expanded,
    });
  };

  getStudentList = (
    standardIndex,
    standardId,
    sectionIndex,
    sectionId,
    limit
  ) => {
    let { standardList, academicYear, limitValue } = this.state;
    const url = GET_URL.getenrolledstudents.api;
    let params = {
      academic_year: academicYear,
      is_active: true,
      standard_section: sectionId,
    };
    if (limit !== limitValue[`${standardIndex}${sectionIndex}`]) {
      let limit_param = { _limit: limit };
      params = { ...params, ...limit_param };
      limitValue[`${standardIndex}${sectionIndex}`] = limit;
    } else if (limit) {
      return;
    }
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.map((data) => {
          data["full_name"] = getFullName(
            data["student_first_name"],
            data["student_middle_name"],
            data["student_last_name"]
          );
        });
        standardList[standardIndex]["section_list"][sectionIndex][
          "studentList"
        ] = response.data.data;
        this.setState({
          standardList,
          limitValue,
        });
      }
    });
  };

  render() {
    const { standardList, expanded } = this.state;
    const {
      isDownload,
      blank,
      loading,
      hideStandard,
      printLabel,
      isConsolidated,
      isImageDownload,
    } = this.props;
    return (
      <div>
        {!blank &&
          standardList.map((standard, stdIndex) => {
            return (
              <Accordion
                expanded={expanded.standard === stdIndex}
                className="standard-paper"
                onChange={() =>
                  this.handleChangeCollapse("standard", stdIndex, standard.id)
                }
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="panel1bh-content"
                  id="panel1bh-header"
                >
                  <Box className="hall-ticket-label">{standard.name}</Box>
                </AccordionSummary>
                <AccordionDetails className="section-paper">
                  {isDownload && !hideStandard && (
                    <Box className="end-flex-prop d-flex">
                      <Button
                        variant="contained"
                        color="secondary"
                        className="hall-ticket-print-button"
                        onClick={() =>
                          loading !== `standard_${standard.id}` &&
                          this.props.handleHallTicketDownload(
                            "standard",
                            standard.id,
                            standard.name
                          )
                        }
                      >
                        {loading === `standard_${standard.id}` ? (
                          <div className="display-flex">
                            <CircularProgress className="circular-hallticket mr-5" />
                            Loading for {standard.name}
                          </div>
                        ) : (
                          <div className="display-flex">
                            <GetAppRoundedIcon className="hall-ticket-download-icon" />
                            Print PDF
                          </div>
                        )}
                      </Button>
                      {isImageDownload && (
                        <Button
                          variant="contained"
                          color="secondary"
                          className="hall-ticket-print-button ml-20"
                          onClick={() =>
                            loading !== `standard_${standard.id}` &&
                            this.props.handleHallTicketImageDownload(
                              "standard",
                              standard.id,
                              standard.name
                            )
                          }
                        >
                          {loading === `standard_${standard.id}` ? (
                            <div className="display-flex">
                              <CircularProgress className="circular-hallticket mr-5" />
                              Loading for {standard.name}
                            </div>
                          ) : (
                            <div className="display-flex">
                              <GetAppRoundedIcon className="hall-ticket-download-icon" />
                              Print IMG
                            </div>
                          )}
                        </Button>
                      )}
                    </Box>
                  )}
                  {standard.section_list &&
                    standard.section_list.map((section, secIndex) => {
                      return (
                        <Accordion
                          expanded={
                            expanded.section === `${stdIndex}${secIndex}`
                          }
                          onChange={() =>
                            this.handleChangeCollapse(
                              "section",
                              stdIndex,
                              standard.id,
                              secIndex,
                              section.section
                            )
                          }
                        >
                          <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            aria-controls="panel1bh-content"
                            id="panel1bh-header"
                          >
                            {section.section_name}
                          </AccordionSummary>
                          <AccordionDetails className="student-paper">
                            {isDownload && (
                              <Box className="hall-ticket-print-button-outer-box">
                                {section.studentList &&
                                section.studentList.length === 0 ? (
                                  <Tooltip
                                    title={"No Students"}
                                    enterDelay={400}
                                    enterNextDelay={400}
                                    placement="top-start"
                                    classes={{ tooltip: "tooltip-show-data" }}
                                  >
                                    <div className="end-flex-prop d-flex">
                                      <Button
                                        variant="contained"
                                        color="secondary"
                                        className="hall-ticket-print-button disabled-button"
                                      >
                                        {loading ===
                                        `section_${section.section}` ? (
                                          <div className="display-flex">
                                            <CircularProgress className="circular-hallticket mr-5" />
                                            Loading for {section.section_name}
                                          </div>
                                        ) : (
                                          <div className="display-flex">
                                            <GetAppRoundedIcon className="hall-ticket-download-icon" />
                                            Print PDF
                                          </div>
                                        )}
                                      </Button>
                                    </div>
                                  </Tooltip>
                                ) : (
                                  <>
                                    <div className="end-flex-prop d-flex">
                                      <Button
                                        variant="contained"
                                        color="secondary"
                                        className="hall-ticket-print-button"
                                        onClick={() =>
                                          loading !==
                                            `section_${section.section}` &&
                                          this.props.handleHallTicketDownload(
                                            "section",
                                            section.section,
                                            null,
                                            null,
                                            `${standard.name}-${section.section_name}`
                                          )
                                        }
                                      >
                                        {loading ===
                                        `section_${section.section}` ? (
                                          <div className="display-flex">
                                            <CircularProgress className="circular-hallticket mr-5" />
                                            Loading for {section.section_name}
                                          </div>
                                        ) : (
                                          <div className="display-flex">
                                            <GetAppRoundedIcon className="hall-ticket-download-icon" />
                                            Print PDF
                                          </div>
                                        )}
                                      </Button>
                                      {isImageDownload && (
                                        <Button
                                          variant="contained"
                                          color="secondary"
                                          className="hall-ticket-print-button ml-20"
                                          onClick={() =>
                                            loading !==
                                              `section_${section.section}` &&
                                            this.props.handleHallTicketImageDownload(
                                              "section",
                                              section.section,
                                              null,
                                              null,
                                              `${standard.name}-${section.section_name}`
                                            )
                                          }
                                        >
                                          {loading ===
                                          `section_${section.section}` ? (
                                            <div className="display-flex">
                                              <CircularProgress className="circular-hallticket mr-5" />
                                              Loading for {section.section_name}
                                            </div>
                                          ) : (
                                            <div className="display-flex">
                                              <GetAppRoundedIcon className="hall-ticket-download-icon" />
                                              Print IMG
                                            </div>
                                          )}
                                        </Button>
                                      )}
                                    </div>
                                    {isConsolidated && (
                                      <Button
                                        variant="contained"
                                        color="secondary"
                                        className="consolidated-print-button ml-10"
                                        onClick={() =>
                                          loading !==
                                            `section_${section.section}` &&
                                          this.props.handleHallTicketDownload(
                                            "section",
                                            section.section,
                                            null,
                                            true
                                          )
                                        }
                                      >
                                        {loading ===
                                        `section_${section.section}` ? (
                                          <div className="display-flex">
                                            <CircularProgress className="circular-hallticket mr-5" />
                                            Loading for {section.section_name}
                                          </div>
                                        ) : (
                                          <div className="display-flex">
                                            <GetAppRoundedIcon className="hall-ticket-download-icon" />
                                            Download Marks for
                                            {section.section_name}
                                          </div>
                                        )}
                                      </Button>
                                    )}
                                  </>
                                )}
                              </Box>
                            )}
                            {section.studentList && (
                              <InfiniteScroll
                                pageStart={0}
                                loadMore={() =>
                                  this.getStudentList(
                                    stdIndex,
                                    standard.id,
                                    secIndex,
                                    section.section,
                                    section.studentList.length + 10
                                  )
                                }
                                hasMore={false}
                                useWindow={false}
                                loader={
                                  <div className="loader-infinite-loop" key={0}>
                                    Loading ...
                                  </div>
                                }
                              >
                                <table
                                  width="100%"
                                  className="selectable-row-table"
                                >
                                  <thead>
                                    <th className={`selectable-table-head`}>
                                      Student Name{" "}
                                    </th>
                                    <th className={`selectable-table-head`}>
                                      Registration Number{" "}
                                    </th>
                                    {isDownload && (
                                      <th
                                        className={`selectable-table-head hall-ticket-print-button-student-outer-box`}
                                      >
                                        {printLabel
                                          ? printLabel
                                          : "Print Hall Ticket"}
                                      </th>
                                    )}
                                  </thead>
                                  <tbody className="selectable-row-table-body">
                                    {section.studentList.map(
                                      (student, index) => {
                                        return (
                                          <tr
                                            key={index}
                                            className="selectable-row-table-row"
                                          >
                                            <td
                                              key={index}
                                              className={"textAlign"}
                                            >
                                              {student.full_name}
                                            </td>
                                            <td>{student.current_reg_num}</td>
                                            {isDownload && (
                                              <td>
                                                <Box className="end-flex-prop d-flex">
                                                  <Button
                                                    variant="contained"
                                                    className="hall-ticket-print-student"
                                                    onClick={() =>
                                                      loading !==
                                                        `student_${student.student}` &&
                                                      this.props.handleHallTicketDownload(
                                                        "student",
                                                        student.student,
                                                        student.standard_section,
                                                        null,
                                                        `${standard.name}-${section.section_name}-${student.full_name}`
                                                      )
                                                    }
                                                  >
                                                    {loading ===
                                                    `student_${student.student}` ? (
                                                      <div className="display-flex">
                                                        <CircularProgress className="circular-hallticket mr-5" />
                                                        Loading
                                                      </div>
                                                    ) : (
                                                      <div>Print PDF</div>
                                                    )}
                                                  </Button>
                                                  {isImageDownload && (
                                                    <Button
                                                      variant="contained"
                                                      className="hall-ticket-print-student ml-20"
                                                      onClick={() =>
                                                        loading !==
                                                          `student_${student.student}` &&
                                                        this.props.handleHallTicketImageDownload(
                                                          "student",
                                                          student.student,
                                                          student.standard_section,
                                                          null,
                                                          `${standard.name}-${section.section_name}-${student.full_name}`,
                                                        )
                                                      }
                                                    >
                                                      {loading ===
                                                      `student_${student.student}` ? (
                                                        <div className="display-flex">
                                                          <CircularProgress className="circular-hallticket mr-5" />
                                                          Loading
                                                        </div>
                                                      ) : (
                                                        <div>Print IMG</div>
                                                      )}
                                                    </Button>
                                                  )}
                                                </Box>
                                              </td>
                                            )}
                                          </tr>
                                        );
                                      }
                                    )}
                                    {section.studentList.length === 0 && (
                                      <tr className="text-center font-weight-bold">
                                        No Data Found
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </InfiniteScroll>
                            )}
                          </AccordionDetails>
                        </Accordion>
                      );
                    })}
                </AccordionDetails>
              </Accordion>
            );
          })}
      </div>
    );
  }
}
