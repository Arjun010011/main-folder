import React from "react";
import { withStyles } from "@material-ui/core/styles";
import { Button, Dialog, CircularProgress, Checkbox } from "@material-ui/core";
import MuiDialogTitle from "@material-ui/core/DialogTitle";
import MuiDialogContent from "@material-ui/core/DialogContent";
import MuiDialogActions from "@material-ui/core/DialogActions";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Typography from "@material-ui/core/Typography";
import { getPaginationProps, dateFormat } from "Includes/functions";
import { getFullName } from "Includes/functions";
import { getFormDefinitionValue } from "Includes/CheckFormDefinition";
import {
  AWS_BUCKET_URL,
  DEFAULT_PAGINATION_PROPS_FIRST_NAME_LIST,
} from "Constants";
import { GET_URL, POST_URL } from "Includes/urls";
import { getRequest, postRequest } from "Includes/api/apicall";
import ReactQuill from "react-quill";
import { modules, formats } from "Constants";
import Swal from "sweetalert2";

const cake = `${AWS_BUCKET_URL}companies-images/web-images/dashboard/cake.gif`;

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

const header = "Happy birthday to today's users";

const body = "";

let user =
  localStorage.getItem("user") != "undefined"
    ? JSON.parse(localStorage.getItem("user"))
    : "";

