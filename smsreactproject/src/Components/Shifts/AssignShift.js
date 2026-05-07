import React, { Component } from 'react'
import Grid from '@material-ui/core/Grid';
import get from '../actions/API_request/Get'
import { FormLabel, Paper, Box } from '@material-ui/core';
import post from '../actions/API_request/Post';
import deleteApi from '../actions/API_request/Delete';
import Switch from '@material-ui/core/Switch';
import Fab from '@material-ui/core/Fab';
import AddIcon from '@material-ui/icons/Add';
import SelectBox from '../actions/Inputfields/SelectBox';
import Typography from '@material-ui/core/Typography';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import Input from '@material-ui/core/Input';
import { Button, TextField } from '@material-ui/core'
import DeleteIcon from '@material-ui/icons/Delete';

import Checkbox from '@material-ui/core/Checkbox';
import MultiSelectEmployee from './Components/MultiSelectEmployee'
import SelectedEmployeeTable from './Components/SelectedEmployeeTable'
import DateFnsUtils from '@date-io/date-fns';
import {
    MuiPickersUtilsProvider,
    KeyboardTimePicker,
    KeyboardDatePicker,
} from '@material-ui/pickers';
export default class AssignShift extends Component {
    state = {
        year: 0,
        yearList: [],
        selectedEmployee: [],
        shiftTypeList: [],
        toggle: true,
        assignShiftTimings: [
            {
                shift: 0,
                fromdate: new Date(),
                todate: new Date()
            }
        ],
        employeeDetails: [
            {
                id: 6,
                name: "nikhil",
                image: ""
            },
            {
                id: 1,
                name: "naga",
                image: ""
            }
        ],
        employeeSelectedFromMultiSelecte: [],
        employeeSeletedDetails: []

    }

    onChangeType = (e, index) => {
        let { value } = e.target
        if (value != 0) {
            let temp = [...this.state.assignShiftTimings]
            temp[index].shift = value;
            this.setState({
                assignShiftTimings: temp
            })
        }
    }
    async componentDidMount() {
        let yearList = await get("institutes/academicyear");
        let staffList = await get("staffs/getstafffullname");
        let shiftType = await get('hr/shift', "?is_active=1");
        shiftType = shiftType.data;
        for (let i in shiftType) {
            shiftType[i].name = shiftType[i].shift_name
        }
        this.setState({
            shiftTypeList: shiftType,
            yearList: yearList.data,
            employeeDetails: staffList.data
        })

    }
    onChange = (e) => {
        let { name, value } = e.target;
        if (value !== 0) {
            this.setState({
                [name]: value
            })
        }
    }

    addEmployee = () => {

    }

    handleDateChange = (date, name, index) => {
        let temp = [...this.state.assignShiftTimings]
        temp[index][name] = date;
        this.setState({
            assignShiftTimings: temp
        })
    };

    deleteAssignedTimings = (index) => {
        var { assignShiftTimings } = this.state;
        assignShiftTimings.splice(index, 1)
        this.setState({
            assignShiftTimings
        })
    }

