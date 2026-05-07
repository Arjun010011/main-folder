import React, { Component } from 'react';
import { withRouter, Link } from 'react-router-dom';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Box, CircularProgress, Button, Paper, Grid } from '@material-ui/core';
import Swal from 'sweetalert2';
import Snackbar from '@material-ui/core/Snackbar';

import FeeTermPlanBenificiary from 'Containers/Finance/Components/FeeTermPlanBenificiary';
import { numberWithCommas } from 'Includes/functions';
import { GET_URL, POST_URL } from 'Includes/urls';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { validateDate, Alert, dateFormat, getUrlParam } from 'Includes/functions';
import './styles.scss';
import { Actions } from 'Constants/permissions';
import AllMUIDataTable from "Components/AllMUIDataTable";
import { DATATABLEROWSPERPAGEOPT, TRANSPORT_CODE } from "Constants";
import { FormattedMessage } from 'react-intl';
import commonMessage from 'Constants/messages';

class CreateFeeTermBenificiary extends Component {
    constructor(props) {
        super(props)
        this.state = {
            feePlanData: [],
            selectedFeePlan: {},
            feePlanwholeData: {},
            alertData: '',
            snackbar: false,
            permissions: ['create'],
            studentType: '',
            standardName: '',
            expandedRowsIndex: [0],
            beneficiary_data: [],
            deletable_ids: []
        };
        this.columns = [
            {
                name: "id",
                options: {
                    filter: false,
                    sort: true,
                    display: false
                },
            },
            {
                name: "codename",
                options: {
                    filter: false,
                    sort: true,
                    display: false
                },
            },
            {
                name: "fee_type_name",
                label: "Fee Type",
                options: {
                    filter: false,
                },
            },
            {
                name: "rate",
                label: "Total Amount",
                options: {
                    filter: false,
                    customBodyRender: (value, tableMeta) => {
                        if (tableMeta.rowData[1] === TRANSPORT_CODE) {
                            return `${value}%`
                        } else {
                            return numberWithCommas(value)
                        }
                    }
                },
            },
            {
                name: "total_terms",
                label: "Total Terms",
                options: {
                    filter: false,
                    customBodyRender: (value, tableMeta) => {
                        if (tableMeta['rowIndex'] in this.state.feePlanData && 'standard_fee' in this.state.feePlanData[tableMeta['rowIndex']] &&
                            this.state.feePlanData[tableMeta['rowIndex']]['standard_fee'].length) {
                            return `${this.state.feePlanData[tableMeta['rowIndex']]['standard_fee'].length}`
                        } else {
                            return 0
                        }
                    }
                },
            },
            {
                name: "standard_fee",
                options: {
                    filter: false,
                    sort: true,
                    display: false
                },
            },
        ];
        this.getFeeTypes = this.getFeeTypes.bind(this);
    }

    componentDidMount() {
        let { year, standard, studentType, standardName } = getUrlParam();
        if (year && standard && studentType) {
            this.setState({ year: year, standard: standard, tableUpdating: true, studentType: studentType, standardName: standardName })
            this.getFeeTypes(year, standard, studentType);
        } else {
            this.props.history.push(Actions.fee_term_benificiary.view.url);
        }
    }

