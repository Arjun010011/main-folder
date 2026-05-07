import React, { Component } from 'react';
import { Paper, Box, Grid, Typography, Button, CircularProgress } from '@material-ui/core';
import Swal from 'sweetalert2';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames';

import { Dropdown } from 'Components/DropDown';
import StudentListActions from 'Includes/StudentListActions';
import ActionColumn from 'Components/ActionColumnNew';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif';
import { getRequest, deleteRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL, POST_URL } from 'Includes/urls';
import { nameAndNumberRegex } from 'Constants/regularExpression';
import { Actions } from 'Constants/permissions';
import { dateFormat, isUserHasPermission, getAcademicYear, SetAcademicYear } from 'Includes/functions';
import { viewTime } from 'Includes/viewFunctions';
import { options } from 'Constants';

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

class PeriodList extends Component {
    constructor() {
        super()
        this.state = {
            periodList: [],
            loading: true,
            selectedToDelete: [],
            tableUpdating: false,
            yearList: [],
            year: '',
            errorContent: '',
            error: {},
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: false,
                        sort: false,
                        display: false
                    }
                },
                {
                    name: "name",
                    label: "Plan Name",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "standard_list",
                    label: `${alias_names['standard']}`,
                    options: {
                        filter: true,
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                {value.map((data, index) => {
                                    return (
                                        data.length == (index + 1) && data.length !== 1 ?
                                            ` ${data.name}` : `${(index ? ', ':" ")+data.name}`
                                    )
                                })}
                            </div>)
                        }
                    },
                },
                {
                    name: "Actions",
                    label: "Action",
                    options: {
                        display: this.updatePermissions('display'),
                        filter: false,
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <StudentListActions
                                    id={tableMeta.rowData[0]}
                                    index={tableMeta.rowIndex}
                                    deleteStudent={this.deleteType}
                                    editURL={Actions.period_plan.update.url}
                                    viewURL={Actions.period_plan_individual.view.url}
                                    enabledActions={this.state.enabledActions}
                                    handleActive={this.copyPeriod}
                                />
                            </div>
                            );
                        }
                    }
                }

            ]
        }
    }

    copyPeriod = async (id) => {
        const { yearList } = this.state;
    
        const academicYearOptions = yearList
            .map(y => `<option value="${y.id}">${y.name}</option>`)
            .join('');
    
        Swal.fire({
            title: 'Copy Period Plan',
            html: `
                <label>New Plan Name <span style="color:red">*</span></label>
                <input id="swal-plan-name" class="swal2-input" placeholder="Enter new plan name">
    
                <label>Academic Year <span style="color:red">*</span></label>
                <select id="swal-academic-year" class="swal2-input">
                    <option value="">Select Year</option>
                    ${academicYearOptions}
                </select>
    
                <div id="swal-standards-container" style="max-height:150px; overflow-y:auto; text-align:left; margin-top:10px; border:1px solid #ddd; padding:8px; border-radius:4px;">
                    <label>Standards <span style="color:red">*</span></label>
                    <p style="font-size:12px; color:#666; margin:4px 0">(Select by ticking the boxes)</p>
                    <div id="swal-standards"></div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Copy',
            type: 'question',
            preConfirm: () => {
                const planNameEl = document.getElementById('swal-plan-name');
                const academicYearEl = document.getElementById('swal-academic-year');
                const standardsContainer = document.querySelector('#swal-standards');
                
                if (!planNameEl || !academicYearEl || !standardsContainer) {
                    Swal.showValidationMessage('Required elements not found');
                    return false;
                }
                
                const planName = planNameEl.value.trim();
                const academicYear = academicYearEl.value;
                const standards = Array.from(standardsContainer.querySelectorAll('input[type="checkbox"]:checked'))
                    .map(cb => cb.value);
    
                if (!planName) {
                    Swal.showValidationMessage('New Plan Name is required');
                    return false;
                }
                if (!academicYear) {
                    Swal.showValidationMessage('Academic Year is required');
                    return false;
                }
                if (standards.length === 0) {
                    Swal.showValidationMessage('Please select at least one Standard');
                    return false;
                }
                return { planName, academicYear, standards };
            },
            onOpen: () => {
                const academicYearDropdown = document.getElementById('swal-academic-year');
                const standardContainer = document.getElementById('swal-standards');
    
                academicYearDropdown.addEventListener('change', async (event) => {
                    const selectedYear = event.target.value;
                    standardContainer.innerHTML = ''; // clear old checkboxes
    
                    if (selectedYear) {
                        try {
                            const standardResponse = await getRequest(
                                GET_URL.getstandard.api,
                                { is_active: true, academic_year: selectedYear },
                                this.props
                            );
    
                            if (standardResponse && standardResponse.status === 200) {
                                if (standardResponse.data.data.length === 0) {
                                    standardContainer.innerHTML = '<p style="color:#999">No standards available</p>';
                                } else {
                                    standardResponse.data.data.forEach(s => {
                                        const checkbox = document.createElement('div');
                                        checkbox.style.marginBottom = "4px";
                                        checkbox.innerHTML = `
                                            <label style="font-size:13px; cursor:pointer;">
                                                <input type="checkbox" value="${s.id}" style="margin-right:5px;">
                                                ${s.name}
                                            </label>`;
                                        standardContainer.appendChild(checkbox);
                                    });
                                }
                            }
                        } catch (err) {
                            console.error('Error fetching standards:', err);
                            standardContainer.innerHTML = '<p style="color:red">Error loading standards</p>';
                        }
                    }
                });
            }
        }).then((result) => {
            if (result.value) {
                const { planName, academicYear, standards } = result.value;
                this.performCopyRequest(id, planName, academicYear, standards);
            }
        });
    };
    
    performCopyRequest = (sourceId, newName, academicYearId, standards) => {
        this.setState({ tableUpdating: true });
    
        const url = POST_URL.period.api; // ✅ Use POST URL
        const payload = {
            source_plan_id: sourceId,
            new_plan_name: newName,
        new_academic_year: academicYearId,
            standards: standards.join(','),
            is_period_copy: true
        };
    
        postRequest(url, payload, this.props).then(response => {
            if (response && response.status === 200) {
                this.getPeriodList(); // refresh list after copy
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: response.data.Reason || 'Period Plan Copied Successfully',
                    showConfirmButton: false,
                    timer: 1500
                });
            }
            this.setState({ tableUpdating: false });
        }).catch((error) => {
            this.setState({ tableUpdating: false });
            Swal.fire({
                type: 'error',
                title: 'Copy Failed',
                text: error?.response?.data?.Reason || 'Something went wrong while copying'
            });
        });
    };

    updatePermissions = (name) => {
        let test = true
        const hasViewPermission = isUserHasPermission('period_plan', 'view')
        const hasEditPermission = isUserHasPermission('period_plan', 'update')
        const hasDeletePermission = isUserHasPermission('period_plan', 'delete')
        const hasCreatePermission = isUserHasPermission('period_plan', 'create')
        let enabledActions = [];
        if (hasCreatePermission) {
            enabledActions.push('copy')
        }
        if (hasViewPermission) {
            enabledActions.push('view')
        }
        if (hasEditPermission) {
            enabledActions.push('edit')
        }
        if (hasDeletePermission) {
            enabledActions.push('delete')
        }
        if (enabledActions.length === 0) {
            test = false;
        }
        if (name === 'display') {
            return test
        }
        else {
            this.setState({
                enabledActions: enabledActions,
                columns: this.state.columns
            })
        }
    }

    componentDidMount = () => {
        this.getAcademicYearList()
        this.updatePermissions('actions');
        this.setState({
            options: options
        })
    }

    getAcademicYearList = () => {
        let { loading } = this.state;
        const url = GET_URL.getacademicyear.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                if (getAcademicYear()) {
                    let year = getAcademicYear()
                    if (year !== 0) {
                        this.setState({
                            year
                        }, () => {
                            this.getPeriodList()
                        })
                    }
                }
                else {
                    loading = false
                }
                let fromYear = ''
                let ToYear = ''
                response.data.data.map((data) => {
                    fromYear = data.start_date.split('-');
                    ToYear = data.end_date.split('-');
                    // data.name = fromYear[0] + '-' + ToYear[0]
                })
                this.setState({
                    yearList: response.data.data,
                    loading
                })
            }
        })
    }

    getPeriodList = () => {
        const { year } = this.state;
        this.setState({ tableUpdating: true })
        const url = GET_URL.period.api
        const params = { is_active: true, academic_year: year }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    periodList: response.data.data,
                    loading: false,
                    tableUpdating: false,
                })

            }
        })
    }

    deleteType = async (id, index) => {
        this.setState({ tableUpdating: true })
        let { periodList, columns } = this.state
        const del_url = DEL_URL.period.api
        const url = del_url + id + '/';
        deleteRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                periodList.splice(index, 1)
                this.setState({
                    periodList,
                    columns: [...columns]
                })
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: response.data.Reason,
                    showConfirmButton: false,
                    timer: 1500
                })
            }
        })
        this.setState({ tableUpdating: false })
    }

    onChange = (e) => {
        const { name, value } = e.target;
        if (value != 0) {
            this.setState({ [name]: value }, () => {
                if (name === 'year') {
                    SetAcademicYear(value)
                    this.getPeriodList()
                }
            })
        }
    }

    handleAddPeriodButton = () => {
        let { year, error, alertData, yearList } = this.state;
        if (year !== '') {
            let yearName, fromDate, toDate
            yearList.map((data) => {
                if (data.id == year) {
                    yearName = data.name
                    fromDate = data.start_date
                    toDate = data.end_date
                }
            })
            let yearInformation = {
                year: year,
                yearName: yearName,
                fromDate: fromDate,
                toDate: toDate,
            }
            let searchParam = "?" + new URLSearchParams(yearInformation).toString()
            this.props.history.push({
                pathname: Actions.period_plan.create.url,
                search: searchParam,
            });
        }
        else {
            alertData = 'Please Select Academic Year'
            error.year = alertData
            this.setState({
                open: true,
                alertData,
                error
            })
        }
    }

    render() {
        const { loading, periodList, columns, options, tableUpdating, yearList, year, open, alertData, error } = this.state
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
                                    Period Plan
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('period_plan', 'create') && <Button
                                        variant="contained"
                                        onClick={this.handleAddPeriodButton}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.period_plan.create.label}</Button>}
                                </Box>
                            </Grid>
                        </Grid>
                        <Box className='header-align'>
                            <Dropdown
                                data={yearList}
                                name='year'
                                value={year}
                                onChange={this.onChange}
                                label='Academic Year'
                                hideSelect={true}
                                error={error.year}
                            />
                        </Box>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={12} xs={12}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={periodList}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        data={periodList}
                                        columns={columns}
                                        options={options}
                                    />
                                </Paper>
                            </Grid>
                        </Grid>
                    </Paper>
                </Box>
            )
        }
    }
}
export default withRouter(PeriodList)
