import React from "react";
import { withStyles } from "@material-ui/core/styles";
import {
  Button,
  Box,
  Dialog,
  TextField,
  CircularProgress,
} from "@material-ui/core";
import MuiDialogTitle from "@material-ui/core/DialogTitle";
import MuiDialogContent from "@material-ui/core/DialogContent";
import MuiDialogActions from "@material-ui/core/DialogActions";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Typography from "@material-ui/core/Typography";
import Snackbar from "@material-ui/core/Snackbar";
import { Alert } from "Includes/functions";
import { POST_URL } from "Includes/urls";
import { postRequest } from "Includes/api/apicall";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";

const styles = (theme) => ({
  root: {
    margin: 0,
    padding: theme.spacing(2),
  },
  closeButton: {
    position: "absolute",
    right: theme.spacing(1),
    top: theme.spacing(1),
    color: theme.palette.grey[500],
  },
});

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

const DialogTitle = withStyles(styles)((props) => {
  const { children, classes, onClose, ...other } = props;
  return (
    <MuiDialogTitle disableTypography className={classes.root} {...other}>
      <Typography variant="h6">{children}</Typography>
      {onClose ? (
        <IconButton
          aria-label="close"
          className={classes.closeButton}
          onClick={onClose}
        >
          <CloseIcon />
        </IconButton>
      ) : null}
    </MuiDialogTitle>
  );
});

const DialogContent = withStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
  },
}))(MuiDialogContent);

const DialogActions = withStyles((theme) => ({
  root: {
    margin: 0,
    padding: theme.spacing(1),
  },
}))(MuiDialogActions);

const header = "Download Custom Report";

const body = "";

export default function FeeCollectionReportModal(props) {
  const [alertData, setAlertData] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState(false);
  const [lodingApi, setLodingApi] = React.useState(false);
  const [fieldError, setFieldError] = React.useState({});
  const [searchFields, setSearchFields] = React.useState({
    standards: [],
    feeTypes: [],
    feeTerms: [],
  });
  const [submitDisable, setSubmitDisable] = React.useState(false);
  const [value, setValue] = React.useState(0);
  const [feeTypes, setFeeTypes] = React.useState([]);
  const [feeTerms, setFeeTerms] = React.useState([]);

  const handleClose = () => {
    props.closeInParent();
  };

  const handleCloseSnackBar = () => {
    setSnackbar(false);
  };

  const onchangeDropdown = (e, name) => {
    let tempDetails = { ...searchFields };
    let fieldErrorTemp = { ...fieldError };
    let is_all_option_selected = false;
    delete fieldErrorTemp[name];
    tempDetails[name] = e;
    if (name === "standards") {
      tempDetails["feeTypes"] = [];
      tempDetails["feeTerms"] = [];
      e.forEach((data) => {
        if (data.id === "all") {
          is_all_option_selected = true;
          return;
        }
      });
      if (is_all_option_selected) {
        tempDetails['standards'].splice(0, 1);
        tempDetails['standards'] = [...props.standardList];
      }
      setFeeTerms([]);
      setFeeTypes([]);
    }
    setFieldError(fieldErrorTemp);
    setSearchFields({ ...tempDetails });
  };

  const getIds = (name) => {
    let ids = [];
    searchFields[name].forEach((data) => {
      if (data.id !== "all") {
        ids.push(data.id);
      }
    });
    return ids;
  };

  const handleDownloadButton = (report_type=null, filter_type='standardwise') => {
    const post_data = {
      filters: {
        academic_year: props.year,
        report_type: report_type,
        filter_type: filter_type
      },
    };
    let fieldError = {};
    if (searchFields.standards.length === 0) {
      setSnackbar(true);
      setAlertData("Select atleast one standard");
      fieldError["standards"] = "Select standard";
      setFieldError(fieldError);
      return;
    }
    post_data["filters"]["standard_ids"] = getIds("standards");
    let prop = { ...props };
    prop.responseType = "blob";
    setLodingApi(true);
    setSubmitDisable(true);
    postRequest(POST_URL.studentreport.api, post_data, prop).then(
      (response) => {
        setSubmitDisable(false);
        setLodingApi(false);
        if (response && response.status === 200) {
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `Student_Report.xlsx`);
          document.body.appendChild(link);
          link.click();
          return;
        }
      }
    );
  };

  const handleNumberOfCopies = () => {
    return (
      <>
        <div className="d-flex flex-wrap flex-justify-space-between">
          <div>
            <MultipleSelectDropdown
              data_list={props.standardList}
              selected_list={searchFields.standards}
              error={fieldError.standards}
              label={"Select Standards"}
              onChange={(e) => onchangeDropdown(e, "standards")}
              size="small"
            />
            {searchFields.standards.map((data, index) => {
              return (
                <div className="margin-top-15 text-capitalize text-blue d-flex" draggable>
                  <div>{index + 1}. </div>
                  <div>{data.name}</div>
                </div>
              );
            })}
          </div> 
          {/* <div>
            <MultipleSelectDropdown
              data_list={feeTypes}
              selected_list={searchFields.feeTypes}
              error={fieldError.feeTypes}
              label={"Select Columns"}
              onChange={(e) => onchangeDropdown(e, "feeTypes")}
              size="small"
            />
            {searchFields.standards.map((data, index) => {
              return (
                <div className="margin-top-15 text-capitalize text-blue d-flex" draggable>
                  <div>{index + 1}. </div>
                  <div>{data.name}</div>
                </div>
              );
            })}
          </div> */}
        </div>
      </>
    );
  };

  return (
    <div>
      <Dialog
        className="student-custom-report"
        aria-labelledby="customized-dialog-title"
        open={true}
      >
        <DialogTitle id="customized-dialog-title" onClose={handleClose}>
          {header}
        </DialogTitle>
        <DialogContent>
          {loading ? <CircularProgress /> : handleNumberOfCopies()}
        </DialogContent>
        {!loading && (
          <DialogActions>
            {lodingApi ? (
              <div>
                <CircularProgress />
              </div>
            ) : (
              ""
            )}
            <Button
              disabled={submitDisable}
              className="submit width-200-px"
              onClick={() => handleDownloadButton()}
            >
              Download Report
            </Button>
            <Button
              disabled={submitDisable}
              className="submit width-200-px"
              onClick={() => handleDownloadButton('boy_girl_report')}
            >
              Boy/GirlReport
              StandardWise
            </Button>
            <Button
              disabled={submitDisable}
              className="submit width-200-px"
              onClick={() => handleDownloadButton('boy_girl_report', 'section_wise')}
            >
              Boy/GirlReport
              SectionWise
            </Button>
          </DialogActions>
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
