import React from 'react';
import { Button, TextField, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Box, Fab, } from '@material-ui/core';
import EditIcon from '@material-ui/icons/Edit';
import DateFnsUtils from '@date-io/date-fns';
import {
    MuiPickersUtilsProvider,
    KeyboardTimePicker,
    KeyboardDatePicker,
} from '@material-ui/pickers';
import Swal from 'sweetalert2'

import { putRequest } from 'Includes/api/apicall';
import { PUT_URL } from 'Includes/urls'


export default function UpdateShiftTypes(props) {
    const [open, setOpen] = React.useState(false);
    const { id, name, updateType, index, tDate } = props;
    const [shiftName, setshiftName] = React.useState(name)
    const [error, setError] = React.useState("")
    const [fromDate, setFromDate] = React.useState()
    const [toDate, setToDate] = React.useState()

    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const update = async () => {
        if (shiftName === "") {
            setError("Can't be empty")
        }
        if (error === "") {
            let fDate = fromDate.getHours() + ":" + fromDate.getMinutes() + ":" + fromDate.getSeconds()
            let tDate = toDate.getHours() + ":" + toDate.getMinutes() + ":" + toDate.getSeconds()
            let payload = {
                "id": 3,
                "shift_name": shiftName,
                "start_time": fDate,
                "end_time": tDate
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
                        updateType(index, shiftName, fDate, tDate)
                    )
                }
                setOpen(false);
            })
        }
    }



    const onchange = (e) => {
        setshiftName(e.target.value)
        var regex = /^[a-zA-Z ]{0,500}$/;
        let test = regex.test(e.target.value);


        if (e.target.value === "") {
            setError("Can't be empty")
        }
        else if (!test) {
            setError("Special case not allowed")
        }
        else {
            setError("")
        }
    }

    return (
        <div>
            <Box m={2}>
                <Fab color="primary" aria-label="add" onClick={handleClickOpen}>
                    <EditIcon />
                </Fab>
            </Box>
            <Dialog open={open} 
            onClose={handleClose} 
            aria-labelledby="form-dialog-title">
                <DialogTitle id="form-dialog-title">{name}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Please enter unique shiftNameName
                     </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="name"
                        label="Update ShiftType"
                        type="name"
                        value={shiftName}
                        onChange={onchange}
                        helperText={error === "" ? "" : error}
                        error={error === "" ? false : true}
                        fullWidth
                    />
                    <MuiPickersUtilsProvider utils={DateFnsUtils}>
                        {/* <Grid container justify="space-around"> */}

                        <KeyboardTimePicker
                            margin="normal"
                            id="time-picker"
                            label="From Time"
                            value={fromDate}
                            onChange={(e) => setFromDate(e)}
                            KeyboardButtonProps={{
                                'aria-label': 'change time',
                            }}
                        />
                        <KeyboardTimePicker
                            margin="normal"
                            id="time-picker"
                            label="To Time"
                            value={toDate}
                            onChange={(e) => setToDate(e)}
                            KeyboardButtonProps={{
                                'aria-label': 'change time',
                            }}
                        />
                        {/* </Grid> */}
                    </MuiPickersUtilsProvider >
                </DialogContent>
                <DialogActions>
                    <Button onClick={update} color="primary">
                        Update
          </Button>

                </DialogActions>
            </Dialog>
        </div>
    );
}