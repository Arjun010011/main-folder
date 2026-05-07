import React, { Component } from 'react';
import  {    IconButton, Grid, Tooltip, Box, Menu, MenuItem, Button,
            TextField, Dialog, DialogActions, DialogContent, DialogContentText, 
            DialogTitle
        } from '@material-ui/core';
import { MuiPickersUtilsProvider, KeyboardDatePicker, KeyboardTimePicker } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import PhoneNumber from 'Components/PhoneNumber';
import MoreHorizIcon from '@material-ui/icons/MoreHoriz';

import { Dropdown } from 'Components/DropDown';
import { validateDate, NumberFormatCustom } from 'Includes/functions';
import './styles.scss';

const ITEM_HEIGHT = 35;

export default class ActionColumn extends Component {

    constructor(props) {
        super(props)
        this.state = {
            open: false,
            anchorEl: null,
            updateDisable: false,
            displayActionColumn: false,
            showData: '',
            fieldValue: {},
            openMenu: ''
        }
    }

    handleClickOpen = () => {
        let data = {};
        const { fieldDetails, fieldValues } = this.props;
        let { fieldValue } = this.state;
        fieldDetails.map((fields, index) => {
            data[fields.name] = fieldValues[index];
            data[fields.name + '_error'] = '';
        })
        fieldValue = data
        this.setState({
            fieldValue: fieldValue,
            updateDisable: false,
            open: true,
        })
        this.props.closeMenuAction(true);
        this.handleCloseMenu();
    };


    handleClose = () => {
        this.setState({
            updateDisable: false,
            open: false
        })
    };

    async componentDidMount() {
        const { enabledActions } = this.props

        if (enabledActions.length > 0) {
            let showData
            if (enabledActions.length > 1) {
                showData = enabledActions.join(' or ')
            }
            else {
                showData = enabledActions.join()
            }
            this.setState({
                displayActionColumn: true,
                showData: showData,
            })
        }
    }

    update = async () => {
        let { fieldValue } = this.state
        let { id, rowData } = this.props;
        let test = true
        let field = {}
        let temp = {}
        
        Object.keys(fieldValue).map((data) => {
            if (data.includes('error')) {
                if (fieldValue[data] !== '') {
                    test = false;
                }
            }
            else {
                if (fieldValue[data] === '' || fieldValue[data] === '0' || Boolean(!fieldValue[data])) {
                    test = false;
                    fieldValue[data + '_error'] = 'Please Enter Value';
                }
                else {
                    temp[data] = fieldValue[data];
                }
            }
        })
        field = temp
        if (test) {
            this.props.updateType(field, id, rowData)
            this.setState({
                updateDisable: true,
                open: false
            })
        }
        else {
            this.setState({
                fieldValue
            })
        }
    }

    handleSearchChange = (e, field) => {
        let { fieldValue } = this.state
        let value = e;
        let name = field.name;
        let fieldValues = { ...fieldValue }
        if (field.type === 'text' || field.type === 'amount' || field.type === 'dropDown') {
            value = e.target.value;
            name = e.target.name;
        }
        if (field.type === 'date' || field.type === 'time') {
            fieldValues[name] = value;
            fieldValues[name + '_error'] = '';
        }
        else if (field.regex === null || value === '' || (field.regex.value && field.regex.value.test(value))) {
            fieldValues[name] = value;
            fieldValues[name + '_error'] = '';
        }
        else {
            fieldValues[name] = value;
            fieldValues[name + '_error'] = field.regex.errorText;
        }
        if (field.type === 'dropDown' && value === 0) {

        }
        else {
            this.setState({
                fieldValue: fieldValues,
                updateDisable: false
            })
        }
    }



    handleClick = event => {
        this.setState({
            anchorEl: event.currentTarget,
            openMenu: Boolean(event.currentTarget)
        })
    };

    handleCloseMenu = () => {
        this.setState({
            anchorEl: null,
            openMenu: false
        })
    };


    handleDeleteAndClose = () => {
        const { id, rowData } = this.props
        this.props.deleteType(id, rowData);
        this.handleCloseMenu();
    }

