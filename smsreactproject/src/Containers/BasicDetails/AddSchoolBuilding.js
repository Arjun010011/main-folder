import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';
import { Paper, Box, Grid, Button, TextareaAutosize, TextField, FormControl, FormHelperText, Tooltip } from '@material-ui/core';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link } from 'react-router-dom';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import Snackbar from '@material-ui/core/Snackbar';

import { numberRegex } from 'Constants/regularExpression'
import loadingBar from 'images/loading.gif'
import { Dropdown } from 'Components/DropDown';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls'
import { Alert, isUserHasPermission } from 'Includes/functions';
import './styles.scss';
import { Actions } from 'Constants/permissions';

class AddSchoolBuilding extends Component {

    constructor(props) {
        super(props)

        this.state = {
            hostel: { floor_list: [], number_of_floors: '', gender: '' },
            fieldErrors: {},
            helperText: {},
            loading: true,
            openError: false,
            alertData: 'Please clear the errors',
            isEdit: false,
            submitDisable: false,
            pageLoading: false,
            isBlankPage: true,
            genderList: [{ id: 1, name: 'Boy', name_staff: 'Male' }, { id: 2, name: 'girl', name_staff: 'Female' }],
            hostelForList: [{ id: 1, name: 'Student' }, { id: 2, name: 'Staff' }, { id: 3, name: 'Both' }],
            deltable_floor_ids: [],
            updatingDropDown: false,
            options:[],
            selected:[]
        }
    }


    componentDidMount = () => {
        if (this.props.location.pathname === Actions.school_building.update.url) {
            if (this.props.location.state && this.props.location.state.detail) {
                let id = this.props.location.state.detail
                this.updateHostelBuildingDetails(id);
            }
            else {
                this.props.history.push(Actions.school_building.view.url);
            }
        }
        else {
            this.setState({
                loading: false
            })
        }
    }

