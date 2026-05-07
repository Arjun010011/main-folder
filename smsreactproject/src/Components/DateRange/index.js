import React, { useState, useImperativeHandle, forwardRef } from 'react';
import DateRangePicker from "react-daterange-picker";
import "react-daterange-picker/dist/css/react-calendar.css";
import { ClickAwayListener, Box, Paper, Menu, Button, TextField, InputAdornment } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import DateRangeIcon from '@material-ui/icons/DateRange';
import originalMoment from "moment";
import { extendMoment } from "moment-range";
import ClearIcon from '@material-ui/icons/Clear';

import { dateFormat, validateDate } from 'Includes/functions';
import { minDateValue, maxDateValue } from 'Constants';
import './styles.scss';

const moment = extendMoment(originalMoment);


const StyledMenu = withStyles({

})((props) => (
    <Menu
        elevation={0}
        getContentAnchorEl={null}
        anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
        }}
        transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
        }}
        {...props}
    />
));


export const DateRange = forwardRef((props, ref) => {

    let { minDate, maxDate, startDate, endDate, handleChange, label, hideClearIcon, size='medium', className='width-280-margin-top-1r', allowFutureEndDate } = props;
    const today = moment();
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [value, setValue] = useState(null);
    const [textValue, setTextValue] = useState(null);
    const [showClearIcon, setShowClearIcon] = useState(true);
    const [enableClearIcon, setEnableClearIcon] = useState(false);
    const [date_range_error, setDate_range_error] = useState('');
    const [minDateRange, setMinDateRange] = useState('');
    const [maxDateRange, setMaxDateRange] = useState(new Date());

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };


    const handleClose = () => {
        setAnchorEl(null);
    };

    const onChange = (newValue) => {
        setValue(newValue)
        let text = `${newValue.start.format('DD-MM-YYYY')} - ${newValue.end.format('DD-MM-YYYY')}`
        setTextValue(text)
        let returnValue = {}
        if (newValue) {
            returnValue['start'] = newValue.start.format('YYYY-MM-DD')
            returnValue['end'] = newValue.end.format('YYYY-MM-DD')
        }
        handleChange(returnValue, anchorEl)
        handleClose()
        setEnableClearIcon(true)
    }

    const handleClear = () => {
        setValue(moment.range(today.clone(), today.clone()))
        setTextValue(null)
        let returnValue = {}
        handleChange(returnValue)
        setEnableClearIcon(false)
        if (startDate && endDate) {
            startDate = moment(startDate)
            endDate = moment(endDate)
            onChange(moment.range(startDate.clone(), endDate.clone()))
        }

    }

    useImperativeHandle(ref, () => ({
        handleClear() {
            handleClear()
        },
        onChange(prop) {
            onChange(prop)
        }
    }))

    React.useEffect(() => {
        if (props.minDate) {
            setMinDateRange(props.minDate)
        }
        else {
            setMinDateRange(minDateValue)
        }
        if (props.maxDate) {
            setMaxDateRange(props.maxDate)
        }
        else if (allowFutureEndDate) {
            setMaxDateRange(new Date(new Date().getFullYear() + 10, 11, 31))
        }
        else {
            setMaxDateRange(new Date())
        }
        if (startDate && endDate) {
            startDate = moment(startDate)
            endDate = moment(endDate)
            onChange(moment.range(startDate.clone(), endDate.clone()))
        }
    }, []);

    const handleDateChange = (e) => {
        let { value } = e.target;
        setTextValue(()=>value);
        setDate_range_error('');
        if (value && textValue && value?.length > textValue?.length) {
            if ((value.length === 3 || value.length === 6) && value.includes("-")) {
                setTextValue(value.replace("-", ""));
            }
            if (value.length === 2 || value.length === 5 || value.length === 15 || value.length === 18) {
                setTextValue(value + "-");
            }
            if (value.length === 10) {
                setTextValue(value + ' ' + "-" + ' ');
            }
        }
    }

    const handleBlur = () => {
        validationAndSetValue(textValue)
    }

    const validationAndSetValue = (value) => {
        if (value) {
            let temp_value = value.replace(/ /g, '');
            temp_value = temp_value.split("-");
            let from_date = new Date(`${temp_value[2]}-${temp_value[1]}-${temp_value[0]}`)
            let to_date = new Date(`${temp_value[5]}-${temp_value[4]}-${temp_value[3]}`)
            let from_error = from_date === 'Invalid Date' ? from_date : validateDate(from_date, minDateRange, maxDateRange)
            let to_error = to_date === 'Invalid Date' ? to_date : validateDate(to_date, from_date, maxDateRange)
            if (from_error !== '' || to_error !== '') {
                if (to_error === 'Invalid Date' || from_error === 'Invalid Date') {
                    setDate_range_error(`Invalid Date`)
                }
                else if (to_error !== '' && from_error !== '') {
                    setDate_range_error(`Should between ${dateFormat(minDateRange, 'DD-MM-YYYY')} - ${dateFormat(maxDateRange, 'DD-MM-YYYY')}`)
                }
                else if (from_error !== '' && to_error === '') {
                    setDate_range_error(`Should between ${dateFormat(minDateRange, 'DD-MM-YYYY')} - ${dateFormat(maxDateRange, 'DD-MM-YYYY')}`)
                }
                else if (to_error !== '' && from_error === '') {
                    setDate_range_error(allowFutureEndDate
                        ? `ToDate should be on or after ${dateFormat(from_date, 'DD-MM-YYYY')}`
                        : `ToDate should between ${dateFormat(from_date, 'DD-MM-YYYY')} - Today Date`)
                }
            }
            else {
                let returnValue = {}
                returnValue['start'] = dateFormat(from_date, 'YYYY-MM-DD')
                returnValue['end'] = dateFormat(to_date, 'YYYY-MM-DD')
                handleChange(returnValue, true)
                setDate_range_error('')
            }
        }
    }

    return (
        <div className=''>
            <Box>
                <TextField
                    label={label ? label : 'Date Range'}
                    name='textValue'
                    type='text'
                    size={size}
                    value={textValue ? textValue : ''}
                    className={className}
                    onChange={handleDateChange}
                    onBlur={handleBlur}
                    inputProps={{ maxLength: 23 }}
                    autoComplete='off'
                    InputLabelProps={{ shrink: (textValue) ? true : false }}
                    InputProps={{
                        className: 'color-black',
                        endAdornment: (
                            <InputAdornment position="end">
                                {enableClearIcon && showClearIcon && !hideClearIcon &&
                                    <Box onClick={handleClear}>
                                        <ClearIcon className='date-range-clear-icon' />
                                    </Box>
                                }
                                <Box
                                    width='fit-content'
                                    color='#5f5f5f'
                                    aria-controls="customized-menu"
                                    aria-haspopup="true"
                                    variant="contained"
                                    onClick={handleClick}
                                >
                                    <DateRangeIcon
                                        className='date-range-icon'
                                    />
                                </Box>
                            </InputAdornment>
                        ),
                    }}
                    variant="outlined"
                    helperText={date_range_error ? date_range_error : 'DD-MM-YYYY - DD-MM-YYYY'}
                    error={date_range_error}
                />
            </Box>
            <StyledMenu
                id="customized-menu"
                anchorEl={anchorEl}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleClose}
            >
                <Paper className='date-range-paper-background'>
                    <DateRangePicker
                        numberOfCalendars={2}
                        selectionType="range"
                        singleDateRange={true}
                        onSelect={onChange}
                        value={value}
                        minimumDate={minDateRange}
                        maximumDate={maxDateRange}
                    />
                </Paper>
            </StyledMenu>
        </div>
    );
}
)