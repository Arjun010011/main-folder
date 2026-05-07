import React from "react";
import { withStyles } from "@material-ui/core/styles";
import { Button, Box, Dialog, TextField } from "@material-ui/core";
import MuiDialogTitle from "@material-ui/core/DialogTitle";
import MuiDialogContent from "@material-ui/core/DialogContent";
import MuiDialogActions from "@material-ui/core/DialogActions";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Typography from "@material-ui/core/Typography";
import DynamicForm from "Components/DynamicForm";
import Snackbar from "@material-ui/core/Snackbar";
import { Alert, dateFormat } from "Includes/functions";
// import './styles.scss';
import { cloneDeep } from "lodash";

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

const header = "Update Student Details";

export default function FeeAdjustmentList(props) {
  const [isEditForm, setIsEditForm] = React.useState(false);
  const [studentFields, setStudentFields] = React.useState(null);
  const [studentDetails, setStudentDetails] = React.useState({});
  const [fieldError, setFieldError] = React.useState({});
  const [alertData, setAlertData] = React.useState("");
  const [snackbar, setSnackbar] = React.useState(false);

  const handleClose = () => {
    props.closeInParent();
  };

  const handleCloseSnackBar = () => {
    setSnackbar(false);
  };

  React.useEffect(() => {
    const { dynamicValuesData } = props;
    let tempDetails = [];
    dynamicValuesData.map((data) => {
      tempDetails.push({
        label: data.label_name,
        regex: null,
        name: data.name,
        md: 12,
        className: "width-form-100",
        required: false,
        id: "outlined-textarea",
        default: data.value,
        rows: null,
        type: data.validation_rules,
        maxLength: 250,
        size: "small",
      });
    });
    setStudentFields(() => cloneDeep(tempDetails));
  }, []);

  const save = () => {
    let updatedData = {};
    studentFields.map((data) => {
      if (data.type === "date") {
        updatedData[data.name] = data.default
          ? dateFormat(data.default, "YYYY-MM-DD")
          : "";
      } else {
        updatedData[data.name] = data.default;
      }
    });
    props.saveUpdatedData(updatedData);
    props.closeInParent();
  };

  const updateStudent = (name, value) => {
    let fieldDetail = cloneDeep(studentFields);
    let studentDetail = cloneDeep(studentDetails);
    fieldDetail.some((field) => {
      if (field.name === name) {
        field.default = value;
      }
    });
    studentDetail[name] = value;
    setStudentDetails(() => studentDetail);
    setStudentFields(() => fieldDetail);
  };

  return (
    <div>
      <Dialog
        // onClose={handleClose}
        className="action-basic-detail-width"
        aria-labelledby="customized-dialog-title"
        open={true}
      >
        <DialogTitle id="customized-dialog-title" onClose={handleClose}>
          {header}
        </DialogTitle>
        <DialogContent>
          {studentFields && (
            <DynamicForm
              fieldDetails={studentFields}
              updateParent={updateStudent}
              isEditForm={isEditForm}
              loading={false}
              // ref={'student'}
              idFormat={"student_2023_05_21_04_19_pm_"}
              customClassName="m-t-10px"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button
            autoFocus
            onClick={() => save()}
            color="primary"
            disabled={props.saveButtonBlocked}
          >
            Save
          </Button>
        </DialogActions>
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