    addAssignTimings = () => {

        let newDate = {
            shift: 0,
            fromdate: new Date(),
            todate: new Date()
        }
        this.setState({
            assignShiftTimings: this.state.assignShiftTimings.concat(newDate)
        })

    }
    submitData = async () => {
        let assignShiftTiming = [...this.state.assignShiftTimings];
        const { employeeSelectedFromMultiSelecte } = this.state
        let test = assignShiftTiming.some((data) => data.shift === 0)
        if (test) {
            alert("Please select Shift type")
        } else {
            if (employeeSelectedFromMultiSelecte.length === 1) {

                let payload = assignShiftTiming.map((data) => {
                    if (typeof data.fromdate !== "string") {

                        let month = data.fromdate.getMonth() + 1;
                        let fDate = data.fromdate.getFullYear() + "-" + month + "-" + data.fromdate.getDate()
                        data.fromdate = fDate
                    }
                    if (typeof data.todate !== "string") {

                        let month = data.todate.getMonth() + 1;
                        let tDate = data.todate.getFullYear() + "-" + month + "-" + data.todate.getDate()
                        data.todate = tDate
                    }
                    data.staff = employeeSelectedFromMultiSelecte[0].id
                    return data


                })
                let result = await post("hr/assignshift", payload)
            }

            else {
                let payload = [];
                employeeSelectedFromMultiSelecte.forEach((x) => {
                    assignShiftTiming.forEach((data) => {
                        let newData = {
                            fromdate: "",
                            todate: "",
                            staff: 0,
                            shift: 0
                        }
                        if (typeof data.fromdate !== "string") {

                            let month = data.fromdate.getMonth() + 1;
                            let fDate = data.fromdate.getFullYear() + "-" + month + "-" + data.fromdate.getDate()
                            newData.fromdate = fDate
                        } else {
                            newData.fromdate = data.fromdate

                        }
                        if (typeof data.todate !== "string") {

                            let month = data.todate.getMonth() + 1;
                            let tDate = data.todate.getFullYear() + "-" + month + "-" + data.todate.getDate()
                            newData.todate = tDate
                        }else
                        {
                            newData.todate = data.todate
                        }
                        newData.staff = x.id
                        newData.shift = data.shift
                        
                        payload.push(newData)


                    })
                })
                let result = await post("hr/assignshift", payload)
            }
        }


    }

    getSelectedEmployee = async (data) => {
        if (data.length === 0) {
            alert("Please select Employee")
        }
        else if (data.length === 1) {

            let result = await get('hr/assignshift', `?staff=${data[0].id}`)
            this.setState({
                employeeSeletedDetails: result.data,
                employeeSelectedFromMultiSelecte: data
            })
        }
        else {
            this.setState({
                employeeSelectedFromMultiSelecte: data
            })
        }

    }

    deleteAssignedShift = async (id, index) => {
        let { employeeSeletedDetails } = this.state;
        let result = await deleteApi("hr/assignshift", id);
        if (result.Result) {
            employeeSeletedDetails.splice(index, 1)
            this.setState({
                employeeSeletedDetails
            })
        }

    }


