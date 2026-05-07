import React, { Component } from "react";
import {
  Box,
  Grid,
  MenuItem,
  Checkbox,
  Button,
  Dialog,
  CircularProgress,
  ListItemText,
} from "@material-ui/core";
import Swal from "sweetalert2";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import { withRouter } from "react-router-dom";
import Snackbar from "@material-ui/core/Snackbar";

import StudentsSubjectList from "Containers/Enrolement/Components/StudentsSubjectsList";
import { postRequest, getRequest } from "Includes/api/apicall";
import { Alert, getSettingValue } from "Includes/functions";
import { POST_URL, GET_URL } from "Includes/urls";
import { Actions } from "Constants/permissions";
import commonMessages from "Constants/messages";
import messages from "./../messages";
import "./styles.scss";

const number_of_language = parseInt(getSettingValue("number_of_language"));
const isMultipleSubject = parseInt((getSettingValue('subject_assignment')) == 1 ? 1 : 0)

class AssignSectionSubjects extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      allSubjectList: [],
      languageList: { first: [], second: [], third: [] },
      language: { first: {}, second: {}, third: {} },
      subjectList: [],
      one_language_list: [],
      selectedSubject: [],
      snackbar: false,
      alertData: "",
      backPage: false,
      assign: true,
    };
  }

  componentDidMount() {
    this.getSubjectsList();
  }

  getSubjectsList = () => {
    const { languageList, one_language_list, subjectList, language } =
      this.state;
    const { year, student_id, section_id, expanded, standardList } = this.props;
    const url = GET_URL.getAssignSubject.api;
    const params = {
      academic_year: year,
      standard: student_id,
      section: section_id,
    };
    getRequest(url, params).then((response) => {
      if (response && response.status === 200) {
        const subject_list = [
          ...response.data.data.unassignedsubjects,
          ...response.data.data.assigned_subjects,
        ];
        subject_list.sort((a, b) =>
          a.subject_name.localeCompare(b.subject_name)
        );
        subject_list.map((data) => {
          if (data.id) {
            data.enable = true;
          } else {
            data.enable = false;
          }
          if (data.subject_is_language) {
            if (data.subject_sequence === 1) {
              languageList.first.push(data);
              if (data.id) {
                language.first.subject_id = data.subject_id;
                language.first.name = data.subject_codename;
              }
            } else if (data.subject_sequence === 2) {
              languageList.second.push(data);
              if (data.id) {
                language.second.subject_id = data.subject_id;
                language.second.name = data.subject_codename;
              }
            } else if (data.subject_sequence === 3) {
              languageList.third.push(data);
              if (data.id) {
                language.third.subject_id = data.subject_id;
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
    let { subjectList, language, one_language_list, languageList } = this.state;
    let validate;
    let assigned_subjects = [];
    if (number_of_language === 1) {
      one_language_list.forEach((data) => {
        if (data.enable && data.subject_is_language) {
          assigned_subjects.push(data.subject_id);
        }
      });
    } else if ((number_of_language === 2 || number_of_language === 3) && !isMultipleSubject) {
      if (Object.keys(language.first).length !== 0) {
        assigned_subjects.push(language.first.subject_id);
      }
      if (Object.keys(language.second).length !== 0) {
        assigned_subjects.push(language.second.subject_id);
      }
      if (Object.keys(language.third).length !== 0) {
        assigned_subjects.push(language.third.subject_id);
      }
    }
    else if(isMultipleSubject){
      if(languageList.first.length>0){
        languageList.first.forEach((data) => {
          if (data.enable) {
            assigned_subjects.push(data.subject_id);
          }
        });
      }
      if(languageList.second.length>0){
        languageList.second.forEach((data) => {
          if (data.enable) {
            assigned_subjects.push(data.subject_id);
          }
        });
      }
      if(languageList.third.length>0){
        languageList.third.forEach((data) => {
          if (data.enable) {
            assigned_subjects.push(data.subject_id);
          }
        });
      }
    }
    subjectList.forEach((data) => {
      if (data.enable && !data.subject_is_language) {
        assigned_subjects.push(data.subject_id);
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

  onSubmit = () => {
    const { standard_section, onCancel } = this.props;
    const assigned_subjects = this.validateAndPostData();
    if (assigned_subjects) {
      const url = POST_URL.assignsubject.api;
      const payload = {
        standard_section: standard_section,
        assigned_subjects: assigned_subjects,
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
          this.setState({ assign: false });
          onCancel(true);
        }
      });
    }
  };

  handleClose = () => {
    this.setState({ snackbar: false });
  };

  onChangeLanguageSubject = (id) => {
    let { one_language_list } = this.state;
    // eslint-disable-next-line no-unused-vars
    for (const subject of one_language_list) {
      if (subject.subject_id === id) {
        subject.enable = !subject.enable;
        break;
      }
    }
    this.setState({ one_language_list });
  };

  onChangeSubject = (id) => {
    let { subjectList } = this.state;
    // eslint-disable-next-line no-unused-vars
    for (const subject of subjectList) {
      if (subject.subject_id === id) {
        subject.enable = !subject.enable;
        break;
      }
    }
    this.setState({ subjectList });
  };

  onChangeLanguage = (name, id, subject_codename) => {
    let { language ,languageList} = this.state;
    if (!isMultipleSubject) {
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
      language[name].subject_id = id;
      language[name].name = subject_codename;
    }
    else{
      for (const subject of languageList[name]) {
        if (subject.subject_id === id) {
          subject.enable = !subject.enable;
          break;
        }
      }
    }
    this.setState({ language ,languageList});
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
            onClose={() => this.props.onCancel(false)}
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
                                          data.subject_id,
                                          data.subject_codename
                                        )
                                      }
                                    >
                                      <input
                                        type={isMultipleSubject ? "checkbox" : "radio"}
                                        value={language.first.subject_id}
                                        name="first"
                                        checked={
                                          isMultipleSubject?data.enable:
                                          (language.first.subject_id ===
                                          data.subject_id)
                                        }
                                        defaultChecked={
                                          isMultipleSubject?data.enable:
                                          (language.first.subject_id ===
                                          data.subject_id)
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
                                          data.subject_id,
                                          data.subject_codename
                                        )
                                      }
                                    >
                                      <input
                                        type={isMultipleSubject ? "checkbox" : "radio"}
                                        value={language.second.subject_id}
                                        name="second"
                                        checked={
                                          isMultipleSubject?data.enable:
                                          (language.second.subject_id ===
                                          data.subject_id)
                                        }
                                        defaultChecked={
                                          isMultipleSubject?data.enable:
                                          (language.second.subject_id ===
                                          data.subject_id)
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
                                            data.subject_id,
                                            data.subject_codename
                                          )
                                        }
                                      >
                                        <input
                                          type={isMultipleSubject ? "checkbox" : "radio"}
                                          value={language.third.subject_id}
                                          name="third"
                                          checked={
                                            isMultipleSubject?data.enable:
                                            (language.third.subject_id ===
                                            data.subject_id)
                                          }
                                          defaultChecked={
                                            isMultipleSubject?data.enable:
                                            (language.third.subject_id ===
                                            data.subject_id)
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
                                this.onChangeLanguageSubject(subject.subject_id)
                              }
                            >
                              <Checkbox
                                color="primary"
                                checked={subject.enable}
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
                              this.onChangeSubject(subject.subject_id)
                            }
                          >
                            <Checkbox
                              color="primary"
                              checked={subject.enable}
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
                  onClick={() => this.props.onCancel(false)}
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

AssignSectionSubjects.propTypes = {
  year: PropTypes.number.isRequired,
  student_id: PropTypes.number.isRequired,
  section_id: PropTypes.number.isRequired,
  standard_section: PropTypes.number.isRequired,
  expanded: PropTypes.string.isRequired,
  onCancel: PropTypes.func.isRequired,
  standardList: PropTypes.array.isRequired,
};

export default withRouter(AssignSectionSubjects);
