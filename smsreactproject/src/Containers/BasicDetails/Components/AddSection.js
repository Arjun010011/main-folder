import React, { Component } from 'react';
import { Button, TextField, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Box, FormHelperText, Tooltip, FormControl, InputLabel, MenuItem, Select } from '@material-ui/core';
import { isUserHasPermission } from 'Includes/functions';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls'
import Swal from 'sweetalert2'
import { Dropdown } from 'Components/DropDown';
import { FormattedMessage } from 'react-intl';
import messages from './../messages';
import commonMessages from 'Constants/messages'

export default class AddSection extends Component {
    constructor(props) {
        super(props)

        this.state = {
            open: false,
            errors: {},
            strength: '',
            sectionsList: [],
            sectionValue: '',
            submitDisable: false,
            sectionListFound: false
        }
    }


    handleClickOpen = () => {
        const { year, strengthData } = this.props
        const { sectionListFound } = this.state;
        if (!sectionListFound) {
            const url = GET_URL.section.api;
            const param = {
                is_active: true, academic_year: year,
                standard: strengthData.standard, unassigned_sections: true
            }
            getRequest(url, param, this.props).then(response => {
                if (response && response.status === 200) {
                    this.setState({
                        sectionsList: response.data.data,
                        sectionListFound: false,
                        open: true,
                    })
                }
            })
        }
        else {
            this.setState({
                open: true
            })
        }
    };

    handleClose = () => {
        this.setState({
            open: false,
            errors: {},
            sectionValue: '',
            strength: ''
        })
    };
    update = async () => {
        let errors = this.state.errors
        let { sectionValue, strength } = this.state
        let { year, strengthData } = this.props
        if (this.state.strength === "") {
            errors['strength'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
        }
        if (this.state.sectionValue === "") {
            errors['section'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
        }
        this.setState({
            errors
        })
        if ((Object.keys(errors).length === 0)) {
            this.setState({ submitDisable: true })
            let section = {}
            let sectionList = []
            section['section'] = sectionValue
            section['strength'] = strength
            sectionList.push(section)
            let post_data = {
                'academic_year': year,
                'standard': strengthData.standard,
                'section': sectionList,
            }
            const url = POST_URL.strength.api
            postRequest(url, post_data, this.props).then(response => {
                if (response && response.status === 200) {
                    let total = this.props.strengthData.strength_sum + parseInt(strength)
                    this.props.updateSectionData(strengthData.standard, response.data.data[0], total)
                    this.setState({
                        open: false,
                        strength: '',
                        sectionValue: '',
                        sectionListFound: false,
                    })
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    })
                }
                this.setState({ submitDisable: false })
            })

        }
    }

    onchange = (e) => {
        this.setState({
            strength: e.target.value,
        })
        let errors = this.state.errors
        var regex = /^[0-9]*$/;
        let test = regex.test(e.target.value);
        if (e.target.value === "") {
            errors['strength'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />

        }
        else if (!test) {
            errors['strength'] = <FormattedMessage {...commonMessages.invalidValue} />
        }
        else {
            delete errors['strength']
            this.setState({
                errors
            })
        }
    }

    onChangeSec = (e) => {
        if (e.target.value !== 0) {
            let errors = this.state.errors
            let sectionValue = this.state
            let result = false
            this.props.strengthData.section.map((data) => {
                if (data.section === e.target.value) {
                    errors['section'] = <FormattedMessage {...commonMessages.duplicateFoundLabel} />
                    sectionValue = e.target.value
                    result = true
                }
                return true
            })
            if (!result) {
                sectionValue = e.target.value
                errors = {}
            }
            this.setState({
                errors,
                sectionValue
            })
        }
    }


    render() {
        let { open, submitDisable, errors, sectionsList, sectionValue, strength, } = this.state
        let { strengthData, baseClassName, deleteStandard, loading } = this.props
        let { classes } = this.props
        return (
            <div>
                <Box display='flex' justifyContent='space-evenly'>
                    {isUserHasPermission('standard_strength', 'create') &&
                        <Tooltip title={<FormattedMessage {...messages.addSection} />} nterDelay={400}
                            enterNextDelay={400} placement='top-start'
                            classes={{ tooltip: 'tooltip-show-data' }}>
                            <Box onClick={this.handleClickOpen} style={{ cursor: 'pointer' }}><AddCircleOutlineOutlinedIcon /></Box>
                        </Tooltip>
                    }
                    {isUserHasPermission('standard_strength', 'delete') &&
                        <Tooltip title={<FormattedMessage {...messages.deleteClass} />} nterDelay={400}
                            enterNextDelay={400} placement='top-start'
                            classes={{ tooltip: 'tooltip-show-data' }}>
                            <Box onClick={() => deleteStandard(strengthData.standard)} style={{ cursor: 'pointer' }}><DeleteOutlineIcon /></Box>
                        </Tooltip>
                    }
                </Box>

                <Dialog open={open}
                    className={baseClassName}
                    // onClose={this.handleClose}
                     aria-labelledby="form-dialog-title">
                    <DialogTitle id="form-dialog-title"></DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            <FormattedMessage {...messages.addSectionStrength} /> {strengthData.standard__name}
                        </DialogContentText>
                        {!loading &&
                            <Dropdown
                                data={sectionsList}
                                required={true}
                                name='year'
                                value={sectionValue}
                                onChange={(e) => this.onChangeSec(e)}
                                label={<FormattedMessage {...commonMessages.section} />}
                                error={errors['section']}
                                fullWidth
                                hideSelect={true}
                            />
                        }
                        <TextField
                            autoComplete='off'
                            id="name"
                            label={<FormattedMessage {...commonMessages.strength} />}
                            required={true}
                            type="name"
                            value={strength}
                            inputProps={{ maxLength: 3 }}
                            margin='normal'
                            variant='outlined'
                            onChange={this.onchange}
                            helperText={errors['strength'] === "" ? "" : errors['strength']}
                            error={errors['strength'] && (errors['strength'] ? true : false)}
                            style={{ width: 300 }}
                        />
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