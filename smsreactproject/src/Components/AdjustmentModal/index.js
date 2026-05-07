import React from "react";
import { withStyles } from "@material-ui/core/styles";
import { Button, Box, Dialog } from "@material-ui/core";
import MuiDialogTitle from "@material-ui/core/DialogTitle";
import MuiDialogContent from "@material-ui/core/DialogContent";
import MuiDialogActions from "@material-ui/core/DialogActions";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Typography from "@material-ui/core/Typography";
import WarningIcon from "@material-ui/icons/Warning";
import { numberWithCommas } from "Includes/functions";
import { DropDownWithSearchAndAddApi } from "Components/DropDownWithSearchAndAddApi";
import Snackbar from "@material-ui/core/Snackbar";
import { Alert } from "Includes/functions";
import "./styles.scss";
import { nameAndNumberAndHyphenRegex } from "Constants/regularExpression";
import { minDate, reasonType } from "Constants";
import { POST_URL, GET_URL } from "Includes/urls";
import { getRequest, postRequest } from "Includes/api/apicall";
import Skeleton from "@material-ui/lab/Skeleton";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import DeleteIcon from "@material-ui/icons/Delete";

const fieldDetails = [
  {
    label: "Reason Name",
    regex: nameAndNumberAndHyphenRegex,
    autoFocus: false,
    name: "name",
    md: 12,
    className: "w-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 50,
    gridClassName: "margin-vertical-20",
  },
];

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

const header = "Adjustment Summary";

const body = "";

