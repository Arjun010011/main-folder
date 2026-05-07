import React, { Component } from 'react'
import { Paper, Box, Button, Grid, TableContainer, Table, TableHead, FormControlLabel, Switch, TableCell, TableRow, TableBody, Tooltip, TextField } from '@material-ui/core';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import {
    MuiPickersUtilsProvider,
    KeyboardDatePicker,
} from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import { validateDate } from 'Includes/functions';
import { numberRegex } from 'Constants/regularExpression';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';

class ScheduleInputComponent extends Component {
    constructor(props) {
        super(props)
        this.state = {
            standard_list: null,
            field_error: {},
            helper_text: {}
        }
    }


    componentDidMount = () => {
        this.setDefaultValues()
    }

    setDefaultValues = () => {
        let { standardList, fieldError, helperText } = this.props
        this.setState({
            standard_list: standardList,
            field_error: fieldError,
            helper_text: helperText
        })
    }

    handleDateChange = (e, stIndex, subIndex, schIndex, name) => {
        let { standard_list, field_error } = this.state
        let { start_date, end_date } = this.props
        let value = e
        let error
        if (value !== null)
            error = validateDate(value, start_date, end_date)
        if (error !== '') {
            field_error[`${name}${stIndex}${subIndex}${schIndex}`] = error
        }
        else {
            field_error[`${name}${stIndex}${subIndex}${schIndex}`] = ''
        }
        standard_list[stIndex]['subject_list'][subIndex]['sub_schedule_list'][schIndex][name] = value
        this.setState({
            standard_list,
            field_error,
        })
    }

    handleChange = (e, stIndex, subIndex, schIndex, max_number) => {
        let { standard_list, field_error, helper_text } = this.state
        let { name, value } = e.target;
        if (name === 'start_time' || name === 'end_time') {
            if (value) {
                value = value + ':' + '00'
            }
        }
        if (name === 'max_marks') {
            standard_list[stIndex]['subject_list'][subIndex]['min_marks'] = ''
        }
        if ((!numberRegex.value.test(value) || parseInt(value) < 0 || parseInt(value) > parseInt(max_number)) && (name === 'min_marks' || name === 'max_marks')) {
            if (!numberRegex.value.test(value)) {
                field_error[`${name}${stIndex}${subIndex}${schIndex}`] = 'Invalid Marks'
            }
            this.setState({
                standard_list,
                field_error,
            })
            return
        }
        field_error[`${name}${stIndex}${subIndex}${schIndex}`] = ''
        helper_text[`${name}${stIndex}${subIndex}${schIndex}`] = ''
        standard_list[stIndex]['subject_list'][subIndex]['sub_schedule_list'][schIndex][name] = value
        this.setState({
            standard_list,
            field_error,
            helper_text
        })
    }

    updateParentValue = () => {
        const { standard_list, field_error, helper_text } = this.state;
        const { stIndex, subIndex, schIndex } = this.props;
        this.props.updateSubScheduleParent(standard_list, stIndex, subIndex, schIndex, field_error, helper_text)
    }

    render() {
        const { start_date, end_date, stIndex, subIndex, schIndex, fieldError, helperText, } = this.props
        const { standard_list } = this.state;
        return (
            <>
                <TableCell>                </TableCell>
                <TableCell>                </TableCell>
                <TableCell>                </TableCell>
                <TableCell>                </TableCell>
                <TableCell className='' component='th' scope='row'>
                    {standard_list &&
                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                            <KeyboardDatePicker
                                id="date-picker-inline"
                                autoOk
                                variant='inline'
                                label=''
                                className='schedule-exam-date'
                                value={standard_list[stIndex]['subject_list'][subIndex]['sub_schedule_list'][schIndex]['fordate']}
                                autoComplete='off'
                                name='fordate'
                                minDate={start_date}
                                maxDate={end_date}
                                format='dd-MM-yyyy'
                                onChange={(e) => this.handleDateChange(e, stIndex, subIndex, schIndex, 'fordate')}
                                onBlur={this.updateParentValue}
                                onClose={this.updateParentValue}
                                KeyboardButtonProps={{
                                    'aria-label': 'change date',
                                }}
                                helperText={(!fieldError[`fordate${stIndex}${subIndex}${schIndex}`]) ? '' : fieldError[`fordate${stIndex}${subIndex}${schIndex}`]}
                                error={fieldError[`fordate${stIndex}${subIndex}${schIndex}`] && (fieldError[`fordate${stIndex}${subIndex}${schIndex}`] ? true : false)}
                            />
                        </MuiPickersUtilsProvider>
                    }
                </TableCell>
                <TableCell className='' component='th' scope='row'>
                    {standard_list &&
                        <TextField
                            id="time"
                            label=""
                            type="time"
                            name='start_time'
                            defaultValue={standard_list[stIndex]['subject_list'][subIndex]['sub_schedule_list'][schIndex]['start_time']}
                            onChange={(e) => this.handleChange(e, stIndex, subIndex, schIndex)}
                            onBlur={this.updateParentValue}
                            onClose={this.updateParentValue}
                            InputLabelProps={{
                                shrink: true,
                            }}
                            inputProps={{
                                step: 300, // 5 min
                            }}
                            helperText={(helperText[`start_time${stIndex}${subIndex}${schIndex}`]) ? helperText[`start_time${stIndex}${subIndex}${schIndex}`] : ''}
                            error={fieldError[`start_time${stIndex}${subIndex}${schIndex}`] && (fieldError[`start_time${stIndex}${subIndex}${schIndex}`] ? true : false)}
                        />
                    }
                </TableCell>
                <TableCell className='' component='th' scope='row'>
                    {standard_list &&
                        <TextField
                            id="time"
                            label=""
                            type="time"
                            name='end_time'
                            defaultValue={standard_list[stIndex]['subject_list'][subIndex]['sub_schedule_list'][schIndex]['end_time']}
                            onChange={(e) => this.handleChange(e, stIndex, subIndex, schIndex)}
                            onBlur={this.updateParentValue}
                            onClose={this.updateParentValue}
                            InputLabelProps={{
                                shrink: true,
                            }}
                            inputProps={{
                                step: 300, // 5 min
                            }}
                            helperText={(helperText[`end_time${stIndex}${subIndex}${schIndex}`]) ? helperText[`end_time${stIndex}${subIndex}${schIndex}`] : ''}
                            error={fieldError[`end_time${stIndex}${subIndex}${schIndex}`] && (fieldError[`end_time${stIndex}${subIndex}${schIndex}`] ? true : false)}
                        />
                    }
                </TableCell>
                <TableCell>
                    <Tooltip title={'Delete Sub Schedule'} enterDelay={400}
                        enterNextDelay={400} placement='top-start'
                        classes={{ tooltip: 'tooltip-show-data' }}>
                        <DeleteOutlineIcon className='text-red pointer' onClick={() => this.props.handleDeleteSchedule(stIndex, subIndex, schIndex, schIndex)} />
                    </Tooltip>
                </TableCell>
            </>
        )
    }
}

export default ScheduleInputComponent;