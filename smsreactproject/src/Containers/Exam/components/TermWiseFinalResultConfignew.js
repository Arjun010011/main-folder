import React from "react";
import {
  Paper,
  Box,
  Button,
  Grid,
  Tooltip,
  TextField,
  TableContainer,
  Table,
  TableHead,
  TableCell,
  TableRow,
  TableBody,
} from "@material-ui/core";
import { Dropdown } from "Components/DropDown";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import loadingBar from "images/loading.gif";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import { withRouter } from "react-router-dom";
import { isObjectEmpty, Alert, getUrlParam } from "Includes/functions";
import InfoIcon from "@material-ui/icons/Info";
import Snackbar from "@material-ui/core/Snackbar";
import _ from "lodash";
import { numberRegex } from "Constants/regularExpression";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";
import Swal from "sweetalert2";
import FinalResultConfigMergeTests from "./FinalResultConfigMergeTests";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};
const exam_config = JSON.parse(localStorage.getItem("exam_configurations"))
  ? JSON.parse(localStorage.getItem("exam_configurations"))
  : {};
const is_cumulative = exam_config["cumulative_type"] == 1 ? true : false;
const is_edit_final_result_config =
  exam_config["is_edit_final_result_config"] == 1 ? true : true;
const is_grade_plan = exam_config["grade_plan"] == 1 ? true : false;