    getFeeTypes = (year, standard, studentType) => {
        const params = { year: year, standard: standard, student_type: studentType };
        getRequest(GET_URL.beneficiary_fee_plan.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                let feePlanData = response.data.fee_plan_data;
                let beneficiary_data = [];
                if (response.data.beneficiary_data) {
                    response.data.beneficiary_data.map((data) => {
                        data['name'] = `${data['account_holder_name']} - ${data['bank_account']}`
                        beneficiary_data.push(data)
                    })
                }
                if (feePlanData.length > 0) {
                    feePlanData.forEach((plan, index) => {
                        plan.standard_fee.forEach(fee => {
                            fee.rate = Math.round(fee.rate);
                            fee.divide_into = 1;
                            // fee.beneficiary_split = [
                            //     { priority: 1, 'account': '', amount: fee.rate }
                            // ]
                        });
                        feePlanData[index]['total_terms'] = plan.standard_fee.length;
                    });
                }
                this.setState({
                    feePlanData,
                    tableUpdating: false,
                    beneficiary_data
                });
            } else {
                this.setState({
                    tableUpdating: false
                })
            }
        });
    }

    showErrorPopUp = (text) => {
        this.setState({ snackbar: true, alertData: text })
    }
    validateTotalAmount = () => {
        let fieldError = {}
        let beneficiary_list = []
        let return_value = true
        let feePlanData = [...this.state.feePlanData];
        for (let fee_plan_index in feePlanData) {
            let data = feePlanData[fee_plan_index];
            let termTotal = 0
            for (let standard_fee_ind in data.standard_fee) {
                let selectedFeeData = data.standard_fee[standard_fee_ind];
                termTotal = 0
                selectedFeeData.reason = ''
                beneficiary_list = []
                selectedFeeData.beneficiary_split.map((account, accIndex) => {
                    termTotal += parseFloat(account.rate)
                    if (!account.beneficiary_id) {
                        return_value = false
                        fieldError[`${standard_fee_ind}_${accIndex}_beneficiary_id`] = <FormattedMessage {...commonMessage.fieldMandatoryError} />
                    }
                    else if (beneficiary_list.includes(account.beneficiary_id)) {
                        return_value = false
                        fieldError[`${standard_fee_ind}_${accIndex}_beneficiary_id`] = <FormattedMessage {...commonMessage.duplicateFoundLabel} />
                    }
                    beneficiary_list.push(account['beneficiary_id'])
                })

                if (selectedFeeData.is_amount && termTotal !== parseFloat(selectedFeeData.rate)) {
                    return_value = false
                    selectedFeeData.reason = `Difference amount ${selectedFeeData.rate - termTotal}`;
                }
                else if (!selectedFeeData.is_amount && termTotal != 100) {
                    return_value = false
                    selectedFeeData.reason = `Difference percentage ${100 - termTotal}`;
                }
                if (!("is_primary_adjustment" in selectedFeeData)) {
                    return_value = false
                    selectedFeeData.reason = `Select any radio primary adjustment`;
                }
            }
        }
        this.setState({ feePlanData, fieldError });
        return return_value;
    }

    getPostData = () => {
        const { year, standard, deletable_ids } = this.state;
        let return_value = {
            year: parseInt(year),
            standard: parseInt(standard),
            data: [],
            deletable_ids: deletable_ids
        }
        let temp_list = []
        let feePlanData = [...this.state.feePlanData];
        for (let data of feePlanData) {
            for (let selectedFeeData of data.standard_fee) {
                selectedFeeData.beneficiary_split.map((account, index) => {
                    temp_list.push({
                        id: account.id,
                        fee_plan: selectedFeeData.id,
                        priority: account.priority,
                        rate: parseFloat(account.rate),
                        beneficiary: account.beneficiary_id,
                        is_amount: selectedFeeData.is_amount,
                        amount_type: 1,
                        // is_primary_adjustment: index === 0 ? true : false,
                    })
                })
            }
        }
        return_value['data'] = temp_list
        return return_value;
    }

    submitFeeTems = () => {
        const url = POST_URL.beneficiary_fee_plan.api;
        const postData = this.getPostData();
        if (this.validateTotalAmount()) {
            postRequest(url, postData, this.props).then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    });
                    const { year, standard } = getUrlParam();
                    this.getFeeTypes(year, standard);
                    this.props.history.push(Actions.fee_term_benificiary.view.url)
                }
            });
        }
    }

    updateFeeData = (selectedFeePlanData, deletable_ids) => {
        let feePlanData = [...this.state.feePlanData];
        for (let index in feePlanData) {
            let data = feePlanData[index];
            if (feePlanData[index].id === selectedFeePlanData.id) {
                feePlanData[index] = selectedFeePlanData;
                for (let standard_fee_ind in feePlanData[index].standard_fee) {
                    let selectedStdFeeData = feePlanData[index].standard_fee[standard_fee_ind];
                    feePlanData[index].hasError = false;
                }
                break;
            }
        }
        this.setState({ feePlanData, deletable_ids });
    }

    getTitle = () => {
        if (this.state.tableUpdating || this.props.loading) {
            return <CircularProgress className="white-text" />;
        }
    };

    handleCloseSnackbar = () => {
        this.setState({ alertData: '', snackbar: false });
    }

    expandGivenRosws = (allRowsExpanded) => {
        let temprowsExpanded = allRowsExpanded.map((data) => {
            return data['index']
        })
        this.setState({
            expandedRowsIndex: temprowsExpanded
        })
    }

    render() {
        const { feePlanData, permissions, studentType,
            snackbar, alertData, standardName, expandedRowsIndex, beneficiary_data
        } = this.state;
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "responsive",
            filter: false,
            download: false,
            print: false,
            viewColumns: false,
            rowsPerPageOptions: DATATABLEROWSPERPAGEOPT,
            expandableRows: true,
            search: false,
            expandableRowsHeader: false,
            rowsExpanded: expandedRowsIndex,
            onRowExpansionChange: (currentRowsExpanded, allRowsExpanded, rowsExpanded) => {
                this.expandGivenRosws(allRowsExpanded)
            },
            renderExpandableRow: (rowData, rowMeta) => {
                return <FeeTermPlanBenificiary
                    selectedFeePlan={feePlanData[rowMeta['rowIndex']]}
                    dataIndex={rowMeta['dataIndex']}
                    updateFeeData={this.updateFeeData}
                    beneficiary_data={beneficiary_data}
                />
            }
        };
        const disabled = !permissions.includes('create') ? true : false;
        return (
            <Box>
                <Paper className='paper-background'>
                    <Grid container>
                        <Grid item md={6} xs={12} className='header-align'>
                            <Box className='heading'>
                                {Actions.fee_term_benificiary.create.label}
                            </Box>
                        </Grid>
                        <Grid item md={6} xs={12} >
                            <Box className='header-align end-flex-prop'>
                                <Button
                                    variant='contained'
                                    component={Link} to={Actions.fee_term_benificiary.view.url + '?studentType=' + studentType}
                                    className='editbutton-view'
                                ><VisibilityOutlinedIcon className='visibility-icon' /> View {Actions.fee_term_benificiary.create.label}</Button>
                            </Box>
                        </Grid>
                        <Grid item md={6} xs={12} >
                            <Box className="year-std-box" mr={2}>
                                <Box className="academic-std-head"> <FormattedMessage {...commonMessage.standard} /> </Box>
                                <Box className="aca-std-white-background">{standardName}</Box>
                            </Box>
                        </Grid>
                    </Grid>
                    <Box mt={4}>
                        <AllMUIDataTable
                            data={feePlanData}
                            key={feePlanData}
                            title={this.getTitle()}
                            columns={this.columns}
                            options={options}
                            onTableChange={this.changePage}
                        />
                    </Box>
                    {!disabled &&
                        <Box className="submt-button-float-bottom" mt={3}>
                            <Button variant='contained'
                                color='primary' className='submit'
                                disabled={false}//{submitDisable}
                                onClick={this.submitFeeTems}>submit
                            </Button>
                        </Box>
                    }
                </Paper>
                <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={snackbar} autoHideDuration={10000} onClose={this.handleCloseSnackbar}>
                    <Alert onClose={this.handleCloseSnackbar} severity="error">
                        {alertData}
                    </Alert>
                </Snackbar>
            </Box>
        )
    }
}


export default withRouter(CreateFeeTermBenificiary);