import React, { Component } from 'react';
import { Button, TextField, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Box, FormHelperText, Tooltip, FormControl, InputLabel, MenuItem, Select } from '@material-ui/core';
import moment from 'moment';
import { FormattedMessage } from 'react-intl';
import commonMessages from 'Constants/messages'

export default class AssignTiming extends Component {
    constructor(props) {
        super(props)

        this.state = {
            open: false,
            fieldError: {},
            strength: '',
            sectionsList: [],
            sectionValue: '',
            submitDisable: false,
            sectionListFound: false,
            period: {}
        }
    }


    handleClickOpen = () => {
        let { period } = this.state;
        let validate = this.props.validateCheckBox()
        let validate_value = false
        if (validate) {
            validate_value = true
            period['start_time'] = validate.start_time
            period['end_time'] = validate.end_time
        }
        this.setState({
            open: validate_value,
            period,
            fieldError: {},
            errorContent:''
        })
    };

    handleClose = () => {
        this.setState({
            open: false,
            errors: {},
            period: {},
        })
    };

    update = () => {
        let { period, fieldError,errorContent } = this.state;
        errorContent=<FormattedMessage {...commonMessages.clearAllErrors} />

        let validate = true
        if (!period.start_time) {
            validate = false
            fieldError['start_time'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
        }
        if (!period.end_time) {
            validate = false
            fieldError['end_time'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
        }
        if(validate){
            let DutyDayStartTime = moment(period.start_time, 'HH:mm')
            let DutyDayEndTime = moment(period.end_time, 'HH:mm') 
            let diffTime = (DutyDayEndTime.diff(DutyDayStartTime, 'minutes'))
            if (diffTime < 0) {
                errorContent = 'End time should be greater than start time'
                validate = false
            }
            else if (diffTime < 5) {
                errorContent = 'At least maintain min 5 Minutes'
                validate = false
            } 
            else if (diffTime > 240) {
                errorContent = 'Should not exceed 4 hours'
                validate = false
            }
        } 
        if (validate) {
            let returnValue = this.props.validateAssigningTime(period);
            if (returnValue.validate) {
                this.handleClose()
            }
            else {
                this.setState({
                    errorData: returnValue.errorData
                })
            }
        }
        else {
            this.setState({
                errorContent
            })
        }
    }

    handleChangePeriod = (e) => {
        let { name, value } = e.target;
        let { period } = this.state;
        if (name === 'start_time' || name === 'end_time') {
            value = `${value}:00`
        }
        period[name] = value;
        this.setState({
            period,
            fieldError: {},
            errorContent: ''
        })
    }

    render() {
        let { open, submitDisable, fieldError, period, errorContent } = this.state
        return (
            <div>
                <Button variant="contained"
                    className='previous-but'
                    onClick={this.handleClickOpen}
                >
                    Assign Timing
                </Button>

                <Dialog open={open}
                    className='action-basic-detail-width'
                    onClose={this.handleClose} aria-labelledby="form-dialog-title">
                    <DialogTitle id="form-dialog-title"></DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Enter Period TIming
                        </DialogContentText>
                        <Box className='m-t-20px'>
                            <TextField
                                id="time"
                                label="Start Time"
                                type="time"
                                variant="outlined"
                                name='start_time'
                                fullWidth
                                defaultValue={period.start_time}
                                onChange={(e) => this.handleChangePeriod(e)}
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                inputProps={{
                                    step: 300, // 5 min
                                }}
                                helperText={(!fieldError[`start_time`]) ? '' : fieldError[`start_time`]}
                                error={fieldError[`start_time`]}

                            />
                        </Box>
                        <Box className='m-t-20px'>
                            <TextField
                                id="time"
                                label="End Time"
                                type="time"
                                variant="outlined"
                                name='end_time'
                                fullWidth
                                defaultValue={period.end_time}
                                onChange={(e) => this.handleChangePeriod(e)}
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                inputProps={{
                                    step: 300, // 5 min
                                }}
                                helperText={(!fieldError[`end_time`]) ? '' : fieldError[`end_time`]}
                                error={fieldError[`end_time`]}
                            />
                        </Box>
                        <Box className='action-error-content flex-justify-center margin-top-10'>
                            {errorContent}
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.handleClose} color="secondary">
                            <FormattedMessage {...commonMessages.close} />
                        </Button>
                        <Button
                            onClick={e => this.update(e)}
                            disabled={submitDisable}
                            color="primary">
                            <FormattedMessage {...commonMessages.submit} />
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
        );
    }
}