import React, { Component } from 'react';
import DateFnsUtils from '@date-io/date-fns';
import {
    MuiPickersUtilsProvider,
    KeyboardTimePicker,
    TimePicker,
    KeyboardDatePicker,
    DateTimePicker
} from '@material-ui/pickers';
import { Paper, Box, Typography, Grid, 
    Container, TextField, MenuItem,
    Select, InputLabel, FormControl,
    Dialog, DialogTitle, Button,
    DialogActions, DialogContent, DialogContentText,
    FormHelperText 
} from '@material-ui/core';
import moment from 'moment';
import { withStyles } from '@material-ui/core/styles';
import { withRouter } from 'react-router-dom';


class TimeDialog extends Component {
    
    constructor() {
        super();
        this.state = {
            tempPeriod: { "name": '', "start_time": moment(), "end_time": moment() },
            errors: {},
            errorContent: ''
        };
    }

    handlePeriodCreation = (e, type) => {
        let tempPeriod = {...this.state.tempPeriod};
        let periodField = (e.currentTarget) ? e.currentTarget.name : type;
        let periodFieldValue = (e.currentTarget) ? e.currentTarget.value: e;
        tempPeriod[periodField] = periodFieldValue;
        this.setState({ tempPeriod, errors:{} });
    }

    resetState = () => {
        const initialTempPeriodState = { "name": '', "start_time": moment(), "end_time": moment() };
        this.setState({ tempPeriod: initialTempPeriodState, errors: {} });
    }

    resetDialog = () => {
        const initialTempPeriodState = { "name": '', "start_time": moment(), "end_time": moment() };
        this.setState({ tempPeriod: initialTempPeriodState, errors: {}, errorContent: "" });
        this.props.closePeriodDialog();
    }


    createPeriods = async (tempPeriod) => {
        let errorResult = this.checkErrors(tempPeriod);
        if(Object.keys(errorResult).length === 0) {
            let errorContent = await this.props.submitPeriodsForCreation(tempPeriod);
            this.setState({errorContent: errorContent});
            // this.resetState();
        } else {
            this.setState({ errors: errorResult });
        }
    }

    checkErrors = (tempPeriod) => {
        let errors = {...this.state.errors};

        if(tempPeriod.name == '') {
            errors['name'] = "Please enter a Valid Name"
        } else {
            delete errors['name'];
        }

        if(moment(tempPeriod.start_time).diff(moment(tempPeriod.end_time), 'hours') < -3) {
            errors['end_time'] = "Start time has exceeded three hours time difference";
        } else {
            delete errors['end_time'];
        }
        
        if( moment(tempPeriod.start_time).diff(moment(tempPeriod.end_time), 'minute') > -5) {
            errors['end_time'] = "Start Time and End Time should be atleast 5mins difference"
        } else {
            delete errors['end_time'];
        }
        if(moment(tempPeriod.start_time).diff(moment(tempPeriod.end_time), 'minute') >= 0) {
            errors['end_time'] = "End time cannot be less or same as start time"
        } else {
            delete errors['end_time'];
        }

        return errors;
    }

    render() {
        const { periodRangeDialogOpen, classes } = this.props;
        const { tempPeriod, errors, errorContent } = this.state;

        return (
            <Dialog
                className="action-basic-detail-width"
                buttonid="periodTimingsDialog"
                open={periodRangeDialogOpen}
                onClose={this.resetDialog}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">{"Create a Period"}</DialogTitle>
                <DialogContent>
                    <Grid container direction="column" spacing={2}>
                        <Grid item>
                            <TextField
                                fullWidth
                                id="periodName"
                                label="Period Name"
                                name="name"
                                margin="normal"
                                variant="outlined"
                                onChange={(e) => { this.handlePeriodCreation(e) }}
                                helperText={errors['name'] ? errors['name']: 'eg: Period 1'}
                                error={errors['name'] ? true : false}
                                value={tempPeriod.name}
                            />
                        </Grid>
                        <Grid item>
                            <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                <KeyboardTimePicker
                                    fullWidth
                                    autoOk
                                    variant='inline'
                                    inputVariant="outlined"
                                    label="Start Time"
                                    name="start_time"
                                    margin="normal"
                                    id="mui-pickers-time"
                                    value={tempPeriod.start_time}
                                    onChange={(e) => { this.handlePeriodCreation(e, "start_time") }}
                                    InputLabelProps={{ shrink: tempPeriod.start_time ? true : false }}
                                    KeyboardButtonProps={{
                                        'aria-label': 'change time',
                                    }}
                                    helperText={errors['start_time'] ? errors['start_time']: null}
                                    error={errors['start_time'] ? true : false}
                                />
                            </MuiPickersUtilsProvider>
                        </Grid>
                        <Grid item>
                            <MuiPickersUtilsProvider utils={DateFnsUtils}>
                            <KeyboardTimePicker
                                    autoOk
                                    fullWidth
                                    variant='inline'
                                    inputVariant="outlined"
                                    label="End Time"
                                    name="end_time"
                                    margin="normal"
                                    id="End Time"
                                    value={tempPeriod.end_time}
                                    onChange={(e) => { this.handlePeriodCreation(e, "end_time") }}
                                    KeyboardButtonProps={{
                                        'aria-label': 'change time',
                                    }}
                                    helperText={errors['end_time'] ? errors['end_time']: null}
                                    error={errors['end_time'] ? true : false}
                                />
                            </MuiPickersUtilsProvider>
                        </Grid>
                    </Grid>
                    <Box className='error-content flex-justify-center margin-top-10'>
                        {errorContent}
                    </Box>
                </DialogContent>
                <DialogActions className="pl-0">
                    <Button mappedid="periodTimingsDialog" onClick={(e) => { this.createPeriods(tempPeriod) }} color="primary">Add</Button>
                </DialogActions>
            </Dialog>
        )
    }

}

export default withRouter(TimeDialog);