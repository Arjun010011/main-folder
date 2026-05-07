import React, { Component } from "react";
import {
  Box,
  Grid,
  MenuItem,
  Checkbox,
  Button,
  CircularProgress,
  ListItemText,
  Dialog,
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import Snackbar from "@material-ui/core/Snackbar";
import { FormattedMessage } from "react-intl";
import PropTypes from "prop-types";
import Swal from "sweetalert2";

import StudentsSubjectList from "Containers/Enrolement/Components/StudentsSubjectsList";
import { postRequest, getRequest } from "Includes/api/apicall";
import { Alert, getSettingValue } from "Includes/functions";
import { POST_URL, GET_URL } from "Includes/urls";
import { Actions } from "Constants/permissions";
import commonMessages from "Constants/messages";
import messages from "./messages";
import "./styles.scss";

const number_of_language = parseInt(getSettingValue("number_of_language"));

class SubjectAssign extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      allSubjectList: [],
      languageList: { first: [], second: [], third: [] },
      subjectList: [],
      one_language_list: [],
      language: { first: {}, second: {}, third: {} },
      selectedSubject: [],
      snackbar: false,
      alertData: "",
      backPage: false,
      assign: true,
    };
  }

  componentDidMount() {
    const { multiple } = this.props;
    if (multiple) {
      this.getClassSubjectList();
    }
    else {
      this.getStudentSubjectsList();
    }
  }

  getClassSubjectList = () => {
    let { languageList, one_language_list, subjectList, language } = this.state;
    const { year, student_id, expanded, standardList, standard, section } =
      this.props;
    let url = GET_URL.getAssignSubject.api;
    let params = {
      academic_year: year,
      standard: standard,
      section: section,
    };
    getRequest(url, params).then((response) => {
      if (response && response.status === 200) {
        // response.data.data.unassignedsubjects.map((data) => {
        //   return (
        //     // (data.subject_name = data.name),
        //     // (data.subject_codename = data.codename),
        //     // (data.subject = data.id),
        //     // (data.subject_is_language = data.is_language),
        //     // (data.subject_sequence = data.sequence)
        //   );
        // });
        let subject_list = [
          // ...response.data.data.unassignedsubjects,
          ...response.data.data.assigned_subjects,
        ];
        subject_list.sort((a, b) =>
          a.subject_name.localeCompare(b.subject_name)
        );
        subject_list.forEach((data) => {
          if (data.student) {
            data.enable = true;
          } else {
            data.enable = false;
          }
          if (data.subject_is_language) {
            if (data.subject_sequence === 1) {
              languageList.first.push(data);
              if (data.student) {
                language.first.subject = data.subject;
                language.first.name = data.subject_codename;
              }
            } else if (data.subject_sequence === 2) {
              languageList.second.push(data);
              if (data.student) {
                language.second.subject = data.subject;
                language.second.name = data.subject_codename;
              }
            } else if (data.subject_sequence === 3) {
              languageList.third.push(data);
              if (data.student) {
                language.third.subject = data.subject;
                language.third.name = data.subject_codename;
              }
            }
            one_language_list.push(data);
          } else {
            subjectList.push(data);
          }
        });
        this.setState({
          languageList,
          subjectList,
          one_language_list,
          year: year,
          student_id: student_id,
          expanded: expanded,
          standardList: standardList,
          language,
          loading: false,
        });
      }
    });
  };

  getStudentSubjectsList = () => {
    let { languageList, one_language_list, subjectList, language } = this.state;
    const { year, student_id, expanded, standardList, standard_section } =
      this.props;
    let url = GET_URL.assignsubjectstudent.api;
    let params = {
      academic_year: year,
      student: student_id,
      standard_section: standard_section,
    };
    getRequest(url, params).then((response) => {
      if (response && response.status === 200) {
        response.data.data.unassigned_subjects.map((data) => {
          return (
            (data.subject_name = data.name),
            (data.subject_codename = data.codename),
            (data.subject = data.id),
            (data.subject_is_language = data.is_language),
            (data.subject_sequence = data.sequence)
          );
        });
        let subject_list = [
          ...response.data.data.unassigned_subjects,
          ...response.data.data.assigned_subjects,
        ];
        subject_list.sort((a, b) =>
          a.subject_name.localeCompare(b.subject_name)
        );
        subject_list.forEach((data) => {
          if (data.student) {
            data.enable = true;
          } else {
            data.enable = false;
          }
          if (data.subject_is_language) {
            if (data.subject_sequence === 1) {
              languageList.first.push(data);
              if (data.student) {
                language.first.subject = data.subject;
                language.first.name = data.subject_codename;
              }
            } else if (data.subject_sequence === 2) {
              languageList.second.push(data);
              if (data.student) {
                language.second.subject = data.subject;
                language.second.name = data.subject_codename;
              }
            } else if (data.subject_sequence === 3) {
              languageList.third.push(data);
              if (data.student) {
                language.third.subject = data.subject;
                language.third.name = data.subject_codename;
              }
            }
            one_language_list.push(data);
          } else {
            subjectList.push(data);
          }
        });
        this.setState({
          languageList,
          subjectList,
          one_language_list,
          year: year,
          student_id: student_id,
          expanded: expanded,
          standardList: standardList,
          language,
          loading: false,
        });
      }
    });
  };

  validateAndPostData = () => {
    let { subjectList, language, one_language_list } = this.state;
    let validate;
    let assigned_subjects = [];
    if (number_of_language === 1) {
      one_language_list.forEach((data) => {
        if (Boolean(data.enable) && data.subject_is_language) {
          assigned_subjects.push(data.subject);
        }
      });
    } else if (number_of_language === 2 || number_of_language === 3) {
      if (Object.keys(language.first).length !== 0) {
        assigned_subjects.push(language.first.subject);
      }
      if (Object.keys(language.second).length !== 0) {
        assigned_subjects.push(language.second.subject);
      }
      if (Object.keys(language.third).length !== 0) {
        assigned_subjects.push(language.third.subject);
      }
    }
    subjectList.forEach((data) => {
      if (data.enable && !data.subject_is_language) {
        assigned_subjects.push(data.subject);
      }
    });

    if (assigned_subjects.length === 0) {
      validate = false;
      this.setState({
        snackbar: true,
        alertData: <FormattedMessage {...messages.subjectError} />,
      });
    } else {
      validate = assigned_subjects;
    }
    return validate;
  };

  getStudentIds = (students) => {
    let return_value = []
    students.map((data) => {
      return_value.push(data['student'])
    })
    return return_value
  }

  onSubmit = () => {
    const { student_id, year } = this.state;
    const { multiple } = this.props;
    let assigned_subjects = this.validateAndPostData();
    let student_ids = [student_id]
    if (multiple) {
      student_ids = this.getStudentIds(student_id)
    }
    if (assigned_subjects) {
      let url = POST_URL.assignsubjectstudent.api;
      let payload = {
        assigned_subjects,
        academic_year: year,
        student_ids: student_ids,
      };
      postRequest(url, payload).then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: response.data.Reason,
            showConfirmButton: false,
            timer: 1500,
          });
          this.setState({ assign: false }, () => {
            this.props.onClose(true);
          });
        }
      });
    }
  };

  handleClose = () => {
    this.setState({ snackbar: false });
  };

  onCancle = () => {
    this.setState({ assign: false }, () => {
      this.props.onClose(false);
    });
  };

  onChangeLanguageSubject = (id) => {
    let { one_language_list } = this.state;
    // eslint-disable-next-line no-unused-vars
    for (const data of one_language_list) {
      if (data.subject === id) {
        data.enable = !data.enable;
        break;
      }
    }
    this.setState({ one_language_list });
  };

  onChangeSubject = (id) => {
    let { subjectList } = this.state;
    // eslint-disable-next-line no-unused-vars
    for (const data of subjectList) {
      if (data.subject === id) {
        data.enable = !data.enable;
        break;
      }
    }
    this.setState({ subjectList });
  };

  onChangeLanguage = (name, id, subject_codename) => {
    let { language } = this.state;
    if (name === "first") {
      if (language.second.name === subject_codename) {
        language.second = {};
      }
      if (language.third.name === subject_codename) {
        language.third = {};
      }
    }
    if (name === "second") {
      if (language.first.name === subject_codename) {
        language.first = {};
      }
      if (language.third.name === subject_codename) {
        language.third = {};
      }
    }
    if (name === "third") {
      if (language.second.name === subject_codename) {
        language.second = {};
      }
      if (language.first.name === subject_codename) {
        language.first = {};
      }
    }
    language[name].subject = id;
    language[name].name = subject_codename;
    this.setState({
      language: { ...language },
    });
  };

  render() {
    let {
      languageList,
      one_language_list,
      loading,
      subjectList,
      language,
      alertData,
      snackbar,
      assign,
      backPage,
      standardList,
      year,
    } = this.state;
    return (
      <>
        {" "}
        {backPage === false && (
          <Dialog
            fullWidth={true}
            maxWidth={"md"}
            maxHeight="600px"
            onClose={this.onCancle}
            aria-labelledby="max-width-dialog-title"
            open={assign}
          >
            <Box className="dialog-box-grid">
              {!loading && (
                <Grid container>
                  {number_of_language !== 0 && (
                    <Grid item md={7} xs={12}>
                      <Box
                        className={
                          number_of_language === 1
                            ? "subject-part-heading subject-list-heading"
                            : "subject-part-heading"
                        }
                      >
                        <FormattedMessage {...commonMessages.languageList} />
                      </Box>

                      {number_of_language !== 1 && (
                        <Box>
                          {languageList.first.length > 0 && (
                            <Box className="language-list-outer-box">
                              <Box className="language-label-box">
                                <FormattedMessage {...messages.firstLang} />
                              </Box>
                              <Box>
                                {languageList.first.map((data, index) => {
                                  return (
                                    <label
                                      key={`first-lang-${index}`}
                                      className="subject-name-enrolled"
                                      onChange={() =>
                                        this.onChangeLanguage(
                                          "first",
                                          data.subject,
                                          data.subject_codename
                                        )
                                      }
                                    >
                                      <input
                                        type="radio"
                                        value={language.first.subject}
                                        name="first"
                                        checked={
                                          language.first.subject ===
                                          data.subject
                                        }
                                        defaultChecked={
                                          language.first.subject ===
                                          data.subject
                                        }
                                      />{" "}
                                      {data.subject_name}
                                    </label>
                                  );
                                })}
                              </Box>
                            </Box>
                          )}
                          {languageList.second.length > 0 && (
                            <Box className="language-list-outer-box">
                              <Box className="language-label-box">
                                <FormattedMessage {...messages.secondLang} />
                              </Box>
                              <Box>
                                {languageList.second.map((data, index) => {
                                  return (
                                    <label
                                      key={`second-lang-${index}`}
                                      className="subject-name-enrolled"
                                      onChange={() =>
                                        this.onChangeLanguage(
                                          "second",
                                          data.subject,
                                          data.subject_codename
                                        )
                                      }
                                    >
                                      <input
                                        type="radio"
                                        value={language.second.subject}
                                        name="second"
                                        checked={
                                          language.second.subject ===
                                          data.subject
                                        }
                                        defaultChecked={
                                          language.second.subject ===
                                          data.subject
                                        }
                                      />{" "}
                                      {data.subject_name}
                                    </label>
                                  );
                                })}
                              </Box>
                            </Box>
                          )}
                          {languageList.third.length > 0 &&
                            number_of_language === 3 && (
                              <Box className="language-list-outer-box">
                                <Box className="language-label-box">
                                  <FormattedMessage {...messages.thirdLang} />
                                </Box>
                                <Box>
                                  {languageList.third.map((data, index) => {
                                    return (
                                      <label
                                        key={`third-lang-${index}`}
                                        className="subject-name-enrolled"
                                        onChange={() =>
                                          this.onChangeLanguage(
                                            "third",
                                            data.subject,
                                            data.subject_codename
                                          )
                                        }
                                      >
                                        <input
                                          type="radio"
                                          value={language.third.subject}
                                          name="third"
                                          checked={
                                            language.third.subject ===
                                            data.subject
                                          }
                                          defaultChecked={
                                            language.third.subject ===
                                            data.subject
                                          }
                                        />{" "}
                                        {data.subject_name}
                                      </label>
                                    );
                                  })}
                                </Box>
                              </Box>
                            )}
                        </Box>
                      )}
                      {number_of_language === 1 &&
                        one_language_list.map((subject, index) => {
                          return (
                            <MenuItem
                              key={index}
                              value={subject.subject_name}
                              onClick={() =>
                                this.onChangeLanguageSubject(subject["subject"])
                              }
                            >
                              <Checkbox
                                color="primary"
                                checked={subject["enable"]}
                              />
                              <Box className="text-capitalize">
                                <ListItemText primary={subject.subject_name} />
                              </Box>
                            </MenuItem>
                          );
                        })}
                    </Grid>
                  )}
                  <Grid item md={5} xs={12}>
                    <Box className="subject-part-heading subject-list-heading">
                      <FormattedMessage {...commonMessages.subjectList} />
                    </Box>
                    <Box>
                      {subjectList.map((subject, index) => {
                        return (
                          <MenuItem
                            key={index}
                            value={subject.subject_name}
                            onClick={() =>
                              this.onChangeSubject(subject["subject"])
                            }
                          >
                            <Checkbox
                              color="primary"
                              checked={subject["enable"]}
                            />
                            <Box className="text-capitalize">
                              <ListItemText primary={subject.subject_name} />
                            </Box>
                          </MenuItem>
                        );
                      })}
                    </Box>
                  </Grid>
                </Grid>
              )}
              {loading && (
                <Box display="flex">
                  <Box className="loader-subject">
                    <CircularProgress />
                  </Box>
                </Box>
              )}
            </Box>
            <Box display="flex" justifyContent="flex-end">
              <Box className="submit-box">
                <Button
                  className="submit assign-subject-button"
                  variant="contained"
                  onClick={() => this.onSubmit()}
                >
                  <FormattedMessage {...commonMessages.submit} />
                </Button>
              </Box>
              <Box className="submit-box">
                <Button
                  className="assign-cancel-button"
                  variant="contained"
                  onClick={() => this.onCancle()}
                >
                  <FormattedMessage {...commonMessages.cancel} />
                </Button>
              </Box>
            </Box>
          </Dialog>
        )}
        {backPage === true && (
          <Box>
            <StudentsSubjectList
              standardList={standardList}
              academicYear={year}
              subjectassignurl={Actions.assign_subjects_for_students.create.url}
            />
          </Box>
        )}
        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          open={snackbar}
          autoHideDuration={10000}
          onClose={this.handleClose}
        >
          <Alert onClose={this.handleClose} severity="error">
            {alertData}
          </Alert>
        </Snackbar>
      </>
    );
  }
}

SubjectAssign.propTypes = {
  year: PropTypes.number.isRequired,
  expanded: PropTypes.any.isRequired,
  onClose: PropTypes.func.isRequired,
  student_id: PropTypes.number.isRequired,
  standardList: PropTypes.array.isRequired,
  standard_section: PropTypes.number.isRequired,
};

export default withRouter(SubjectAssign);
