import React, { Component } from 'react'
import Grid from '@material-ui/core/Grid';
import get from '../actions/API_request/Get'
import { Paper, Box, Button, TextField } from '@material-ui/core';
import post from '../actions/API_request/Post';
import { withStyles } from '@material-ui/core/styles';
import Fab from '@material-ui/core/Fab';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import UpdateShiftTypes from './Components/UpdateShiftType'
import deleteApi from '../actions/API_request/Delete'
import Swal from 'sweetalert2'
import Typography from '@material-ui/core/Typography';
import { async } from 'q';
import DateFnsUtils from '@date-io/date-fns';
import {
    MuiPickersUtilsProvider,
    KeyboardTimePicker,
    KeyboardDatePicker,
} from '@material-ui/pickers';


const useStyles = {
    fab: {
        margin: 12,
    },
    extendedIcon: {
        marginRight: (1),
    }, button: {
        margin: (1),
    },
    deleteIcon: {
        marginLeft: 20
    }
};


class AddShifts extends Component {
    state = {
        shiftTypes: [
            {
                "id": 1,
                "shift_name": "fasfsdaf",
                "start_time": "06:06:06",
                "end_time": "04:00:02"
            },
            {
                "id": 2,
                "shift_name": "dpd",
                "start_time": "06:06:06",
                "end_time": "04:00:04"
            }
        ],
        newShiftTypes: [],
        textFiledError: "",
        fromDate: new Date(),
        toDate: new Date()
    }

    async componentDidMount() {

        let data = await get('hr/shift', "?is_active=1")
        this.setState({
            shiftTypes: data.data
        })
    }


    handleDateChange = (dateObj, name) => {

        this.setState({
            [name]: dateObj
        })
    };

    addNew = () => {

        let value = this.input.value.trim();
        const { shiftTypes, newShiftTypes, fromDate, toDate } = this.state
        let alreadyPresent = false;
        alreadyPresent = shiftTypes.some((data) => {
            return data.shift_name.toUpperCase() === value.toUpperCase()
        })
        if (!alreadyPresent) {
            alreadyPresent = newShiftTypes.some((data) => {
                return data.shift_name.toUpperCase() === value.toUpperCase()
            })
        }

        if (value === "") {
            this.setState({
                textFiledError: "ShiftName can't be empty"
            })
            this.input.focus()
        }
        else if (alreadyPresent) {
            alert("already exist")
            this.input.focus()
            this.setState({
                textFiledError: ""
            })

        }
        else {
            var regex = /^[a-zA-Z ]{0,500}$/;
            let test = regex.test(value);
            if (!test) {
                this.setState({
                    textFiledError: "special case not allowed"
                })
            }
            else {

                let fDate = fromDate.getHours() + ":" + fromDate.getMinutes() + ":" + fromDate.getSeconds()
                let tDate = toDate.getHours() + ":" + toDate.getMinutes() + ":" + toDate.getSeconds()


                let data = {
                    "shift_name": value,
                    "start_time": fDate,
                    "end_time": tDate
                }
                this.setState((prevState) =>
                    ({
                        newShiftTypes: prevState.newShiftTypes.concat(data),
                        textFiledError: ""
                    })
                )
                this.input.value = "";
                this.input.focus()
            }
        }
    }

    delete = (index) => {
        let newShiftTypes = this.state.newShiftTypes
        newShiftTypes.splice(index, 1)
        this.setState({
            newShiftTypes
        })
    }

    saveData = async () => {

        let data = await post("hr/shift", this.state.newShiftTypes)

        if (data.Result) {
            Swal.fire({
                position: 'top-end',
                type: 'success',
                title: 'Your Data has been saved',
                showConfirmButton: false,
                timer: 1500
            })
            let result = [...this.state.shiftTypes, ...data.data]
            this.setState({
                shiftTypes: result,
                newShiftTypes: []
            })
        }
        else {
            Swal.fire({
                type: 'error',
                title: 'Oops...',
                text: 'Data not added',
            })

        }

    }

