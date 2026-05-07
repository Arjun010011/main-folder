import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { Link, withRouter } from 'react-router-dom';
import { Grid, Paper, Box, Button } from '@material-ui/core';
import { Actions } from 'Constants/permissions';
import classNames from 'classnames';
import { isUserHasPermission } from 'Includes/functions';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import Snackbar from '@material-ui/core/Snackbar';
import { Alert } from 'Includes/functions';
import loadingBar from 'images/loading.gif'
import { POST_URL, GET_URL, PUT_URL } from 'Includes/urls';
import { postRequest, getRequest, putRequest } from 'Includes/api/apicall';
import MultiSelect from "react-multi-select-component";
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import OutlinedInput from '@material-ui/core/OutlinedInput';
import FormHelperText from '@material-ui/core/FormHelperText';
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";


const header = 'Add Kilometer Price Plan'
const subheader = '  Here You can add kilometer price plan for the standards'

const override = {
    "selectSomeItems": "Select Standards",
    "allItemsAreSelected": "All Standards are selected.",
    "selectAll": "Select All",
    "search": "Search",
    "clearSearch": "Clear Search"
}

class AddPricePlan extends Component {
    constructor(props) {
        super(props)
        this.state = {
            year: '',
            yearName: '',
            loading: true,
            snackbar: false,
            alertData: '',
            selected: [],
            planname: '',
            StandardList: [],
            options: [],
            isEdit: false,
            planid: '',
        }
    }

    componentDidMount() {
        let { selected } = this.state
        let { year, yearName, planname, selectedStandards, isEdit, planid } = this.props.location.state.detail;
        if (selectedStandards) {
            selectedStandards.map((data) => {
                let standard_data = {
                    name: data.name,
                    // value: data.name,
                    id: data.id,
                }
                selected.push(standard_data)
            })
        }
        this.setState({
            year: year,
            yearName: yearName,
            planname: planname,
            selected,
            isEdit: isEdit,
            planid: planid

        }, () => {
            this.getStandardList()
        })
    }

    getStandardList = () => {
        let { options, StandardList } = this.state
        let url = GET_URL.getstandard.api
        let params = { academic_year: this.state.year }
        getRequest(url, params).then((response) => {
            if (response && response.status === 200) {
                StandardList = response.data.data
                StandardList.map((data) => {
                    let optionformat = {
                        name: data.name,
                        // value: data.name,
                        id: data.id
                    }
                    options.push(optionformat)
                })
            }
            this.setState({
                options: options,
                StandardList: StandardList,
                loading:false
            })
        })
    }

    setSelected = (data) => {
        let { selected } = this.state
        selected = data
        this.setState({
            selected,
        })
    }

    handleChange = (e) => {
        let { planname } = this.state
        let value = e.target.value
        planname = value
        this.setState({
            planname
        })
    }

    submit = () => {
        let { selected, planname, StandardList, isEdit, planid } = this.state
        if (!Boolean(planname)) {
            this.setState({
                error: true,
                alertData: `Plan Name can not be empty`,
                snackbar: true,
            })
        }
        else if (selected.length === 0) {
            this.setState({
                error: true,
                alertData: `Please Select Standard`,
                snackbar: true,
            })
        }
        else {
            let selectedStandard = []
            selected.map((data) => {
                selectedStandard.push(data.id)
            })
            let postData = {
                name: planname,
                standard: selectedStandard,
                academic_year: this.state.year
            }
            if (!isEdit) {
                const url = POST_URL.routepriceplan.api;
                postRequest(url, postData).then((response) => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: 'Your Data has been saved',
                            showConfirmButton: false,
                            timer: 1500
                        })
                        this.props.history.push({
                            pathname: Actions.transport_priceplan.view.url,
                        });
                    }
                })
            }
            else if (isEdit) {
                let put_url = PUT_URL.routepriceplan.api + planid + '/'
                let selectedStandard = []
                selected.map((data) => {
                    selectedStandard.push(data.id)
                })
                let post_data = {
                    name: planname,
                    standard: selectedStandard,
                    academic_year: this.state.year
                }
                putRequest(put_url, post_data, this.props).then(response => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: response.data.Reason,
                            showConfirmButton: false,
                            timer: 1500
                        })
                        this.setState({
                            isEdit: false
                        }, () => {
                            this.props.history.push({
                                pathname: Actions.transport_priceplan.view.url,
                            });
                        })
                    }
                })
            }
        }
    }


    handleClose = () => {
        this.setState({
            snackbar: false,
            alertFixed: false,
            errors: {}
        })
    }

    render() {
        let { yearName, loading, snackbar, alertData, selected, planname, options } = this.state
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        } else {
            return (
                <Paper className='paper-background'>
                    <Box>
                        <Box>
                            <Grid container >
                                <Grid item md={6} xs={12} sm={12} className={classNames('header-align')}>
                                    <Box className='heading'>
                                        {header}
                                    </Box>
                                    <Box className='sub-heading'>
                                        {subheader}
                                    </Box>
                                    <Box className="year-std-box mr-40">
                                        <Box className="academic-std-head "> For Academic Year</Box>
                                        <Box className="aca-std-white-background">{yearName}</Box>
                                    </Box>
                                </Grid>
                                <Grid item md={6} xs={12} >
                                    <Box className={classNames('header-align', 'end-flex-prop')}>
                                        {isUserHasPermission('transport_price', 'view') && <Button
                                            variant="contained"
                                            component={Link} to={Actions.transport_priceplan.view.url}
                                            className='editbutton-view'
                                        ><VisibilityOutlinedIcon className='visibility-icon' />  {'Price Plan'}</Button>}
                                    </Box>
                                </Grid>
                                <Box className="margin-top-30">
                                    <Box >
                                        <Box className='priceplan'>
                                            <FormControl className='marign-right-30' variant="outlined">
                                                <InputLabel htmlFor="component-outlined">Plan Name</InputLabel>
                                                <OutlinedInput id="component-outlined"
                                                    value={planname}
                                                    onChange={(e) => this.handleChange(e)}
                                                    label="Price Plan Name"

                                                />
                                                <FormHelperText id="component-helper-text">For Example: Primary</FormHelperText>
                                            </FormControl>

                                            {/* <MultiSelect
                                                className='multiselect-width multi-select'
                                                options={options}
                                                value={selected}
                                                onChange={(e) => this.setSelected(e)}
                                                labelledBy={"Select"}
                                                overrideStrings={override}
                                            /> */}
                                            <MultipleSelectDropdown
                                                data_list={options}
                                                selected_list={selected}
                                                error={false}
                                                label={'Select Standard'}
                                                onChange={(e) => this.setSelected(e)}
                                            />
                                        </Box>
                                        <Box className='end-flex-prop  width-100 mt-30'>
                                            <Box>
                                                <Button variant="contained" color="primary"
                                                    className='submit'
                                                    disabled={this.state.submitDisable}
                                                    onClick={() => this.submit()}>
                                                    Submit &nbsp;{' '}
                                                </Button>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>
                            </Grid>

                            <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={snackbar} autoHideDuration={2000} onClose={() => this.handleClose()}>
                                <Alert onClose={() => this.handleClose()} severity='error'>
                                    {alertData}
                                </Alert>
                            </Snackbar>
                        </Box>
                    </Box>
                </Paper>
            )
        }
    }
}

export default withRouter(AddPricePlan)
