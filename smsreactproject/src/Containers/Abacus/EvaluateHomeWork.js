import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import {
  Paper,
  Box,
  Grid,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Divider,
  Button,
} from "@material-ui/core";
import { Skeleton } from "@material-ui/lab";
import AssignmentOutlinedIcon from "@material-ui/icons/AssignmentOutlined";
import moment from "moment";

import EvaluateStudentHomeWork from "Containers/Diary/EvaluateStudentHomeWork";
import { GET_URL } from "Includes/urls";
import { getRequest } from "Includes/api/apicall";
import { getUrlParam } from "Includes/functions";
import "./styles.scss";

class EvaluateHomeWork extends Component {
  state = {
    homeworklist: [],
    homeworklistbydate: [],
    expanded: "",
    evaluate: "",
    homework_id: "",
    homework: {},
    fetchingHomeWorkList: false,
  };

  componentDidMount() {
    this.gethomeworklist();
    this.getParamValues();
  }

  getParamValues = () => {
    let { expanded } = getUrlParam();
    this.setState({ expanded });
  };

  gethomeworklist = () => {
    let url = GET_URL.diary.api;
    let params = { evaluate_data: 1 };
    this.setState({ fetchingHomeWorkList: true });
    getRequest(url, params).then((response) => {
      this.setState({ fetchingHomeWorkList: false });
      if (response && response.status === 200) {
        const homeworklist = response.data.data;
        this.setState({ homeworklist });
      }
    });
  };

  handleChange = (panel) => (event, isExpanded) => {
    let { expanded, innerExpanded, isInnerExpanded } = this.state;
    expanded = isExpanded ? panel : false;
    innerExpanded = isInnerExpanded ? panel : false;
    this.setState({
      expanded: expanded,
      innerExpanded: innerExpanded,
    });
  };

  evaluatehomework = (homework, evaluate) => {
    this.setState({ homework_id: homework.id, homework, evaluate });
  };

  render() {
    let { expanded, homeworklist, evaluate, fetchingHomeWorkList } = this.state;
    return (
      <Paper className="paper-plain-background mt-20 pb-20">
        <Grid container className="pv-10">
          <Grid item md={9} xs={12}>
            <Box className="heading">Evaluate Home Work</Box>
          </Grid>
        </Grid>
        <Box className="mt-20">
          <Box className="margin-auto">
            {fetchingHomeWorkList ? (
              <Box className="pv-30">
                {[...Array(5).keys()].map((count, index) => (
                  <Skeleton
                    key={index}
                    animation="wave"
                    className="skeleton-loader-wave"
                  />
                ))}
              </Box>
            ) : null}
          </Box>
          {homeworklist.map((data, index) => {
            return (
              <Accordion
                square
                expanded={expanded === `panel+${index}`}
                onChange={this.handleChange(`panel+${index}`)}
                key={`panel+${index}`}
              >
                <AccordionSummary
                  className="accordin-hover"
                  aria-controls="panel1d-content"
                  id="panel1d-header"
                >
                  <Box className="diary-circle-icon margin-auto">
                    <AssignmentOutlinedIcon className="diary-assignment-icon"></AssignmentOutlinedIcon>
                  </Box>
                  <Box className="align-items md-up-justify-space-between full-width">
                    <Box className="marign-left-15">
                      <Box className="heading-text-content marign-top-text">
                        {data.title}
                      </Box>
                    </Box>
                    <Box className="pl-15">
                      Due On: {moment(data.duedate).format("DD MMM YYYY")}
                    </Box>
                  </Box>
                </AccordionSummary>
                <Divider />
                <AccordionDetails>
                  <Box className="text-content mt-10">
                    <Box className="text-content mr-30">
                      <Box className="marign-left-15 evaluate-status">
                        <Box>{data.total_student}</Box>
                        <Box className="evaluate-count sub-text-content">
                          Assigned
                        </Box>
                      </Box>
                      <Box className="marign-left-15 evaluate-status">
                        <Box>{data.submitted_student}</Box>
                        <Box className="evaluate-count sub-text-content">
                          Submitted
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </AccordionDetails>
                <Divider />
                <AccordionDetails className="md-down-flex-column full-width flex-justify-space-between ">
                  <AccordionDetails className="pv-10 evalute-footer-detail">
                    <Box
                      className="homework-actionsicon text-left"
                      style={{ paddingTop: "6px" }}
                    >
                      Subject: {data.subject_name}
                    </Box>
                    <Box
                      className="homework-actionsicon text-right md-up-text-left"
                      style={{ paddingTop: "6px" }}
                    >
                      Marks: {data.marks}
                    </Box>
                  </AccordionDetails>
                  <AccordionDetails className="pv-0 evalute-footer-detail">
                    {data.standard_codename &&
                      data.standard_codename.length > 0 && (
                        <Box
                          className=" homework-actionsicon text-left"
                          style={{ paddingTop: "6px" }}
                        >
                          Standard: {data.standard_codename[0]}
                        </Box>
                      )}
                    <Box className="homework-actionsicon end-flex-prop text-right md-up-text-left">
                      <Button
                        className="evaluate-button pr-0"
                        onClick={() => this.evaluatehomework(data, true)}
                      >
                        View HomeWork
                      </Button>
                    </Box>
                  </AccordionDetails>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
        {evaluate === true && (
          <EvaluateStudentHomeWork
            id={this.state.homework_id}
            homework={this.state.homework}
            evaluatehomework={this.evaluatehomework}
          />
        )}
      </Paper>
    );
  }
}

export default withRouter(EvaluateHomeWork);
