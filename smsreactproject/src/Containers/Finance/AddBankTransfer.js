import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter, Link } from 'react-router-dom';
import { Paper, Box, Grid, Button, TextareaAutosize, TextField, FormControl, FormHelperText, CircularProgress, Tooltip, Divider, Snackbar } from '@material-ui/core';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { MuiPickersUtilsProvider, KeyboardDatePicker, } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import DeleteIcon from '@material-ui/icons/Delete';

import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import commonMessages from 'Constants/messages'
import { FormattedMessage } from 'react-intl';

import BlankPagewithIcon from 'Components/BlankPageWithIcon'
import { DropDownWithSearch } from 'Components/DropDownWithSearch';
import loadingBar from 'images/loading.gif'
import { maxFileSize, minDate } from 'Constants'
import { supported_receipts, image_formats } from 'Containers/Expenses/Constants';
import { Dropdown } from 'Components/DropDown';

import { gstinNumberRegex, amountRegexWithDecimals } from 'Constants/regularExpression'
import { getRequest, putRequest, postRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, POST_URL, DEL_URL } from 'Includes/urls'
import { getUrlParam, numberWithCommas, dateFormat, validateDate, Alert, isUserHasPermission, NumberFormatCustom } from 'Includes/functions';
import './styles.scss';
import { Actions } from 'Constants/permissions';


class AddBankTransfer extends Component {

    constructor(props) {
        super(props)

        this.state = {
            submitDisable: false,
            transfer: {
                receipt_preview: '',
                receipt: '',
                transferType: 'Cash in Hand to Bank',
                selectedDate: new Date(),
                amount: '',
                refNumber: '',
                comment: '',
                fromBank: null,
                toBank: null,
                fromCashInHand: null,
                toCashInHand: null,

            },
            fieldErrors: {},
            helperText: {},
            imagesPreview: [],
            imageUploading: false,
            largeImagePreview: '',
            loading: true,
            enableUploadIcons: true,
            isEnable: {},
            upload_name: 'Upload Receipt',
            openError: false,
            alertData: 'Clear the errors',
            submitDisable: false,
            pageLoading: false,
            isBlankPage: false,
            bankList: [],
            fromBankInfo: {},
            toBankInfo: {},
            staffList: [],
            staffList: [],
            fromBankAvailableAmount: 0,
            fromStaffAvailableAmount: 0,

            denominationList: [],
            denominationCounts: {}
        }
    }


    componentDidMount = () => {
        this.getBankList();
        // Only get staff list for toCashInHand dropdown (Cash in Hand to Cash in Hand transfers)
        this.getStaffList();

        this.getDenominationList();

        // Get user from localStorage and set fromCashInHand
        const user = localStorage.getItem("user") != "undefined" && localStorage.getItem("user")
            ? JSON.parse(localStorage.getItem("user"))
            : null;

        if (user) {
            // Ensure user has id property (use id or user_id)
            const userId = user.id || user.user_id;
            if (userId) {
                // Set fromCashInHand with user details
                const fromCashInHand = {
                    id: userId,
                    user_id: userId,
                    full_name: user.full_name || user.name || '',
                    name: user.name || user.full_name || ''
                };

                this.setState({
                    transfer: {
                        ...this.state.transfer,
                        fromCashInHand: fromCashInHand
                    }
                }, () => {
                    // Fetch available amount if transfer type requires cash in hand
                    const transferType = this.state.transfer.transferType;
                    if (transferType === 'Cash in Hand to Bank' || transferType === 'Cash in Hand to Cash in Hand') {
                        this.getAvailableAmount({ from_cash_in_hand: userId });
                    }
                });
            }
        }
    }

