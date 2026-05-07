import React, { Component } from "react";
import {
  IconButton,
  Box,
  Tooltip,
  Grid,
  MenuItem,
  Checkbox,
  Button,
  TextField,
  ListItem,
  List,
  ListItemSecondaryAction,
  ListItemText,
} from "@material-ui/core";
import MenuBookOutlinedIcon from "@material-ui/icons/MenuBookOutlined";
import DialogTitle from "@material-ui/core/DialogTitle";
import Dialog from "@material-ui/core/Dialog";
import DeleteIcon from "@material-ui/icons/Delete";
import Snackbar from "@material-ui/core/Snackbar";
import { withRouter } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import Swal from "sweetalert2";

import StudentsSubjectList from "Containers/Enrolement/Components/StudentsSubjectsList";
import { postRequest, getRequest } from "Includes/api/apicall";
import { POST_URL, GET_URL } from "Includes/urls";
import { Alert } from "Includes/functions";
import { Actions } from "Constants/permissions";
import messages from "Constants/messages";
import "./styles.scss";

class AssignMultiLang extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedUnassignedObj: [],
      assignedSubjectList: [],
      unassignedSubjectList: [],
      existing_objects: [],
      search_name: "",
      alertData: "",
      snackbar: false,
      assign: true,
      backPage: false,
      assignedlanguageList: { first: [], second: [], third: [] },
      unassignedlanguageList: { first: [], second: [], third: [] },
    };
  }

  componentDidMount() {
    this.getSubjectsList();
  }

  getSubjectsList = () => {
    let unassignedSubjectList;
    let assignedSubjectList;
    let { assignedlanguageList, unassignedlanguageList } = this.state;
    const { year, student_id, section_id, expanded, standardList } =
      this.props.location.state;
    let url = GET_URL.getAssignSubject.api;
    const params = {
      academic_year: year,
      standard: student_id,
      section: section_id,
    };
    getRequest(url, params).then((response) => {
      if (response && response.status === 200) {
        assignedSubjectList = response.data.data.assigned_subjects;
        unassignedSubjectList = response.data.data.unassignedsubjects;
        unassignedSubjectList.forEach((data) => {
          if (data.subject_is_language) {
            if (data.subject_sequence === 1) {
              unassignedlanguageList["first"].push(data);
            } else if (data.subject_sequence === 2) {
              unassignedlanguageList["second"].push(data);
            } else if (data.subject_sequence === 3) {
              unassignedlanguageList["third"].push(data);
            }
          }
        });
        assignedSubjectList.foreach((data) => {
          if (data.subject_is_language) {
            if (data.subject_sequence === 1) {
              assignedlanguageList["first"].push(data);
              let unassignedFormat = {
                subject: data.subject_id,
                subject_branch: data.subject_branch,
                subject_codename: data.subject_codename,
                subject_id: data.subject_id,
                subject_is_language: data.subject_is_language,
                subject_name: data.subject_name,
                subject_sequence: data.subject_sequence,
                is_selected: true,
              };
              unassignedlanguageList["first"].push(unassignedFormat);
            } else if (data.subject_sequence === 2) {
              assignedlanguageList["second"].push(data);
              let unassignedFormat = {
                subject: data.subject_id,
                subject_branch: data.subject_branch,
                subject_codename: data.subject_codename,
                subject_id: data.subject_id,
                subject_is_language: data.subject_is_language,
                subject_name: data.subject_name,
                subject_sequence: data.subject_sequence,
                is_selected: true,
              };
              unassignedlanguageList["second"].push(unassignedFormat);
            } else if (data.subject_sequence === 3) {
              assignedlanguageList["third"].push(data);
              let unassignedFormat = {
                subject: data.subject_id,
                subject_branch: data.subject_branch,
                subject_codename: data.subject_codename,
                subject_id: data.subject_id,
                subject_is_language: data.subject_is_language,
                subject_name: data.subject_name,
                subject_sequence: data.subject_sequence,
                is_selected: true,
              };
              unassignedlanguageList["third"].push(unassignedFormat);
            }
          }
        });
        this.setState({
          assignedSubjectList: assignedSubjectList,
          unassignedSubjectList: unassignedSubjectList,
          year: year,
          student_id: student_id,
          expanded: expanded,
          standardList: standardList,
          assignedlanguageList: assignedlanguageList,
          unassignedlanguageList: unassignedlanguageList,
        });
      }
    });
  };

  onSelectUnAsssignedObjects = (data) => {
    let selectedUnassignedObj = [...this.state.selectedUnassignedObj];
    let assignedSubjectList = [...this.state.assignedSubjectList];

    if (selectedUnassignedObj.includes(data.subject_name)) {
      const index = selectedUnassignedObj.indexOf(data.subject_name);
      selectedUnassignedObj.splice(index, 1);
    } else {
      selectedUnassignedObj.push(data.subject_name);
    }
    let isPresent = false;
    for (const assigneddataId in assignedSubjectList) {
      const assigneddata = assignedSubjectList[assigneddataId];
      if (assigneddata.subject_name === data.subject_name) {
        assignedSubjectList.splice(assigneddataId, 1);
        isPresent = true;
        break;
      }
    }
    if (!isPresent) {
      assignedSubjectList.push(data);
    }
    this.setState({ selectedUnassignedObj, assignedSubjectList });
  };

  handleSearchChange = (e) => {
    const search_name = e.target.value;
    this.setState({ search_name });
  };

  deleteAssignedItem = (data) => {
    let assignedSubjectList = [...this.state.assignedSubjectList];
    let unassignedSubjectList = [...this.state.unassignedSubjectList];
    let selectedUnassignedObj = [...this.state.selectedUnassignedObj];
    var index = assignedSubjectList.indexOf(data);
    if (index > -1) assignedSubjectList.splice(index, 1);
    let isPresent = false;
    for (const unassigneddata of unassignedSubjectList) {
      if (unassigneddata.subject_name === data.subject_name) {
        isPresent = true;
        break;
      }
    }
    if (!isPresent) {
      unassignedSubjectList.push(data);
    }
    index = selectedUnassignedObj.indexOf(data.subject_name);
    if (index > -1) selectedUnassignedObj.splice(index, 1);
    this.setState({
      assignedSubjectList,
      unassignedSubjectList,
      selectedUnassignedObj,
    });
  };

  onSubmit = () => {
    let { assignedSubjectList, assignedlanguageList } = this.state;
    if (
      assignedSubjectList.length === 0 &&
      assignedlanguageList.first.length === 0 &&
      assignedlanguageList.second.length === 0 &&
      assignedlanguageList.third.length === 0
    ) {
      this.setState({
        alertData: <FormattedMessage {...messages.assignSubErr} />,
        snackbar: true,
        severity: "error",
      });
    } else {
      let { assignedSubjectList, assignedlanguageList } = this.state;
      const { standard_section } = this.props.location.state;
      let assigned_subjects = [];
      assignedSubjectList.forEach((data) => {
        if (!data.subject_is_language) {
          assigned_subjects.push(data.subject_id);
        }
      });
      assignedlanguageList.first.foreach((data) => {
        assigned_subjects.push(data.subject_id);
      });
      assignedlanguageList.second.foreach((data) => {
        assigned_subjects.push(data.subject_id);
      });
      assignedlanguageList.third.foreach((data) => {
        assigned_subjects.push(data.subject_id);
      });
      let url = POST_URL.assignsubject.api;
      let payload = {
        standard_section,
        assigned_subjects,
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
            this.backToAssignedPage("submit");
          });
        }
      });
    }
  };
  handleClose = () => {
    this.setState({
      snackbar: false,
    });
  };

  onCancle = () => {
    this.setState(
      {
        assign: false,
      },
      () => {
        this.backToAssignedPage("cancle");
      }
    );
  };

  backToAssignedPage = () => {
    let { student_id, year } = this.state;
    let { standard_section, expanded } = this.props.location.state;
    let searchState = {
      year: year,
      student_id: student_id,
      standard_section: standard_section,
      expanded: expanded,
    };

    // eslint-disable-next-line no-undef
    let searchParam = "?" + new URLSearchParams(searchState).toString();
    this.props.history.push({
      pathname: Actions.assign_subjects.view.url,
      search: searchParam,
      expanded: expanded,
    });
  };

  onChangeLanguage = (name, id, subject_codename, type, data) => {
    let { unassignedlanguageList, assignedlanguageList } = this.state;
    unassignedlanguageList[name].forEach((unassigned) => {
      if (unassigned.subject_name === data.subject_name) {
        if (data.is_selected && data.is_selected === true) {
          unassigned.is_selected = false;
          assignedlanguageList[name].forEach((assigned) => {
            if (assigned.subject_name === data.subject_name) {
              let removeIndex = -1;
              // eslint-disable-next-line no-unused-vars
              for (const item_ind in assignedlanguageList[name]) {
                const item = assignedlanguageList[name][item_ind];
                if (data.subject_name === item.subject_name) {
                  removeIndex = item_ind;
                  break;
                }
              }
              if (removeIndex !== -1) {
                assignedlanguageList[name].splice(removeIndex, 1);
              }
            }
          });
        } else {
          unassignedlanguageList[name].forEach((unassigned) => {
            if (unassigned.subject_name === data.subject_name) {
              if (data.is_selected && data.is_selected === false) {
                data.is_selected = true;
                assignedlanguageList[name].push(data);
              } else {
                data["is_selected"] = true;
                assignedlanguageList[name].push(data);
              }
            }
          });
        }
      }
    });
    this.setState({
      unassignedlanguageList: { ...unassignedlanguageList },
      assignedlanguageList: { ...assignedlanguageList },
    });
  };

  deleteAssignedLangItem = (data, name) => {
    let { assignedlanguageList, unassignedlanguageList } = this.state;
    unassignedlanguageList[name].forEach((unassigned) => {
      if (unassigned.subject_name === data.subject_name) {
        if (unassigned.is_selected && unassigned.is_selected === true) {
          unassigned.is_selected = false;
          assignedlanguageList[name].forEach((assigned) => {
            if (assigned.subject_name === data.subject_name) {
              var removeIndex = assignedlanguageList[name]
                .map(function (item) {
                  return item.subject_name;
                })
                .indexOf(data.subject_name);
              assignedlanguageList[name].splice(removeIndex, 1);
            }
          });
        }
      }
    });
    this.setState({
      unassignedlanguageList: { ...unassignedlanguageList },
      assignedlanguageList: { ...assignedlanguageList },
    });
  };

  render() {
    let {
      selectedUnassignedObj,
      unassignedSubjectList,
      assignedSubjectList,
      existing_objects,
      search_name,
      alertData,
      snackbar,
      assign,
      backPage,
      standardList,
      year,
      unassignedlanguageList,
      assignedlanguageList,
    } = this.state;
    return (
      <>
        {" "}
        {backPage === false && (
          <Dialog
            fullWidth={true}
            maxWidth={"lg"}
            maxHeight="600px"
            aria-labelledby="max-width-dialog-title"
            open={assign}
          >
            <DialogTitle id="max-width-dialog-title">
              Assign Subject
            </DialogTitle>
            <Box>
              <Grid container className="assign-outer-body">
                <Grid
                  item
                  xs={12}
                  sm={12}
                  md={6}
                  className="assign-subject-part assign-subject-outer-body"
                  minHeight="200px"
                >
                  <Box display="flex" className="assign-header-bar">
                    <Box className="assign-col-head assign-subject-name" mt={3}>
                      <Box mr="10px"> Assign Subject </Box>
                      <MenuBookOutlinedIcon />
                    </Box>
                    <Box mr={3} mt={1}>
                      <TextField
                        id="outlined-textarea"
                        label="Search"
                        multiline
                        value={search_name}
                        onChange={this.handleSearchChange}
                      />
                    </Box>
                  </Box>
                  <Box mt={2} className="assign-subjects-body margin-top-25">
                    <Grid container>
                      <Grid item md={7} xs={12}>
                        <Box className="language-list lang-font">
                          <Box>First Language:</Box>
                          <Box className="language-type first-lang-width">
                            {unassignedlanguageList.first &&
                              unassignedlanguageList.first.map(
                                (data, index) => {
                                  return (
                                    <label
                                      className="padding-right-10"
                                      key={`first-lang-${index}`}
                                    >
                                      <input
                                        type="checkbox"
                                        value={
                                          unassignedlanguageList["first"]["id"]
                                        }
                                        name="first"
                                        checked={data.is_selected}
                                        onChange={() =>
                                          this.onChangeLanguage(
                                            "first",
                                            data.subject_id,
                                            data.subject_codename,
                                            "unassignedlanguageList",
                                            data
                                          )
                                        }
                                      />{" "}
                                      {data.subject_name}
                                    </label>
                                  );
                                }
                              )}
                          </Box>
                        </Box>
                        <Box className="language-list lang-font">
                          <Box>Second Language:</Box>
                          <Box className="language-type second-lang-width ">
                            {unassignedlanguageList.second &&
                              unassignedlanguageList.second.map(
                                (data, index) => {
                                  return (
                                    <label
                                      className="padding-right-10"
                                      key={`second-lang-${index}`}
                                    >
                                      <input
                                        type="checkbox"
                                        value={
                                          unassignedlanguageList["second"]["id"]
                                        }
                                        name="second"
                                        checked={data.is_selected}
                                        onChange={() =>
                                          this.onChangeLanguage(
                                            "second",
                                            data.subject_id,
                                            data.subject_codename,
                                            "unassignedlanguageList",
                                            data
                                          )
                                        }
                                      />{" "}
                                      {data.subject_name}
                                    </label>
                                  );
                                }
                              )}
                          </Box>
                        </Box>
                        <Box className="language-list lang-font">
                          <Box>Third Language:</Box>
                          <Box className="language-type third-lang-width ">
                            {unassignedlanguageList.third &&
                              unassignedlanguageList.third.map(
                                (data, index) => {
                                  return (
                                    <label
                                      className="padding-right-10"
                                      key={`third-lang-${index}`}
                                    >
                                      <input
                                        type="checkbox"
                                        value={
                                          unassignedlanguageList["third"]["id"]
                                        }
                                        name="third"
                                        checked={data.is_selected}
                                        onChange={() =>
                                          this.onChangeLanguage(
                                            "third",
                                            data.subject_id,
                                            data.subject_codename,
                                            "unassignedlanguageList",
                                            data
                                          )
                                        }
                                      />{" "}
                                      {data.subject_name}
                                    </label>
                                  );
                                }
                              )}
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                    <Box className="language-list lang-font">
                      <Box className="marign-top-5">Other Subjects:</Box>
                      <Box className="margin-left-60">
                        {unassignedSubjectList &&
                          unassignedSubjectList.map((data, index) => {
                            let selectedItem = selectedUnassignedObj.includes(
                              data.subject_name
                            );
                            let hr_class = selectedItem
                              ? "selected-item"
                              : "unselected-item";
                            let name =
                              data.subject_name &&
                              data.subject_name.toLowerCase();
                            if (
                              search_name === "" ||
                              (search_name !== "" &&
                                name.includes(search_name.toLowerCase()))
                            )
                              return (
                                <Box
                                  key={index}
                                  className={"assign-element-row "}
                                >
                                  {data.subject_id &&
                                    data.subject_is_language === false && (
                                      <MenuItem
                                        value={data.subject_id}
                                        onClick={() =>
                                          this.onSelectUnAsssignedObjects(data)
                                        }
                                      >
                                        <Checkbox
                                          color="primary"
                                          checked={selectedItem}
                                        />
                                        <Box
                                          ml={2}
                                          width="100%"
                                          className={`${hr_class}`}
                                        >
                                          <ListItemText
                                            primary={data.subject_name}
                                            className={`assign-item-name`}
                                          />
                                          <Box
                                            className={`assign-menu-hr ${hr_class}`}
                                          ></Box>
                                        </Box>
                                      </MenuItem>
                                    )}
                                </Box>
                              );
                            return "";
                          })}
                      </Box>
                    </Box>
                  </Box>
                </Grid>
                <Grid
                  item
                  xs={12}
                  sm={12}
                  md={6}
                  className="assign-subject-part assigned-subject-outer-body"
                  minHeight="200px"
                >
                  <Box display="flex" className="assign-header-bar">
                    <Box
                      className="assign-col-head assigned-subject-name"
                      mt={3}
                    >
                      <Box mr="10px"> Assigned Subject </Box>
                      <MenuBookOutlinedIcon />
                    </Box>
                  </Box>
                  <Box mt={2} ml={2} className="assign-subjects-body">
                    <Grid container>
                      <Grid item md={7} xs={12}>
                        <Box className="language-list lang-font">
                          <Box className="mt-10 margin-bottom-15">
                            First Language:
                          </Box>
                          <Box className="first-lang-width">
                            <List
                              dense={false}
                              className="assigned-item-list list-width no-padding"
                            >
                              {assignedlanguageList &&
                                assignedlanguageList.first.map(
                                  (data, index) => {
                                    let obj_exist = existing_objects.includes(
                                      data[data.subject_id]
                                    );
                                    return (
                                      <ListItem
                                        key={index}
                                        className="assigned-item "
                                      >
                                        {obj_exist ? (
                                          <Tooltip
                                            title={`Existing Assigned Subjects`}
                                            placement="top-start"
                                            arrow
                                          >
                                            <ListItemText
                                              primary={data.subject_name}
                                            />
                                          </Tooltip>
                                        ) : (
                                          <ListItemText
                                            primary={data.subject_name}
                                          />
                                        )}
                                        <ListItemSecondaryAction>
                                          <IconButton
                                            edge="end"
                                            aria-label="delete"
                                          >
                                            <DeleteIcon
                                              className="delete-icon-hover1"
                                              onClick={() =>
                                                this.deleteAssignedLangItem(
                                                  data,
                                                  "first",
                                                  data.subject_id,
                                                  data.subject_codename
                                                )
                                              }
                                            />
                                          </IconButton>
                                        </ListItemSecondaryAction>
                                      </ListItem>
                                    );
                                  }
                                )}
                            </List>
                          </Box>
                        </Box>
                        <Box className="language-list lang-font">
                          <Box className="mt-10 margin-bottom-15">
                            Second Language:
                          </Box>
                          <Box className="second-lang-width">
                            <List
                              dense={false}
                              className="assigned-item-list list-width no-padding"
                            >
                              {assignedlanguageList &&
                                assignedlanguageList.second.map(
                                  (data, index) => {
                                    let obj_exist = existing_objects.includes(
                                      data[data.subject_id]
                                    );
                                    return (
                                      <ListItem
                                        key={index}
                                        className="assigned-item "
                                      >
                                        {obj_exist ? (
                                          <Tooltip
                                            title={`Existing Assigned Subjects`}
                                            placement="top-start"
                                            arrow
                                          >
                                            <ListItemText
                                              primary={data.subject_name}
                                            />
                                          </Tooltip>
                                        ) : (
                                          <ListItemText
                                            primary={data.subject_name}
                                          />
                                        )}
                                        <ListItemSecondaryAction>
                                          <IconButton
                                            edge="end"
                                            aria-label="delete"
                                          >
                                            <DeleteIcon
                                              className="delete-icon-hover1"
                                              onClick={() =>
                                                this.deleteAssignedLangItem(
                                                  data,
                                                  "second",
                                                  data.subject_id,
                                                  data.subject_codename
                                                )
                                              }
                                            />
                                          </IconButton>
                                        </ListItemSecondaryAction>
                                      </ListItem>
                                    );
                                  }
                                )}
                            </List>
                          </Box>
                        </Box>
                        <Box className="language-list lang-font">
                          <Box className="mt-10 margin-bottom-15">
                            Third Language:
                          </Box>
                          <Box className="third-lang-width ">
                            <List
                              dense={false}
                              className="assigned-item-list list-width no-padding "
                            >
                              {assignedlanguageList &&
                                assignedlanguageList.third.map(
                                  (data, index) => {
                                    let obj_exist = existing_objects.includes(
                                      data[data.subject_id]
                                    );
                                    return (
                                      <ListItem
                                        key={index}
                                        className="assigned-item "
                                      >
                                        {obj_exist ? (
                                          <Tooltip
                                            title={`Existing Assigned Subjects`}
                                            placement="top-start"
                                            arrow
                                          >
                                            <ListItemText
                                              primary={data.subject_name}
                                            />
                                          </Tooltip>
                                        ) : (
                                          <ListItemText
                                            primary={data.subject_name}
                                          />
                                        )}
                                        <ListItemSecondaryAction>
                                          <IconButton
                                            edge="end"
                                            aria-label="delete"
                                          >
                                            <DeleteIcon
                                              className="delete-icon-hover1"
                                              onClick={() =>
                                                this.deleteAssignedLangItem(
                                                  data,
                                                  "third",
                                                  data.subject_id,
                                                  data.subject_codename
                                                )
                                              }
                                            />
                                          </IconButton>
                                        </ListItemSecondaryAction>
                                      </ListItem>
                                    );
                                  }
                                )}
                            </List>
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                    <Box className="language-list lang-font">
                      <Box className="mt-10 margin-bottom-15">
                        Other Subjects:
                      </Box>
                      <Box className="third-lang-width">
                        <List
                          dense={false}
                          className="assigned-item-list list-width no-padding margin-left-10"
                        >
                          {assignedSubjectList &&
                            assignedSubjectList.map((data, index) => {
                              if (!data.subject_is_language === true) {
                                let obj_exist = existing_objects.includes(
                                  data[data.subject_id]
                                );
                                return (
                                  <ListItem
                                    key={index}
                                    className="assigned-item "
                                  >
                                    {obj_exist ? (
                                      <Tooltip
                                        title={`Existing Assigned Subjects`}
                                        placement="top-start"
                                        arrow
                                      >
                                        <ListItemText
                                          primary={data.subject_name}
                                        />
                                      </Tooltip>
                                    ) : (
                                      <ListItemText
                                        primary={data.subject_name}
                                      />
                                    )}
                                    <ListItemSecondaryAction>
                                      <IconButton
                                        edge="end"
                                        aria-label="delete"
                                      >
                                        <DeleteIcon
                                          className="delete-icon-hover1"
                                          onClick={() =>
                                            this.deleteAssignedItem(data)
                                          }
                                        />
                                      </IconButton>
                                    </ListItemSecondaryAction>
                                  </ListItem>
                                );
                              }
                              return "";
                            })}
                        </List>
                      </Box>
                    </Box>
                  </Box>
                  <Box display="flex" justifyContent="flex-end">
                    <Box className="submit-box">
                      <Button
                        className="submit assign-subject-button"
                        variant="contained"
                        onClick={() => this.onSubmit()}
                      >
                        Submit
                      </Button>
                    </Box>
                    <Box className="submit-box">
                      <Button
                        className="assign-cancel-button"
                        variant="contained"
                        onClick={() => this.onCancle()}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
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

export default withRouter(AssignMultiLang);
