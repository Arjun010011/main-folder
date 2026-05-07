import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';

import MultipleAdd from 'Components/MultipleAdd'
import { nameWithQuoteRegex, amountRegexWithDecimals } from 'Constants/regularExpression'
import { postRequest, getRequest } from 'Includes/api/apicall';
import { POST_URL, GET_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import { dateFormat } from 'Includes/functions';

const header = 'Asset Details'


class AddAsset extends Component {

    constructor(props) {
        super(props)
        this.multipleAddRef = React.createRef();

        this.state = {
            submitDisable: false,
            fieldDetails: [],
            loading: true
        }
        this.viewUrl = Actions.assets.view.url
    }

    componentDidMount = () => {
        Promise.all([
            this.loadAssetGroups(),
            this.loadBankList(),
        ]).then(() => {
            this.buildFieldDetails()
        })
    }

    loadBankList = () => {
        const url = GET_URL.bankdetail.api
        const params = { is_active: true }
        return getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                const banks = response.data.data || []
                this.setState({
                    bankOptions: banks.map(b => ({
                        id: b.id,
                        name: b.display_name || b.bank_name
                    }))
                })
            }
        })
    }

    loadAssetGroups = () => {
        const url = GET_URL.assetGroups.api
        const params = { is_active: true, limit: 100, pageno: 1 }
        return getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                const groups = response.data.data.data_list || response.data.data || []

                // Filter to only leaf groups (groups that have no children)
                const leafGroups = groups.filter(g =>
                    !groups.some(child => child.parent_group === g.id)
                )

                // Create options with hierarchy labels (Parent → Child)
                const options = leafGroups.map(g => {
                    let parentName = g.parent_group_name
                    if (!parentName && g.parent_group) {
                        const parent = groups.find(p => p.id === g.parent_group)
                        parentName = parent ? parent.name : null
                    }

                    return {
                        id: g.id,
                        name: parentName ? `${parentName} → ${g.name}` : g.name
                    }
                })

                this.setState({ assetGroupOptions: options })
            }
        })
    }

    buildFieldDetails = () => {
        const { assetGroupOptions, bankOptions } = this.state
        this.setState({
            fieldDetails: [
                {
                    label: 'Asset Code', regex: nameWithQuoteRegex, name: 'asset_code', md: 6, maxLength: '50', className: 'width-95-mt-30px', required: true,
                    id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: true
                },
                {
                    label: 'Asset Name', regex: nameWithQuoteRegex, name: 'asset_name', md: 6, maxLength: '255', className: 'width-95-mt-30px', required: true,
                    id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: false, isDuplicateAllow: true
                },
                {
                    label: 'Asset Group', regex: '', name: 'asset_group', md: 6, className: 'width-95-mt-30px', required: true,
                    id: 'outlined-select', default: '', type: 'dropDownWithSearch', autoFocus: false,
                    list: assetGroupOptions || []
                },
                {
                    label: 'Purchase Date', name: 'purchase_date', md: 6, className: 'width-95-mt-30px', required: true,
                    id: 'outlined-textarea', default: '', type: 'date', autoFocus: false
                },
                {
                    label: 'Put to Use Date', name: 'put_to_use_date', md: 6, className: 'width-95-mt-30px', required: true,
                    id: 'outlined-textarea', default: '', type: 'date', autoFocus: false,
                    helperText: 'Defaults to Purchase Date if left empty'
                },
                {
                    label: 'Original Cost', regex: amountRegexWithDecimals, name: 'original_cost', md: 6, maxLength: '15', className: 'width-95-mt-30px', required: true,
                    id: 'outlined-textarea', default: '', rows: null, type: 'amount', autoFocus: false, isDuplicateAllow: true
                },
                {
                    label: 'Salvage Value', regex: amountRegexWithDecimals, name: 'salvage_value', md: 6, maxLength: '15', className: 'width-95-mt-30px', required: false,
                    id: 'outlined-textarea', default: '0', rows: null, type: 'amount', autoFocus: false, isDuplicateAllow: true
                },
                {
                    label: 'Location', regex: nameWithQuoteRegex, name: 'location', md: 6, maxLength: '255', className: 'width-95-mt-30px', required: false,
                    id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: false, isDuplicateAllow: true
                },
                {
                    label: 'Bank (Purchase From)', regex: '', name: 'bank', md: 6, className: 'width-95-mt-30px', required: false,
                    id: 'outlined-select', default: '', type: 'dropDownWithSearch', autoFocus: false,
                    list: bankOptions || []
                },
            ],
            loading: false
        }, () => {
            this.setupMultipleAddWorkaround()
        })
    }

    setupMultipleAddWorkaround = () => {
        if (this.multipleAddRef && this.multipleAddRef.current) {
            const originalHandleSearchChange = this.multipleAddRef.current.handleSearchChange;
            this.multipleAddRef.current.handleSearchChange = (e, field, i) => {
                // Call the original method
                originalHandleSearchChange.call(this.multipleAddRef.current, e, field, i);

                // Add the custom behavior for purchase_date
                if (field.name === 'purchase_date') {
                    setTimeout(() => {
                        if (this.multipleAddRef && this.multipleAddRef.current) {
                            let { fieldValue } = this.multipleAddRef.current.state;
                            if (fieldValue[i] && fieldValue[i]['purchase_date']) {
                                // Default put_to_use_date to purchase_date only if put_to_use_date is empty
                                if (!fieldValue[i]['put_to_use_date']) {
                                    fieldValue[i]['put_to_use_date'] = fieldValue[i]['purchase_date'];
                                    fieldValue[i]['put_to_use_date_error'] = "";
                                    this.multipleAddRef.current.setState({ fieldValue });
                                }
                            }
                        }
                    }, 10);
                }
            }
        }
    }

    postMethod = (assets) => {
        this.setState({ submitDisable: true })
        assets.map((data) => {
            data.original_cost = parseFloat(data.original_cost)
            data.salvage_value = data.salvage_value ? parseFloat(data.salvage_value) : 0
            data.asset_group = parseInt(data.asset_group?.id || data.asset_group)
            data.location = data.location || null
            data.purchase_date = data.purchase_date ? dateFormat(data.purchase_date, 'YYYY-MM-DD') : null
            // Default put_to_use_date to purchase_date if not set
            data.put_to_use_date = data.put_to_use_date ? dateFormat(data.put_to_use_date, 'YYYY-MM-DD') : data.purchase_date
            // Bank FK - send id only
            data.bank = data.bank?.id ? parseInt(data.bank.id) : null
        })
        let payload = assets[0];
        let url = POST_URL.assetList.api;
        postRequest(url, payload, this.props)
            .then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Asset has been saved',
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.props.history.push(Actions.assets.view.url)
                }
                this.setState({ submitDisable: false })
            });
    }

    render() {
        const { submitDisable, fieldDetails, loading } = this.state
        if (loading) {
            return <div>Loading...</div>
        }
        return (
            <div>
                <MultipleAdd
                    wrappedComponentRef={this.multipleAddRef}
                    fieldDetails={fieldDetails}
                    header={header}
                    name='Asset'
                    viewUrl={this.viewUrl}
                    submitDisable={submitDisable}
                    postMethod={this.postMethod}
                    headerGrid={{ xl: 6, lg: 8, md: 8, xs: 12 }}
                    buttonGrid={{ xl: 6, lg: 4, md: 4, xs: 12 }}
                    bodyGrid={{ xl: 6, lg: 8, md: 8, xs: 12 }}
                    idFormat={'asset_add_'}
                    isSingle={true}
                />
            </div>
        )
    }
}


export default withRouter(AddAsset)
