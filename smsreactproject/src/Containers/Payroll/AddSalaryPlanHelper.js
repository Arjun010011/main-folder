import React, { Component } from 'react'
import {
    Paper, Box, Grid, Table, TableContainer, TableHead, TableCell,
    TableRow, TableBody, Button, MenuItem, FormHelperText, FormControl,
    FormControlLabel, Switch, Select, TextField
} from '@material-ui/core';
import { withRouter } from 'react-router-dom';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import { GET_URL, POST_URL } from 'Includes/urls';
import { getRequest } from 'Includes/api/apicall';
import { getUrlParam } from 'Includes/functions';
import classNames from "classnames";
import { postRequest } from 'Includes/api/apicall';
import Swal from 'sweetalert2'
import loadingBar from 'images/loading.gif'
import { FixedPayID } from 'Containers/Payroll/constants'
import { Actions } from 'Constants/permissions';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';
import commonMessages from 'Constants/messages';
import messages from './messages';
import { FormattedMessage } from 'react-intl';

function Alert(props) {
    return <MuiAlert elevation={6} variant='filled' {...props} />;
}

class AddSalaryPlanHelper extends Component {
    constructor() {
        super();
        let { year } = getUrlParam();
        this.state = {
            componentList: [],
            year: parseInt(year),
            salaryPlanHelper: { earnings: [], deductions: [] },
            errors: {},
            loading: true,

            submitDisable: false,
            newSalaryComponentList: [],
            open: false,
            alertData: '',
            component: [{ "id": FixedPayID, "name": "Fixed Pay" }]
        }
    }

    componentDidMount = () => {
        this.getSalaryComponent();
        this.getSalaryPlanHelper();
    }


    getSalaryComponent = async () => {
        await getRequest(GET_URL.salarycomponent.api, { is_active: true, formatted: 1 },
            this.props).then(response => {
                if (response && response.status === 200) {
                    let componentList = response.data.data;
                    this.setState({
                        componentList
                    });
                }
            })
    }


    getSalaryPlanHelper = async () => {
        let { year, component, salaryPlanHelper } = this.state;
        await getRequest(GET_URL.salaryplan.api, { financial_year: year }, this.props).then(response => {
            if (response && response.status === 200) {
                let salaryPlanHelperList = response.data.data;
                salaryPlanHelperList.map((data) => {
                    if (data.percentage_of === null && data.is_amount === false) {
                        data.percentage_of_component_id = FixedPayID
                        data.percentage_component_name = "Fixed Pay"
                    }
                    if (data.is_deduction) {
                        salaryPlanHelper.deductions.push(data);
                    }
                    else {
                        salaryPlanHelper.earnings.push(data);
                    }
                    let tmp = {
                        "id": data.salary_component,
                        "name": data.salary_component_name
                    }
                    component.push(tmp);

                });
                this.setState({
                    salaryPlanHelper,
                    loading: false,
                    component
                })
            }
        })
    }

    dependentCheck = (comp, value, errors, type, index) => {
        if (comp.percentage_of_component_id && comp.percentage_of_component_id === value) {
            errors[type + "percentage_of_component_id" + index] = 'Dependent Component';
            return true;
        }
        return false;
    }


    duplicateCheck = (component, value, type, errors) => {
        let error = false;
        for (const [index, comp] of component.entries()) {
            if (comp.salary_component === value) {
                this.setState({
                    open: true,
                    alertData: "Component is already exist(s)"
                });
                return true;
            }
            error = this.dependentCheck(comp, value, errors, type, index);
        }
        return error;
    }

    onChangeComponentName = async (e, index, type) => {
        let { name, value } = e.target;
        if (value) {
            let { salaryPlanHelper, componentList, errors, component } = this.state;
            this.clear_errors(errors, index, type);
            let error1 = this.duplicateCheck(salaryPlanHelper['earnings'], value, 'earnings', errors);
            let error2 = this.duplicateCheck(salaryPlanHelper['deductions'], value, 'deductions', errors);
            if (error1 || error2) {
                this.setState({
                    errors
                });
            }
            else {

                let changingComponent = salaryPlanHelper[type][index].salary_component;
                component.some((tmp, componentindex) => {
                    if (tmp.id === changingComponent) {
                        component.splice(componentindex, 1)
                    }
                });
                salaryPlanHelper[type][index][name] = value;
                componentList[type].some((com) => {
                    if (com.id === value) {
                        component.push({ "id": value, "name": com.name });
                    }
                });
                this.setState({
                    salaryPlanHelper,
                    component
                });
            }
        }
    }


