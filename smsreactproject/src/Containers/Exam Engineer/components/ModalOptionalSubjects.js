import React, { Component } from "react";
import {
  makeStyles,
  Dialog,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Slide,
  Grid,
  Box,
  FormControlLabel,
  Switch,
  Button,
} from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";

import { getSettingValue } from "Includes/functions";

const useStyles = makeStyles((theme) => ({
  appBar: {
    position: "relative",
    backgroundColor: "#4680FF",
  },
  title: {
    marginLeft: theme.spacing(2),
    flex: 1,
  },
}));

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default class ModalOptionalSubjects extends Component {
  constructor(props) {
    super(props);

    this.state = {
      open: false,
      tabValue: 0,
      isPrompt: false,
      openSnackBar: false,
      acknowledged: false,
    };
  }

  handleClose = () => {
    this.setState({
      open: false,
      acknowledged: false,
    });
  };

  handleChange = (event, newValue) => {
    this.setState({
      tabValue: newValue,
    });
  };

  handleCloseSnackBar = () => {
    this.setState({
      openSnackBar: false,
    });
  };

  render() {
    const {
      open,
      standardList,
      requestApprovalError,
      is_standard_section,
      selectedStandard,
    } = this.props;
    let { acknowledged } = this.state;
    return (
      <div>
        <Dialog
          fullScreen
          open={open}
          onClose={this.handleClose}
          TransitionComponent={Transition}
        >
          <AppBar>
            <Toolbar>
              <IconButton
                edge="start"
                color="inherit"
                onClick={() => this.props.handleClose()}
                aria-label="close"
              >
                <CloseIcon />
              </IconButton>
              <Typography variant="h6">
                Verify Not Scheduled Subjects
              </Typography>
            </Toolbar>
          </AppBar>
          {is_standard_section &&
            selectedStandard &&
            Object.keys(standardList).map((standard) => {
              return (
                <Box className="exam-optional-grid-container">
                  {" "}
                  <Box className="exam-optional-standard-name">
                    {standardList[standard].standard_name &&
                      standardList[standard].standard_name}
                  </Box>
                  <Grid container>
                    {standardList[standard].section_list.map((section) => {
                      return (
                        <Grid item xl={4} md={4} xs={6}>
                          <Box>
                            <Box className="exam-optional-standard-name">
                              {section.section_name && section.section_name}
                            </Box>
                            <Box>
                              <ul>
                                {section.subject_list.map(
                                  (subject, subIndex) => {
                                    return (
                                      <Box>
                                        {subject.isEnabled === false && (
                                          <li>
                                            {" "}
                                            {subject.partialSubjects
                                              ? `${subject.subject_name} - (Partial Scheduled)`
                                              : subject.subject_name}
                                          </li>
                                        )}
                                      </Box>
                                    );
                                  }
                                )}
                              </ul>
                            </Box>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              );
            })}
          {!is_standard_section && (
            <Grid container className="exam-optional-grid-container">
              {standardList.map(
                (standard, stIndex) =>
                  standard.optionalSubjects && (
                    <Grid item xl={4} md={4} xs={6}>
                      <Box>
                        <Box className="exam-optional-standard-name">
                          {standard.standard_name && standard.standard_name}
                          {standard.section_name && standard.section_name}
                        </Box>
                        <Box>
                          <ul>
                            {standard.subject_list.map((subject, subIndex) => {
                              return (
                                <Box>
                                  {subject.isEnabled === false && (
                                    <li>
                                      {" "}
                                      {subject.partialSubjects
                                        ? `${subject.subject_name} - (Partial Scheduled)`
                                        : subject.subject_name}
                                    </li>
                                  )}
                                </Box>
                              );
                            })}
                          </ul>
                        </Box>
                      </Box>
                    </Grid>
                  )
              )}
            </Grid>
          )}
          <Box>
            <FormControlLabel
              className="margin-left-0"
              control={
                <Switch
                  checked={acknowledged}
                  name={acknowledged}
                  value={acknowledged}
                  color="primary"
                  onChange={() =>
                    this.setState({ acknowledged: !acknowledged })
                  }
                />
              }
              label="I verified not scheduled subjects and i wish to request for approve"
            />
          </Box>
          <Box className="schedule-exam-approve-button-left">
            <Button
              variant="outlined"
              color="primary"
              className={
                acknowledged ? "submit" : "submit disabled-request-button"
              }
              disabled={!acknowledged}
              onClick={() => this.props.requestForApprove()}
            >
              Request for Approve &nbsp;{" "}
            </Button>
            <Box className="error-content">
              {requestApprovalError && requestApprovalError}
            </Box>
          </Box>
        </Dialog>
      </div>
    );
  }
}
