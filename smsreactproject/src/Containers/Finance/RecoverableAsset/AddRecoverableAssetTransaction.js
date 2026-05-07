import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';
import { TextField, MenuItem, Box, Typography } from '@material-ui/core';

import MultipleAdd from 'Components/MultipleAdd'
import { nameWithQuoteRegex, amountRegexWithDecimals } from 'Constants/regularExpression'
import { postRequest, getRequest } from 'Includes/api/apicall';
import { POST_URL, GET_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import LoadingGif from 'Components/LoadingGif'

const header = 'Recoverable Asset Transaction'

const TRANSACTION_TYPE_OPTIONS = [
    { id: 'CREDIT', name: 'Credit' },
    { id: 'DEBIT', name: 'Debit' },
    { id: 'ADVANCE', name: 'Advance' },
    { id: 'RECOVERY', name: 'Recovery' },
    { id: 'ADJUSTMENT', name: 'Adjustment' },
    { id: 'INTEREST', name: 'Interest Charge' },
    { id: 'PENALTY', name: 'Late Payment Penalty' },
    { id: 'REVERSAL', name: 'Reversal' },
]

const SOURCE_TYPE_OPTIONS = [
    { id: 'MANUAL', name: 'Manual' },
    { id: 'PAYROLL', name: 'Payroll' },
    { id: 'ADJUSTMENT', name: 'Adjustment' },
]

class AddRecoverableAssetTransaction extends Component {

    constructor(props) {
        super(props)

        this.state = {
            submitDisable: false,
            fieldDetails: [],
            loading: true,
            categories: [],
            selectedCategory: '',
            financialYears: [],
            selectedFy: '',
            assetOptions: [],
            assetsLoading: false,
        }
        this.viewUrl = Actions.recoverable_asset_transactions.view.url
    }

    componentDidMount = () => {
        this.loadFinancialYears()
    }

    loadFinancialYears = () => {
        getRequest(GET_URL.financialyear.api, { limit: 100 }, this.props)
            .then(res => {
                if (res && res.status === 200) {
                    const fys = res.data.data?.data_list || res.data.data || []
                    const activeFy = fys.find(fy => fy.is_active)
                    this.setState({
                        financialYears: fys,
                        selectedFy: activeFy ? activeFy.id : (fys[0] ? fys[0].id : '')
                    }, this.loadCategories)
                } else {
                    this.loadCategories()
                }
            })
            .catch(() => this.loadCategories())
    }

    loadCategories = () => {
        const url = GET_URL.recoverableAssetCategory.api
        const params = { is_active: true }
        if (this.state.selectedFy) {
            params.financial_year = this.state.selectedFy
        }

        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                const categories = response.data.data || []
                // Exclude system-linked categories (Cash, Bank, Debtors, etc) from manual transaction entry
                const allowedCategories = categories.filter(c => !c.is_linked_system)
                this.setState({ categories: allowedCategories, loading: false })
            } else {
                this.setState({ categories: [], loading: false })
            }
        }).catch(() => this.setState({ categories: [], loading: false }))
    }

    handleFyChange = (e) => {
        const fyId = e.target.value
        this.setState({
            selectedFy: fyId,
            selectedCategory: '',
            assetOptions: [],
            fieldDetails: []
        }, () => {
            this.loadCategories()
        })
    }

    handleCategoryChange = (e) => {
        const categoryId = e.target.value
        this.setState({
            selectedCategory: categoryId,
            assetOptions: [],
            assetsLoading: true,
            fieldDetails: []
        }, () => {
            if (categoryId) {
                this.loadAssets(categoryId)
            } else {
                this.setState({ assetsLoading: false })
            }
        })
    }

    loadAssets = (categoryId) => {
        const url = GET_URL.recoverableAsset.api
        const { categories } = this.state
        const cat = categories.find(c => c.id === parseInt(categoryId))
        const params = { is_active: true, limit: 500, pageno: 1 }
        if (cat && cat.asset_types && cat.asset_types.length > 0) {
            params.asset_type = cat.asset_types[0]
        }
        // Also filter by category
        params.category = categoryId

        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                const assets = response.data.data?.data_list || response.data.data || []
                const assetOptions = assets.map(a => ({
                    id: a.id,
                    name: a.particulars || a.name || `Asset #${a.id}`
                }))
                this.setState({ assetOptions, assetsLoading: false }, () => {
                    this.buildFieldDetails()
                })
            } else {
                this.setState({ assetsLoading: false })
            }
        }).catch(() => this.setState({ assetsLoading: false }))
    }

    buildFieldDetails = () => {
        const { assetOptions } = this.state

        this.setState({
            fieldDetails: [
                {
                    label: 'Asset', regex: '', name: 'recoverable_asset', md: 6, className: 'width-95-mt-30px', required: true,
                    id: 'outlined-select', default: null, type: 'dropDownWithSearch', autoFocus: true,
                    list: assetOptions
                },
                {
                    label: 'Transaction Type', regex: '', name: 'transaction_type', md: 6, className: 'width-95-mt-30px', required: true,
                    id: 'outlined-select', default: { id: 'DEBIT', name: 'Debit' }, type: 'dropDownWithSearch', autoFocus: false,
                    list: TRANSACTION_TYPE_OPTIONS
                },
                {
                    label: 'Amount', regex: amountRegexWithDecimals, name: 'amount', md: 6, maxLength: '15', className: 'width-95-mt-30px', required: true,
                    id: 'outlined-textarea', default: '', rows: null, type: 'amount', autoFocus: false, isDuplicateAllow: true
                },
                {
                    label: 'Transaction Date', regex: '', name: 'transaction_date', md: 6, className: 'width-95-mt-30px', required: true,
                    id: 'outlined-textarea', default: new Date().toISOString().split('T')[0], type: 'date', autoFocus: false, isDuplicateAllow: true
                },
                {
                    label: 'Source Type', regex: '', name: 'source_type', md: 6, className: 'width-95-mt-30px', required: false,
                    id: 'outlined-select', default: { id: 'MANUAL', name: 'Manual' }, type: 'dropDownWithSearch', autoFocus: false,
                    list: SOURCE_TYPE_OPTIONS
                },
                {
                    label: 'Source Reference', regex: nameWithQuoteRegex, name: 'source_reference', md: 6, maxLength: '100', className: 'width-95-mt-30px', required: false,
                    id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: false, isDuplicateAllow: true
                },
                {
                    label: 'Remarks', regex: nameWithQuoteRegex, name: 'remarks', md: 12, maxLength: '500', className: 'width-95-mt-30px', required: false,
                    id: 'outlined-textarea', default: '', rows: 2, type: 'text', autoFocus: false, isDuplicateAllow: true
                },
            ],
        })
    }

    postMethod = (transactions) => {
        this.setState({ submitDisable: true })
        transactions.map((data) => {
            // MultipleAdd extracts dropdown IDs before calling postMethod,
            // so recoverable_asset may be a string ID or an object {id, name}
            if (data.recoverable_asset && typeof data.recoverable_asset === 'object') {
                data.recoverable_asset = data.recoverable_asset.id ? parseInt(data.recoverable_asset.id) : null
            } else if (data.recoverable_asset) {
                data.recoverable_asset = parseInt(data.recoverable_asset) || null
            } else {
                data.recoverable_asset = null
            }
            data.transaction_type = typeof data.transaction_type === 'object' ? (data.transaction_type?.id || data.transaction_type) : (data.transaction_type || 'DEBIT')
            data.amount = parseFloat(data.amount) || 0
            data.source_type = typeof data.source_type === 'object' ? (data.source_type?.id || data.source_type) : (data.source_type || 'MANUAL')
            data.source_reference = data.source_reference || null
            data.remarks = data.remarks || null
        })
        let payload = transactions[0];

        // Client-side validation: ensure asset is selected
        if (!payload.recoverable_asset) {
            Swal.fire({
                position: 'top-end',
                type: 'error',
                title: 'Please select an asset',
                showConfirmButton: false,
                timer: 2000
            })
            this.setState({ submitDisable: false })
            return
        }
        if (!payload.amount || payload.amount <= 0) {
            Swal.fire({
                position: 'top-end',
                type: 'error',
                title: 'Amount must be greater than 0',
                showConfirmButton: false,
                timer: 2000
            })
            this.setState({ submitDisable: false })
            return
        }

        let url = POST_URL.recoverableAssetTransaction.api;
        postRequest(url, payload, this.props)
            .then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Transaction has been saved',
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.props.history.push(this.viewUrl)
                }
                this.setState({ submitDisable: false })
            });
    }

    isFyLocked = () => {
        const { financialYears, selectedFy } = this.state
        if (selectedFy) {
            const fy = financialYears.find(f => f.id === parseInt(selectedFy))
            return fy && fy.is_locked
        }
        return false
    }

    render() {
        const { submitDisable, fieldDetails, loading, categories, selectedCategory, assetsLoading, financialYears, selectedFy } = this.state
        if (loading) {
            return <LoadingGif />
        }
        const fyLocked = this.isFyLocked()

        return (
            <div>
                <Box px={3} pt={2} pb={1} display="flex" gap={2}>
                    <Box>
                        <Typography variant="subtitle2" color="textSecondary" style={{ marginBottom: 8 }}>
                            Financial Year
                        </Typography>
                        <TextField
                            select
                            label="Financial Year"
                            variant="outlined"
                            value={selectedFy}
                            onChange={this.handleFyChange}
                            style={{ minWidth: 200 }}
                            size="small"
                        >
                            {financialYears.map(fy => (
                                <MenuItem key={fy.id} value={fy.id}>{fy.name}</MenuItem>
                            ))}
                        </TextField>
                    </Box>
                    <Box>
                        <Typography variant="subtitle2" color="textSecondary" style={{ marginBottom: 8 }}>
                            Category
                        </Typography>
                        <TextField
                            select
                            label="Category"
                            variant="outlined"
                            value={selectedCategory}
                            onChange={this.handleCategoryChange}
                            style={{ minWidth: 300 }}
                            size="small"
                        >
                            <MenuItem value="">-- Select Category --</MenuItem>
                            {categories.map(c => (
                                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                            ))}
                        </TextField>
                    </Box>
                </Box>

                {fyLocked && (
                    <Box px={3} py={2}>
                        <Typography variant="body2" style={{ color: '#d32f2f', fontWeight: 500 }}>
                            Transactions cannot be added because the selected financial year is locked.
                        </Typography>
                    </Box>
                )}

                {assetsLoading && (
                    <Box px={3} py={2}>
                        <Typography variant="body2" color="textSecondary">Loading assets...</Typography>
                    </Box>
                )}

                {selectedCategory && !assetsLoading && !fyLocked && fieldDetails.length > 0 && (
                    <MultipleAdd
                        fieldDetails={fieldDetails}
                        header={header}
                        name='Transaction'
                        viewUrl={this.viewUrl}
                        submitDisable={submitDisable}
                        postMethod={this.postMethod}
                        headerGrid={{ xl: 6, lg: 8, md: 8, xs: 12 }}
                        buttonGrid={{ xl: 6, lg: 4, md: 4, xs: 12 }}
                        bodyGrid={{ xl: 6, lg: 8, md: 8, xs: 12 }}
                        idFormat={'recoverable_asset_txn_add_'}
                        isSingle={true}
                    />
                )}

                {!selectedCategory && !fyLocked && (
                    <Box px={3} py={4} display="flex" justifyContent="center">
                        <Typography variant="body1" color="textSecondary">
                            Please select a category to proceed
                        </Typography>
                    </Box>
                )}
            </div>
        )
    }
}


export default withRouter(AddRecoverableAssetTransaction)
