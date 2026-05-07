import React from 'react';
import {
    IconButton, Menu, MenuItem, Button, TextField, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Grid
} from '@material-ui/core/';
import MoreHorizIcon from '@material-ui/icons/MoreHoriz';
import put from '../actions/API_request/put'
import Swal from 'sweetalert2'
import DateFnsUtils from '@date-io/date-fns';
import {
    MuiPickersUtilsProvider,
    KeyboardTimePicker,
    KeyboardDatePicker,
} from '@material-ui/pickers';
import { putRequest } from 'Includes/api/apicall';
import { PUT_URL } from 'Includes/urls'


const ITEM_HEIGHT = 35;

export default function ShiftActions(props) {


    const { id, name, start_time, end_time, deleteFee, updateType, index } = props;

    let startTimeSplit = []
    startTimeSplit = start_time.split(':')
    let start = new Date()
    start.setHours(startTimeSplit[0])
    start.setMinutes(startTimeSplit[1])
    start.setSeconds(startTimeSplit[2])

    let endTimeSplit = []
    endTimeSplit = end_time.split(':')
    let end = new Date()
    end.setHours(endTimeSplit[0])
    end.setMinutes(endTimeSplit[1])
    end.setSeconds(endTimeSplit[2])

    const [open, setOpen] = React.useState(false);
    const [shiftName, setShiftName] = React.useState(name)
    const [startTime, setStartTime] = React.useState(start)
    const [endTime, setEndTime] = React.useState(end)
    const [ShiftNameError, setShiftNameError] = React.useState("")
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [updateDisable, setUpdateDisable] = React.useState(false);
    const openMenu = Boolean(anchorEl);




    const handleClickOpen = () => {
        setShiftName(name)
        setStartTime(start)
        setEndTime(end)
        setOpen(true);
        handleCloseMenu();

    };

    const handleClose = () => {
        setOpen(false);
        handleCloseMenu();
    }; 

    const update = async () => {
        setUpdateDisable(true)
        if (shiftName === "") {
            setShiftNameError("Can't be empty")
        }
        if (shiftName !== "" && startTime !== "" && ShiftNameError === "") {

            let payload = {
                shift_name: shiftName,
                start_time: ('0' + startTime.getHours()).slice(-2) + ":" + ('0' + startTime.getMinutes()).slice(-2) + ":" + ('0' + startTime.getSeconds()).slice(-2),
                end_time: ('0' + endTime.getHours()).slice(-2) + ":" + ('0' + endTime.getMinutes()).slice(-2) + ":" + ('0' + endTime.getSeconds()).slice(-2)
            }

            const put_url = PUT_URL.addHrShift.api
            const url = put_url + id + '/';
            putRequest(url, payload, props).then(response => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    }).then(
                        updateType(id, payload)
                    )
                }
                else {
                    setShiftName(name)
                    setStartTime(start)
                    setEndTime(end)
                }
                setUpdateDisable(false)
                setOpen(false);
                handleCloseMenu();
            })
        }
    }


    const onchange = (e) => {

        setShiftName(e.target.value)
        var regex = /^[a-zA-Z ]{0,500}$/;
        let test = regex.test(e.target.value);


        if (e.target.value === "") {
            setShiftNameError("Can't be empty")
        }
        else if (!test) {
            setShiftNameError("Special case not allowed")
        }
        else {
            setShiftNameError("")
        }

    }


 
    const handleClick = event => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };


    const handleDeleteAndClose = () => {

        deleteFee(id, name);
        handleCloseMenu();

    }

    return (
        <div>
            <IconButton
                aria-label="more"
                aria-controls="long-menu"
                aria-haspopup="true"
                onClick={handleClick}
            >
                <MoreHorizIcon />
            </IconButton>
            <Menu
                id="long-menu"
                anchorEl={anchorEl}
                keepMounted
                open={openMenu}
                onClose={handleCloseMenu}
                PaperProps={{
                    style: {
                        maxHeight: ITEM_HEIGHT * 4.5,
                        width: 100,
                    },
                }}
            >
                <MenuItem onClick={handleClickOpen}>
                    Edit
          </MenuItem>

                <MenuItem onClick={handleDeleteAndClose}>
                    Delete
          </MenuItem>

            </Menu>
            <Dialog open={open} 
            // onClose={handleClose} 
            aria-labelledby="form-dialog-title">
                <DialogTitle id="form-dialog-title"></DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Please Enter Shift Name
          </DialogContentText> 
                    <TextField
                        autoFocus 
                        margin="dense"
                        id="name"
                        label="Update Shift Name"
                        type="name"
                        value={shiftName}
                        onChange={onchange}
                        helperText={ShiftNameError !== "" && ShiftNameError}
                        error={ShiftNameError !== "" && true}
                        fullWidth
                        inputProps={{ maxLength: 20 }} 
                    />

                    <Grid container>
                        <Grid item md={12}>

                            <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                <KeyboardTimePicker
                                    fullWidth
                                    autoOk
                                    variant='inline'
                                    inputVariant="outlined"
                                    name="start_time"
                                    margin="normal"
                                    inputProps={{ readOnly: true }}
                                    id="time-picker"
                                    label="Start Time"
                                    value={startTime}
                                    onChange={e => setStartTime(e)}
                                    KeyboardButtonProps={{
                                        'aria-label': 'change time',
                                    }}
                                />

                                <KeyboardTimePicker
                                    fullWidth
                                    autoOk
                                    variant='inline'
                                    inputVariant="outlined"
                                    name="end_time"
                                    margin="normal"
                                    inputProps={{ readOnly: true }}
                                    id="time-picker"
                                    label="End Time"
                                    value={endTime}
                                    onChange={e => setEndTime(e)}
                                    KeyboardButtonProps={{
                                        'aria-label': 'change time',
                                    }}
                                />

                            </MuiPickersUtilsProvider>
                        </Grid>
                    </Grid>

                </DialogContent>
                <DialogActions>
                    <Button disabled={updateDisable} onClick={update} color="primary">
                        Update
                     </Button>
                    <Button onClick={handleClose} color="primary">
                        Close
             </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}