import React from 'react';
import {
    Box, IconButton, Menu, MenuItem, Button, TextField, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Grid
} from '@material-ui/core';
// import put from '../actions/API_request/put'
import Swal from 'sweetalert2'
import DateFnsUtils from '@date-io/date-fns';
import {
    MuiPickersUtilsProvider,
    KeyboardDatePicker,
} from '@material-ui/pickers';
import { putRequest } from 'Includes/api/apicall';
import { PUT_URL } from 'Includes/urls'
import MoreHorizIcon from '@material-ui/icons/MoreHoriz';
import InsertInvitationIcon from '@material-ui/icons/InsertInvitation';
import CancelIcon from '@material-ui/icons/Cancel';

const ITEM_HEIGHT = 35;

export default function UpdateHolidayCalender(props) {


    const { id, name, from_date, to_date, deleteHoliday, updateHoliday, year } = props;


    const [open, setOpen] = React.useState(false);
    const [errors, setErrors] = React.useState({});
    const [openFromCalender, setOpenFromCalender] = React.useState(false);
    const [openToCalender, setOpenToCalender] = React.useState(false);
    const [holidayName, setHolidayName] = React.useState(name)
    const [startDate, setStartDate] = React.useState(from_date)
    const [endDate, setEndDate] = React.useState(to_date)
    const [anchorEl, setAnchorEl] = React.useState(null);
    const openMenu = Boolean(anchorEl);




    const handleClickOpen = () => {
        setOpen(true);
        handleCloseMenu();

    };

    const handleClose = () => {
        setOpen(false);
        handleCloseMenu();
    };

    const update = async () => {
        if (holidayName === "") {
            errors.holidayName = 'Please Enter Holiday Name'
            setErrors(errors)

        }
        if (startDate === "") {
            errors.startDate = 'Please Enter Start Date'
            setErrors(errors)

        } 
        if (endDate === "") {
            errors.endDate = 'Please Enter To Date'
            setErrors(errors)

        }
        if ((Object.keys(errors).length === 0)) {
            let payload = {
                financial_year:year,
                reason: holidayName,
                from_date: startDate,
                to_date: endDate
            }
            const put_url = PUT_URL.addHolidayCalender.api
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
                        updateHoliday(id, payload)
                    )
                }
                else {
                    setHolidayName(name)
                    setStartDate(from_date)
                    setEndDate(to_date)
                }
                setOpen(false);
                handleCloseMenu();
            })

        }
    }
 
    const onchange = (e) => {
        setHolidayName(e.target.value)
        delete errors['holidayName']
        setErrors(errors)
        if (e.target.value === "") {
            errors.holidayName='Please Enter Holiday Name'
            setErrors(errors)
        }
    }



    const handleClick = event => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };


    const handleDeleteAndClose = () => {

        deleteHoliday(id, name);
        handleCloseMenu();

    }
    const onChangeDate = (e, name) => {
        if (name === 'startDate') {
            setStartDate(convert(e))
            setOpenFromCalender(false)
            delete errors.startDate
            setErrors(errors)
        }
        if (name === 'endDate') {
            setEndDate(convert(e))
            setOpenToCalender(false)
            delete errors.endDate
            setErrors(errors)
        }
    }
    const convert = (str) => {
        var date = new Date(str),
            mnth = ('0' + (date.getMonth() + 1)).slice(-2),
            day = ('0' + date.getDate()).slice(-2);
        return [date.getFullYear(), mnth, day].join('-');
    }

    const clearCalendar = (e, name) => {
        let names = ''
        if (name === 'startDate') {
            setStartDate(names)
            errors.startDate='Please Enter Start Date'
            setErrors(errors)
        }
        if (name === 'endDate') {
            setEndDate(names)
            errors.endDate='Please Enter To Date'
            setErrors(errors)
        }
    }
    const openCalenderFunFrom = (e) => {
        setOpenFromCalender(!openFromCalender)
    }
    const openCalenderFunTo = (e) => {
        setOpenToCalender(!openToCalender)

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
            <Dialog open={open} onClose={handleClose} aria-labelledby="form-dialog-title">
                <DialogTitle id="form-dialog-title"></DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Please Enter Holiday Name
          </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="name"
                        label="Update Holiday Name"
                        type="name"
                        value={holidayName}
                        name='holidayName'
                        onChange={onchange}
                        helperText={errors.holidayName && errors.holidayName}
                        error={errors.holidayName && (errors.holidayName ? true : false)}
                        fullWidth
                    />

                    <Grid container>
                        <Grid item md={12}>

                            <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                <KeyboardDatePicker
                                    fullWidth
                                    autoOk
                                    variant='inline'
                                    KeyboardButtonProps={{
                                        'aria-label': 'change date',
                                        'class': 'MuiIconButton-root-hover-cancel'
                                    }}
                                    keyboardIcon={<Box>
                                        {(startDate) ? <CancelIcon onClick={e => clearCalendar(e, 'startDate')} style={{ marginTop: "4px", marginRight: "5px" }} /> : ''}
                                        <InsertInvitationIcon onClick={openCalenderFunFrom} style={{ marginTop: "4px" }} />
                                    </Box>}
                                    open={openFromCalender}
                                    onClose
                                    inputVariant="outlined"
                                    label="From Date"
                                    name="startDate"
                                    margin="normal"
                                    inputProps={{ readOnly: true }}
                                    InputLabelProps={{ shrink: startDate ? true : false }}
                                    format="yyyy-MM-dd"
                                    value={startDate}
                                    onChange={(e) => onChangeDate(e, 'startDate')}
                                    helperText={errors.startDate && errors.startDate}
                                    error={errors.startDate && (errors.startDate ? true : false)}
                                />
                                <KeyboardDatePicker
                                    fullWidth
                                    autoOk
                                    variant='inline'
                                    KeyboardButtonProps={{
                                        'aria-label': 'change date',
                                        'class': 'MuiIconButton-root-hover-cancel'
                                    }}
                                    keyboardIcon={<Box>
                                        {(endDate) ? <CancelIcon onClick={e => clearCalendar(e, 'endDate')} style={{ marginTop: "4px", marginRight: "5px" }} /> : ''}
                                        <InsertInvitationIcon onClick={openCalenderFunTo} style={{ marginTop: "4px" }} />
                                    </Box>}
                                    open={openToCalender}
                                    onClose
                                    inputVariant="outlined"
                                    label='End Date'
                                    name="endDate"
                                    margin="normal"
                                    inputProps={{ readOnly: true }}
                                    InputLabelProps={{ shrink: endDate ? true : false }}
                                    format="yyyy-MM-dd"
                                    value={endDate}
                                    onChange={(e) => onChangeDate(e, 'endDate')}
                                    disabled={endDate === null ? true : false}
                                    helperText={errors.endDate && errors.endDate}
                                    error={errors.endDate && (errors.endDate ? true : false)}
                                />
                            </MuiPickersUtilsProvider>
                        </Grid>
                    </Grid>

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