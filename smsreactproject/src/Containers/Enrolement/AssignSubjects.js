import React, { Component } from "react";
import { Grid, Paper, Box, Hidden, Button } from "@material-ui/core";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";

import classNames from "classnames";
import { withRouter, Link } from "react-router-dom";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { Actions } from "Constants/permissions";
import Assign from "Components/Assign";
import "./styles.scss";
import Swal from "sweetalert2";

class AssignSubject extends Component {
  constructor(props) {
    super(props);
    this.state = {
      subjectDetails: { unassignedsubjects: [], assigned_subjects: [] },
    };
    this.submitAssignedItems = this.submitAssignedItems.bind(this);
    this.text = {
      assign: "Assign Subjects",
      assigned: "Assigned Subjects",
      addAction: "Add Subjects",
      head: "Subject",
    };
    this.fields = {
      id: "subject_id",
      name: "subject_name",
    };
  }

  componentDidMount() {
    this.getAssignedSubjects();
  }

  getAssignedSubjects = () => {
    if (!this.props.location.state) {
      this.props.history.push(Actions.assign_subjects.view.url);
    } else {
      const { yearName, standard, section, yearId, standardId, sectionId } =
        this.props.location.state;
      this.setState({ yearName, standard, section });

      const params = {
        academic_year: yearId,
        standard: standardId,
        section: sectionId,
      };
      getRequest(GET_URL.getAssignSubject.api, params, this.props).then(
        (response) => {
          if (response && response.status === 200) {
            const subjectDetails = response.data.data;
            this.setState({ subjectDetails });
          }
        }
      );
    }
  };
  submitAssignedItems = (assigned_subjects) => {
    let payload = {
      standard_section: this.state.subjectDetails.standard_section,
    };
    let data = [];
    assigned_subjects.map((sub) => {
      data.push(sub[this.fields["id"]]);
    });
    payload["assigned_subjects"] = data;
    let url = POST_URL.assignsubject.api;
    postRequest(url, payload, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
        this.props.history.push(Actions.assign_subjects.view.url);
      }
    });
  };

  render() {
    const { yearName, standard, section } = this.state;
    return (
      <>
        <Paper>
          <Box className="paper-background">
            <Grid container>
              <Grid item md={6} xs={12} sm={12}>
                <Box className="header-align heading">Assign subject</Box>
              </Grid>
              <Grid item md={6} xs={12} sm={12}>
                <Hidden mdDown>
                  {/* <Box display='flex' justifyContent='flex-end' className="header-align">
                                        <Button className="previous-but" onClick={() => this.props.history.push(Actions.assign_subjects.view.url)}> Previous </Button>
                                    </Box> */}
                  <Box className={classNames("header-align", "end-flex-prop")}>
                    <Button
                      variant="contained"
                      component={Link}
                      to={Actions.assign_subjects.view.url}
                      className="editbutton-view"
                    >
                      <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.assign_subjects.view.label}
                    </Button>
                  </Box>
                </Hidden>
              </Grid>
              <Grid item md={12} xs={12} sm={12}>
                <Box className="md-down-justify-start md-up-justify-start mb-y-20">
                  <Box className="year-std-box mr-40">
                    <Box className="academic-std-head "> Academic Year</Box>
                    <Box className=" aca-std-white-background">{yearName}</Box>
                  </Box>
                  <Box className="year-std-box mr-40">
                    <Box className="academic-std-head"> Standard</Box>
                    <Box className=" aca-std-white-background">{standard}</Box>
                  </Box>
                  <Box className="year-std-box">
                    <Box className="academic-std-head"> Section</Box>
                    <Box className=" aca-std-white-background">{section}</Box>
                  </Box>
                </Box>
              </Grid>
              <Grid item md={12} xs={12} sm={12}>
                <Box mt={1}>
                  <Assign
                    assigned_objects={
                      this.state.subjectDetails.assigned_subjects
                    }
                    unassigned_objects={
                      this.state.subjectDetails.unassignedsubjects
                    }
                    submitAssignedItems={this.submitAssignedItems}
                    text={this.text}
                    fields={this.fields}
                  />
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </>
    );
  }
}

export default withRouter(AssignSubject);
