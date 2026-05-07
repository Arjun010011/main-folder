import React, { useState } from "react";
import { withStyles, makeStyles } from "@material-ui/core/styles";
import {
    Button,
    Dialog,
    AppBar,
    Toolbar,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    FormControlLabel,
    Switch,
    CircularProgress,
} from "@material-ui/core";
import MuiDialogContent from "@material-ui/core/DialogContent";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Typography from "@material-ui/core/Typography";
import { postRequest } from "Includes/api/apicall";
import { POST_URL } from "Includes/urls";
import Swal from "sweetalert2";

const useStyles = makeStyles((theme) => ({
    appBar: {
        position: "relative",
        backgroundColor: "#4680FF",
    },
    title: {
        flex: 1,
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 200,
    },
    timePicker: {
        margin: theme.spacing(1),
        width: 200,
    },
    submitBtn: {
        margin: theme.spacing(2),
    },
}));

const DialogContent = withStyles((theme) => ({
    root: {
        padding: theme.spacing(3),
    },
}))(MuiDialogContent);

// Attendance status options for dropdown
const STATUS_OPTIONS = [
    { value: "present", label: "Present" },
    { value: "absent", label: "Absent" },
    { value: "halfday", label: "Half Day" },
    { value: "late", label: "Late" },
    { value: "lateandhalfday", label: "Late and Half Day" },
    { value: "unmarked", label: "Unmarked" },
    { value: "holiday", label: "Holiday" },
    { value: "leave_applied", label: "Leave Applied" },
    { value: "lop_attendance", label: "LOP" },
];

/**
 * BulkAttendanceEditDialog - Dialog for bulk editing staff attendance
 * 
 * Props:
 * - open: boolean - Controls dialog visibility
 * - onClose: function - Called when dialog should close
 * - selectedRecords: array - Array of {id, staff_id, for_date} objects
 * - onSuccess: function - Called after successful update
 * - history: object - Router history for API calls
 */
export default function BulkAttendanceEditDialog(props) {
    const classes = useStyles();
    const { open, onClose, selectedRecords, onSuccess, history } = props;

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");
    const [useCustomTimes, setUseCustomTimes] = useState(false);
    const [inTime, setInTime] = useState("");
    const [outTime, setOutTime] = useState("");
    const [reason, setReason] = useState("");

    const handleClose = () => {
        if (!loading) {
            // Reset form
            setStatus("");
            setUseCustomTimes(false);
            setInTime("");
            setOutTime("");
            setReason("");
            onClose();
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (!status && !useCustomTimes) {
            Swal.fire({
                icon: "warning",
                title: "Validation Error",
                text: "Please select a status or enable custom times",
            });
            return;
        }

        if (useCustomTimes && !inTime && !outTime) {
            Swal.fire({
                icon: "warning",
                title: "Validation Error",
                text: "Please enter at least one time value",
            });
            return;
        }

        if (!selectedRecords || selectedRecords.length === 0) {
            Swal.fire({
                icon: "warning",
                title: "No Records Selected",
                text: "Please select at least one attendance record to update",
            });
            return;
        }

        // Build payload
        const payload = {};

        // Use attendance_ids if available, otherwise use staff_attendance_pairs
        const hasIds = selectedRecords.every((r) => r.id);
        if (hasIds) {
            payload.attendance_ids = selectedRecords.map((r) => r.id);
        } else {
            payload.staff_attendance_pairs = selectedRecords.map((r) => ({
                staff_id: r.staff_id,
                for_date: r.for_date,
            }));
        }

        // Add status if selected
        if (status) {
            payload.status = status;
        }

        // Add custom times if enabled
        if (useCustomTimes) {
            if (inTime) {
                payload.in_time = inTime + ":00"; // Add seconds
            }
            if (outTime) {
                payload.out_time = outTime + ":00"; // Add seconds
            }
        }

        // Add reason if provided
        if (reason.trim()) {
            payload.reason = reason.trim();
        }

        // Confirm before submitting
        const confirmResult = await Swal.fire({
            title: "Confirm Bulk Update",
            html: `Are you sure you want to update <strong>${selectedRecords.length}</strong> attendance record(s)?`,
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, Update",
        });

        if (!confirmResult.value) {
            return;
        }

        setLoading(true);

        try {
            const url = POST_URL.staffattendancebulk.api;
            const response = await postRequest(url, payload, { history });

            if (response && response.status === 200) {
                Swal.fire({
                    position: "top-end",
                    icon: "success",
                    title: response.data?.message || "Attendance updated successfully",
                    showConfirmButton: false,
                    timer: 1500,
                });
                handleClose();
                if (onSuccess) {
                    onSuccess();
                }
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Update Failed",
                    text: response?.data?.error || "An error occurred while updating attendance",
                });
            }
        } catch (error) {
            console.error("Bulk update error:", error);
            Swal.fire({
                icon: "error",
                title: "Update Failed",
                text: error?.response?.data?.error || "An unexpected error occurred",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            aria-labelledby="bulk-attendance-dialog"
        >
            <AppBar className={classes.appBar}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={handleClose}
                        aria-label="close"
                        disabled={loading}
                    >
                        <CloseIcon />
                    </IconButton>
                    <Typography variant="h6" className={classes.title}>
                        Bulk Edit Attendance ({selectedRecords?.length || 0} selected)
                    </Typography>
                </Toolbar>
            </AppBar>
            <DialogContent>
                <div className="mb-20">
                    <Typography variant="body2" color="textSecondary">
                        Update status and/or custom times for all selected attendance records.
                    </Typography>
                </div>

                <FormControl className={classes.formControl} fullWidth>
                    <InputLabel id="status-select-label">Status</InputLabel>
                    <Select
                        labelId="status-select-label"
                        id="status-select"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        disabled={loading}
                    >
                        <MenuItem value="">
                            <em>No Change</em>
                        </MenuItem>
                        {STATUS_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <div className="mt-20">
                    <FormControlLabel
                        control={
                            <Switch
                                checked={useCustomTimes}
                                onChange={(e) => setUseCustomTimes(e.target.checked)}
                                color="primary"
                                disabled={loading}
                            />
                        }
                        label="Set Custom Times"
                    />
                </div>

                {useCustomTimes && (
                    <div className="mt-20">
                        <TextField
                            label="In Time"
                            type="time"
                            value={inTime}
                            onChange={(e) => setInTime(e.target.value)}
                            className={classes.timePicker}
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ step: 60 }}
                            disabled={loading}
                        />
                        <TextField
                            label="Out Time"
                            type="time"
                            value={outTime}
                            onChange={(e) => setOutTime(e.target.value)}
                            className={classes.timePicker}
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ step: 60 }}
                            disabled={loading}
                        />
                    </div>
                )}

                <div className="mt-20">
                    <TextField
                        label="Reason (Optional)"
                        placeholder="Enter reason for attendance change..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        fullWidth
                        multiline
                        rows={2}
                        variant="outlined"
                        disabled={loading}
                    />
                </div>

                <div className={classes.submitBtn}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSubmit}
                        disabled={loading || (!status && !useCustomTimes)}
                    >
                        {loading ? (
                            <>
                                <CircularProgress size={20} color="inherit" className="mr-10" />
                                Updating...
                            </>
                        ) : (
                            "Update Attendance"
                        )}
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={handleClose}
                        disabled={loading}
                        className="ml-10"
                    >
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