    onChangeComponentType = (e, index, type) => {
        let { errors, salaryPlanHelper } = this.state;
        let { value, name } = e.target;
        this.clear_errors(errors, index, type);
        salaryPlanHelper[type][index][name] = value === 'true';
        salaryPlanHelper[type][index].rate = 0;
        salaryPlanHelper[type][index].percentage_of_component_id = 0;
        this.setState({
            salaryPlanHelper,
            errors
        });
    }

    clear_errors = (errors, index, type) => {
        delete errors[type + "percentage_of_component_id" + index]
        delete errors[type + "salary_component" + index]
        delete errors[type + "rate" + index]
    }


    onChangeComponentRate = (e, index, type) => {
        const { errors, salaryPlanHelper } = this.state;
        let { value, name } = e.target;
        this.clear_errors(errors, index, type);
        if ((salaryPlanHelper[type][index].is_amount && value <= 1000000) ||
            (!salaryPlanHelper[type][index].is_amount && value <= 100)) {
            salaryPlanHelper[type][index][name] = parseFloat(value);
            this.setState({
                salaryPlanHelper,
                errors
            });
        }
    }


    onChangeComponent = async (e, index, type) => {
        let { name, value } = e.target;
        if (value) {
            let { componentList, errors, salaryPlanHelper } = this.state;
            this.clear_errors(errors, index, type);
            let componentName
            componentList[type].map((data) => {
                if (data.id === value) {
                    componentName = data.name
                }
            });
            if (value === salaryPlanHelper[type][index].salary_component ||
                this.deadlockcheck(value, salaryPlanHelper[type][index].salary_component)) {
                errors[type + "percentage_of_component_id" + index] = componentName + ' is Deadlock Component';
                this.setState({
                    errors
                });
            }
            else {
                salaryPlanHelper[type][index][name] = value;
                this.setState({
                    salaryPlanHelper,
                    errors
                });
            }
        }

    }

    deadlockcheck(value, parentValue) {
        if (value === FixedPayID) {
            return false;
        }
        let { salaryPlanHelper } = this.state;
        let tempCompList = [...salaryPlanHelper.earnings, ...salaryPlanHelper.deductions];
        for (const comp of tempCompList) {
            if (comp.salary_component === value) {
                if (comp.percentage_of_component_id === 0) {
                    return false;
                }
                else if (comp.percentage_of_component_id === parentValue) {
                    return true;
                }
                return this.deadlockcheck(comp.percentage_of_component_id, parentValue);
            }
        }
        return false;
    }