    getBankList = () => {
        const url = GET_URL.bankdetail.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    bankList: response.data.data || [],
                    loading: false,
                })
            }
        })
    }

    getStaffList = (page = 1) => {
        const url = GET_URL.staffWallet.api
        const params = { is_active: true, limit: 10, pageno: page }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                const responseData = response.data?.data || {};
                const walletData = responseData.data_list || [];
                const staffWithWallet = walletData.map(wallet => ({
                    ...wallet,
                    user_id: wallet.user_id,
                    full_name: wallet.staff_name || '',
                }));
                this.setState(prevState => ({
                    staffList: page === 1 ? staffWithWallet : [...prevState.staffList, ...staffWithWallet],
                }), () => {
                    const totalCount = responseData.count || 0;
                    if (this.state.staffList.length < totalCount) {
                        this.getStaffList(page + 1);
                    }
                })
            }
        })
    }



    getDenominationList = () => {
        const url = GET_URL.denominations.api;
        const params = { is_active: true };
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    denominationList: response.data.data || [],
                })
            }
        }).catch(() => {
        })
    }

    handleChange(event, acceptFileType) {
        let { transfer, enableUploadIcons } = this.state
        this.setState({ enableUploadIcons: false, alertImageData: '' })
        let fileName = event.target.files[0]['name']
        let file_extension = `${fileName.slice((Math.max(0, fileName.lastIndexOf(".")) || Infinity) + 1)}`;
        let is_supported_types = true
        is_supported_types = supported_receipts.type.includes(file_extension.toLowerCase())
        if (event.target.files[0] && is_supported_types) {
            if (event.target.files[0].size < maxFileSize[acceptFileType].size) {
                let post = new FormData();
                post.append('file', event.target.files[0])

                if (transfer['receipt']) {
                    const url = PUT_URL.uploads.api + transfer['receipt'] + '/'
                    putRequest(url, post, this.props).then(response => {
                        if (response && response.status === 200) {
                            transfer['receipt'] = response.data.data.id
                            transfer['receipt_preview'] = response.data.data.file
                            transfer['receipt_extension'] = file_extension.toLowerCase()
                            transfer['receipt_name'] = fileName
                            this.setState({
                                transfer,
                                upload_name: 'Change Receipt'
                            })
                        }
                    })
                }
                else {
                    const url = POST_URL.uploads.api
                    postRequest(url, post, this.props).then(response => {
                        if (response && response.status === 200) {
                            transfer['receipt'] = response.data.data.id
                            transfer['receipt_preview'] = response.data.data.file
                            transfer['receipt_extension'] = file_extension.toLowerCase()
                            transfer['receipt_name'] = fileName
                            this.setState({
                                transfer,
                                upload_name: 'Change Receipt'
                            })
                        }

                    })
                }

            }
            else {
                this.setState({
                    openError: true,
                    alertData: 'Please Upload Below 3 MB Pic'
                })
            }
        }
        else if (!is_supported_types) {
            this.setState({
                openError: false,
                alertData: supported_receipts.error,
                alertImageData: supported_receipts.error
            })
        }
        enableUploadIcons = true
        this.setState({
            enableUploadIcons
        })
    }

    handleSearchChange = (e) => {
        let { transfer, fieldErrors, isEnable } = this.state;
        let { name, value } = e.target;
        transfer[name] = value
        delete fieldErrors[name]
        if ((name === 'amount') && !amountRegexWithDecimals.value.test(value) && value) {
            fieldErrors[name] = amountRegexWithDecimals.errorText
            this.setState({
                fieldErrors,
                transfer
            })
            return
        }
        isEnable[name] = true
        this.validateAmount()
        this.setState({
            transfer,
            isEnable,
            fieldErrors
        })
    }

    handleDropDownChange = (e, newValue, name) => {
        let { transfer, fieldErrors } = this.state;
        transfer[name] = newValue
        delete fieldErrors[name]

        // Clear dependent fields when transfer type changes
        if (name === 'transferType') {
            transfer.fromBank = null;
            transfer.toBank = null;
            // Don't clear fromCashInHand - it should always be the logged-in user from localStorage
            // Restore it from localStorage if needed
            const user = localStorage.getItem("user") != "undefined" && localStorage.getItem("user")
                ? JSON.parse(localStorage.getItem("user"))
                : null;
            if (user) {
                const userId = user.id || user.user_id;
                if (userId) {
                    transfer.fromCashInHand = {
                        id: userId,
                        user_id: userId,
                        full_name: user.full_name || user.name || '',
                        name: user.name || user.full_name || ''
                    };
                }
            }
            transfer.toCashInHand = null;
            this.setState({
                fromBankInfo: {},
                toBankInfo: {},
                fromBankAvailableAmount: 0,
                fromStaffAvailableAmount: 0
            });
        }

        // Fetch bank info and available amount when bank is selected
        if (name === 'fromBank' && newValue) {
            this.getBankInfo(newValue.id, 'from');
            this.getAvailableAmount({ from_bank: newValue.id });
        }
        if (name === 'toBank' && newValue) {
            this.getBankInfo(newValue.id, 'to');
        }

        this.setState({
            transfer,
            fieldErrors
        })
    }

    getBankInfo = (bankId, type) => {
        const url = GET_URL.bankdetail.api + bankId + '/'
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                if (type === 'from') {
                    this.setState({ fromBankInfo: response.data.data })
                } else {
                    this.setState({ toBankInfo: response.data.data })
                }
            }
        })
    }

    getAvailableAmount = (params) => {
        const url = GET_URL.depositdata.api;
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                const availableAmount = response.data.total_collected || 0;
                if (params.from_bank) {
                    this.setState({ fromBankAvailableAmount: parseFloat(availableAmount) });
                } else if (params.from_cash_in_hand) {
                    this.setState({ fromStaffAvailableAmount: parseFloat(availableAmount) });
                }
            }
        }).catch(error => {
            console.error('Error fetching available amount:', error);
            if (params.from_bank) {
                this.setState({ fromBankAvailableAmount: 0 });
            } else if (params.from_cash_in_hand) {
                this.setState({ fromStaffAvailableAmount: 0 });
            }
        });
    }

    validateAmount = () => {
        let { fieldErrors, transfer, fromBankAvailableAmount, fromStaffAvailableAmount } = this.state;
        let error = false
        let availableAmount = 0;

        // Get available amount based on transfer type
        if ((transfer.transferType === 'Bank to Bank' || transfer.transferType === 'Bank to Cash') && transfer.fromBank) {
            availableAmount = fromBankAvailableAmount;
        } else if ((transfer.transferType === 'Cash in Hand to Bank' || transfer.transferType === 'Cash in Hand to Cash in Hand') && transfer.fromCashInHand) {
            availableAmount = fromStaffAvailableAmount;
        }

        // Validate that from account has sufficient balance
        if (availableAmount > 0 && transfer.amount) {
            if (parseFloat(availableAmount) < parseFloat(transfer.amount)) {
                error = true
                fieldErrors['amount'] = `Insufficient balance. Available: ${numberWithCommas(availableAmount)}`
            }
        }

        if (parseFloat(transfer.amount) === 0 || !transfer.amount) {
            error = true
            fieldErrors['amount'] = `Enter amount greater than 0`
        }

        this.setState({
            fieldErrors,
        })
    }

    handleDateSearchChange = (e) => {
        let { transfer, fieldErrors, helperText, isEnable } = this.state;
        transfer['selectedDate'] = e
        delete fieldErrors['selectedDate']
        helperText['selectedDate'] = ''
        isEnable['selectedDate'] = true
        let fromDate = dateFormat(minDate, 'YYYY-MM-DD')
        let toDate = dateFormat(new Date(), 'YYYY-MM-DD')
        let error = validateDate(e, fromDate, toDate)
        if (error === 'Invalid Date')
            helperText['selectedDate'] = error
        else if (error !== '')
            fieldErrors['selectedDate'] = error
        this.setState({
            transfer,
            fieldErrors,
            isEnable
        })
    }

    handleDenominationChange = (id, count) => {
        let { denominationCounts } = this.state;
        denominationCounts[id] = count;
        this.setState({ denominationCounts });
    }

    getDenominationTotal = () => {
        let { denominationCounts, denominationList } = this.state;
        let total = 0;
        Object.keys(denominationCounts).forEach(id => {
            const count = parseInt(denominationCounts[id]) || 0;
            const denomination = denominationList.find(d => d.id === parseInt(id));
            if (denomination && count > 0) {
                total += (denomination.amount * count);
            }
        });
        return total;
    }

    getDateFormat = () => {
        let { transfer } = this.state;
        let returnValue = ''
        if (dateFormat(transfer.selectedDate, 'DD-MM-YYYY') !== 'Invalid date')
            returnValue = dateFormat(transfer.selectedDate, 'DD-MM-YYYY')
        return returnValue
    }

    handleViewImage = () => {
        let { transfer } = this.state;
        if (image_formats.includes(transfer.receipt_extension)) {
            this.setState({
                largeImagePreview: transfer.receipt_preview
            })
        }
        else {
            window.open(transfer.receipt_preview);
        }
    }

    handleDeleteImage = () => {
        let { transfer } = this.state;
        if (transfer['receipt']) {
            const url = DEL_URL.uploads.api + transfer['receipt'] + '/'
            deleteRequest(url, {}, this.props).then(response => {
                if (response && response.status === 200) {
                    transfer['receipt'] = ''
                    transfer['receipt_preview'] = ''
                    transfer['receipt_name'] = ''
                    transfer['receipt_extension'] = ''
                    this.setState({
                        transfer,
                        upload_name: 'Upload Receipt'
                    })
                }
            })
        }
        else {
            transfer['receipt'] = ''
            transfer['receipt_preview'] = ''
            transfer['receipt_name'] = ''
            transfer['receipt_extension'] = ''
            this.setState({
                transfer,
                upload_name: 'Upload Receipt'
            })
        }
    }

    handleCloseLargeImage = () => {
        this.setState({
            largeImagePreview: ''
        })
    }

    validation = () => {
        let { openError } = this.state;
        let returnValue = true
        let { transfer, fieldErrors } = this.state;

        if (!transfer.selectedDate) {
            fieldErrors['selectedDate'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
        }
        if (transfer.selectedDate) {
            let fromDate = dateFormat(minDate, 'YYYY-MM-DD')
            let toDate = dateFormat(new Date(), 'YYYY-MM-DD')
            let error = validateDate(transfer.selectedDate, fromDate, toDate)
            if (error !== '')
                fieldErrors['selectedDate'] = error
        }
        if (!transfer.amount) {
            fieldErrors['amount'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
        }

        // Validate based on transfer type
        if (transfer.transferType === 'Bank to Bank') {
            if (!transfer.fromBank) {
                fieldErrors['fromBank'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
            }
            if (!transfer.toBank) {
                fieldErrors['toBank'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
            }
            if (transfer.fromBank && transfer.toBank && transfer.fromBank.id === transfer.toBank.id) {
                fieldErrors['toBank'] = 'From and To banks cannot be the same'
            }
        } else if (transfer.transferType === 'Cash in Hand to Bank') {
            if (!transfer.fromCashInHand) {
                fieldErrors['fromCashInHand'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
            }
            if (!transfer.toBank) {
                fieldErrors['toBank'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
            }
        } else if (transfer.transferType === 'Cash in Hand to Cash in Hand') {
            if (!transfer.fromCashInHand) {
                fieldErrors['fromCashInHand'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
            }
            if (!transfer.toCashInHand) {
                fieldErrors['toCashInHand'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
            }
            if (transfer.fromCashInHand && transfer.toCashInHand && transfer.fromCashInHand.id === transfer.toCashInHand.user_id) {
                fieldErrors['toCashInHand'] = 'From and To staff cannot be the same'
            }
        } else if (transfer.transferType === 'Bank to Cash') {
            if (!transfer.fromBank) {
                fieldErrors['fromBank'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
            }
            if (!transfer.fromCashInHand) {
                fieldErrors['fromCashInHand'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
            }
        }

        if (Object.keys(fieldErrors).length > 0) {
            returnValue = false
            openError = true
        }
        this.setState({
            fieldErrors,
            openError
        })

        return returnValue
    }

    submit = () => {
        let { transfer } = this.state;
        let validate = this.validation();
        if (validate) {
            this.setState({ submitDisable: true })

            let denominationsPayload = [];
            if (transfer.transferType === 'Cash in Hand to Bank') {
                Object.keys(this.state.denominationCounts).forEach(id => {
                    const count = parseInt(this.state.denominationCounts[id]);
                    if (count > 0) {
                        denominationsPayload.push({ "denomination": id, "count": count });
                    }
                });
            }

            // Prepare transfer data based on type
            let post_data = {
                date: dateFormat(transfer.selectedDate, 'YYYY-MM-DD'),
                amount: parseFloat(transfer.amount),
                ref_number: transfer.refNumber || '',
                particulars: transfer.comment || '',
                attachment: transfer.receipt ? transfer.receipt : null,
                transfer_type: transfer.transferType
            };
            if (denominationsPayload.length > 0) {
                post_data.denominations_write = denominationsPayload;
            }

            // Add from/to based on transfer type
            if (transfer.transferType === 'Bank to Bank') {
                post_data.from_bank = transfer.fromBank.id;
                post_data.to_bank = transfer.toBank.id;
            } else if (transfer.transferType === 'Cash in Hand to Bank') {
                post_data.from_cash_in_hand = transfer.fromCashInHand.id;
                post_data.to_bank = transfer.toBank.id;
                post_data.staff = transfer.fromCashInHand.id;
            } else if (transfer.transferType === 'Cash in Hand to Cash in Hand') {
                post_data.from_cash_in_hand = transfer.fromCashInHand.id;
                post_data.to_cash_in_hand = transfer.toCashInHand.user_id;
                post_data.staff = transfer.fromCashInHand.id;
            } else if (transfer.transferType === 'Bank to Cash') {
                post_data.from_bank = transfer.fromBank.id;
                post_data.to_cash_in_hand = transfer.fromCashInHand.id;
            }



            // Call depositdata API for transfer
            let url = POST_URL.depositdata.api;
            postRequest(url, post_data, this.props)
                .then((response) => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: 'Transfer completed successfully',
                            showConfirmButton: false,
                            timer: 1500
                        })
                        // Navigate to view page if it exists, otherwise go back
                        if (Actions.bank_transfers && Actions.bank_transfers.view) {
                            this.props.history.push(Actions.bank_transfers.view.url)
                        } else {
                            this.props.history.goBack();
                        }
                    }
                    this.setState({ submitDisable: false })
                })
                .catch((error) => {
                    this.setState({ submitDisable: false })
                    Swal.fire({
                        position: 'top-end',
                        type: 'error',
                        title: 'Transfer failed',
                        showConfirmButton: false,
                        timer: 1500
                    })
                });

        }
    }

    handleClose = () => {
        this.setState({
            openError: false,
            alertImageData: ''
        })
    }

    changeTransferType = (event, value) => {
        let { transfer, fieldErrors } = this.state;
        if (value !== null) {
            // Clear all selection fields when transfer type changes
            transfer.transferType = value;
            transfer.fromBank = null;
            transfer.toBank = null;
            // Don't clear fromCashInHand - it should always be the logged-in user from localStorage
            // Restore it from localStorage if needed
            const user = localStorage.getItem("user") != "undefined" && localStorage.getItem("user")
                ? JSON.parse(localStorage.getItem("user"))
                : null;
            if (user) {
                const userId = user.id || user.user_id;
                if (userId) {
                    transfer.fromCashInHand = {
                        id: userId,
                        user_id: userId,
                        full_name: user.full_name || user.name || '',
                        name: user.name || user.full_name || ''
                    };
                    // Fetch available amount if transfer type requires cash in hand
                    if (value === 'Cash in Hand to Bank' || value === 'Cash in Hand to Cash in Hand') {
                        this.getAvailableAmount({ from_cash_in_hand: userId });
                    }
                }
            }
            transfer.toCashInHand = null;
            delete fieldErrors['fromBank'];
            delete fieldErrors['toBank'];
            delete fieldErrors['fromCashInHand'];
            delete fieldErrors['toCashInHand'];
            this.setState({
                transfer,
                fieldErrors,
                fromBankInfo: {},
                toBankInfo: {},
                fromBankAvailableAmount: 0,
                fromStaffAvailableAmount: 0
            }, () => {
                this.validateAmount()
            })
        }
    }

    render() {
        const { alertImageData, loading, transfer, fieldErrors, helperText, enableUploadIcons, largeImagePreview,
            bankList, fromBankInfo, toBankInfo, staffList, isEnable, upload_name, openError, alertData, submitDisable,
            fromBankAvailableAmount, fromStaffAvailableAmount } = this.state

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
                    {largeImagePreview &&
                        <Box className='set-question-large-image-preview-box'>
                            <img src={largeImagePreview} alt='Image Preview' className='set-question-large-image-preview' />
                            <Tooltip title='Close Image' placement='top-start'>
                                <Box className='set-question-large-image-remove-icon-box'
                                    onClick={this.handleCloseLargeImage}>
                                    <HighlightOffIcon className='set-question-large-image-remove-icon' />
                                </Box>
                            </Tooltip>
                        </Box>
                    }
                    <Paper className='paper-background'>
                        <Grid container>
                            <Grid item md={8} xs={12} className='header-align'>
                                <Box className='heading'>
                                    Bank & Cash Transfer
                                </Box>
                            </Grid>
                            <Grid item md={4} xs={12} >
                                <Box className='header-align end-flex-prop'>
                                    {isUserHasPermission('fee_type_bank_transactions', 'view') &&
                                        <Button
                                            variant="contained"
                                            component={Link} to={Actions.bank_transfers.view.url}
                                            className='editbutton-view'
                                        ><VisibilityOutlinedIcon className='visibility-icon' /> View Transactions</Button>
                                    }
                                </Box>
                            </Grid>
                        </Grid>
                        <Box>
                            <Grid container spacing={2}>
                                <Grid item md={7} xs={12}>
                                    <Paper className='paper-plain-background header-align p-b-20px'>
                                        <Grid container spacing={3}>
                                            <Grid item md={12} xs={12} style={{ marginTop: '20px' }}>
                                                <ToggleButtonGroup
                                                    size="medium"
                                                    value={transfer.transferType}
                                                    exclusive
                                                    onChange={this.changeTransferType}
                                                    style={{ backgroundColor: 'white' }}
                                                >
                                                    <ToggleButton key={2} value="Cash in Hand to Bank"
                                                        className={transfer.transferType === 'Cash in Hand to Bank' ? 'selected-transaction-type' : 'not-selected-transaction-type'}>
                                                        Cash to Bank
                                                    </ToggleButton>
                                                    <ToggleButton key={1} value="Bank to Bank"
                                                        className={transfer.transferType === 'Bank to Bank' ? 'selected-transaction-type' : 'not-selected-transaction-type'}>
                                                        Bank to Bank
                                                    </ToggleButton>
                                                    <ToggleButton key={3} value="Cash in Hand to Cash in Hand"
                                                        className={transfer.transferType === 'Cash in Hand to Cash in Hand' ? 'selected-transaction-type' : 'not-selected-transaction-type'}>
                                                        Cash to Cash
                                                    </ToggleButton>
                                                    <ToggleButton key={4} value="Bank to Cash"
                                                        className={transfer.transferType === 'Bank to Cash' ? 'selected-transaction-type' : 'not-selected-transaction-type'}>
                                                        Bank to Cash
                                                    </ToggleButton>
                                                </ToggleButtonGroup>
                                            </Grid>
                                            <Grid item md={12} xs={12}>
                                                <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                                    <KeyboardDatePicker
                                                        className='width-100'
                                                        autoComplete="off"
                                                        autoOk
                                                        variant='inline'
                                                        inputVariant="outlined"
                                                        label='Date'
                                                        minDate={minDate}
                                                        maxDate={new Date()}
                                                        name='selectedDate'
                                                        format="dd-MM-yyyy"
                                                        value={transfer.selectedDate ? transfer.selectedDate : null}
                                                        required={true}
                                                        onChange={(e) => this.handleDateSearchChange(e)}
                                                        KeyboardButtonProps={{
                                                            'aria-label': 'change date',
                                                        }}
                                                        helperText={fieldErrors['selectedDate'] === "" ? helperText['selectedDate'] : fieldErrors['selectedDate']}
                                                        error={fieldErrors['selectedDate'] && (fieldErrors['selectedDate'] === "" ? false : true)}
                                                    />
                                                </MuiPickersUtilsProvider>
                                            </Grid>
                                            {/* From Account */}
                                            {(transfer.transferType === 'Bank to Bank' || transfer.transferType === 'Bank to Cash') && (
                                                <Grid item md={6} xs={12}>
                                                    <DropDownWithSearch
                                                        options={bankList}
                                                        value={transfer.fromBank}
                                                        onChange={(e, newValue) => this.handleDropDownChange(e, newValue, 'fromBank')}
                                                        optionValue='bank_name'
                                                        name='fromBank'
                                                        label='From Bank'
                                                        className='width-100'
                                                        helperText={transfer.fromBank ? `` : fieldErrors['fromBank']}
                                                        error={fieldErrors['fromBank']}
                                                    />
                                                </Grid>
                                            )}
                                            {/* To Account */}
                                            {(transfer.transferType === 'Bank to Bank' || transfer.transferType === 'Cash in Hand to Bank') && (
                                                <Grid item md={6} xs={12}>
                                                    <DropDownWithSearch
                                                        options={transfer.transferType === 'Bank to Bank'
                                                            ? bankList.filter(bank => !transfer.fromBank || bank.id !== transfer.fromBank.id)
                                                            : bankList}
                                                        value={transfer.toBank}
                                                        onChange={(e, newValue) => this.handleDropDownChange(e, newValue, 'toBank')}
                                                        optionValue='bank_name'
                                                        name='toBank'
                                                        label='To Bank'
                                                        className='width-100'
                                                        helperText={transfer.toBank ? `` : fieldErrors['toBank']}
                                                        error={fieldErrors['toBank']}
                                                    />
                                                </Grid>
                                            )}
                                            {transfer.transferType === 'Cash in Hand to Cash in Hand' && (
                                                <Grid item md={6} xs={12}>
                                                    <DropDownWithSearch
                                                        options={staffList.filter(staff => !transfer.fromCashInHand || staff.user_id !== transfer.fromCashInHand.user_id)}
                                                        value={transfer.toCashInHand}
                                                        onChange={(e, newValue) => this.handleDropDownChange(e, newValue, 'toCashInHand')}
                                                        optionValue='full_name'
                                                        name='toCashInHand'
                                                        label='To Staff (Cash in Hand)'
                                                        className='width-100'
                                                        helperText={transfer.toCashInHand ? `` : fieldErrors['toCashInHand']}
                                                        error={fieldErrors['toCashInHand']}
                                                    />
                                                </Grid>
                                            )}



                                            <Grid item md={6} xs={12}>
                                                <TextField
                                                    label='Amount'
                                                    autoComplete="off"
                                                    required={true}
                                                    name='amount'
                                                    value={transfer.amount}
                                                    className='width-100'
                                                    InputProps={{
                                                        inputComponent: NumberFormatCustom,
                                                    }}
                                                    inputProps={{ maxLength: '15', style: { textAlign: 'right' } }}
                                                    fullWidth={true}
                                                    variant="outlined"
                                                    helperText={fieldErrors['amount']}
                                                    error={fieldErrors['amount']}
                                                    onChange={(e) => this.handleSearchChange(e)}
                                                />
                                            </Grid>

                                            {transfer.transferType === 'Cash in Hand to Bank' && this.state.denominationList.length > 0 && (
                                                <Grid item md={12} xs={12} style={{ marginTop: '10px' }}>
                                                    <Divider />
                                                    <Box className='create-expenses-comment header-align' style={{ marginTop: '10px', marginBottom: '10px' }}>Denominations (Optional)</Box>
                                                    <Grid container spacing={2}>
                                                        {this.state.denominationList.map(denom => (
                                                            <Grid item md={3} xs={6} key={denom.id}>
                                                                <TextField
                                                                    label={`₹ ${denom.amount}`}
                                                                    autoComplete="off"
                                                                    type="number"
                                                                    value={this.state.denominationCounts[denom.id] || ''}
                                                                    className='width-100'
                                                                    inputProps={{ min: 0 }}
                                                                    fullWidth={true}
                                                                    variant="outlined"
                                                                    onChange={(e) => this.handleDenominationChange(denom.id, e.target.value)}
                                                                />
                                                            </Grid>
                                                        ))}
                                                    </Grid>
                                                    {this.getDenominationTotal() > 0 && (
                                                        <Box mt={2} textAlign="right" fontWeight="bold">
                                                            Total Denomination Amount: {numberWithCommas(this.getDenominationTotal())}
                                                            {this.getDenominationTotal() !== parseFloat(transfer.amount || 0) && (
                                                                <span style={{ color: 'red', display: 'block', fontSize: '0.85em', fontWeight: 'normal' }}>
                                                                    Warning: Denomination total does not match entered Amount
                                                                </span>
                                                            )}
                                                        </Box>
                                                    )}
                                                </Grid>
                                            )}

                                            <Grid item md={6} xs={12}>
                                                <TextField
                                                    label='Ref Number'
                                                    required={false}
                                                    autoComplete="off"
                                                    name='refNumber'
                                                    value={transfer.refNumber}
                                                    className='width-100'
                                                    inputProps={{ maxLength: '20' }}
                                                    fullWidth={true}
                                                    variant="outlined"
                                                    helperText={fieldErrors['refNumber'] === '' ? helperText['refNumber'] : fieldErrors['refNumber']}
                                                    error={fieldErrors['refNumber']}
                                                    onChange={(e) => this.handleSearchChange(e)}
                                                />
                                            </Grid>
                                        </Grid>
                                        <Grid container>
                                            <Grid item md={12}>
                                                <FormControl
                                                    fullWidth
                                                    error={fieldErrors.comment && (fieldErrors.comment ? true : false)}
                                                >
                                                    <Box className='create-expenses-comment header-align'>Comment</Box>
                                                    <TextareaAutosize aria-label="minimum height"
                                                        className='create-expenses-comment-auto-size'
                                                        value={transfer.comment}
                                                        name='comment'
                                                        maxLength={200}
                                                        onChange={(e) => this.handleSearchChange(e)}
                                                        required
                                                    />
                                                    {fieldErrors.comment &&
                                                        <FormHelperText>{fieldErrors.comment}</FormHelperText>
                                                    }
                                                </FormControl>
                                            </Grid>
                                        </Grid>

                                    </Paper>
                                </Grid>

                                <Grid item md={5} xs={12}>
                                    <Paper className='header-align create-expenses-right-part-paper'>
                                        <Box className='text-center'>
                                            <Box className='header-align'>
                                                {enableUploadIcons &&
                                                    <label htmlFor='upload-pic'>
                                                        <Button variant="contained" component='span' className='create-expenses-upload-receipts-button'>
                                                            {upload_name}<Box className='upload-icon'><i className="fa fa-upload" aria-hidden="true"></i></Box>
                                                        </Button>
                                                    </label>
                                                }
                                                {alertImageData &&
                                                    <Box className='error-content p-t-20px'>{alertImageData} </Box>
                                                }
                                            </Box>
                                            <input type='file' id='upload-pic' className='display-none' onChange={(e) => this.handleChange(e, 'img')}
                                                onClick={e => (e.target.value = null)} />

                                            {(transfer.receipt_preview !== '' && enableUploadIcons && transfer.receipt) &&
                                                <Box className='flex-justify-space-around header-align'>
                                                    <Box>{transfer.receipt_name}</Box>
                                                    <Box><VisibilityOutlinedIcon onClick={this.handleViewImage} className='create-expenses-image-view' /></Box>
                                                    <Box><DeleteIcon onClick={this.handleDeleteImage} className='create-expenses-image-delete' /></Box>
                                                </Box>
                                            }
                                            {!enableUploadIcons &&
                                                <Box className='upload-profile-loading'>
                                                    <CircularProgress />
                                                </Box>
                                            }
                                        </Box>
                                        <Box className='create-expenses-info-outer-box'>
                                            {transfer.transferType === 'Bank to Bank' && fromBankInfo.bank_name && (
                                                <>
                                                    <Box className='create-expenses-outer-box-label-value'>
                                                        <Box className='create-expenses-label'>From Bank</Box>
                                                        <Box className='create-expenses-value'>{fromBankInfo.bank_name}</Box>
                                                    </Box>
                                                    <Box className='create-expenses-outer-box-label-value'>
                                                        <Box className='create-expenses-label'>From Account</Box>
                                                        <Box className='create-expenses-value'>{fromBankInfo.account_num}</Box>
                                                    </Box>
                                                    <Box className='create-expenses-outer-box-label-value'>
                                                        <Box className='create-expenses-label'>Available Balance</Box>
                                                        <Box className='create-expenses-value'>{numberWithCommas(fromBankAvailableAmount || 0)}</Box>
                                                    </Box>
                                                </>
                                            )}
                                            {transfer.transferType === 'Bank to Bank' && toBankInfo.bank_name && (
                                                <>
                                                    <Box className='create-expenses-outer-box-label-value'>
                                                        <Box className='create-expenses-label'>To Bank</Box>
                                                        <Box className='create-expenses-value'>{toBankInfo.bank_name}</Box>
                                                    </Box>
                                                    <Box className='create-expenses-outer-box-label-value'>
                                                        <Box className='create-expenses-label'>To Account</Box>
                                                        <Box className='create-expenses-value'>{toBankInfo.account_num}</Box>
                                                    </Box>
                                                </>
                                            )}
                                            {(transfer.transferType === 'Cash in Hand to Bank' || transfer.transferType === 'Cash in Hand to Cash in Hand') && transfer.fromCashInHand && (
                                                <>
                                                    <Box className='create-expenses-outer-box-label-value'>
                                                        <Box className='create-expenses-label'>From Staff (Petty Cash)</Box>
                                                        <Box className='create-expenses-value'>{transfer.fromCashInHand.full_name || transfer.fromCashInHand.name}</Box>
                                                    </Box>
                                                    <Box className='create-expenses-outer-box-label-value'>
                                                        <Box className='create-expenses-label'>Available Balance</Box>
                                                        <Box className='create-expenses-value'>{numberWithCommas(fromStaffAvailableAmount || 0)}</Box>
                                                    </Box>
                                                </>
                                            )}
                                            {transfer.transferType === 'Bank to Cash' && fromBankInfo.bank_name && (
                                                <>
                                                    <Box className='create-expenses-outer-box-label-value'>
                                                        <Box className='create-expenses-label'>From Bank</Box>
                                                        <Box className='create-expenses-value'>{fromBankInfo.bank_name}</Box>
                                                    </Box>
                                                    <Box className='create-expenses-outer-box-label-value'>
                                                        <Box className='create-expenses-label'>Available Balance</Box>
                                                        <Box className='create-expenses-value'>{numberWithCommas(fromBankAvailableAmount || 0)}</Box>
                                                    </Box>
                                                    <Box className='create-expenses-outer-box-label-value'>
                                                        <Box className='create-expenses-label'>To (Petty Cash)</Box>
                                                        <Box className='create-expenses-value'>{transfer.fromCashInHand ? (transfer.fromCashInHand.full_name || transfer.fromCashInHand.name) : ''}</Box>
                                                    </Box>
                                                </>
                                            )}
                                            {transfer.transferType === 'Cash in Hand to Bank' && transfer.toBank && toBankInfo.bank_name && (
                                                <>
                                                    <Box className='create-expenses-outer-box-label-value'>
                                                        <Box className='create-expenses-label'>To Bank</Box>
                                                        <Box className='create-expenses-value'>{toBankInfo.bank_name}</Box>
                                                    </Box>
                                                    <Box className='create-expenses-outer-box-label-value'>
                                                        <Box className='create-expenses-label'>To Account</Box>
                                                        <Box className='create-expenses-value'>{toBankInfo.account_num}</Box>
                                                    </Box>
                                                </>
                                            )}
                                            {transfer.transferType === 'Cash in Hand to Cash in Hand' && transfer.toCashInHand && (
                                                <Box className='create-expenses-outer-box-label-value'>
                                                    <Box className='create-expenses-label'>To Staff</Box>
                                                    <Box className='create-expenses-value'>{transfer.toCashInHand.full_name || transfer.toCashInHand.name}</Box>
                                                </Box>
                                            )}
                                            {isEnable['amount'] &&
                                                <Box className='create-expenses-outer-box-label-value'>
                                                    <Box className='create-expenses-label'>Transfer Amount</Box>
                                                    <Box className='create-expenses-value'>{numberWithCommas(transfer.amount || 0)}</Box>
                                                </Box>
                                            }

                                        </Box>
                                    </Paper>
                                </Grid>
                            </Grid>
                            <Grid item md={12}>
                                <Box display='flex' marginLeft='auto' justifyContent='flex-end' className='header-align'>
                                    <Button variant="contained" color="primary"
                                        className='submit'
                                        disabled={submitDisable ? submitDisable : !enableUploadIcons}
                                        onClick={this.submit}>
                                        Submit Transfer &nbsp;{' '}
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


export default withRouter(AddBankTransfer)

