import React from "react";
import { withStyles } from "@material-ui/core/styles";
import {
  Button,
  Dialog,
  CircularProgress,
  TextareaAutosize,
} from "@material-ui/core";
import MuiDialogTitle from "@material-ui/core/DialogTitle";
import MuiDialogContent from "@material-ui/core/DialogContent";
import MuiDialogActions from "@material-ui/core/DialogActions";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Typography from "@material-ui/core/Typography";
import { dateFormat } from "Includes/functions";
import { GET_URL, POST_URL } from "Includes/urls";
import { getRequest, postRequest } from "Includes/api/apicall";
import Swal from "sweetalert2";

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

const body = "";

let user =
  localStorage.getItem("user") != "undefined"
    ? JSON.parse(localStorage.getItem("user"))
    : "";

export default function ReturnOrRenewBookModal(props) {
  const [open, setOpen] = React.useState(true);
  const [body, setBody] = React.useState([]);
  const [alertData, setAlertData] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [saveButtonBlocked, setSaveButtonBlocked] = React.useState(false);
  const [configDetails, setConfigDetails] = React.useState({});
  const [remark_on_issue, set_remark_on_issue] = React.useState("");

  const handleClose = () => {
    if (props.closeInParent()) props.closeInParent();
  };
  
  const sendMessage = () => {
    let post_data = {
      return_list: [],
      payment_details: null,
      transaction_id: props?.bookInformations?.transaction_id,
    };
    post_data["return_list"].push({
      issuereturnbook_id: props?.bookInformations?.id,
      remark_on_return: remark_on_issue,
      fine_amount: 0,
    });
    let prop = { ...props };
    prop["return_error_message"] = true;
    setSaveButtonBlocked(true);
    let url = POST_URL.issuereturnbook.api;
    postRequest(url, post_data, props).then((response) => {
      setSaveButtonBlocked(true);
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
        handleClose();
      } else {
        setAlertData(response);
      }
    });
  };

  const getReturnConfiguration = () => {
    setLoading(true);
    let params = {
      config_for_student: 1,
      is_active: true,
      issuing_user_id: props.issueUserId,
      academic_year: user?.other_details?.academic_year?.id,
    };
    const url = GET_URL.libraryconfiguration.api;
    getRequest(url, params, props).then((response) => {
      if (response && response.status === 200) {
        let new_date = new Date();
        new_date.setHours(0, 0, 0, 0);
        response.data["return_date"] = dateFormat(
          new Date(new_date.setDate(new_date.getDate() - 7)),
          "DD-MM-YYYY"
        );
        setConfigDetails(response.data);
      }
      setLoading(false);
    });
  };

  React.useEffect(() => {
    setOpen(true);
    getReturnConfiguration();
  }, [props.showModal]);

  const handleSearchChange = (e) => {
    const { value } = e.target;
    set_remark_on_issue(value);
  };

  return (
    <div>
      <Dialog
        aria-labelledby="customized-dialog-title"
        className="action-video-tutorial-details-width"
        open={open}
      >
        <DialogTitle id="customized-dialog-title" onClose={handleClose}>
          <div className="d-flex align-items-center text-capitalize">
            {`${props.action} Book`}
          </div>
        </DialogTitle>
        {loading ? (
          <div className="loading-wish-birthday">
            <CircularProgress />
          </div>
        ) : (
          <>
            <DialogContent>
              <div
                style={{
                  maxHeight: "250px",
                  overflow: "auto",
                  fontSize: "14px",
                }}
              >
                <table className="w-100">
                  <thead>
                    <tr className="review-issue-modal">
                      <th>Header</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="review-issue-modal">
                      <td>Book Title</td>
                      <td>{configDetails["number_of_books_per_user"]}</td>
                    </tr>
                    <tr className="review-issue-modal">
                      <td>Issued On</td>
                      <td>{configDetails["return_within_days"]}</td>
                    </tr>
                    <tr className="review-issue-modal">
                      <td>Returning On</td>
                      <td>{configDetails["return_date"]} </td>
                    </tr>
                    <tr className="review-issue-modal">
                      <td>Fine Amount</td>
                      <td>{configDetails["fine_amount"]} </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-10">
                <div className="apply-leave-label-names margin-top-20">
                  Remarks on issue
                </div>
                <TextareaAutosize
                  aria-label="minimum height"
                  autoComplete="off"
                  className="apply-leave-text-area-auto-size-reason"
                  value={remark_on_issue}
                  maxLength={1000}
                  name="remark_on_issue"
                  onChange={handleSearchChange}
                />
              </div>
            </DialogContent>
            <DialogActions className="flex-justify-space-between">
              <div className="text-red fs-18">{alertData}</div>
              <Button
                autoFocus
                onClick={saveButtonBlocked ? "" : () => sendMessage()}
                color="primary"
                className="submit"
                disabled={saveButtonBlocked}
              >
                Submit
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </div>
  );
}