    saveData = () => {
        let { salaryPlanHelper, errors, year } = this.state;
        this.validateSalaryPlan(errors, 'both');
        if ((Object.keys(errors).length === 0)) {
            let postList = [...salaryPlanHelper.earnings, ...salaryPlanHelper.deductions];
            postList.map((data) => {
                data.percentage_of = data.percentage_of_component_id === FixedPayID ? null : data.percentage_of_component_id;
            })

            this.setState({ submitDisable: true });
            let post_data = {
                financial_year: year,
                salary_plan: postList
            }
            let url = POST_URL.salaryplan.api;
            postRequest(url, post_data)
                .then((response) => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: 'Your Data has been saved',
                            showConfirmButton: false,
                            timer: 1500
                        })
                        this.viewPage();
                    }
                    this.setState({ submitDisable: false });
                });
        }
        else {
            this.setState({
                open: true,
                alertData: "Please clear errors",
                errors
            });
        }
    }

    viewPage = () => {
        this.props.history.push(Actions.payroll_salaryplanhelper.view.url);
    }

    addData = (type) => {
        let { salaryPlanHelper, errors, componentList } = this.state;
        this.validateSalaryPlan(errors, type, salaryPlanHelper[type]);
        if ((Object.keys(errors).length === 0)) {
            if (componentList[type].length === salaryPlanHelper[type].length) {
                this.setState({
                    open: true,
                    alertData: "No More " + type + " Component To Add"
                });
            }
            else {
                let data = {
                    salary_component: 0, is_amount: false, rate: 0,
                    percentage_of_component_id: 0, is_deduction: type === 'deductions'
                };
                salaryPlanHelper[type].push(data);
                this.setState({
                    salaryPlanHelper
                })
            }
        }
        else {
            this.setState({
                errors
            });
        }
    }


    validateSalaryPlan(errors, type) {
        let { salaryPlanHelper } = this.state;
        if (type === 'both') {
            this.validateComponentByType(salaryPlanHelper['earnings'], 'earnings', errors);
            this.validateComponentByType(salaryPlanHelper['deductions'], 'deductions', errors);
        }
        else {
            this.validateComponentByType(salaryPlanHelper[type], type, errors);
        }
    }

    validateComponentByType(components, type, errors) {
        components.map((data, index) => {
            if (!data.salary_component) {
                errors[type + 'salary_component' + index] = 'This field is mandatory';
            }
            if (!data.rate) {
                errors[type + 'rate' + index] = 'This field is mandatory';
            }
            if (!data.is_amount && data.percentage_of_component_id === 0) {
                errors[type + 'percentage_of_component_id' + index] = 'This field is mandatory';
            }
        });
    }



    handleRemove(index, type) {
        let { component, errors, salaryPlanHelper } = this.state
        let deletingComponent = salaryPlanHelper[type][index].salary_component;
        let error1 = salaryPlanHelper['earnings'].some((temp, index) => {
            return this.dependentCheck(temp, deletingComponent, errors, 'earnings', index);
        })
        let error2 = salaryPlanHelper['deductions'].some((temp, index) => {
            return this.dependentCheck(temp, deletingComponent, errors, 'deductions', index);
        })
        if (error1 || error2) {
            this.setState({
                errors
            });
        }
        else {
            salaryPlanHelper[type].splice(index, 1);
            component.some((tmp, componentindex) => {
                if (tmp.id === deletingComponent) {
                    component.splice(componentindex, 1)
                }
            });
            this.setState({
                salaryPlanHelper,
                errors: {},
                component
            });
        }
    }


    handleClose = () => {
        this.setState({
            open: false,
            errors: {}
        })
    }

    renderComponent = (salaryPlanHelperList, comp, component, errors, componentType) => {
        return (
            <>
                <Box className='Salary-component-heading'>
                    <FormattedMessage {...messages[componentType]} />
                </Box>
                <Box>
                    <TableContainer>
                        <Table size='small' aria-label='simple table' className='salaryplan-table-margin'>
                            <TableHead>
                                <TableRow className='salary-plan-table-header'>
                                    <TableCell className='salary-plan-header-label'><FormattedMessage {...messages.componentName} /></TableCell>
                                    <TableCell className='salary-plan-header-label'><FormattedMessage {...commonMessages.type} /></TableCell>
                                    <TableCell className='salary-plan-header-label'><FormattedMessage {...commonMessages.rate} /></TableCell>
                                    <TableCell className='salary-plan-header-label'>of Component</TableCell>
                                    <TableCell align='center'></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {salaryPlanHelperList && salaryPlanHelperList.map((data, index) => {
                                    return <TableRow key={index} className='salary-plan-table-data-row'>

                                        <TableCell className='fs-18' component='th' scope='row'>
                                            <FormControl
                                                error={errors[componentType + "salary_component" + index]}
                                                className='w-webkit-fill-available'
                                            >
                                                <Select name='salary_component'
                                                    value={data?.salary_component}
                                                    required={true}
                                                    onChange={e => this.onChangeComponentName(e, index, componentType)}
                                                >
                                                    {comp.map((temp) => {
                                                        return <MenuItem key={temp.id} value={temp.id}>{temp.name}</MenuItem>
                                                    })}
                                                </Select>
                                                <FormHelperText>{errors[componentType + "salary_component" + index]}</FormHelperText>
                                            </FormControl>
                                        </TableCell>

                                        <TableCell className='fs-18' component='th' scope='row'>
                                            {<FormattedMessage {...commonMessages.percentage} />}
                                            <FormControlLabel
                                                style={{ marginLeft: '0px', marginRight: '0px' }}
                                                control={<Switch checked={data.is_amount}
                                                    name="is_amount"
                                                    value={!data.is_amount}
                                                    color="primary"
                                                    onChange={(e) => this.onChangeComponentType(e, index, componentType)} />}
                                            />{<FormattedMessage {...commonMessages.amount} />}
                                        </TableCell>
                                        <TableCell className='fs-18' component='th' scope='row'>
                                            {data.is_amount && "₹"}&nbsp;
                                            <TextField
                                                id='outlined-name'
                                                fullWidth
                                                InputProps={{
                                                    inputProps: {
                                                        max: data.is_amount ? 1000000 : 100, min: 1,
                                                        style: { textAlign: 'right' }
                                                    }
                                                }}
                                                className={data.is_amount ? 'edit-amount-input-salary-plan' : 'edit-rate-input-salary-plan'}
                                                value={data.rate}
                                                type='number'
                                                name='rate'
                                                autoComplete="off"
                                                onChange={(e) => this.onChangeComponentRate(e, index, componentType)}
                                            />
                                            &nbsp;{!data.is_amount && "%"}
                                            <div className='error-text'>{errors[componentType + "rate" + index]}</div>
                                        </TableCell>
                                        <TableCell className='fs-18' component='th' scope='row'>
                                            {!data.is_amount &&
                                                <FormControl
                                                    error={errors[componentType + "percentage_of_component_id" + index]}
                                                    className='w-webkit-fill-available'
                                                >
                                                    <Select name='percentage_of_component_id'
                                                        value={data.percentage_of_component_id}
                                                        required={true}
                                                        onChange={e => this.onChangeComponent(e, index, componentType)}
                                                    >
                                                        {component.map((temp) => {
                                                            return <MenuItem key={temp.id} value={temp.id}>{temp.name}</MenuItem>
                                                        })}

                                                    </Select>
                                                    <FormHelperText>{errors[componentType + "percentage_of_component_id" + index]}</FormHelperText>
                                                </FormControl>
                                            }
                                        </TableCell>
                                        <TableCell className='fs-18'>
                                            <Button
                                                color="secondary"
                                                className='min-max-w-0'
                                                onClick={() => this.handleRemove(index, componentType)}>
                                                <DeleteOutlineIcon className='add-icon-stock-item' />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Button
                        variant='contained' p={1}
                        className='salary-plan-add-details'
                        onClick={() => this.addData(componentType)}
                    ><AddCircleOutlineOutlinedIcon style={{ marginRight: '10px', marginTop: '3px', fontSize: '25px', }} />
                        <FormattedMessage {...commonMessages.addMore} />
                    </Button>
                </Box>
            </>
        )
    }

    render() {
        const { loading, errors, submitDisable, alertData, open, component,
            salaryPlanHelper, componentList } = this.state;
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
                                    <FormattedMessage {...messages.salaryPlanHelper} />
                                </Box>
                            </Grid>
                            <Grid item md={4} xs={12} >
                                <Box className='header-align end-flex-prop'>
                                    <Button
                                        variant='container'
                                        onClick={() => this.viewPage()}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' />
                                        <FormattedMessage {...messages.salaryPlanHelper} />
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                        <Grid container className={classNames('flex-justify-center', 'header-align')}>
                            <Grid item md={12} xs={12} className={classNames('header-align')}>
                                <Box>
                                    {this.renderComponent(salaryPlanHelper['earnings'], componentList.earnings, component, errors, 'earnings')}
                                    {this.renderComponent(salaryPlanHelper['deductions'], componentList.deductions, component, errors, 'deductions')}
                                </Box>

                                <Box display='flex' justifyContent='flex-end' marginTop='60px'>
                                    <Button variant='contained'
                                        className='submit'
                                        disabled={submitDisable}
                                        onClick={() => this.saveData()}>
                                        Submit
                                    </Button>
                                </Box>
                                <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                                    <Alert onClose={this.handleClose} severity='error'>
                                        {alertData}
                                    </Alert>
                                </Snackbar>
                            </Grid>

                        </Grid>
                    </Paper>

                </div >
            )
        }
    }
}

export default withRouter(AddSalaryPlanHelper)
