import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import CloseIcon from "@material-ui/icons/Close";
import Slide from "@material-ui/core/Slide";
import Checkbox from "@material-ui/core/Checkbox";
import Swal from "sweetalert2";
import {
  Box,
  Grid,
  TextField,
  Tooltip,
  TableContainer,
  Table,
  TableHead,
  TableCell,
  TableRow,
  TableBody,
} from "@material-ui/core";
import {
  validateDate,
  dateFormat,
  getReverseList,
  getPropertyValues,
} from "Includes/functions";
import WarningIcon from "@material-ui/icons/Warning";
import { FormattedMessage } from "react-intl";
import messages from "../messages";
import commonMessages from "Constants/messages";
import Snackbar from "@material-ui/core/Snackbar";
import { Alert } from "Includes/functions";
import { Dropdown } from "Components/DropDown";

import { GET_URL, POST_URL } from "Includes/urls";
import { getRequest, postRequest } from "Includes/api/apicall";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import { CUSTOM_CODE } from "Constants";
import LoadingGif from "Components/LoadingGif";

const useStyles = makeStyles((theme) => ({
  appBar: {
    position: "relative",
    backgroundColor: "#4680FF",
  },
  title: {
    flex: 1,
  },
}));

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const today = new Date();

export default function FullScreenDialog(props) {
  const { studentIds, studentTypes, isViewOnly } = props;
  const classes = useStyles();
  const [open, setOpen] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [alertData, setAlertData] = React.useState("");
  const [snackbar, setSnackbar] = React.useState(false);
  const [fieldError, setFieldError] = React.useState({});
  const [submitDisable, setSubmitDisable] = React.useState(false);

  const handleCloseSnackBar = () => {
    setSnackbar(false);
  };

  const handleClose = () => {
    props.handleCloseMultipleSections();
  };

  React.useEffect(() => {
    getNonMandatoryFeatures();
  }, []);

  const getNonMandatoryFeatures = () => {};

  const scheduleExamView = (standard, stIndex, part_key) => {
    const {
      part_type,
      standardList,
      fieldError,
      start_date,
      end_date,
      helperText,
      is_multiple_schedule,
      gradePlanList,
      subject_list,
    } = props;
    return (
      <TableBody>
        {Object.keys(part_type).length > 1 && (
          <TableRow>
            <TableCell
              className="schedule-exam-subject-name-box height-49px text-bold fs-18 "
              component="th"
              scope="row"
            >
              {/* <div className="text-blue">{part_type[part]["name"]}</div> */}
            </TableCell>
            <TableCell className="" component="th" scope="row"></TableCell>
            <TableCell className="" component="th" scope="row"></TableCell>
            <TableCell className="" component="th" scope="row"></TableCell>
            <TableCell className="" component="th" scope="row"></TableCell>
            <TableCell className="" component="th" scope="row"></TableCell>
            <TableCell className="" component="th" scope="row"></TableCell>
          </TableRow>
        )}
        {subject_list.map((subject, subIndex) => {
          return (
            <>
              {/* {part_type[part]["list"].includes(subject.subject) && ( */}
                <>
                  <TableRow
                    key={subIndex}
                    className={"schedule-exam-subject-name-box"}
                  >
                    {/* <ScheduleInputComponent
                      subject={subject}
                      start_date={start_date}
                      end_date={end_date}
                      stIndex={stIndex}
                      subIndex={subIndex}
                      fieldError={fieldError}
                      helperText={helperText}
                      standardList={standardList}
                      is_multiple_schedule={is_multiple_schedule}
                      getAliasLanguage={this.getAliasLanguage}
                      updateParent={this.updateParent}
                      handleEnable={this.handleEnable}
                      handleAddAnotherSchedule={this.handleAddAnotherSchedule}
                      ref={this.schedule}
                      gradePlanList={gradePlanList}
                    /> */}
                  </TableRow>
                </>
              {/* )} */}
            </>
          );
        })}
      </TableBody>
    );
  };

  return (
    <div>
      <Dialog
        fullScreen
        open={open}
        onClose={() => handleClose("close")}
        TransitionComponent={Transition}
      >
        <AppBar className={classes.appBar}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => handleClose("close")}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
            <Typography variant="h6" className={classes.title}>
              Schedule Exam For Multiple Sections
            </Typography>
          </Toolbar>
        </AppBar>
        {loading && <LoadingGif />}
        {!loading && (
          <>
            <Box ml={4} mr={4} mb={5}>
              <Box display="flex" m={1} ml={2} className="warning-message">
                Terms can not be disabled on the following conditions. <br />
                1) If Non Mandatory fee is already paid for the particular term.
                {/* 2) If he/she already selected the feature and term start date is lesser than today. <br /> */}
              </Box>
              <Grid container>
                {scheduleExamView()}
              </Grid>
            </Box>
            <Box className="submt-button-float-bottom" mt={3}>
              <Button
                autoFocus
                onClick={submitDisable ? "" : () => handleClose("save")}
                variant="contained"
                color="primary"
                disabled={submitDisable}
                className="submit"
              >
                Save
              </Button>
            </Box>
          </>
        )}
      </Dialog>
      <Snackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        open={snackbar}
        autoHideDuration={10000}
        onClose={handleCloseSnackBar}
      >
        <Alert onClose={handleCloseSnackBar} severity="error">
          {alertData}
        </Alert>
      </Snackbar>
    </div>
  );
}