    updateHostelBuildingDetails = (id) => {
        const url = GET_URL.buildingdata.api + id + '/'
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    hostel_details: response.data.data,
                })
                this.updateAllDetails(id);
            }
        })
    }

    updateAllDetails = (id) => {
        let { hostel_details, hostel } = this.state;
        hostel['id'] = id
        hostel['name'] = hostel_details.name
        hostel['address'] = hostel_details.address
        hostel['floor_list'] = hostel_details.floor_building
        this.setState({
            hostel,
            loading: false,
            isEdit: true
        })
    }

    handleSearchChange = (e) => {
        let { hostel, fieldErrors, updatingDropDown } = this.state;
        let { name, value } = e.target;
        hostel[name] = value
        if (name === 'number_of_floors' && !numberRegex.value.test(value) && value) {
            fieldErrors[name] = numberRegex.errorText
            this.setState({
                fieldErrors,
                hostel
            })
            return
        }
        delete fieldErrors[name]
        this.setState({
            hostel,
            fieldErrors,
            updatingDropDown
        })
    }

    handleChangeFloor = (e, index) => {
        let { hostel, fieldErrors } = this.state;
        let { name, value } = e.target;
        hostel.floor_list[index][name] = value
        if (name === 'number_of_floors' && !numberRegex.value.test(value) && value) {
            fieldErrors[`${name}${index}`] = numberRegex.errorText
            this.setState({
                fieldErrors,
                hostel
            })
            return
        }
        delete fieldErrors[`${name}${index}`]
        this.setState({
            fieldErrors,
            hostel
        })
    }

    handleAddFloor = () => {
        let { hostel } = this.state;
        let temp = {}
        let value = parseInt(hostel.number_of_floors) + parseInt(hostel.floor_list.length)
        for (let i = hostel.floor_list.length; i < value; i++) {
            temp = {}
            temp['name'] = ``
            temp['no_of_rooms'] = ''
            hostel.floor_list.push(temp)
        }
        hostel.number_of_floors = ''
        this.setState({
            hostel
        })
    }

    deleteFloor = (index) => {
        let { hostel, deltable_floor_ids, fieldErrors } = this.state;
        if (hostel.floor_list[index]['id']) {
            deltable_floor_ids.push(hostel.floor_list[index]['id'])
        }
        delete fieldErrors[`name${index}`]
        delete fieldErrors[`no_of_rooms${index}`]
        hostel.floor_list.splice(index, 1)
        this.setState({
            hostel,
            deltable_floor_ids,
            fieldErrors
        })
    }

    validation = () => {
        let { hostel, fieldErrors, isEdit, openError, alertData, deltable_floor_ids } = this.state;
        let returnValue = true
        if (!hostel.name) {
            fieldErrors['name'] = 'Enter name'
        }
        if (hostel.floor_list.length === 0) {
            alertData = 'Add floors'
            openError = true
        }

        hostel.floor_list.map((data, index) => {
            if (!data.name) {
                fieldErrors[`name${index}`] = 'Enter name'
            }
            if (!data.no_of_rooms) {
                fieldErrors[`no_of_rooms${index}`] = 'Enter no of rooms'
            }
        })

        if (Object.keys(fieldErrors).length > 0 || openError) {
            returnValue = false
            openError = true
        }
        if (returnValue) {
            let temp = {}
            if (isEdit) {
                temp['id'] = hostel.id
            }
            temp['deltable_floor_ids'] = deltable_floor_ids
            temp['name'] = hostel.name
            temp['building_type'] = 'School'
            temp['building_for'] = ''
            temp['address'] = hostel.address
            temp['number_of_floors'] = parseInt(hostel.floor_list.length)
            temp['floor_list'] = hostel.floor_list
            returnValue = temp
        }
        this.setState({
            fieldErrors,
            openError,
            alertData
        })

        return returnValue
    }

    submit = () => {
        let validate_post_format = this.validation();
        if (validate_post_format) {
            this.setState({ submitDisable: true })
            let url = POST_URL.buildingdata.api;
            postRequest(url, validate_post_format, this.props)
                .then((response) => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: 'Your Data has been saved',
                            showConfirmButton: false,
                            timer: 1500
                        })
                        this.props.history.push(Actions.school_building.view.url)
                    }
                    this.setState({ submitDisable: false })
                });

        }
    }

    handleClose = () => {
        this.setState({
            openError: false
        })
    }

    render() {
        const { loading, hostel, fieldErrors, openError, alertData, submitDisable, options, hostelForList,
             selected } = this.state
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <div>
                    <Paper className='paper-background'>
                        <Grid container>
                            <Grid item md={8} xs={12} className='header-align'>
                                <Box className='heading'>
                                {Actions.school_building.create.label}
                                </Box>
                            </Grid>
                            <Grid item md={4} xs={12} >
                                <Box className='header-align end-flex-prop'>
                                    {isUserHasPermission('building', 'view') &&
                                        <Button
                                            variant="contained"
                                            component={Link} to={Actions.school_building.view.url}
                                            className='editbutton-view'
                                        ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.school_building.view.label}</Button>
                                    }
                                </Box>

                            </Grid>
                        </Grid>
                        <Box>
                            <Grid container spacing={1}>
                                <Grid item md={8} xs={12}>
                                    <Paper className='paper-plain-background header-align p-b-20px'>
                                        <Grid container spacing={2} className=''>
                                            <Grid item md={12} xs={12}>
                                                <TextField
                                                    label='Building Name'
                                                    required={true}
                                                    name='name'
                                                    type='text'
                                                    value={hostel.name}
                                                    className='width-100'
                                                    inputProps={{ maxLength: '50', autoComplete: 'new-password' }}
                                                    fullWidth={true}
                                                    variant="outlined"
                                                    helperText={fieldErrors['name'] ? fieldErrors['name'] : ''}
                                                    error={fieldErrors['name']}
                                                    onChange={(e) => this.handleSearchChange(e)}
                                                />
                                            </Grid>
                                        </Grid>
                                        <Grid container>
                                            <Grid item md={12}>
                                                <FormControl
                                                    fullWidth
                                                    error={fieldErrors.address && (fieldErrors.address ? true : false)}
                                                >
                                                    <Box className='create-hostel-building-address-label header-align'>Building Address</Box>
                                                    <TextareaAutosize aria-label="minimum height"
                                                        className='create-expenses-comment-auto-size'
                                                        value={hostel.address}
                                                        name='address'
                                                        onChange={(e) => this.handleSearchChange(e)}
                                                        required
                                                    />
                                                    {fieldErrors.address &&
                                                        <FormHelperText>{fieldErrors.address}</FormHelperText>
                                                    }
                                                </FormControl>
                                            </Grid>

                                        </Grid>

                                    </Paper>
                                </Grid>
                                <Grid item md={4} xs={12}>
                                    <Paper className='header-align hostel-floor-padding'>
                                        <Grid container spacing={1}>
                                            <Grid item md={7} xs={3} className='room-strength-asset-label'>
                                                <Box>Floors : {hostel.floor_list.length}</Box>
                                            </Grid>
                                            <Grid item md={3} xs={8}>
                                                <Tooltip title='Add number of floors' placement='top-start'>
                                                    <TextField
                                                        label='Add'
                                                        name='number_of_floors'
                                                        type='text'
                                                        size='small'
                                                        value={hostel.number_of_floors}
                                                        className='width-100'
                                                        inputProps={{ maxLength: '2', autoComplete: 'new-password' }}
                                                        fullWidth={true}
                                                        variant="outlined"
                                                        helperText={fieldErrors['number_of_floors'] ? fieldErrors['number_of_floors'] : ''}
                                                        error={fieldErrors['number_of_floors']}
                                                        onChange={(e) => this.handleSearchChange(e)}
                                                    />
                                                </Tooltip>

                                            </Grid>
                                            <Grid item md={2} xs={2} className='hostel-add-building-add-button'>
                                                <Button onClick={this.handleAddFloor}>
                                                    <AddCircleOutlineOutlinedIcon className='hostel-add-building-add-button-icon' />
                                                </Button>
                                            </Grid>
                                        </Grid>
                                        <Box className='header-align'>
                                            {hostel.floor_list.map((data, index) => {
                                                return <Grid container spacing={1} className='hostel-building-image-preview-outer-box'>
                                                    <Grid item md={6} xs={12}>
                                                        <TextField
                                                            label='Floor Name'
                                                            name='name'
                                                            type='text'
                                                            value={data.name}
                                                            className='width-100'
                                                            inputProps={{ maxLength: '50', autoComplete: 'new-password' }}
                                                            variant="outlined"
                                                            helperText={fieldErrors[`name${index}`] ? fieldErrors[`name${index}`] : ''}
                                                            error={fieldErrors[`name${index}`]}
                                                            onChange={(e) => this.handleChangeFloor(e, index)}
                                                        />
                                                    </Grid>
                                                    <Grid item md={6} xs={12}>
                                                        <TextField
                                                            label='No. of Rooms'
                                                            name='no_of_rooms'
                                                            type='text'
                                                            value={data.no_of_rooms}
                                                            className='width-100'
                                                            inputProps={{ maxLength: '2', autoComplete: 'new-password' }}
                                                            variant="outlined"
                                                            helperText={fieldErrors[`no_of_rooms${index}`] ? fieldErrors[`no_of_rooms${index}`] : ''}
                                                            error={fieldErrors[`no_of_rooms${index}`]}
                                                            onChange={(e) => this.handleChangeFloor(e, index)}
                                                        />
                                                    </Grid>
                                                    <Box className='hostel-building-delete-image-input'
                                                        onClick={() => this.deleteFloor(index)}>
                                                        <HighlightOffIcon />
                                                    </Box>
                                                </Grid>
                                            })}
                                        </Box>
                                    </Paper>
                                </Grid>
                            </Grid>


                            <Grid item md={12}>
                                <Box display='flex' marginLeft='auto' justifyContent='flex-end' className='header-align'>
                                    <Button variant="contained" color="primary"
                                        className='submit'
                                        disabled={submitDisable}
                                        onClick={this.submit}>
                                        Submit &nbsp;{' '}
                                    </Button>
                                </Box>
                            </Grid>
                        </Box>
                    </Paper>
                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openError} autoHideDuration={2000} onClose={this.handleClose}>
                        <Alert onClose={this.handleClose} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>
                </div>
            )
        }
    }
}


export default withRouter(AddSchoolBuilding)