export default function AdjustmentModal(props) {
  const [open, setOpen] = React.useState(true);
  const [body, setBody] = React.useState([]);
  const [reasonForAdjustment, setreasonForAdjustment] = React.useState("");
  const [alertData, setAlertData] = React.useState("");
  const [snackbar, setSnackbar] = React.useState(false);
  const [reasonList, setReasonList] = React.useState([]);
  const [reasonForAdjustmentError, setreasonForAdjustmentError] =
    React.useState(false);
  const [reasonLoading, setReasonLoading] = React.useState(false);
  const [approvedDocuments, setApprovedDocuments] = React.useState([]);
  const [uploadingDocument, setUploadingDocument] = React.useState(false);

  const handleClose = () => {
    props.closeInParent();
  };

  const handleCloseSnackBar = () => {
    setSnackbar(false);
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate each file
    const maxSize = 10 * 1024 * 1024; // 10MB
    const invalidFiles = files.filter(file => file.size > maxSize);
    
    if (invalidFiles.length > 0) {
      setAlertData(`Some files exceed 10MB limit. Please select smaller files.`);
      setSnackbar(true);
      return;
    }

    setUploadingDocument(true);
    const uploadedDocs = [];
    const errors = [];

    // Upload files sequentially
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await postRequest(POST_URL.uploads.api, formData, props);
        if (response && response.status === 200) {
          uploadedDocs.push({
            id: response.data.data.id,
            file_name: response.data.data.file_name,
            file: response.data.data.file,
          });
        }
      } catch (error) {
        errors.push(file.name);
      }
    }

    setUploadingDocument(false);

    if (uploadedDocs.length > 0) {
      setApprovedDocuments(prev => [...prev, ...uploadedDocs]);
      // Don't show snackbar for successful uploads
    }

    if (errors.length > 0) {
      setAlertData(`Failed to upload ${errors.length} file(s). Please try again.`);
      setSnackbar(true);
    }

    // Reset file input
    if (event.target) {
      event.target.value = '';
    }
  };

  const removeDocument = (documentId) => {
    setApprovedDocuments(prev => prev.filter(doc => doc.id !== documentId));
  };

  const saveAdjustment = () => {
    if (validate()) {
      // Filter out any documents without valid IDs
      const documentIds = approvedDocuments
        .map(doc => doc?.id)
        .filter(id => id !== undefined && id !== null);
      
      let data = { 
        reason_id: reasonForAdjustment["id"],
        approved_document_ids: documentIds
      };
      props.saveAdjustment(data);
    }
  };

  const getReasonList = () => {
    setReasonLoading(() => true);
    const url = GET_URL.reason.api;
    const params = { is_active: true, reason_type: reasonType["adjustment"] };
    getRequest(url, params, props).then((response) => {
      if (response && response.status === 200) {
        setReasonList(() => response.data.data);
      }
      setReasonLoading(() => false);
    });
  };

  const validate = () => {
    if (!Boolean(reasonForAdjustment)) {
      setAlertData("Please provide the reason");
      setreasonForAdjustmentError(true);
      return false;
    }
    if (reasonForAdjustment.length < 3) {
      setAlertData("Minimum text length should be 3");
      setSnackbar(true);
      setreasonForAdjustmentError(true);
      return false;
    }
    setreasonForAdjustmentError(false);
    return true;
  };

  const handleDropDown = (e, newValue) => {
    setreasonForAdjustment(newValue);
  };

  const updatePostFormat = (newData) => {
    newData.name = newData.name;
    newData.reason_type = reasonType["adjustment"];
    let payload = {
      reason: [newData],
    };
    return payload;
  };

  const updateType = (field) => {
    setReasonLoading(() => true);
    let temp_list = [...reasonList];
    temp_list.push(field);
    setReasonList(() => temp_list);
    setReasonLoading(() => false);
    return true;
  };

  React.useEffect(() => {
    setOpen(props.showModal);
    setBody(props.body);
    if (props.showModal) {
      getReasonList();
      // Reset documents when modal opens
      setApprovedDocuments([]);
    }
  }, [props.showModal]);

  let totalAmount = 0;
  return (
    <div>
      <Dialog
        onClose={handleClose}
        aria-labelledby="customized-dialog-title"
        open={open}
      >
        <DialogTitle id="customized-dialog-title" onClose={handleClose}>
          {header}
          <Box className="warning-msg">
            <Box display="flex" className="warning-message fs-12" mt={2} ml={0}>
              <WarningIcon style={{ color: "#f6c342" }} /> Adjusting Amount will
              increase/reduce the student fees. Please review before submit
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            <table className="w-100">
              <thead>
                <tr className="thead-adjustment">
                  <th>Fee Types</th>
                  <th>Terms</th>
                  <th className="text-align-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {!!body &&
                  body.map((data, index) => {
                    totalAmount = data.is_addition
                      ? totalAmount + parseFloat(data["adjust_amount"])
                      : totalAmount - parseFloat(data["adjust_amount"]);
                    return (
                      <tr className="tbody-adjustment">
                        <td>{data["fee_type_name"]}</td>
                        <td>{data["term_name"]}</td>
                        <td className="text-align-right">{`(${
                          data.is_addition ? "+" : "-"
                        }) ${numberWithCommas(data["adjust_amount"])}`}</td>
                      </tr>
                    );
                  })}
                <tr className="tbody-adjustment row-text-bold">
                  <td>Total</td>
                  <td></td>
                  <td className="text-align-right">
                    {numberWithCommas(totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </Typography>
          {/* <TextareaAutosize aria-label="minimum height" style={reasonForAdjustmentError ? {'borderColor': 'red'} : {}} className='w-100 adjustment-textarea' 
                        rowsMin={4} placeholder="Reason For Adjustment *" maxLength={200}
                        onChange={handleDropDown} onBlur={validate} value={reasonForAdjustment} 
                    /> */}
          {/* Approved Documents Upload */}
          <div style={{ marginTop: "20px", marginBottom: "20px" }}>
            <Typography variant="subtitle2" style={{ marginBottom: "8px", fontWeight: "bold" }}>
              📎 Upload Approved Documents (Optional)
            </Typography>
            <div>
              <input
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                style={{ display: "none" }}
                id="approved-documents-upload"
                type="file"
                multiple
                onChange={handleFileUpload}
                disabled={uploadingDocument}
              />
              <label htmlFor="approved-documents-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<AttachFileIcon />}
                  disabled={uploadingDocument}
                  style={{ textTransform: "none", marginBottom: "10px" }}
                >
                  {uploadingDocument ? "Uploading..." : "Choose Files"}
                </Button>
              </label>
              <Typography variant="caption" display="block" style={{ marginTop: "4px", color: "#666" }}>
                Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB per file). You can select multiple files.
              </Typography>
              
              {/* Display uploaded documents */}
              {approvedDocuments.length > 0 && (
                <div style={{ marginTop: "12px", maxHeight: "150px", overflowY: "auto" }}>
                  {approvedDocuments.map((doc, index) => (
                    <div
                      key={doc.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "8px",
                        backgroundColor: "#f5f5f5",
                        borderRadius: "4px",
                        marginBottom: "6px"
                      }}
                    >
                      <AttachFileIcon style={{ color: "#1976d2", fontSize: "20px" }} />
                      <Typography variant="body2" style={{ flex: 1, fontSize: "12px" }}>
                        {doc.file_name}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => removeDocument(doc.id)}
                        style={{ color: "#d32f2f", padding: "4px" }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="width-300px">
            {reasonLoading ? (
              <div>
                <Skeleton
                  variant="rect"
                  className="drop-down-skeleton m-t-10px"
                ></Skeleton>
                <div>...Loading Reason List</div>
              </div>
            ) : (
              <DropDownWithSearchAndAddApi
                options={reasonList}
                value={reasonForAdjustment}
                onChange={(e, newValue) => handleDropDown(e, newValue)}
                name="reason"
                label="Reason Name *"
                optionValue="name"
                className="width-100"
                helperText={
                  reasonForAdjustmentError && reasonForAdjustmentError
                }
                error={reasonForAdjustmentError && reasonForAdjustmentError}
                fieldDetails={fieldDetails}
                postUrl={POST_URL.reason.api}
                updatePostFormat={updatePostFormat}
                updateType={updateType}
                hideClearIcon
              />
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            autoFocus
            onClick={props.saveButtonBlocked ? "" : () => saveAdjustment()}
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
