import React, { Component } from 'react'
import { Paper, Box, Grid, Button } from '@material-ui/core';
import Swal from 'sweetalert2'
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import { withRouter } from 'react-router-dom';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';

import MultipleAddTextFields from 'Components/MultipleAddTextFields';
import loadingBar from 'images/loading.gif'
import { postRequest } from 'Includes/api/apicall';
import { POST_URL } from 'Includes/urls'
import { nameAndNumberRegex, nameRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission } from 'Includes/functions';

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}
const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}


const stateDetails_global = [
    {
        label: 'State Name', regex: nameRegex, autoFocus: true, name: 'name', md: 6, className: 'width-form-95', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 30
    },
    {
        label: 'Code', regex: nameAndNumberRegex, autoFocus: false, name: 'code', md: 6, className: 'width-form-95', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 20
    },
]
class ManageStates extends Component {
    constructor() {
        super()
        this.state = {
            stateList: [],
            loading: true,
            open: false,
            alertData: '',
            selectedCountry: '',
            error: {}
        }
    }


    componentDidMount = () => {
        if (this.props.location.state.countryName) {
            let countryName = this.props.location.state.countryName
            let selectedCountry = this.props.location.state.selectedCountry
            this.setState({
                countryName,
                selectedCountry,
                loading: false
            })
        }
        else {
            this.props.history.push(Actions.manage_states.view.url)
        }
    }


    updateStateListValue = (stateValue) => {
        let { stateList } = this.state
        stateList = stateValue
        this.setState({
            stateList
        })
    }

    validate = () => {
        let stateTest = true;
        let { stateList, selectedCountry, error } = this.state
        stateTest = this.refs.state.validateFields();
        if (stateTest) {
            let post_data = {
                'states': stateList,
                'country': selectedCountry
            }
            this.setState({ submitDisable: true })
            let url = POST_URL.state.api;
            postRequest(url, post_data, this.props)
                .then((response) => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: 'Your Data has been saved',
                            showConfirmButton: false,
                            timer: 1500
                        })
                        this.props.history.push({
                            pathname: Actions.manage_states.view.url,
                            state: { selectedCountry: selectedCountry }
                        })
                    }
                    this.setState({ submitDisable: false })
                });
        }
    }


    handleClose = () => {
        this.setState({
            open: false
        })
    }

    handleStateViewButton = () => {
        let { selectedCountry } = this.state;
        this.props.history.push({
            pathname: Actions.manage_states.view.url,
            state: { selectedCountry: selectedCountry }
        })
    }

    render() {
        const { loading, open, countryName } = this.state
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <Box>
                    <Paper className={classNames('paper-background')}>
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    Add State
                                </Box>
                                <Box className='sub-heading'>
                                    {`The State schedule of the ${alias_names['school']} is defined here over a period time.The academic year
                                    over 12 months of time.`}
                                </Box>
                            </Grid>
                            <Grid item md={3} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('manage_states', 'view') && <Button
                                        variant="contained"
                                        onClick={this.handleStateViewButton}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.manage_states.view.label}</Button>}
                                </Box>
                            </Grid>
                        </Grid>

                        <Box className='md-down-justify-start md-up-justify-start mb-y-20'>
                            <Box className="year-std-box mr-40">
                                <Box className="academic-std-head "> Country</Box>
                                <Box className=" aca-std-white-background">{countryName}</Box>
                            </Box>
                        </Box>

                        <Grid container className={classNames('header-align')}>
                            <Grid item md={6}>
                                <MultipleAddTextFields
                                    fieldDefaultValue={[]}
                                    fieldDetails={stateDetails_global}
                                    updateParent={this.updateStateListValue}
                                    isEmptyNotAllowed={true}
                                    ref={'state'}
                                    idFormat={'state_add_2022_08_11_2_pm_'}
                                />
                                <Box className='end-flex-prop  margin-top-30'>
                                    <Box>
                                        <Button variant="contained" color="primary"
                                            className='submit'
                                            disabled={this.state.submitDisable}
                                            onClick={() => this.validate()}>
                                            Submit &nbsp;{' '}
                                        </Button>
                                    </Box>
                                </Box>
                            </Grid>
                        </Grid>
                        <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                            <Alert onClose={this.handleClose} severity="error">
                                Enter State Details
                            </Alert>
                        </Snackbar>
                    </Paper>
                </Box>
            )
        }
    }
}
export default withRouter(ManageStates)




