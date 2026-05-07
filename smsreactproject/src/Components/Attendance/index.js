import React, { Component } from 'react'
import Grid from '@material-ui/core/Grid';
import get from '../actions/API_request/Get'
import { Paper, Box, Button, TextField, FormLabel } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
// import UpdateFeeType from './Components/UpdateFeeType'
// import deleteApi from '../actions/API_request/Delete'
// import Swal from 'sweetalert2'
import AdjustOutlinedIcon from '@material-ui/icons/AdjustOutlined';
import { Typography } from '@material-ui/core';
import DateFnsUtils from '@date-io/date-fns';
import {
    MuiPickersUtilsProvider,
    KeyboardDateTimePicker,

} from '@material-ui/pickers';
import { Icon } from '@material-ui/core';
import SingleSelectAutoComplete from '../actions/Inputfields/SingleSelectAutocomplete'
import SelectBox from '../actions/Inputfields/SelectBox';


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
    },
    gridMargin: {
        margin: "20px"
    }
};


class Attendance extends Component {
    state = {
        year: 0,
        yearList: [],
        date: new Date(),
        standardList: [],
        standard: 0,
        name: ""
    }


    async componentDidMount() {
        let yearList = await get("institutes/getacademicyear");

        this.setState({
            yearList: yearList.data
        })


    }
    handleDateChange = (date, name) => {
        const { fromdate, toDate } = this.state
        this.setState({
            [name]: date
        })
    };


    onChange = async (e) => {
        let { value, name } = e.target;

        if (value != 0) {
            this.setState({
                [name]: value
            })
        }
    }


    onChangeAutoComplete = (value) => {
    }


    render() {
        const { year, yearList, date, standardList, standard, name } = this.state
        const { classes } = this.props;
        return (
            <>
                <Paper>
                    <Box style={{ textAlign: "center" }}>
                        <Typography variant="h3" gutterBottom>
                            Attendance

                     </Typography>
                    </Box>
                    <Box p={8}>

                        <Grid container>
                            <Grid item md={2}>
                                <MuiPickersUtilsProvider utils={DateFnsUtils} >
                                    <KeyboardDateTimePicker
autoComplete='off'
                                        margin="normal"
                                        id="date-picker-dialog"
                                        label="From Date"
                                        format="MM/dd/yyyy HH:mm"
                                        variant="dialog"
                                        value={date}
                                        onChange={(e) => this.handleDateChange(e, "date")}

                                    // maxDate={todate}

                                    />
                                </MuiPickersUtilsProvider>
                            </Grid>
                            <Grid item md={2}>

                                <SingleSelectAutoComplete
                                    label="Select Teacher"
                                    changeFunction={this.onChangeAutoComplete}
                                />
                            </Grid>
                            <Grid item md={2}>

                                <SingleSelectAutoComplete
                                    label="Select Class"
                                    changeFunction={this.onChangeAutoComplete}
                                />
                            </Grid>
                            <Grid item md={2}>

                                <SingleSelectAutoComplete
                                    label="Select Section"
                                    changeFunction={this.onChangeAutoComplete}
                                />
                            </Grid>
                            <Grid item md={2}>

                                <SingleSelectAutoComplete
                                    label="Select Student"
                                    changeFunction={this.onChangeAutoComplete}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                </Paper>
            </>
        )
    }
}







export default withStyles(useStyles)(Attendance)