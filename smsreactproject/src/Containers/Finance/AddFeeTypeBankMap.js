
import React, { Component } from 'react';
import { Paper, Box, Button, Grid, TextField } from '@material-ui/core';
import Swal from 'sweetalert2';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link, withRouter } from 'react-router-dom';
import classNames from 'classnames';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import Snackbar from '@material-ui/core/Snackbar';

import loadingBar from 'images/loading.gif'
import { Dropdown } from 'Components/DropDown'
import { GET_URL, POST_URL } from 'Includes/urls';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { isUserHasPermission, Alert } from 'Includes/functions';
import { Actions } from 'Constants/permissions';
import './styles.scss';

class AddFeeTypeBankMap extends Component {
    constructor(props) {
        super(props);
        this.state = {
            yearList: [],
            feeTypeList: [],
            year: 0,
            yearName: '',
            standard: 0,
            fieldError: {},
            fieldValues: {},
            textFieldShow: {},
            selectAllAmt: '',
            selectAllError: '',
            applicationplan: [],
            loading: true,
            submittingData: false,
            snackbar: false,
            alertData: '',
            bankList: []
        };
    }

    componentDidMount() {
        this.getFeeTypes();
    }

    getFeeTypes = () => {
        const param = { available_for_bank: true }
        getRequest(GET_URL.addFeeType.api, param, this.props).then((response) => {
            if (response && response.status === 200) {
                const feeTypeList = response.data.data;
                this.setState({ feeTypeList }, () => this.getBankList());
            }
            else {
                this.setState({ loading: false })
            }
        });
    }

    getBankList = () => {
        const param = { available_for_bank: true, is_active: true }
        getRequest(GET_URL.bankdetail.api, param, this.props).then((response) => {
            if (response && response.status === 200) {
                let bankList = response.data.data;
                bankList.map((data) => data.name = data.display_name)
                this.setState({ bankList, loading: false });
            }
            else {
                this.setState({ loading: false })
            }
        });
    }

    onChange = (e, index) => {
        const { value } = e.target
        let { feeTypeList, bankList, snackbar, alertData, fieldError } = this.state;
        let bank_name, account_num, id
        // feeTypeList.map((data) => {
        //     if (data.bank == value) {
        //         snackbar = true
        //         alertData = `Selected bank is already mapped to ${data.name}`
        //         fieldError[`bankId${index}`] = `Selected bank is already mapped to ${data.name}`
        //     }
        // })
        if (snackbar) {
            delete feeTypeList[index]['bank']
            delete feeTypeList[index]['bank_name']
            delete feeTypeList[index]['account_num']
            this.setState({ feeTypeList, snackbar: false, alertData })
        }
        else {
            bankList.map((data) => {
                if (data.id == value) {
                    bank_name = data.bank_name
                    account_num = data.account_num
                    id = data.id
                }
            })
            feeTypeList[index]['bank'] = id
            feeTypeList[index]['bank_name'] = bank_name
            feeTypeList[index]['account_num'] = account_num
            delete fieldError[`bankId${index}`]
            this.setState({
                feeTypeList,
                fieldError
            })
        }
    }

    getPostData = () => {
        const { feeTypeList } = this.state;
        let returnData = [];
        let temp = {}
        feeTypeList.map((data) => {
            if (data.bank) {
                temp = {}
                temp['bank'] = data['bank']
                temp['fee_type'] = data['id']
                returnData.push(temp)
            }
        })
        if (returnData.length === 0) {
            returnData = false
            this.setState({
                snackbar: true,
                alertData: 'Select Atleast One Bank'
            })
        }
        return returnData;
    }

    saveData = () => {
        const url = POST_URL.bankfeetype.api;
        const validated_postData = this.getPostData();
        if (validated_postData) {
            this.setState({ submittingData: true });
            postRequest(url, validated_postData, this.props).then((response) => {
                if (response && response.status === 200) {
                    this.props.history.push(Actions.fee_type_bank_map.view.url)
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    });
                }
                else {
                    this.setState({ submittingData: false });
                }
            });
        }
    }

    handleClose = () => {
        this.setState({
            snackbar: false
        })
    }
    render() {
        const { year, bankList, yearName, feeTypeList, fieldError, fieldValues, selectAllAmt, selectAllError, snackbar, alertData } = this.state;
        if (this.state.loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <Paper>
                    <Box className="paper-background">
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    Fee Type Bank Map
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('fee_type_bank_map', 'view') && <Button
                                        variant='contained'
                                        component={Link} to={Actions.fee_type_bank_map.view.url}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.fee_type_bank_map.view.label}</Button>}
                                </Box>
                            </Grid>


                            {feeTypeList.length !== 0 &&
                                <Grid item md={12} xs={12}>
                                    <Paper className='fee-type-bank-map-bg header-align'>
                                        <Grid container spacing={2}>
                                            <Grid item md={3} xs={12}>
                                                <Box className='fee-type-bank-map-label header-align'>
                                                    Fee Types
                                                </Box>
                                            </Grid>
                                            <Grid item md={4} xs={12}>
                                                <Box className='fee-type-bank-map-label header-align'>
                                                    Bank ID
                                                </Box>
                                            </Grid>
                                            {/* <Grid item md={2} xs={12}>
                                                <Box className='fee-type-bank-map-label header-align'>
                                                    Bank Name
                                                </Box>
                                            </Grid> */}
                                            <Grid item md={2} xs={12}>
                                                <Box className='fee-type-bank-map-label header-align'>
                                                    Account Num
                                                </Box>
                                            </Grid>

                                        </Grid>
                                        {
                                            feeTypeList.map((feeType, index) => {
                                                return <Grid container spacing={2} className={feeTypeList.length > 0 ? "align-items-center p-5px" : "display-none"}>
                                                    <Grid item md={3} xs={12}>
                                                        <Box className='fee-type-bank-map-header header-align'>
                                                            {feeType.name}
                                                        </Box>
                                                    </Grid>
                                                    <Grid item md={4} xs={12}>
                                                        <Dropdown
                                                            data={bankList}
                                                            name='bank'
                                                            fullWidth
                                                            value={feeType.bank ? feeType.bank : ''}
                                                            onChange={(e) => this.onChange(e, index)}
                                                            label='Bank ID'
                                                            error={fieldError[`bankId${index}`]}
                                                            size='small'
                                                        />
                                                    </Grid>
                                                    {/* <Grid item md={2} xs={6}>
                                                        <Box className='fee-type-bank-map-header'>
                                                            {feeType.bank_name}
                                                        </Box>
                                                    </Grid> */}
                                                    <Grid item md={2} xs={6}>
                                                        <Box className='fee-type-bank-map-header'>
                                                            {feeType.account_num}
                                                        </Box>
                                                    </Grid>
                                                </Grid>
                                            })
                                        }
                                        <Box className="submt-button-float-bottom" mt={3}>
                                            <Button variant='contained'
                                                color='primary' className='submit'
                                                onClick={() => this.saveData()} >
                                                Submit
                                            </Button>
                                        </Box>
                                    </Paper>
                                </Grid>}
                            {feeTypeList.length === 0 &&
                                <Grid item md={12} className='header-align'>
                                    <BlankPagewithIcon data="All fee types are mapped with bank" />
                                </Grid>

                            }
                        </Grid>
                    </Box>

                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={snackbar} autoHideDuration={10000} onClose={this.handleClose}>
                        <Alert onClose={this.handleClose} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>
                </Paper>
            )
        }
    }
}

export default withRouter(AddFeeTypeBankMap);
