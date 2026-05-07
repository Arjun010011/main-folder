import React from "react";
import Button from "@material-ui/core/Button";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@material-ui/core";
import Swal from "sweetalert2";
import { Box} from "@material-ui/core";
import WarningIcon from "@material-ui/icons/Warning";
import Snackbar from "@material-ui/core/Snackbar";
import { Alert } from "Includes/functions";

import { POST_URL } from "Includes/urls";
import { postRequest } from "Includes/api/apicall";

export default function FullScreenDialog(props) {
  const [open, setOpen] = React.useState(true);
  const [alertData, setAlertData] = React.useState("");
  const [snackbar, setSnackbar] = React.useState(false);
  const [submitDisable, setSubmitDisable] = React.useState(false);

  const handleClose = (action) => {
    if (["enable", "disable"].includes(action)) {
      setSubmitDisable(() => true);
      const url = POST_URL.librarymembership.api;
      let post_data = {
        enabled_user_ids: [],
        disabled_user_ids: [],
      };
      let temp_list = [];
      props.studentIds.map((data) => {
        temp_list.push(data.user_id);
      });
      if (action === "enable") {
        post_data["enabled_user_ids"] = temp_list;
      } else if (action === "disable") {
        post_data["disabled_user_ids"] = temp_list;
      }
      postRequest(url, post_data, props).then((response) => {
        setSubmitDisable(() => false);
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: response.data.Reason,
            showConfirmButton: false,
            timer: 1500,
          });
          setOpen(false);
          props.closeMemberShipPopup(true);
        }
      });
    } else {
      setOpen(false);
      props.closeMemberShipPopup();
    }
  };

  const handleCloseSnackBar = () => {
    setSnackbar(false);
  };


  return (
    <div>
      <Dialog
        onClose={handleClose}
        className="action-general-detail-width"
        aria-labelledby="customized-dialog-title"
        open={open}
      >
        <DialogTitle id="customized-dialog-title" onClose={handleClose}>
          Members List
          <Box className="warning-msg">
            <Box display="flex" className="warning-message fs-12" mt={2} ml={0}>
              <WarningIcon style={{ color: "#f6c342" }} /> Enabling/Disabling
              will apply for selected members
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <table className="w-100">
            <thead>
              <tr className="thead-adjustment">
                <th>Student Name </th>
                <th>Membership Status</th>
              </tr>
            </thead>
            <tbody>
              {!!props.studentIds &&
                props.studentIds.map((data, index) => {
                  return (
                    <tr className="tbody-adjustment">
                      <td>{data?.["name"]}</td>
                      <td>
                        {data["is_library_member"] ? "Enabled" : "Disabled"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </DialogContent>
        <DialogActions>
          <Button
            autoFocus
            onClick={() => handleClose("enable")}
            color="primary"
          >
            Enable
          </Button>
          <Button
            autoFocus
            onClick={() => handleClose("disable")}
            color="primary"
          >
            Disable
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