function TermWiseFinalResultConfignew(props) {
  const { currentTab, gradePlanList } = props;
  const [fieldError, setFieldError] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [isBlankPage, setIsBlankPage] = React.useState(true);
  const [blankData, setBlankData] = React.useState("");
  const [marksCardInformation, setMarksCardInformation] = React.useState({});
  const [is_approved, set_is_approved] = React.useState(false);
  const [is_enable_disable_test, set_is_enable_disable_test] =
    React.useState(false);
  const [submitDisable, setSubmitDisable] = React.useState(false);
  const [openSnackBar, setOpenSnackBar] = React.useState(false);
  const [alertData, setAlertData] = React.useState(false);
  const [selectedExamTestDropdown, setSelectedExamTestDropdown] =
    React.useState([]);
  const [part_type, set_part_type] = React.useState({});
  const [selectedYear, setSelectedYear] = React.useState("");
  const [selectedExam, setSelectedExam] = React.useState("");
  const [standardSectionId, setStandardSectionId] = React.useState("");
  const [selectedGradePlan, setSelectedGradePlan] = React.useState("");
  const [mergeExamSet, setMergeExamSet] = React.useState({});
  const [mergeExamPostData, setMergeExamPostData] = React.useState([]);

  const [selectedTotalGradePlan, setSelectedTotalGradePlan] =
    React.useState("");
  const [isModified, setIsModified] = React.useState(false);

  React.useEffect(() => {
    getResultConfiguration();
  }, []);

  const getResultConfiguration = () => {
    let { selectedYear, standard_section_id , selectedExam} = getUrlParam();
    const url = GET_URL.examfinalresultconfigindividual.api;
    const param = {
      is_active: true,
      standard_section: standard_section_id,
      academic_year: selectedYear,
      exam : selectedExam
    };
    console.log('poojakiranjiiii')
    console.log(param,'paramssssss')
    let prop = { ...props };
    prop["return_error_message"] = true;
    getRequest(url, param, prop).then((response) => {
      if (response && response.status === 200) {
        let part_type_temp = {};
        response.data.data.part_type_list.map((data) => {
          part_type_temp[data["id"]] = {
            list: [],
            id: data["id"],
            name: data["name"],
          };
        });
        let is_marks_subject = true;
        if (
          response.data.data?.result_data &&
          response.data.data?.result_data.length > 0 &&
          response.data.data?.available_exam_list.length > 0
        ) {
          response.data.data.result_data.map((subject) => {
            is_marks_subject = true;
            Object.keys(part_type_temp).map((part_key) => {
              if (
                subject.subject_part_type_id == part_key &&
                !part_type_temp[part_key].list.includes(subject.subject)
              ) {
                part_type_temp[part_key].list.push(subject.subject);
              }
            });
            Object.keys(subject.exam_test_list).map((exam_test) => {
              if (
                response.data.data.available_exam_list.some(
                  (key) => key.id == exam_test
                )
              ) {
                if (subject.exam_test_list[exam_test].is_marks === false) {
                  is_marks_subject = false;
                }
              }
            });
            subject["is_marks"] = is_marks_subject;
            if (!is_marks_subject) {
              subject["selectedExamForGrade"] =
                response.data.data.available_exam_list[0]["id"];
            }
          });
          response.data.data.available_exam_list.map((data) => {
            data.value = data.id;
            data.label = data.exam_type__name;
            data.name = data.exam_type__name;
          });
          Object.keys(part_type_temp).map((part_key) => {
            if (part_type_temp[part_key].list.length === 0) {
              delete part_type_temp[part_key];
            }
          });
          setMarksCardInformation(() => response.data.data);
          setLoading(() => false);
          setIsBlankPage(() => false);
          setSelectedExamTestDropdown(
            () => response.data.data.available_exam_list
          );
          set_part_type(() => part_type_temp);
          setSelectedYear(() => selectedYear);
          setSelectedExam(() => selectedExam);
          setStandardSectionId(() => standard_section_id);
          setSelectedGradePlan(() => response.data.data.grade_plan);
          set_is_approved(() =>
            response.data.data.approval_status ? true : false
          );
        } else {
          setMarksCardInformation(() => {});
          setLoading(() => false);
          setIsBlankPage(() => true);
          setBlankData(() => "There are no exams");
        }
      } else {
        setMarksCardInformation(() => {});
        setLoading(() => false);
        setIsBlankPage(() => true);
        setBlankData(() => response);
      }
    });
  };

  const handleCloseSnacBar = () => {
    setOpenSnackBar(() => false);
    setAlertData(() => "");
  };

  const getSubjectTotal = (subIndex) => {
    let total = 0;
    let subject = marksCardInformation.result_data[subIndex];
    if (!_.isEmpty(subject.exam_test_list)) {
      Object.keys(subject.exam_test_list).map((exam_test) => {
        if (
          marksCardInformation.available_exam_list.some(
            (key) => key.id == exam_test
          )
        ) {
          if (
            subject.exam_test_list[exam_test].configured_marks ||
            subject.exam_test_list[exam_test].configured_cum_marks
          ) {
            if (
              subject.exam_test_list[exam_test].configured_marks &&
              !subject.exam_test_list[exam_test]["is_disabled"]
            ) {
              total =
                parseFloat(total) +
                parseFloat(subject.exam_test_list[exam_test].configured_marks);
            }
            if (
              subject.exam_test_list[exam_test].configured_cum_marks &&
              !subject.exam_test_list[exam_test]["is_cum_disabled"]
            ) {
              total =
                parseFloat(total) +
                parseFloat(
                  subject.exam_test_list[exam_test].configured_cum_marks
                );
            }
          }
        }
      });
    }
    return total;
  };

  const getSubjectTestTotal = (subIndex, exam_test) => {
    let total = 0;
    let subject = marksCardInformation.result_data[subIndex];
    if (!_.isEmpty(subject.exam_test_list)) {
      if (
        marksCardInformation.available_exam_list.some(
          (key) => key.id == exam_test
        )
      ) {
        if (
          subject.exam_test_list[exam_test].configured_marks ||
          subject.exam_test_list[exam_test].configured_cum_marks
        ) {
          if (
            subject.exam_test_list[exam_test].configured_marks &&
            !subject.exam_test_list[exam_test]["is_disabled"]
          ) {
            total =
              parseFloat(total) +
              parseFloat(subject.exam_test_list[exam_test].configured_marks);
          }
          if (
            subject.exam_test_list[exam_test].configured_cum_marks &&
            !subject.exam_test_list[exam_test]["is_cum_disabled"]
          ) {
            total =
              parseFloat(total) +
              parseFloat(
                subject.exam_test_list[exam_test].configured_cum_marks
              );
          }
        }
      }
    }
    return total;
  };

  const onChangeExamTest = (value) => {
    setSelectedExamTestDropdown(() => value);
  };

  const handleEnableDisableTest = () => {
    set_is_enable_disable_test(() => !is_enable_disable_test);
  };

  const handleChangeDisable = (e, subIndex, examTestIndex, id) => {
    let { name } = e.target;
    delete fieldError[`${name}${subIndex}${examTestIndex}`];
    const updated_value = marksCardInformation.result_data[subIndex][
      "exam_test_list"
    ][id][name]
      ? false
      : true;
    if (marksCardInformation.result_data[subIndex]["exam_test_list"][id]) {
      marksCardInformation.result_data[subIndex]["exam_test_list"][id][name] =
        updated_value;
    }
    if (updated_value) {
      let select_all = {};
      marksCardInformation.result_data.map((subject, subIndex) => {
        Object.keys(subject.exam_test_list).map((exam) => {
          if (!(exam in select_all)) {
            select_all[exam] = true;
          }
          subject.exam_test_list[exam].is_disabled =
            subject.exam_test_list[exam]?.is_disabled ?? false;
          if (
            "is_disabled" in subject.exam_test_list[exam] &&
            !subject.exam_test_list[exam]?.is_disabled
          ) {
            if (exam in select_all) {
              select_all[exam] = false;
            }
          }
        });
      });
      marksCardInformation.available_exam_list.map((data) => {
        data.is_disabled = select_all?.[data["id"]] ?? false;
      });
    } else {
      marksCardInformation.available_exam_list[examTestIndex]["is_disabled"] =
        updated_value;
    }
    setMarksCardInformation(() => marksCardInformation);
    setFieldError(() => fieldError);
    marksCardInformation.result_data[subIndex]["configured_max_marks"] =
      getSubjectTotal(subIndex);
    marksCardInformation.result_data[subIndex]["configured_min_marks"] =
      marksCardInformation.result_data?.[subIndex]?.["configured_max_marks"] ===
      0
        ? ""
        : marksCardInformation?.schedule_data[subIndex]?.[
            "configured_min_marks"
          ];
    setMarksCardInformation(() => marksCardInformation);
    setIsModified(() => true);
  };

  const getSubjectFormat = (part) => {
    return (
      <TableBody className="selectable-row-table-body">
        {Object.keys(part_type).length > 1 && (
          <TableRow
            className={is_enable_disable_test ? "height-37px" : "height-35px"}
          >
            <TableCell
              className="mark-add-table-cell padding-y-zero  text-bold fs-18 "
              component="th"
              scope="row"
            >
              <div className="text-blue">{part_type[part]["name"]}</div>
            </TableCell>
          </TableRow>
        )}
        {marksCardInformation.result_data.map((subject, subIndex) => {
          return (
            <>
              {part_type[part].list.includes(subject.subject) &&
                !subject.hidden && (
                  <TableRow className="selectable-row-table-row">
                    <TableCell
                      className="mark-add-table-cell padding-y-zero "
                      component="th"
                      scope="row"
                    >
                      {subject.subject_name}
                    </TableCell>
                    {marksCardInformation.available_exam_list.map(
                      (exam_test, examTestIndex) => {
                        return (
                          selectedExamTestDropdown.some(
                            (key) => key.value === exam_test.id
                          ) && (
                            <TableCell
                              className="mark-add-table-cell padding-y-zero"
                              component="th"
                              scope="row"
                              align="center"
                            >
                              <TableRow
                                className={
                                  is_enable_disable_test
                                    ? "height-36px"
                                    : "height-34px"
                                }
                              >
                                <TableCell
                                  className="mark-add-table-cell padding-y-zero"
                                  component="th"
                                  scope="row"
                                >
                                  {subject.exam_test_list[exam_test.id] &&
                                    (subject.exam_test_list[exam_test.id][
                                      "is_marks"
                                    ] ? (
                                      <Box className="result-config-text text-align-center">
                                        {
                                          subject.exam_test_list[exam_test.id]
                                            .max_marks
                                        }
                                      </Box>
                                    ) : (
                                      <Box className="result-config-text text-align-center text-blue">
                                        {`Only Grade - ${
                                          subject.exam_test_list[exam_test.id]
                                            .grade_plan_name
                                        }`}
                                      </Box>
                                    ))}
                                  {!subject.exam_test_list[exam_test.id] && (
                                    <Tooltip
                                      title="Exam marks not entered in schedule"
                                      enterDelay={400}
                                      enterNextDelay={400}
                                      placement="top-start"
                                      classes={{ tooltip: "tooltip-show-data" }}
                                    >
                                      <Box className="result-config-text text-align-center">
                                        {" "}
                                        <InfoIcon className="time-table-info-icon cursor-pointer" />
                                      </Box>
                                    </Tooltip>
                                  )}
                                </TableCell>
                                <TableCell
                                  className="mark-add-table-cell padding-y-zero"
                                  component="th"
                                  scope="row"
                                  align="center"
                                >
                                  {subject?.exam_test_list?.[exam_test.id]?.[
                                    "is_marks"
                                  ] &&
                                    !is_enable_disable_test &&
                                    subject.exam_test_list[exam_test.id] &&
                                    !subject.exam_test_list[exam_test.id]
                                      ?.is_disabled && (
                                      <>
                                        {(is_approved ||
                                          !is_edit_final_result_config) && (
                                          <Box className="result-config-text marks-view-entered">
                                            {
                                              subject.exam_test_list[
                                                exam_test.id
                                              ].configured_marks
                                            }
                                          </Box>
                                        )}
                                        {!is_approved &&
                                          is_edit_final_result_config && (
                                            <TextField
                                              id="number"
                                              label=""
                                              type="text"
                                              name="configured_marks"
                                              autoComplete="off"
                                              value={
                                                subject.exam_test_list?.[
                                                  exam_test.id
                                                ]
                                                  ? subject.exam_test_list[
                                                      exam_test.id
                                                    ].configured_marks
                                                  : ""
                                              }
                                              className={"result-config-text"}
                                              onChange={(e) =>
                                                handleChange(
                                                  e,
                                                  subIndex,
                                                  exam_test.id
                                                )
                                              }
                                              defaultValue=""
                                              InputLabelProps={{
                                                shrink: true,
                                              }}
                                              InputProps={{
                                                max: 200,
                                                min: 0,
                                                maxLength: 4,
                                                endAdornment: fieldError[
                                                  `configured_marks${subIndex}${exam_test.id}`
                                                ] ? (
                                                  <Tooltip
                                                    title={
                                                      fieldError[
                                                        `configured_marks${subIndex}${exam_test.id}`
                                                      ]
                                                    }
                                                    enterDelay={400}
                                                    enterNextDelay={400}
                                                    placement="top-start"
                                                    classes={{
                                                      tooltip:
                                                        "tooltip-show-data",
                                                    }}
                                                  >
                                                    <InfoIcon className="time-table-info-icon cursor-pointer" />
                                                  </Tooltip>
                                                ) : (
                                                  ""
                                                ),
                                              }}
                                              // helperText={(!fieldError[`configured_marks${subIndex}${exam_test.id}`]) ? '' : fieldError[`configured_marks${subIndex}${exam_test.id}`]}
                                              error={
                                                fieldError[
                                                  `configured_marks${subIndex}${exam_test.id}`
                                                ] &&
                                                (fieldError[
                                                  `configured_marks${subIndex}${exam_test.id}`
                                                ]
                                                  ? true
                                                  : false)
                                              }
                                            />
                                          )}
                                      </>
                                    )}
                                  {!is_enable_disable_test &&
                                    subject?.exam_test_list?.[exam_test.id] &&
                                    !!subject?.exam_test_list?.[exam_test.id]
                                      ?.is_disabled && (
                                      <Tooltip
                                        title="Disabled"
                                        enterDelay={400}
                                        enterNextDelay={400}
                                        placement="top-start"
                                        classes={{
                                          tooltip: "tooltip-show-data",
                                        }}
                                      >
                                        <Box className="display-flex text-align-center">
                                          <InfoIcon className="time-table-info-icon cursor-pointer" />
                                        </Box>
                                      </Tooltip>
                                    )}
                                  {!subject?.exam_test_list?.[exam_test.id]?.[
                                    "is_marks"
                                  ] && (
                                    <Tooltip
                                      title="Only Grade"
                                      enterDelay={400}
                                      enterNextDelay={400}
                                      placement="top-start"
                                      classes={{
                                        tooltip: "tooltip-show-data",
                                      }}
                                    >
                                      <Box className="display-flex result-config-text text-align-center">
                                        <InfoIcon className="time-table-info-icon cursor-pointer" />
                                      </Box>
                                    </Tooltip>
                                  )}
                                  {is_enable_disable_test &&
                                    subject.exam_test_list?.[exam_test.id] && (
                                      <Box class="exam-mark-checkbox padding-y-zero">
                                        <input
                                          type="checkbox"
                                          id={`written_${subIndex}${examTestIndex}`}
                                          name="is_disabled"
                                          checked={
                                            subject.exam_test_list[
                                              exam_test.id
                                            ] &&
                                            subject.exam_test_list[exam_test.id]
                                              .is_disabled
                                          }
                                          value={
                                            subject.exam_test_list[
                                              exam_test.id
                                            ] &&
                                            subject.exam_test_list[exam_test.id]
                                              .is_disabled
                                          }
                                          onChange={(e) =>
                                            handleChangeDisable(
                                              e,
                                              subIndex,
                                              examTestIndex,
                                              exam_test.id
                                            )
                                          }
                                        />
                                        <label
                                          for={`written_${subIndex}${examTestIndex}`}
                                        >
                                          <span></span>
                                        </label>
                                      </Box>
                                    )}
                                </TableCell>
                                {is_cumulative && (
                                  <TableCell
                                    className="mark-add-table-cell padding-y-zero"
                                    component="th"
                                    scope="row"
                                  >
                                    {subject?.exam_test_list?.[exam_test.id]?.[
                                      "is_marks"
                                    ] &&
                                      subject.exam_test_list[exam_test.id] && (
                                        <Box className="result-config-text text-align-center">
                                          {
                                            subject.exam_test_list[exam_test.id]
                                              .cum_max_marks
                                          }
                                        </Box>
                                      )}
                                    {!subject?.exam_test_list?.[exam_test.id]?.[
                                      "is_marks"
                                    ] && (
                                      <Tooltip
                                        title="Only Grade"
                                        enterDelay={400}
                                        enterNextDelay={400}
                                        placement="top-start"
                                        classes={{
                                          tooltip: "tooltip-show-data",
                                        }}
                                      >
                                        <Box className="display-flex result-config-text text-align-center">
                                          <InfoIcon className="time-table-info-icon cursor-pointer" />
                                        </Box>
                                      </Tooltip>
                                    )}
                                  </TableCell>
                                )}
                                {is_cumulative && (
                                  <TableCell
                                    className="mark-add-table-cell padding-y-zero"
                                    component="th"
                                    scope="row"
                                    align="center"
                                  >
                                    {subject?.exam_test_list?.[exam_test.id]
                                      ?.is_marks &&
                                      !is_enable_disable_test &&
                                      subject.exam_test_list[exam_test.id] &&
                                      !subject.exam_test_list[exam_test.id]
                                        ?.is_cum_disabled && (
                                        <>
                                          {(is_approved ||
                                            !is_edit_final_result_config) && (
                                            <Box className="result-config-text marks-view-entered">
                                              {
                                                subject.exam_test_list[
                                                  exam_test.id
                                                ].configured_cum_marks
                                              }
                                            </Box>
                                          )}
                                          {!is_approved &&
                                            is_edit_final_result_config && (
                                              <TextField
                                                id="number"
                                                label=""
                                                type="text"
                                                name="configured_cum_marks"
                                                autoComplete="off"
                                                value={
                                                  subject.exam_test_list?.[
                                                    exam_test.id
                                                  ]
                                                    ? subject.exam_test_list[
                                                        exam_test.id
                                                      ].configured_cum_marks
                                                    : ""
                                                }
                                                className={"result-config-text"}
                                                onChange={(e) =>
                                                  handleChange(
                                                    e,
                                                    subIndex,
                                                    exam_test.id
                                                  )
                                                }
                                                defaultValue=""
                                                InputLabelProps={{
                                                  shrink: true,
                                                }}
                                                InputProps={{
                                                  max: 200,
                                                  min: 0,
                                                  maxLength: 4,
                                                  endAdornment: fieldError[
                                                    `configured_cum_marks${subIndex}${exam_test.id}`
                                                  ] ? (
                                                    <Tooltip
                                                      title={
                                                        fieldError[
                                                          `configured_cum_marks${subIndex}${exam_test.id}`
                                                        ]
                                                      }
                                                      enterDelay={400}
                                                      enterNextDelay={400}
                                                      placement="top-start"
                                                      classes={{
                                                        tooltip:
                                                          "tooltip-show-data",
                                                      }}
                                                    >
                                                      <InfoIcon className="time-table-info-icon cursor-pointer" />
                                                    </Tooltip>
                                                  ) : (
                                                    ""
                                                  ),
                                                }}
                                                // helperText={(!fieldError[`configured_cum_marks${subIndex}${exam_test.id}`]) ? '' : fieldError[`configured_cum_marks${subIndex}${exam_test.id}`]}
                                                error={
                                                  fieldError[
                                                    `configured_cum_marks${subIndex}${exam_test.id}`
                                                  ] &&
                                                  (fieldError[
                                                    `configured_cum_marks${subIndex}${exam_test.id}`
                                                  ]
                                                    ? true
                                                    : false)
                                                }
                                              />
                                            )}
                                        </>
                                      )}
                                    {!is_enable_disable_test &&
                                      subject?.exam_test_list?.[exam_test.id] &&
                                      !!subject?.exam_test_list?.[exam_test.id]
                                        ?.is_cum_disabled && (
                                        <Tooltip
                                          title="Disabled"
                                          enterDelay={400}
                                          enterNextDelay={400}
                                          placement="top-start"
                                          classes={{
                                            tooltip: "tooltip-show-data",
                                          }}
                                          is_edit_final_result_config
                                        >
                                          <Box className="display-flex text-align-center">
                                            <InfoIcon className="time-table-info-icon cursor-pointer" />
                                          </Box>
                                        </Tooltip>
                                      )}
                                    {!subject?.exam_test_list?.[exam_test.id]
                                      ?.is_marks && (
                                      <Tooltip
                                        title="Only Grade"
                                        enterDelay={400}
                                        enterNextDelay={400}
                                        placement="top-start"
                                        classes={{
                                          tooltip: "tooltip-show-data",
                                        }}
                                        is_edit_final_result_config
                                      >
                                        <Box className="display-flex result-config-text text-align-center">
                                          <InfoIcon className="time-table-info-icon cursor-pointer" />
                                        </Box>
                                      </Tooltip>
                                    )}
                                    {is_enable_disable_test &&
                                      subject.exam_test_list?.[
                                        exam_test.id
                                      ] && (
                                        <Box class="exam-mark-checkbox padding-y-zero">
                                          <input
                                            type="checkbox"
                                            id={`cum_${subIndex}${examTestIndex}`}
                                            name="is_cum_disabled"
                                            checked={
                                              subject.exam_test_list[
                                                exam_test.id
                                              ] &&
                                              subject.exam_test_list[
                                                exam_test.id
                                              ].is_cum_disabled
                                            }
                                            value={
                                              subject.exam_test_list[
                                                exam_test.id
                                              ] &&
                                              subject.exam_test_list[
                                                exam_test.id
                                              ].is_cum_disabled
                                            }
                                            onChange={(e) =>
                                              handleChangeDisable(
                                                e,
                                                subIndex,
                                                examTestIndex,
                                                exam_test.id
                                              )
                                            }
                                          />
                                          <label
                                            for={`cum_${subIndex}${examTestIndex}`}
                                          >
                                            <span></span>
                                          </label>
                                        </Box>
                                      )}
                                  </TableCell>
                                )}
                                {/* <TableCell className='mark-add-table-cell padding-left-10 padding-right-10 padding-y-zero'>
                                                        <div className='text-center font-weight-bold result-config-text'>
                                                            {subject.exam_test_list?.[exam_test.id]?.total}
                                                        </div>
                                                    </TableCell> */}
                              </TableRow>
                            </TableCell>
                          )
                        );
                      }
                    )}
                  </TableRow>
                )}
            </>
          );
        })}
        {marksCardInformation.result_data.length === 0 && (
          <tr className="text-center font-weight-bold">No Data Found</tr>
        )}
      </TableBody>
    );
  };

  const getTotalFormat = (part) => {
    return (
      <TableBody className="selectable-row-table-body">
        {Object.keys(part_type).length > 1 && (
          <TableRow
            className={is_enable_disable_test ? "height-37px" : "height-35px"}
          >
            <TableCell className="mark-add-table-cell">{` `}</TableCell>
          </TableRow>
        )}
        {marksCardInformation.result_data.map((subject, subIndex) => {
          return (
            <>
              {part_type[part].list.includes(subject.subject) &&
                !subject.hidden && (
                  <TableRow
                    className={
                      is_enable_disable_test ? "height-37px" : "height-35px"
                    }
                  >
                    <TableCell className="mark-add-table-cell"></TableCell>
                    <TableCell
                      className="mark-add-table-cell"
                      component="th"
                      scope="row"
                    >
                      <Box className="marks-view-entered">
                        {subject.configured_max_marks}
                      </Box>
                    </TableCell>
                    <TableCell
                      className="mark-add-table-cell padding-y-zero"
                      component="th"
                      scope="row"
                      align="center"
                    >
                      {is_approved || !is_edit_final_result_config ? (
                        <Box className="marks-view-entered">
                          {subject.configured_min_marks}
                        </Box>
                      ) : subject.is_marks ? (
                        <TextField
                          id="number"
                          label=""
                          type="text"
                          name="configured_min_marks"
                          autoComplete="off"
                          value={subject.configured_min_marks}
                          className={"width-150px"}
                          onChange={(e) => handleSubjectChange(e, subIndex)}
                          onBlur={() => onBlurMinMarkValidation(subIndex)}
                          disabled={false}
                          defaultValue=""
                          InputLabelProps={{
                            shrink: true,
                          }}
                          InputProps={{
                            max: 200,
                            min: 0,
                            maxLength: 4,
                            endAdornment: fieldError[
                              `configured_min_marks${subIndex}`
                            ] ? (
                              <Tooltip
                                title={
                                  fieldError[`configured_min_marks${subIndex}`]
                                }
                                enterDelay={400}
                                enterNextDelay={400}
                                placement="top-start"
                                classes={{ tooltip: "tooltip-show-data" }}
                              >
                                <InfoIcon className="time-table-info-icon cursor-pointer" />
                              </Tooltip>
                            ) : (
                              ""
                            ),
                          }}
                          error={
                            fieldError[`configured_min_marks${subIndex}`] &&
                            (fieldError[`configured_min_marks${subIndex}`]
                              ? true
                              : false)
                          }
                        />
                      ) : (
                        <div>
                          <Dropdown
                            data={marksCardInformation.available_exam_list}
                            size={"small"}
                            variant="standard"
                            style="width-150px"
                            selectClassName="m-t-0px"
                            value={subject.selectedExamForGrade}
                            hideSelect
                            name="selectedExamForGrade"
                            onChange={(e) => handleSubjectChange(e, subIndex)}
                          />
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
            </>
          );
        })}
        {marksCardInformation.result_data.length === 0 && (
          <tr className="text-center font-weight-bold">No Data Found</tr>
        )}
      </TableBody>
    );
  };

  const handleChange = (e, subIndex, id) => {
    let { name, value } = e.target;
    let fieldErrorTemp = { ...fieldError };
    let marksInfo = { ...marksCardInformation };
    if (value && parseInt(value) === 0) {
      return;
    } else if (
      (!numberRegex.value.test(value) && value) ||
      parseInt(value) > 200
    ) {
      if (parseInt(value) > 200) {
        fieldErrorTemp[`${name}${subIndex}${id}`] =
          "Enter equal to or below 200";
      } else {
        fieldErrorTemp[`${name}${subIndex}${id}`] = numberRegex.errorText;
      }
      setFieldError(() => fieldErrorTemp);
    } else {
      delete fieldErrorTemp[`${name}${subIndex}${id}`];
      delete fieldErrorTemp[`configured_min_marks${subIndex}`];
      marksInfo.result_data[subIndex]["exam_test_list"][id][name] = value;
      marksInfo.result_data[subIndex]["exam_test_list"][id]["total"] =
        getSubjectTestTotal(subIndex, id);
      marksInfo.result_data[subIndex]["configured_max_marks"] =
        getSubjectTotal(subIndex);
      setMarksCardInformation(() => marksInfo);
      setFieldError(() => fieldErrorTemp);
    }
    // setSubmitDisable(() => Object.keys(fieldErrorTemp).length > 0 ? true : false)
    setIsModified(() => true);
  };

  const handleSubjectChange = (e, subIndex) => {
    let errors = { ...fieldError };
    let marksInfo = { ...marksCardInformation };
    let { name, value } = e.target;
    delete errors[`${name}${subIndex}`];
    marksInfo.result_data[subIndex][name] = value;
    setMarksCardInformation(() => marksInfo);
    setFieldError(() => errors);
    setIsModified(() => true);
  };

  const onBlurMinMarkValidation = (subIndex) => {
    let errors = { ...fieldError };
    let configured_min_marks =
      marksCardInformation.result_data[subIndex]["configured_min_marks"];
    let configured_max_marks =
      marksCardInformation.result_data[subIndex]["configured_max_marks"];
    if (parseFloat(configured_max_marks) >= parseFloat(configured_min_marks)) {
      delete errors[`configured_min_marks${subIndex}`];
    } else {
      errors[
        `configured_min_marks${subIndex}`
      ] = `Enter Below ${configured_max_marks}`;
    }
    setFieldError(() => errors);
  };

  const handleSelectAllTest = (e, index, exam_id, name) => {
    let marksInfo = { ...marksCardInformation };
    let updated_value = marksInfo.available_exam_list[index]?.[name] ? 0 : 1;
    marksInfo.result_data.map((data) => {
      if (data.exam_test_list[exam_id]) {
        data.exam_test_list[exam_id][name] = updated_value;
      }
    });
    marksInfo.available_exam_list[index][name] = updated_value;
    setMarksCardInformation(() => marksInfo);
    setIsModified(() => true);
  };

  const validationAndPostData = () => {
    marksCardInformation.available_exam_list.map((parent) => {
      parent.is_disabled = true;
      selectedExamTestDropdown.map((child) => {
        if (child.id == parent.id) {
          parent.is_disabled = false;
        }
      });
    });
    let validate = true;
    let fieldError = {};
    let alertData = "";
    let student_data = [];
    let subject_temp = {};
    let exam_test_temp = {};
    let examTestIndexTemp = "";
    let subject_config_is_present = false;
    if (selectedExamTestDropdown.length !== 0) {
      marksCardInformation.result_data.map((subject, stIndex) => {
        if (
          (subject.configured_min_marks &&
            parseFloat(subject.configured_max_marks) >=
              parseFloat(subject.configured_min_marks)) ||
          !subject.configured_min_marks
        ) {
          subject_temp = { marks_configuration: [] };
          subject_temp["subject"] = subject.subject;
          subject_temp["max_marks"] = subject.configured_max_marks
            ? parseInt(subject.configured_max_marks)
            : null;
          subject_temp["min_marks"] = subject.configured_min_marks
            ? parseInt(subject.configured_min_marks)
            : null;
          subject_config_is_present = false;
          marksCardInformation.available_exam_list.map((sub, subIndex) => {
            exam_test_temp = {};
            Object.keys(subject.exam_test_list).map(
              (exam_test, examTestIndex) => {
                exam_test_temp["is_only_grade_for_config"] = null;
                if (!subject.is_marks) {
                  exam_test_temp["exam"] = sub.id;
                  exam_test_temp["marks"] = null;
                  exam_test_temp["is_disabled"] = 0;
                  exam_test_temp["is_only_grade_for_config"] = 1;
                }
                if (
                  subject.exam_test_list?.[sub.id]?.configured_marks &&
                  !subject.exam_test_list[sub.id].is_disabled
                ) {
                  exam_test_temp["exam"] = sub.id;
                  exam_test_temp["marks"] = parseFloat(
                    subject.exam_test_list[sub.id].configured_marks
                  );
                  exam_test_temp["is_disabled"] = 0;
                }
                if (subject.exam_test_list?.[sub.id]?.is_disabled) {
                  exam_test_temp["exam"] = sub.id;
                  exam_test_temp["is_disabled"] = 1;
                  exam_test_temp["marks"] = 0;
                }
                if (
                  subject.exam_test_list?.[sub.id]?.configured_cum_marks &&
                  !subject.exam_test_list[sub.id].is_cum_disabled
                ) {
                  exam_test_temp["exam"] = sub.id;
                  exam_test_temp["cum_marks"] = parseFloat(
                    subject.exam_test_list[sub.id].configured_cum_marks
                  );
                  exam_test_temp["is_cum_disabled"] = 0;
                }
                if (subject.exam_test_list?.[sub.id]?.is_cum_disabled) {
                  exam_test_temp["exam"] = sub.id;
                  exam_test_temp["cum_marks"] = 0;
                  exam_test_temp["is_cum_disabled"] = 1;
                }
                if (
                  subject.exam_test_list[sub.id] &&
                  subject.exam_test_list[sub.id].id &&
                  !subject.exam_test_list[sub.id].is_disabled
                ) {
                  exam_test_temp["id"] = subject.exam_test_list[sub.id].id;
                }
                // if (mergeExamSet.hasOwnProperty(exam_test_temp["exam"])) {
                //   exam_test_temp["merge_name_id"] =
                //     mergeExamSet[exam_test_temp["exam"]]["mergeId"];
                // }
                examTestIndexTemp = examTestIndex;
              }
            );
            if (
              subject.exam_test_list[sub.id] &&
              (subject.exam_test_list[sub.id].configured_cum_marks ||
                subject.exam_test_list[sub.id].is_cum_disabled ||
                subject.exam_test_list[sub.id].configured_marks ||
                subject.exam_test_list[sub.id].is_disabled ||
                !subject.exam_test_list[sub.id].is_marks)
            ) {
              if (
                (subject.exam_test_list[sub.id].is_marks &&
                  subject.exam_test_list[sub.id].configured_marks &&
                  parseInt(subject.exam_test_list[sub.id].configured_marks) >
                    200) ||
                (subject.exam_test_list[sub.id].configured_cum_marks &&
                  parseInt(
                    subject.exam_test_list[sub.id].configured_cum_marks
                  ) > 200)
              ) {
                validate = false;
                fieldError[`marks${stIndex}${examTestIndexTemp}`] =
                  "Enter equal to or below 200";
              } else {
                subject_config_is_present = true;
                if (!isObjectEmpty(exam_test_temp)) {
                  subject_temp["marks_configuration"].push(exam_test_temp);
                }
              }
            }
          });
        } else if (
          subject.configured_max_marks ||
          subject.configured_min_marks
        ) {
          validate = false;
          alertData = `Enter Below ${subject.configured_max_marks} in ${subject.subject_name}`;
          fieldError[
            `configured_min_marks${stIndex}`
          ] = `Enter Below ${subject.configured_max_marks}`;
          subject_config_is_present = true;
        }
        if (subject_config_is_present) {
          if (!subject.configured_min_marks && subject.is_marks) {
            validate = false;
            fieldError[`configured_min_marks${stIndex}`] = `Enter min marks`;
          } else if (
            subject.is_marks &&
            parseInt(subject.configured_min_marks) >
              parseInt(subject.configured_max_marks)
          ) {
            validate = false;
            fieldError[
              `configured_min_marks${stIndex}`
            ] = `Enter Below ${subject.configured_max_marks}`;
          } else {
            student_data.push(subject_temp);
          }
        }
      });
    } else {
      validate = false;
      alertData = "clear errors";
    }
    if (!selectedGradePlan) {
      validate = false;
      fieldError["selectedGradePlan"] = "Grade Plan Is Mandatory";
    }
    if (!selectedTotalGradePlan) {
      validate = false;
      fieldError["selectedTotalGradePlan"] = "Total Grade Plan Is Mandatory";
    }

    if (!validate) {
      alertData = "clear errors";
      setAlertData(() => alertData);
      setFieldError(() => fieldError);
      setOpenSnackBar(() => true);
    } else {
      let return_data = {
        term: currentTab === "term1" ? 1 : 2,
        academic_year: selectedYear,
        exam:selectedExam,
        section_list: [
          {
            standard_section: standardSectionId,
            grade_plan: selectedGradePlan,
            total_grade_plan: selectedTotalGradePlan,
            subject_list: student_data,
            merge_list: mergeExamPostData,
          },
        ],
      };
      if (marksCardInformation.config_id) {
        return_data["id"] = marksCardInformation.config_id;
      }
      validate = return_data;
    }
    return validate;
  };

  const submitMarks = (name) => {
    let post_data = validationAndPostData();
    if (post_data) {
      setSubmitDisable(() => true);
      let url = POST_URL.finalresultconfiguration.api;
      postRequest(url, post_data, {}).then((response) => {
        if (response && response.status === 200) {
          if (name === "finalize") {
            finalizeMarks();
          } else {
            Swal.fire({
              position: "top-end",
              type: "success",
              title: "Your Data has been saved",
              showConfirmButton: false,
              timer: 1500,
            });
            props.goToViewPage();
          }
        }
        setSubmitDisable(() => false);
      });
    }
  };

  const onChange = (e) => {
    let errors = { ...fieldError };
    delete errors["selectedGradePlan"];
    setFieldError(() => errors);
    setSelectedGradePlan(() => e.target.value);
  };

  const onChangeTotalGrade = (e) => {
    let errors = { ...fieldError };
    delete errors["selectedTotalGradePlan"];
    setFieldError(() => errors);
    setSelectedTotalGradePlan(() => e.target.value);
  };

  const submitAndFinalize = () => {
    return Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to change marks!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, Finalize it!",
    }).then(async (result) => {
      if (result.value) {
        if (isModified) {
          submitMarks("finalize");
        } else {
          finalizeMarks();
        }
      }
    });
  };

  const validationFinalizePostData = () => {
    let validate = true;
    let fieldError = {};
    marksCardInformation.result_data.map((subject, subIndex) => {
      marksCardInformation.available_exam_list.map((sub) => {
        if (subject.exam_test_list[sub.id]) {
          Object.keys(subject.exam_test_list).map((exam_test) => {
            if (
              !subject.exam_test_list?.[sub.id]?.configured_marks &&
              subject.exam_test_list?.[sub.id]?.configured_marks !== 0 &&
              !subject.exam_test_list?.[sub.id]?.is_disabled
            ) {
              fieldError[
                `configured_marks${subIndex}${sub.id}`
              ] = `Enter Marks`;
              validate = false;
            }
            if (
              subject.exam_test_list?.[sub.id]?.cum_max_marks != 0 &&
              !subject.exam_test_list?.[sub.id]?.configured_cum_marks  &&
              !subject.exam_test_list?.[sub.id]?.is_cum_disabled
            ) {
              fieldError[
                `configured_cum_marks${subIndex}${sub.id}`
              ] = `Enter Cum Marks`;
              validate = false;
            }
          });
        }
      });
      if (subject.exam_test_list) {
        if (!subject.configured_min_marks) {
          validate = false;
          fieldError[`configured_min_marks${subIndex}`] = `Enter min marks`;
        } else if (
          parseInt(subject.configured_min_marks) >
          parseInt(subject.configured_max_marks)
        ) {
          validate = false;
          fieldError[
            `configured_min_marks${subIndex}`
          ] = `Enter Below ${subject.configured_max_marks}`;
        }
      }
    });
    setFieldError(() => fieldError);
    if (validate) {
      validate = {
        result_config: marksCardInformation.config_id,
        academic_year: selectedYear,
        exam:selectedExam,
        standard_section_ids: [parseInt(standardSectionId)],
        term: currentTab === "term1" ? 1 : 2,
        approval_status: 1,
      };
    }
    return validate;
  };

  const finalizeMarks = () => {
    let validate = validationFinalizePostData();
    if (validate) {
      setSubmitDisable(() => true);
      let url = POST_URL.approveresultconfiguration.api;
      postRequest(url, validate, {}).then((response) => {
        setSubmitDisable(() => false);
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: "Your Data has been saved",
            showConfirmButton: false,
            timer: 1500,
          });
          props.goToViewPage();
        }
      });
    }
  };

  const updateMergeExamSet = (selectedExamSet) => {
    let mergeExamSet = {};
    let mergeExamSetPostData = [];
    let mergeExamSetPostDataTemp = {};
    selectedExamSet.map((data) => {
      mergeExamSetPostDataTemp["merge_id"] = data["mergeId"];
      mergeExamSetPostDataTemp["exam_list"] = [];
      data.examList.map((examData) => {
        mergeExamSet[examData["id"]] = {
          mergeId: data["mergeId"],
          mergeName: data["mergeName"],
        };
        mergeExamSetPostDataTemp["exam_list"].push(examData["id"]);
      });
      mergeExamSetPostData.push(mergeExamSetPostDataTemp);
    });
    setMergeExamPostData(mergeExamSetPostData);
    setMergeExamSet(mergeExamSet);
  };

  return (
    <>
      {loading && (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      )}
      {!loading && (
        <>
          {isBlankPage && <BlankPagewithIcon data={blankData} />}
          {!isBlankPage && (
            <Grid container className="header-align" spacing={2}>
              <Grid item md={3} xs={12} className="margin-top-10">
                <MultipleSelectDropdown
                  data_list={marksCardInformation?.available_exam_list ?? []}
                  selected_list={selectedExamTestDropdown}
                  error={false}
                  label={`Select Exam`}
                  onChange={onChangeExamTest}
                  className="width-100-perc"
                />
              </Grid>
              <Grid item md={3} xs={12} className="margin-top-10">
                {is_grade_plan &&
                  selectedExamTestDropdown.length > 0 &&
                  !is_approved && (
                    <Dropdown
                      data={gradePlanList}
                      name="selectedGradePlan"
                      // className={'width-300px'}
                      value={selectedGradePlan}
                      onChange={onChange}
                      label="Subject Grade Plan"
                      error={
                        fieldError.selectedGradePlan &&
                        fieldError.selectedGradePlan
                      }
                      helperText={
                        fieldError.selectedGradePlan &&
                        fieldError.selectedGradePlan
                      }
                    />
                  )}
                {is_grade_plan &&
                  selectedExamTestDropdown.length > 0 &&
                  is_approved && (
                    <Box className="year-std-box mr-40">
                      <Box className="academic-std-head"> Grade Plan</Box>
                      <Box className=" exam-mark-add-heading-bg">
                        {marksCardInformation?.grade_plan_name}
                      </Box>
                    </Box>
                  )}
              </Grid>
              <Grid item md={3} xs={12} className="margin-top-10">
                {is_grade_plan &&
                  selectedExamTestDropdown.length > 0 &&
                  !is_approved && (
                    <Dropdown
                      data={gradePlanList}
                      name="selectedTotalGradePlan"
                      value={selectedTotalGradePlan}
                      onChange={onChangeTotalGrade}
                      label="Total Grade Plan"
                      error={
                        fieldError.selectedTotalGradePlan &&
                        fieldError.selectedTotalGradePlan
                      }
                      helperText={
                        fieldError.selectedTotalGradePlan &&
                        fieldError.selectedTotalGradePlan
                      }
                    />
                  )}
                {is_grade_plan &&
                  selectedExamTestDropdown.length > 0 &&
                  is_approved && (
                    <Box className="year-std-box mr-40">
                      <Box className="academic-std-head"> Grade Plan</Box>
                      <Box className=" exam-mark-add-heading-bg">
                        {marksCardInformation?.grade_plan_name}
                      </Box>
                    </Box>
                  )}
              </Grid>
              {selectedExamTestDropdown.length > 0 &&
                (is_approved ? (
                  <Grid
                    item
                    md={3}
                    xs={12}
                    className="flex-justify-center margin-top-10 pointer-event-none"
                  >
                    <Tooltip
                      title={"Marks Approved"}
                      enterDelay={400}
                      enterNextDelay={400}
                      placement="top-start"
                      classes={{ tooltip: "tooltip-show-data" }}
                    >
                      <Button
                        className={"exam-enter-marks-button"}
                        style={{
                          height: "40px",
                          alignSelf: "center",
                        }}
                      >
                        <Box>Marks Approved</Box>
                      </Button>
                    </Tooltip>
                  </Grid>
                ) : (
                  <Grid
                    item
                    md={3}
                    xs={12}
                    className="flex-justify-center margin-top-10"
                  >
                    <Tooltip
                      title="Enable/Disable Test"
                      enterDelay={400}
                      enterNextDelay={400}
                      placement="top-start"
                      classes={{ tooltip: "tooltip-show-data" }}
                    >
                      <Button
                        className={
                          !is_enable_disable_test
                            ? "exam-mark-absent-button"
                            : "exam-enter-marks-button"
                        }
                        onClick={handleEnableDisableTest}
                        style={{
                          height: "40px",
                          alignSelf: "center",
                        }}
                      >
                        {!is_enable_disable_test && <Box>Disable Exam</Box>}
                        {is_enable_disable_test && <Box>Enter Exam</Box>}
                      </Button>
                    </Tooltip>
                  </Grid>
                ))}
            </Grid>
          )}
          {!isBlankPage && (
            <div>
              <FinalResultConfigMergeTests
                examList={marksCardInformation?.available_exam_list ?? []}
                updateMergeExamSet={updateMergeExamSet}
              />
            </div>
          )}
          {!isBlankPage && selectedExamTestDropdown.length === 0 && (
            <BlankPagewithIcon
              data={
                selectedExamTestDropdown.length === 0
                  ? `Select Exam to see the details`
                  : blankData
              }
            />
          )}
          {selectedExamTestDropdown.length > 0 && (
            <Box display="flex">
              <TableContainer className="result-config-bg time-table-create header-align m-b-60px p-b-20px">
                <Table
                  size="small"
                  aria-label="simple table"
                  className="exam-mark-row-table"
                >
                  <TableHead>
                    <TableRow className="">
                      <TableCell className="selectable-table-head">
                        Subject
                      </TableCell>
                      {marksCardInformation.available_exam_list.map((data) => {
                        return (
                          selectedExamTestDropdown.some(
                            (key) => key.value === data.id
                          ) && (
                            <TableCell
                              className="selectable-table-head"
                              align="center"
                            >
                              {mergeExamSet.hasOwnProperty(data.id)
                                ? `${data.name} (${
                                    mergeExamSet[data["id"]]["mergeName"]
                                  })`
                                : data.name}
                            </TableCell>
                          )
                        );
                      })}
                    </TableRow>
                  </TableHead>
                  {is_cumulative && (
                    <TableHead>
                      <TableRow className="">
                        <TableCell className=""></TableCell>
                        {marksCardInformation.available_exam_list.map(
                          (data, index) => {
                            return (
                              selectedExamTestDropdown.some(
                                (key) => key.id === data.id
                              ) && (
                                <TableCell className="padding-0">
                                  <TableHead style={{ lineHeight: "0.2rem" }}>
                                    <TableRow className="">
                                      <TableCell className="mark-add-table-cell padding-y-zero text-align-center">
                                        <div style={{ width: "210px" }}>
                                          PPT
                                        </div>
                                      </TableCell>
                                      <TableCell className="mark-add-table-cell padding-y-zero text-align-center">
                                        <div style={{ width: "130px" }}>CA</div>
                                      </TableCell>
                                    </TableRow>
                                  </TableHead>
                                </TableCell>
                              )
                            );
                          }
                        )}
                      </TableRow>
                    </TableHead>
                  )}
                  <TableHead>
                    <TableRow className="">
                      <TableCell className=""></TableCell>
                      {marksCardInformation.available_exam_list.map(
                        (data, index) => {
                          return (
                            selectedExamTestDropdown.some(
                              (key) => key.value === data.id
                            ) && (
                              <TableCell
                                className=""
                                style={{ padding: "0px" }}
                              >
                                <TableHead style={{ lineHeight: "0.2rem" }}>
                                  <TableCell
                                    className="mark-add-table-cell padding-y-zero"
                                    component="th"
                                    scope="row"
                                    align="center"
                                  >
                                    <TableRow className="">
                                      <TableCell className="mark-add-table-cell text-align-center">
                                        <Box className="result-config-text">
                                          Original
                                        </Box>
                                      </TableCell>
                                      {is_enable_disable_test && (
                                        <TableCell className="mark-add-table-cell">
                                          <Tooltip
                                            title="Select All Subjects"
                                            enterDelay={400}
                                            enterNextDelay={400}
                                            placement="top-start"
                                            classes={{
                                              tooltip: "tooltip-show-data",
                                            }}
                                          >
                                            <Box class="exam-mark-checkbox padding-y-zero">
                                              <input
                                                type="checkbox"
                                                id={`written_${index}`}
                                                name="is_disabled"
                                                checked={
                                                  data?.is_disabled ?? false
                                                }
                                                value={
                                                  data?.is_disabled ?? false
                                                }
                                                onChange={(e) =>
                                                  handleSelectAllTest(
                                                    e,
                                                    index,
                                                    data.id,
                                                    "is_disabled"
                                                  )
                                                }
                                              />
                                              <label for={`written_${index}`}>
                                                <span></span>
                                              </label>
                                            </Box>
                                          </Tooltip>
                                        </TableCell>
                                      )}
                                      {!is_enable_disable_test && (
                                        <TableCell className="mark-add-table-cell">
                                          <Box className="result-config-text">
                                            Configured
                                          </Box>
                                        </TableCell>
                                      )}
                                      {is_cumulative && (
                                        <TableCell className="mark-add-table-cell text-align-center">
                                          <Box className="result-config-text">
                                            Original
                                          </Box>
                                        </TableCell>
                                      )}
                                      {is_enable_disable_test &&
                                        is_cumulative && (
                                          <TableCell className="mark-add-table-cell">
                                            <Tooltip
                                              title="Select All Subjects"
                                              enterDelay={400}
                                              enterNextDelay={400}
                                              placement="top-start"
                                              classes={{
                                                tooltip: "tooltip-show-data",
                                              }}
                                            >
                                              <Box class="exam-mark-checkbox padding-y-zero">
                                                <input
                                                  type="checkbox"
                                                  id={`cumulative_${index}`}
                                                  name="is_cum_disabled"
                                                  checked={
                                                    data?.is_cum_disabled ??
                                                    false
                                                  }
                                                  value={
                                                    data?.is_cum_disabled ??
                                                    false
                                                  }
                                                  onChange={(e) =>
                                                    handleSelectAllTest(
                                                      e,
                                                      index,
                                                      data.id,
                                                      "is_cum_disabled"
                                                    )
                                                  }
                                                />
                                                <label
                                                  for={`cumulative_${index}`}
                                                >
                                                  <span></span>
                                                </label>
                                              </Box>
                                            </Tooltip>
                                          </TableCell>
                                        )}
                                      {!is_enable_disable_test &&
                                        is_cumulative && (
                                          <TableCell className="mark-add-table-cell">
                                            Configured
                                          </TableCell>
                                        )}
                                      <TableCell className="mark-add-table-cell"></TableCell>
                                    </TableRow>
                                  </TableCell>
                                </TableHead>
                              </TableCell>
                            )
                          );
                        }
                      )}
                    </TableRow>
                  </TableHead>
                  {Object.keys(part_type).map((part_key) => {
                    return (
                      part_type[part_key].list.length > 0 &&
                      getSubjectFormat(part_key)
                    );
                  })}
                </Table>
              </TableContainer>
              <TableContainer className="result-config-bg header-align w-auto m-b-60px">
                <Table
                  size="small"
                  aria-label="simple table"
                  className="w-auto"
                >
                  <TableHead>
                    <TableRow className="">
                      <TableCell></TableCell>
                      <TableCell className="selectable-table-head">
                        Total
                      </TableCell>
                      <TableCell className="selectable-table-head">
                        Min Marks
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableHead>
                    <TableRow className="height-26px">
                      <TableCell></TableCell>
                      <TableCell className="height-table-cell text-align-center">{` `}</TableCell>
                      <TableCell className="height-table-cell text-align-center">{` `}</TableCell>
                    </TableRow>
                    <TableRow
                      className={
                        is_enable_disable_test ? "height-49px" : "height-39px"
                      }
                    >
                      <TableCell></TableCell>
                      <TableCell className="height-table-cell text-align-center">
                        Max
                      </TableCell>
                      <TableCell
                        className={
                          is_edit_final_result_config
                            ? "height-table-cell"
                            : "height-table-cell text-align-center"
                        }
                      >
                        Min
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  {Object.keys(part_type).map((part_key) => {
                    return (
                      part_type[part_key].list.length > 0 &&
                      getTotalFormat(part_key)
                    );
                  })}
                </Table>
              </TableContainer>
            </Box>
          )}
          {!is_approved && selectedExamTestDropdown.length > 0 && (
            <Box className="submt-button-float-bottom" mt={3}>
              <Button
                className={submitDisable ? "submit disabled-button" : "submit"}
                variant="contained"
                style={{ float: "right" }}
                disabled={submitDisable}
                onClick={() => submitAndFinalize()}
              >
                Finalize
              </Button>
              <Button
                className={
                  submitDisable
                    ? "submit mr-20 disabled-button"
                    : "submit mr-20"
                }
                variant="contained"
                style={{ float: "right" }}
                disabled={submitDisable}
                onClick={() => submitMarks()}
              >
                Submit
              </Button>
            </Box>
          )}
          <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            open={openSnackBar}
            autoHideDuration={2000}
            onClose={handleCloseSnacBar}
          >
            <Alert onClose={handleCloseSnacBar} severity="error">
              {alertData}
            </Alert>
          </Snackbar>
        </>
      )}
    </>
  );
}

export default withRouter(TermWiseFinalResultConfignew);
