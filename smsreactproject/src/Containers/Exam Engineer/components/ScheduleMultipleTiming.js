import React, { Component } from 'react';
import {
    Paper, Box, Grid, Button, DialogContent,
    DialogContentText, Tooltip, Dialog, TextField, DialogActions, CircularProgress
} from '@material-ui/core';
import { withRouter } from 'react-router-dom';
import { floatNumberWithTwoDecimalRegex } from 'Constants/regularExpression';


// const alias_names = JSON.parse(localStorage.getItem('alias_name'))

const max_number = 200

class ScheduleMultipleTiming extends Component {
    constructor() {
        super()
        this.state = {
            openPopup: false,
            timingDetails: {},
            field_error: {},
            updateDisable: true
        }
    }

    componentDidMount = () => {
        this.setState({
            openPopup: true
        })
    }

    handleClosePopup = () => {
        this.setState({
            openPopup: false,
            timingDetails: {},
            field_error: {},
        }, () => {
            this.props.handleCloseDialog()
        })
    }

    handleSearchChange = (e) => {
        let { field_error } = this.state;
        delete field_error['selectedCumulative'];
        this.setState({
            selectedCumulative: e,
            field_error
        })
    }

    handleApply = () => {
        let { timingDetails, field_error } = this.state;
        let return_data = true
        if (!timingDetails.start_time) {
            field_error['start_time'] = 'Select start time'
            return_data = false
        }
        if (!timingDetails.end_time) {
            field_error['end_time'] = 'Select end time'
            return_data = false
        }
        this.setState({
            field_error
        })
        if (return_data) {
            this.props.updateTimingDetails(timingDetails)
        }
    }

    handleChange = (e, max_number) => {
        let { timingDetails, field_error } = this.state
        let { name, value } = e.target;
        if (name === 'start_time' || name === 'end_time') {
            if (value) {
                value = value + ':' + '00'
            }
        }
        if (name === 'max_marks') {
            timingDetails['min_marks'] = ''
        }
        delete field_error[name]
        timingDetails[name] = value
        if ((!floatNumberWithTwoDecimalRegex.value.test(value) || parseInt(value) < 0 || parseInt(value) > parseInt(max_number)) && (name === 'min_marks' || name === 'max_marks')) {
            if (!floatNumberWithTwoDecimalRegex.value.test(value)) {
                field_error[name] = 'Invalid Marks'
            }
            else {
                field_error[name] = `Max ${max_number} Mark`
            }
        }
        if (name === 'max_marks' && parseInt(value) < parseInt('1')) {
            field_error[name] = `Min 1 Mark`
        }
        this.setState({
            timingDetails,
            field_error,
            updateDisable: Object.keys(field_error).length > 0 ? true : false
        })
    }


    render() {
        const { openPopup, timingDetails, updateDisable, field_error } = this.state;
        return (
            <Dialog open={openPopup}
                className='action-basic-detail-width'
                // onClose={this.handleClosePopup}
                 aria-labelledby='form-dialog-title'>
                <DialogContent>
                    <DialogContentText>
                        {`Enter The Timing Details`}
                    </DialogContentText>
                    <Grid container>
                        <Grid item md={12} xs={12}>
                            <TextField
                                id="time"
                                label="Start Time"
                                type="time"
                                name='start_time'
                                className='width-90'
                                defaultValue={timingDetails.start_time}
                                onChange={(e) => this.handleChange(e)}
                                onBlur={this.updateParentValue}
                                onClose={this.updateParentValue}
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                inputProps={{
                                    step: 300, // 5 min
                                }}
                                helperText={field_error['start_time'] && field_error['start_time']}
                                error={field_error['start_time'] && field_error['start_time']}
                            />
                        </Grid>
                        <Grid item md={12} xs={12}>
                            <TextField
                                id="time"
                                label="End Time"
                                type="time"
                                name='end_time'
                                className='width-90'
                                defaultValue={timingDetails.end_time}
                                onChange={(e) => this.handleChange(e)}
                                onBlur={this.updateParentValue}
                                onClose={this.updateParentValue}
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                inputProps={{
                                    step: 300, // 5 min
                                }}
                                helperText={field_error['end_time'] && field_error['end_time']}
                                error={field_error['end_time'] && field_error['end_time']}
                            />
                        </Grid>
                    </Grid>
                    <div className='text-red mt-30'>
                        Note : Exisiting selected data will be erased and replaced with new value
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={this.handleClosePopup} color='secondary'>
                        Close
                    </Button>
                    <Button disabled={updateDisable} onClick={this.handleApply} color='primary'>
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
        )
    }
}

export default withRouter(ScheduleMultipleTiming)
