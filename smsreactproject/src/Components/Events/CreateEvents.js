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
    KeyboardDatePicker,

} from '@material-ui/pickers';
import { Icon } from '@material-ui/core';

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


class CreateEvents extends Component {
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


    render() {
        const { year, yearList, date, standardList, standard, name } = this.state
        const { classes } = this.props;
        return (
            <>
                <Paper>
                    <Box style={{ textAlign: "center" }}>
                        <Typography variant="h3" gutterBottom>
                            CreateEvents

                     </Typography>
                    </Box>
                    <Box p={8}>

                        <Grid container >
                            <Grid item xs={12} className={classes.gridMargin}>
                                <FormLabel>
                                    Select Leave Type
                                </FormLabel>
                                <SelectBox
                                    data={yearList}
                                    name="year"
                                    value={year}
                                    onChange={this.onChange}
                                />
                            </Grid>

                            <Grid item xs={12} className={classes.gridMargin}>

                                <MuiPickersUtilsProvider utils={DateFnsUtils} >
                                    <KeyboardDatePicker
                                        margin="normal"
                                        id="date-picker-dialog"
                                        label="From Date"
                                        format="MM/dd/yyyy"
                                        value={date}
                                        onChange={(e) => this.handleDateChange(e, "date")}
                                        KeyboardButtonProps={{
                                            'aria-label': 'change date',
                                        }}
                                    // maxDate={todate}

                                    />
                                </MuiPickersUtilsProvider>

                            </Grid>

                            <Grid item xs={12} className={classes.gridMargin}>
                                <FormLabel>
                                    From Section
                                </FormLabel>
                                <SelectBox
                                    data={standardList}
                                    name="fromSession"
                                    value={standard}
                                    onChange={this.onChange}
                                />
                            </Grid>
                            <Grid item xs={12} className={classes.gridMargin}>
                                <FormLabel>
                                    Enter Event Name
                                </FormLabel>
                                <TextField
                                    id="outlined-helperText"
                                    label="cc"
                                    value={name}
                                    // helperText="Some important text"
                                    variant="outlined"
                                    onChange={(e) => this.setState({ name: e.target.value })}
                                // helperText={ccError && ccError}
                                // error={ccError !== "" ? true : false}
                                />
                            </Grid>

                        </Grid>




                    </Box>


                    <Button onClick={this.submitLeave}>
                        apply Leave
                            </Button>

                        <AdjustOutlinedIcon  fontSize="large" color="primary" />
                    
                </Paper>
            </>
        )
    }
}







export default withStyles(useStyles)(CreateEvents)