    render() {
        const { year, yearList, shiftTypeList, assignShiftTimings, employeeDetails, employeeSeletedDetails, employeeSelectedFromMultiSelecte } = this.state
        return (

            <Paper>

                <Box style={{ textAlign: "center" }}>
                    <Typography variant="h3" gutterBottom>
                        Assign Shifts
                     </Typography>
                </Box>
                <Box p={6}>
                    <Grid container justify="center" >

                        <Grid item md={2}>
                            <Typography variant="h5">
                                Select Year
                            </Typography>
                            <SelectBox
                                data={yearList}
                                name="year"
                                value={year}
                                onChange={this.onChange}
                            />
                        </Grid>
                        <Grid item md={2}>
                            <Typography variant="h5">
                                Select Department

                            </Typography>
                            <SelectBox
                                data={yearList}
                                name="year"
                                value={year}
                                onChange={this.onChange}
                            />
                        </Grid>

                        <Grid item md={5} >

                            <Typography variant="h5">
                                Select Employee
                            </Typography>

                            <MultiSelectEmployee
                                employeeDetails={employeeDetails}
                                submit={this.getSelectedEmployee}
                            />


                        </Grid>


                    </Grid>

                    {
                        employeeSelectedFromMultiSelecte.length > 0 &&
                        <Box p={6}>
                            <Grid container spacing={2}>
                                <Grid item md={6}>
                                    {
                                        employeeSelectedFromMultiSelecte.length === 1 ?
                                            <Box>
                                                {
                                                    employeeSeletedDetails.length === 0 &&
                                                    <Box>
                                                        No data
                                                    </Box>
                                                }


                                                {employeeSeletedDetails.map((data, index) => {
                                                    return <div key={index}>
                                                        <Box boxShadow={3} p={2} mb={2} >

                                                            <Grid container>
                                                                <Grid item md={8}>

                                                                    <Box pb={2}>

                                                                        <Typography variant="h5">
                                                                            From Date:{data.fromdate}
                                                                        </Typography>
                                                                    </Box>
                                                                    <Box pb={2}>

                                                                        <Typography variant="h5">
                                                                            To Date:{data.todate}
                                                                        </Typography>
                                                                    </Box>
                                                                    {index === 0 && <Typography variant="h5">
                                                                        Shift details
                                                    </Typography>}
                                                                    <Box pt={3}>

                                                                        <Typography variant="body1">
                                                                            Shift Name:{data.shift.shift_name}
                                                                        </Typography>
                                                                    </Box>
                                                                    <Box pt={3}>

                                                                        <Typography variant="body1">
                                                                            Shift Start Time:{data.shift.start_time}
                                                                        </Typography>
                                                                    </Box>
                                                                    <Box pt={3}>

                                                                        <Typography variant="body1">
                                                                            Shift End TIme:{data.shift.end_time}
                                                                        </Typography>
                                                                    </Box>
                                                                </Grid>
                                                                <Grid item md={4}>
                                                                    <Fab color="secondary" aria-label="add" onClick={() => this.deleteAssignedShift(data.id, index)}>
                                                                        <DeleteIcon />
                                                                    </Fab>
                                                                </Grid>

                                                            </Grid>
                                                        </Box>
                                                    </div>
                                                })}
                                            </Box>
                                            :
                                            <SelectedEmployeeTable
                                                data={employeeSelectedFromMultiSelecte}
                                            />
                                    }
                                </Grid>

                                <Grid item md={6}>

                                    {assignShiftTimings.map(({ shift, fromdate, todate }, index) =>
                                        <MuiPickersUtilsProvider utils={DateFnsUtils} key={index}>

                                            <Grid container justify="space-around">
                                                <FormLabel>
                                                    ShiftType
                                                </FormLabel>
                                                <SelectBox
                                                    data={shiftTypeList}
                                                    name="shift"
                                                    value={shift}
                                                    onChange={(e) => this.onChangeType(e, index)}
                                                />
                                                <KeyboardDatePicker
                                                    margin="normal"
                                                    id="date-picker-dialog"
                                                    label="From Date"
                                                    format="MM/dd/yyyy"
                                                    value={fromdate}
                                                    onChange={(e) => this.handleDateChange(e, "fromdate", index)}
                                                    KeyboardButtonProps={{
                                                        'aria-label': 'change date',
                                                    }}
                                                // maxDate={todate}

                                                />

                                                <KeyboardDatePicker
                                                    margin="normal"
                                                    id="date-picker-dialog"
                                                    label="To Date"
                                                    format="MM/dd/yyyy"
                                                    onChange={(e) => this.handleDateChange(e, "todate", index)}
                                                    value={todate}
                                                    minDate={fromdate}
                                                    KeyboardButtonProps={{
                                                        'aria-label': 'change date',
                                                    }}
                                                />
                                                {
                                                    assignShiftTimings.length - 1 === index &&

                                                    <Box pt={1}>

                                                        <Fab color="primary" aria-label="add" onClick={this.addAssignTimings} >
                                                            <AddIcon />
                                                        </Fab>
                                                    </Box>
                                                }
                                                {
                                                    assignShiftTimings.length > 1 &&
                                                    <Box pt={1}>

                                                        <Fab color="secondary" aria-label="add" onClick={() => this.deleteAssignedTimings(index)}>
                                                            <DeleteIcon />
                                                        </Fab>
                                                    </Box>
                                                }

                                            </Grid>
                                        </MuiPickersUtilsProvider>
                                    )}
                                    <Box pt={2} textAlign="center">
                                        <Button size="large" color="primary" variant="outlined" onClick={this.submitData}>submit</Button>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Box>}
                </Box>
            </Paper>
        )
    }
}