export default function AdjustmentModal(props) {
  const [open, setOpen] = React.useState(true);
  const [body, setBody] = React.useState([]);
  const from_text = getFormDefinitionValue(
    "dashboard_configuration",
    "text_to_display_in_from_text"
  )
  console.log(from_text);
  const [reasonForAdjustment, setreasonForAdjustment] = React.useState(
    `<p><em>Wishing you a birthday filled with sweet moments and wonderful memories to cherish always! Happy Birthday.</em></p><p><br></p><p><strong>From<br>${
      from_text
        ? from_text
        : user.staff
        ? getFullName(
            user.staff.first_name,
            user.staff.middle_name,
            user.staff.last_name
          )
        : user.student
        ? getFullName(
            user.student.first_name,
            user.student.middle_name,
            user.student.last_name
          )
        : ""
    }</strong></p>`
  );
  const [noBirthdayList] = React.useState(
    `<p><em>
    <strong>
    Regrettably, no one has a birthday today, so unable to send a message.
    </em></p><p></strong></p>`
  );
  const [alertData, setAlertData] = React.useState("");
  const [selectedAll, setSelectedAll] = React.useState(true);
  const [transaction_id] = React.useState(Date.now());
  const [textContent, setTextContent] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [saveButtonBlocked, setSaveButtonBlocked] = React.useState(false);

  let quillRef = React.useRef(null);

  const handleClose = () => {
    props.closeInParent();
  };

  const sendMessage = () => {
    if (validate()) {
      let prop = { ...props };
      prop["return_error_message"] = true;
      setSaveButtonBlocked(true);
      let url = POST_URL.bulknotification.api;
      postRequest(url, validate(), props).then((response) => {
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
    }
  };

  const getTodaysBirthdays = () => {
    setLoading(true);
    let pagination_params = getPaginationProps(
      DEFAULT_PAGINATION_PROPS_FIRST_NAME_LIST
    );
    let params = {
      ...pagination_params,
      is_active: true,
      for_date: dateFormat(new Date(), "YYYY-MM-DD"),
    };
    const url = GET_URL.userbirthday.api;
    getRequest(url, params, props).then((response) => {
      if (response && response.status === 200) {
        const studentList = response.data;
        studentList.data.data_list.map((data) => {
          data["checked"] = true;
          if (data["student__first_name"]) {
            data["full_name"] = getFullName(
              data["student__first_name"],
              data["student__middle_name"],
              data["student__last_name"]
            );
            data["mobile_num"] = data["student__mobile_num"];
          } else if (data["staff__first_name"]) {
            data["full_name"] = getFullName(
              data["staff__first_name"],
              data["staff__middle_name"],
              data["staff__last_name"]
            );
            data["mobile_num"] = data["staff__middle_name"];
          }
        });
        if (studentList.data.data_list.length === 0) {
          setSaveButtonBlocked(true);
        }
        setBody(studentList.data.data_list);
      }
      setLoading(false);
    });
  };
  const validate = () => {
    let validate = true;
    let user_ids = [];
    if (textContent.length === 0) {
      setAlertData("Please provide the message");
      validate = false;
    } else if (textContent.length < 3) {
      setAlertData("Minimum text length should be 3");
      validate = false;
    }
    body.map((data) => {
      if (data["checked"]) {
        user_ids.push(data["id"]);
      }
    });
    if (user_ids.length === 0) {
      setAlertData("Atleast select one user");
      validate = false;
    }
    if (!validate) return false;
    let post_data = {
      message_data: reasonForAdjustment,
      heading: "Birthday",
      schedule: "",
      medium: "push",
      language: 1,
      standard_ids: [],
      standard_section_ids: [],
      user_ids: user_ids,
      group_ids: [],
      transaction_id: transaction_id,
      return_users_only: false,
      academic_year: user?.other_details?.academic_year?.id,
      documents: [],
      birthday_wish: true,
    };
    return post_data;
  };

  const handleDropDown = (content, delta, source, editor) => {
    setreasonForAdjustment(content);
    setTextContent(editor.getText(content).trim());
    setAlertData("");
  };

  React.useEffect(() => {
    setOpen(true);
    getTodaysBirthdays();
  }, [props.showModal]);

  const handleCheckChange = (index) => {
    let bodyTemp = [...body];
    bodyTemp[index]["checked"] = !bodyTemp[index]["checked"];
    setBody(bodyTemp);
    setAlertData("");
  };

  const handleSelectAll = () => {
    setSelectedAll(!selectedAll);
    let temp_list = [...body];
    temp_list.map((data) => {
      data["checked"] = !selectedAll;
    });
    setBody([...temp_list]);
    setAlertData("");
  };

  return (
    <div>
      <Dialog
        aria-labelledby="customized-dialog-title"
        className="fee-plan-edit-width"
        open={open}
      >
        <DialogTitle id="customized-dialog-title" onClose={handleClose}>
          <div className="d-flex align-items-center">
            <img src={cake} className="height-width-50px" /> {header}
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
                {body.length === 0 ? (
                  <div></div>
                ) : (
                  <table className="w-100">
                    <thead>
                      <tr className="birthday-dialog-tb">
                        <th>
                          <Checkbox
                            onChange={handleSelectAll}
                            color="primary"
                            name={"checked"}
                            checked={selectedAll}
                            className="padding-0"
                            inputProps={{
                              "aria-label": "primary checkbox",
                            }}
                          />
                        </th>
                        <th>User Name</th>
                        <th>Staff/Student</th>
                        <th>Mobile No.</th>
                        <th>Standard</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!!body &&
                        body.map((data, index) => {
                          return (
                            <tr className="birthday-dialog-tb">
                              <td>
                                <Checkbox
                                  onChange={() => handleCheckChange(index)}
                                  color="primary"
                                  name={"checked"}
                                  checked={data.checked}
                                  className="padding-0"
                                  inputProps={{
                                    "aria-label": "primary checkbox",
                                  }}
                                />
                              </td>
                              <td className="text-capitalize">
                                {data["full_name"]}
                              </td>
                              <td>{data["student"] ? "Student" : "Staff"}</td>
                              <td>{data["mobile_num"]}</td>
                              <td>{data["student__current_standard__name"]}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="mt-10">
                <ReactQuill
                  ref={(el) => (quillRef = el)}
                  theme={"snow"}
                  value={
                    body.length === 0 ? noBirthdayList : reasonForAdjustment
                  }
                  defaultValue={reasonForAdjustment}
                  readOnly={body.length === 0 ? true : false}
                  onChange={handleDropDown}
                  modules={body.length === 0 ? {} : modules}
                  formats={formats}
                  className={"react-quill-min-height"}
                />
              </div>
            </DialogContent>
            {body.length !== 0 && (
              <DialogActions className="flex-justify-space-between">
                <div className="text-red fs-18">{alertData}</div>
                <Button
                  autoFocus
                  onClick={saveButtonBlocked ? "" : () => sendMessage()}
                  color="primary"
                  className="submit"
                  disabled={saveButtonBlocked}
                >
                  Send Wishes
                </Button>
              </DialogActions>
            )}
          </>
        )}
      </Dialog>
    </div>
  );
}