    onBlurValidation = (e, field) => {
        let { fieldValue } = this.state
        let fieldValues = { ...fieldValue }
        const name = field.name;
        const minDate = field.minDate;
        const maxDate = field.maxDate;
        let value = fieldValues[name];
        const error = validateDate(value, minDate, maxDate)
        if (error !== '') {
            fieldValues[name + '_error'] = error
            this.setState({
                fieldValue: fieldValues
            })
        }
    }


    render() {
        const { open, showData, openMenu, anchorEl, updateDisable, displayActionColumn, fieldValue } = this.state
        const { enabledActions, baseClassName, label, fieldDetails, errorContent, rowData } = this.props
        const {
            handleClick, handleClose, handleCloseMenu, handleClickOpen, handleDeleteAndClose, handleSearchChange, onBlurValidation, update
        } = this;
        let status = true;
        if (!this.state.open || this.props.closeMenu === false) {
            status = false
        }
        return (
            <div>
                <Tooltip title={showData} enterDelay={400}
                    enterNextDelay={400} placement='top-start'
                    classes={{ tooltip: 'tooltip-show-data' }}>
                    <IconButton
                        aria-label='more'
                        aria-controls='long-menu'
                        aria-haspopup='true'
                        onClick={handleClick}
                        className={displayActionColumn ? 'padding-0' : 'display-none padding-0'}
                    >
                        <MoreHorizIcon />
                    </IconButton>
                </Tooltip>
                <Menu
                    id='long-menu'
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

                    {enabledActions.includes('edit') && <MenuItem onClick={handleClickOpen}>
                        Edit
                 </MenuItem>}
                    {enabledActions.includes('delete') && <MenuItem onClick={handleDeleteAndClose}>
                        Delete
                 </MenuItem>}
                    {
                        enabledActions.includes('add') && <MenuItem onClick={handleClickOpen}>
                            Add
                 </MenuItem>
                    }

                </Menu>
                <Dialog open={status}
                    className={baseClassName}
                    // onClose={handleClose} 
                    aria-labelledby='form-dialog-title'>
                    <DialogTitle id='form-dialog-title'></DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            {label ? label : `Please Enter the Details`}
                        </DialogContentText>
                        <Grid container className='flex-justify-center'>
                            {fieldDetails && fieldDetails.map((field) => <Grid item md={field.md} xs={10} sm={10}>
                                {(field.type === 'text' || field.type === 'multiline-text') &&
                                <Box className={` error-msg-height`}>
                                <TextField
                                    id={field.id}
                                    label={field.label}
                                    name={field.name}
                                    value={fieldValue[field.name]}
                                    className={`${field.className} error-msg-height`}
                                    autoFocus={field.autoFocus}
                                    required={field.required}
                                    rows={field.rows}
                                    variant='outlined'
                                    inputProps={{ maxLength: field.maxLength }}
                                    helperText={fieldValue[field.name + '_error'] === '' ? '' : fieldValue[field.name + '_error']}
                                    error={fieldValue[field.name + '_error'] === '' ? false : true}
                                    onChange={(e) => handleSearchChange(e, field)}
                                />
                                </Box>}
                                {(field.type === 'multiline-text') &&
                                <Box className={` error-msg-height`}>
                                <TextField
                                    id={field.id}
                                    label={field.label}
                                    name={field.name}
                                    value={(fieldValue[field.name] != 0) ? fieldValue[field.name] : '' }
                                    className={`${field.className} error-msg-height`}
                                    autoFocus={field.autoFocus}
                                    rows={field.rows}
                                    variant='outlined'
                                    inputProps={{ maxLength: field.maxLength, style: {textAlign: 'right'} }}
                                    helperText={fieldValue[field.name + '_error'] === '' ? '' : fieldValue[field.name + '_error']}
                                    error={fieldValue[field.name + '_error'] === '' ? false : true}
                                    onChange={(e) => handleSearchChange(e, field)}
                                />
                                </Box>}
                                {field.type === 'date' && <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                    <KeyboardDatePicker
                                        className={field.className}
                                        autoOk
                                        variant='inline'
                                        inputVariant='outlined'
                                        label={field.label}
                                        name={field.name}
                                        minDate={field.minDate}
                                        maxDate={field.maxDate}
                                        onClose={() => onBlurValidation('close', field)}
                                        onBlur={(e) => onBlurValidation(e, field)}
                                        format='dd-MM-yyyy'
                                        value={fieldValue[field.name]}
                                        onChange={(e) => handleSearchChange(e, field)}
                                        KeyboardButtonProps={{
                                            'aria-label': 'change date',
                                        }}
                                        inputProps={{ maxLength: 50 }}
                                        helperText={fieldValue[field.name + '_error'] === '' ? 'Format DD-MM-YYYY' : fieldValue[field.name + '_error']}
                                        error={fieldValue[field.name + '_error'] === '' ? false : true}
                                    />
                                </MuiPickersUtilsProvider>}
                                {field.type === 'time' && <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                    <KeyboardTimePicker
                                        className={field.className}
                                        autoOk
                                        variant='inline'
                                        inputVariant="outlined"
                                        label={field.label}
                                        name={field.name}
                                        margin="normal"
                                        id="mui-pickers-time"
                                        value={fieldValue[field.name]}
                                        onChange={(e) => handleSearchChange(e, field)}
                                        InputLabelProps={{ shrink: fieldValue[field.name] ? true : false }}
                                        KeyboardButtonProps={{
                                            'aria-label': 'change time',
                                        }}
                                        helperText={fieldValue[field.name + '_error'] === '' ? 'Validate Format HH:MM AM/PM' : fieldValue[field.name + '_error']}
                                        error={fieldValue[field.name + '_error'] === '' ? false : true}
                                    />
                                </MuiPickersUtilsProvider>}
                                {field.type === 'phone_number' &&
                                    <PhoneNumber
                                        label={field.label}
                                        className={field.className}
                                        value={fieldValue[field.name]}
                                        name={field.name}
                                        error={fieldValue[field.name + '_error']}
                                        onChange={e => this.handleSearchChange(e, field)}
                                        helperText={fieldValue[field.name + '_error'] === "" ? field.helperText : fieldValue[field.name + '_error']}
                                        onBlur={(e) => this.changeInParent(e, field)}
                                    />
                                }
                                {field.type === 'dropDown' && fieldValue[field.name] !== undefined &&
                                    <Dropdown
                                        data={field.list}
                                        name={field.name}
                                        value={fieldValue[field.name]}
                                        onChange={(e) => this.handleSearchChange(e, field)}
                                        error={fieldValue[field.name + '_error']}
                                        label={field.label}
                                        style={field.className}
                                        disabled={field.disabled}
                                        required={field.required}
                                        hideSelect={field.hideSelect}
                                    />}
                                {(field.type === 'amount') &&
                                    <Box className={`error-msg-height`}>
                                        <TextField
                                            InputProps={{
                                                inputComponent: NumberFormatCustom,
                                            }}
                                            id={field.id}
                                            label={field.label}
                                            name={field.name}
                                            value={(fieldValue[field.name] != 0) ? fieldValue[field.name] : '' }
                                            className={`${field.className} error-msg-height`}
                                            autoFocus={field.autoFocus}
                                            rows={field.rows}
                                            variant='outlined'
                                            inputProps={{ maxLength: field.maxLength, style: {textAlign: 'right'} }}
                                            helperText={fieldValue[field.name + '_error'] === '' ? '' : fieldValue[field.name + '_error']}
                                            error={fieldValue[field.name + '_error'] === '' ? false : true}
                                            onChange={(e) => handleSearchChange(e, field)}
                                        />
                                    </Box>}
                            </Grid>
                            )}
                        </Grid>
                        <Box className='error-content flex-justify-center'>
                            {errorContent}
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose} color='secondary'>
                            Close
                </Button>
                        <Button disabled={updateDisable} onClick={update} color='primary'>
                            Update
                </Button>

                    </DialogActions>
                </Dialog>
            </div>
        );
    }
}