    deleteFeesType = async (data, index, name) => {

        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then(async (result) => {
            if (result.value) {
                let result = await deleteApi('hr/shift', data)
                if (result.Result) {
                    let shiftTypes = this.state.shiftTypes
                    shiftTypes.splice(index, 1)
                    this.setState({
                        shiftTypes
                    })
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: `${name} FeesType has been deleted`,
                        showConfirmButton: false,
                        timer: 1500
                    })
                }
                else {

                    Swal.fire({
                        type: 'error',
                        title: result.Reason,
                        text: 'Data not added',
                    })
                }

            }
        })

        // let result = await deleteApi('finance/addfeetypes', data)

        // if (result.Result) {
        //     let shiftTypes = this.state.shiftTypes
        //     shiftTypes.splice(index, 1)
        //     this.setState({
        //         shiftTypes
        //     })
        //     Swal.fire({
        //         position: 'top-end',
        //         type: 'success',
        //         title: `${name} FeesType has been deleted`,
        //         showConfirmButton: false,
        //         timer: 1500
        //     })
        // }

    }

    UpdateShiftTypes = (index, newValue, startTime, endTime) => {


        let temp = this.state.shiftTypes[index]
        temp.shift_name = newValue;
        temp.start_time = startTime
        temp.end_time = endTime


        let shiftTypes = this.state.shiftTypes
        shiftTypes.splice(index, 1, temp)
        this.setState({
            shiftTypes
        })
        Swal.fire({
            position: 'top-end',
            type: 'success',
            title: `FeesType has been updated`,
            showConfirmButton: false,
            timer: 1500
        })


    }
    render() {
        const { classes } = this.props;
        const { shiftTypes, newShiftTypes, textFiledError, fromDate, toDate } = this.state
        return (
            <>
                <Paper>
                    <Box p={8}>

                        <Grid container >
                            <Grid item xs={6}>

                                <Typography variant="h4" gutterBottom>
                                    List of Shifts
                                    </Typography>
                                <Box mt={4}>



                                    {shiftTypes.map((data, index) => {
                                        return <Box p={1} key={data.id}>
                                            <Grid container>
                                                <Grid item md={4}>
                                                    <Box
                                                        mt={3}
                                                    >
                                                        <Typography variant="h6" gutterBottom>
                                                            {index + 1} {data.shift_name}

                                                        </Typography>

                                                    </Box>

                                                </Grid>
                                                <Grid item md={3}>
                                                    <Box
                                                        mt={3}
                                                    >
                                                        <Typography variant="h6" gutterBottom>
                                                            {data.start_time}

                                                        </Typography>

                                                    </Box>

                                                </Grid>
                                                <Grid item md={3}>
                                                    <Box
                                                        mt={3}
                                                    >
                                                        <Typography variant="h6" gutterBottom>
                                                            {data.end_time}

                                                        </Typography>

                                                    </Box>

                                                </Grid>
                                                <Grid item md={1}>
                                                    <Fab color="secondary" aria-label="edit" className={classes.fab} onClick={() => this.deleteFeesType(data.id, index, data.name)}>
                                                        <DeleteIcon />
                                                    </Fab>
                                                </Grid>
                                                <Grid item md={1}>

                                                    <UpdateShiftTypes
                                                        id={data.id}
                                                        name={data.shift_name}
                                                        fDate={data.start_time}
                                                        tDate={data.end_time}
                                                        updateType={this.UpdateShiftTypes}
                                                        index={index}
                                                    />
                                                </Grid>

                                            </Grid>


                                        </Box>
                                    })}

                                </Box>
                            </Grid>
                            <Grid item xs={6}>

                                <Grid container spacing={4}>
                                    <Grid item md={3}>



                                        <TextField
                                            id="outlined-name"
                                            label="ShiftName"
                                            fullWidth
                                            inputRef={(val) => this.input = val}
                                            name="Add new FeeTypes"

                                            margin="normal"
                                            variant="outlined"
                                            autoComplete="off"
                                            helperText={textFiledError !== "" && textFiledError}
                                            error={textFiledError !== "" && true}
                                            inputProps={{ maxLength: 50 }}
                                        />


                                    </Grid>
                                    <Grid item md={8}>
                                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                            <Grid container justify="space-around">
                                                <KeyboardTimePicker
                                                    margin="normal"
                                                    id="time-picker"
                                                    label="From Time"
                                                    value={fromDate}
                                                    onChange={(e) => this.handleDateChange(e, "fromDate")}
                                                    KeyboardButtonProps={{
                                                        'aria-label': 'change time',
                                                    }}
                                                />
                                                <KeyboardTimePicker
                                                    margin="normal"
                                                    id="time-picker"
                                                    label="To Time"
                                                    value={toDate}
                                                    onChange={(e) => this.handleDateChange(e, "toDate")}
                                                    KeyboardButtonProps={{
                                                        'aria-label': 'change time',
                                                    }}
                                                />

                                            </Grid>
                                        </MuiPickersUtilsProvider>
                                    </Grid>
                                    <Grid item md={1}>

                                        <Fab color="primary" className={classes.addButton} aria-label="add"  onClick={this.addNew}>
                                            <AddIcon />
                                        </Fab>
                                    </Grid>

                                </Grid>


                                <div>
                                    <br /><br />
                                    {newShiftTypes.map((data, index) => {
                                        return <Box key={index} pt={2}>
                                            <Grid container>
                                                <Grid item md={4}>

                                                    <Typography variant="h6" gutterBottom>
                                                        {data.shift_name}

                                                    </Typography>

                                                </Grid>
                                                <Grid item md={3}>

                                                    <Typography variant="h6" gutterBottom>

                                                        FromDate :  {(data.start_time)}

                                                    </Typography>

                                                </Grid>
                                                <Grid item md={3}>

                                                    <Typography variant="h6" gutterBottom>
                                                        ToDate : {(data.end_time)}

                                                    </Typography>

                                                </Grid>
                                                <Grid item md={2}>

                                                    <Fab size="medium" color="secondary" aria-label="add"
                                                        onClick={() => this.delete(index)} className={classes.deleteIcon}>
                                                        <DeleteIcon />
                                                    </Fab>
                                                </Grid>
                                            </Grid>

                                        </Box>
                                    })}
                                </div>
                                <br /><br />
                                {newShiftTypes.length > 0 && <Button variant="contained"
                                    color="primary" onClick={this.saveData}>Save Data</Button>}
                            </Grid>
                        </Grid>
                    </Box>

                </Paper>
            </>
        )
    }
}







export default withStyles(useStyles)(AddShifts)