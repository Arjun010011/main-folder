import React, { useState } from "react";
import { withStyles } from "@material-ui/core/styles";
import {
  Button,
  Dialog,
  CircularProgress,
  TextareaAutosize,
  Tooltip,
} from "@material-ui/core";
import MuiDialogTitle from "@material-ui/core/DialogTitle";
import MuiDialogContent from "@material-ui/core/DialogContent";
import MuiDialogActions from "@material-ui/core/DialogActions";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Typography from "@material-ui/core/Typography";
import { dateFormat, numberWithCommas } from "Includes/functions";
import { GET_URL, POST_URL } from "Includes/urls";
import { getRequest, postRequest } from "Includes/api/apicall";
import Swal from "sweetalert2";
import { Actions } from "Constants/permissions";
import PaymentModal from "Components/PaymentModalNew";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";
import { withRouter } from "react-router-dom/cjs/react-router-dom.min";

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

function ReviewIssueModal(props) {
  const { book_action, book_details,user_details} = props;
  const header = `Review ${book_action} Book Configuration`;
  const [open, setOpen] = React.useState(true);
  const [alertData, setAlertData] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [postData, setPostData] = React.useState(props.post_data);
  const [saveButtonBlocked, setSaveButtonBlocked] = React.useState(false);
  const [configDetails, setConfigDetails] = React.useState({});
  const [remark_on_issue, set_remark_on_issue] = React.useState("");

  let quillRef = React.useRef(null);

  const handleClose = () => {
    if (props.closeInParent()) props.closeInParent();
  };

  const sendMessage = () => {
    let prop = { ...props };
    let postData = { ...props.post_data };
    prop["return_error_message"] = true;
    setSaveButtonBlocked(true);
    let url = POST_URL.issuereturnbook.api;
    if (book_action === "RENEW") {
      url = POST_URL.renewbook.api;
    } else {
      postData["issue_list"].map((issueData) => {
        issueData["issued_at"] = dateFormat(new Date(), "YYYY-MM-DD HH:mm:ss");
        issueData["remark_on_issue"] = remark_on_issue;
        issueData["assigned_configuration"] = configDetails["id"];
      });
    }
    postRequest(url, postData, props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
        // props.history.push(Actions.library_issue_book.view.url);
        handleClose(true);
      } else {
        setAlertData(response);
      }
      setSaveButtonBlocked(false);
    });
  };

  const getLibraryConfiguration = () => {
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
        // new_date.setHours(0, 0, 0, 0);
        if (book_action === "RENEW") {
          // new_date = new Date(book_details.due_date);
        }
        response.data["return_date"] = dateFormat(
          new Date(
            new_date.setDate(
              new_date.getDate() + response.data["return_within_days"]
            )
          ),
          "DD-MM-YYYY"
        );
        if (book_action === "RENEW") {
          let new_renew_date = new Date();
          // new_renew_date.setHours(0, 0, 0, 0);
          let new_data = postData;
          new_data["issue_return_datas"][0]["updated_due_date"] = dateFormat(
            new Date(
              new_renew_date.setDate(
                new_renew_date.getDate() + response.data["return_within_days"]
              )
            ),
            "YYYY-MM-DD hh:mm:ss"
          );
          setPostData(new_data);
        }
        let issued_books =
          props.user_details?.student_details?.number_of_books_issues;
        if (
          parseInt(issued_books) >=
          parseInt(response.data["number_of_books_per_user"])
        ) {
          setAlertData(
            `The maximum number they can take is : ${issued_books}, and it has been reached `
          );
        }
        setConfigDetails(response.data);
      }
      setLoading(false);
    });
  };

  React.useEffect(() => {
    setOpen(true);
    getLibraryConfiguration();
  }, [props.showModal]);

  const handleSearchChange = (e) => {
    const { value } = e.target;
    set_remark_on_issue(value);
  };

  const handleButton = () => {
    const details = {
      amount: parseFloat(book_details.fine_details?.fine_amount ?? 0),
      student: user_details.student_details
        ? user_details.student_details.name
        : user_details.staff_details.name,
    };
    props.handleOpenPaymentModal(details);
    handleClose();
  };

  return (
    <div>
      <Dialog
        aria-labelledby="customized-dialog-title"
        className="action-video-tutorial-details-width"
        open={open}
      >
        <DialogTitle id="customized-dialog-title" onClose={handleClose}>
          <div className="d-flex align-items-center">{header}</div>
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
                      <td>Number Of Days</td>
                      <td>{configDetails["return_within_days"]}</td>
                    </tr>
                    {book_action === "RENEW" && (
                      <tr className="review-issue-modal">
                        <td>Current Return Date</td>
                        <td>
                          {dateFormat(book_details["due_date"], "DD-MM-YYYY")}
                        </td>
                      </tr>
                    )}
                    <tr className="review-issue-modal">
                      {book_action === "RENEW" ? (
                        <td>Updated Returning On</td>
                      ) : (
                        <td>Returning On</td>
                      )}
                      <td>{configDetails["return_date"]} </td>
                    </tr>
                    <tr className="review-issue-modal">
                      <td>Maximum Books Can Hold</td>
                      <td>{configDetails["number_of_books_per_user"]}</td>
                    </tr>
                    <tr className="review-issue-modal">
                      <td>Current Holding Books</td>
                      <td>
                        {
                          props.user_details?.assigned_books.length
                        }
                      </td>
                    </tr>
                    {book_action === "RENEW" && (
                      <tr className="review-issue-modal-fine">
                        <td>
                          <Tooltip title="Fine amount to be carried forward">
                            <span>Fine Carry Forward</span>
                          </Tooltip>
                        </td>
                        <td>
                          {numberWithCommas(
                            book_details.fine_details?.fine_amount ?? 0
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {book_action === "RENEW" && (
                  <div className="mt-3">
                    {book_details.fine_details?.fine_amount > 0 && (
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleButton}
                        disabled={saveButtonBlocked}
                        size="small"
                      >
                        Pay & Renew
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {!alertData && (
                <div className="mt-10">
                  <div className="apply-leave-label-names margin-top-20">
                    Remarks on {book_action}
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
              )}
              {alertData && (
                <div className="show-error-config-page">{alertData}</div>
              )}
            </DialogContent>
            <DialogActions className="flex-justify-space-between">
              {!alertData && (
                <Button
                  autoFocus
                  onClick={saveButtonBlocked ? "" : () => sendMessage()}
                  color="primary"
                  className="submit"
                  disabled={saveButtonBlocked}
                >
                  {book_action}
                </Button>
              )}
               {book_details.fine_details?.fine_amount > 0 && (
              <div
                style={{
                  fontSize: "16px",
                  color: "#757575",
                  marginLeft: "1px",
                }}
              >
                Submit and Carry Forward
              </div>
            )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </div>
  );
}

export default withRouter(ReviewIssueModal);
