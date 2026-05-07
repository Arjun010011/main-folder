import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';
import {
    Paper, Box, Grid, Button, TextField, Chip, IconButton,
    Typography, Divider, CircularProgress,
    Table, TableHead, TableRow, TableCell, TableBody
} from '@material-ui/core'
import { ToggleButton, ToggleButtonGroup } from '@material-ui/lab'
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined'
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline'
import RemoveCircleOutlineIcon from '@material-ui/icons/RemoveCircleOutline'
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline'
import classNames from 'classnames'

import { DropDownWithSearch } from 'Components/DropDownWithSearch'
import MultipleSelectDropdown from 'Components/MultipleSelectDropdown'
import { postRequest, getRequest, deleteRequest, patchRequest, putRequest } from 'Includes/api/apicall';
import { POST_URL, GET_URL, PUT_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import { NumberFormatCustom } from 'Includes/functions';


const COUNTERPARTY_TYPE_OPTIONS = [
    { id: 'INSTITUTION', name: 'Institution' },
    { id: 'VENDOR', name: 'Vendor' },
    { id: 'INDIVIDUAL', name: 'Individual' },
    { id: 'BANK', name: 'Bank' },
    { id: 'EMPLOYEE', name: 'Employee' },
]

const ACCOUNT_LABEL_OPTIONS = [
    { id: 'OLD', name: 'Old' },
    { id: 'NEW', name: 'New' },
    { id: 'OTHER', name: 'Other' },
]

const LINKED_MODULE_OPTIONS = [
    { id: 'SUNDRY_DEBTORS', name: 'Pending Fees' },
    { id: 'ADVANCE_FEE', name: 'Advance Fee' },
    { id: 'STAFF_SALARY_ADVANCE', name: 'Staff Salary Advance' },
    { id: 'CASH_IN_HAND', name: 'Cash in Hand' },
    { id: 'BANK_ACCOUNT', name: 'Bank Account' },
]

const ASSET_TYPE_SECTIONS = {
    'DEPOSIT': ['bank', 'counterparty'],
    'LOAN': ['counterparty', 'recovery'],
    'ADVANCE': ['counterparty'],
    'STAFF_SALARY_ADVANCE': ['staff', 'recovery'],
}
    
const MAPPING_TYPE_OPTIONS = [
    { id: 'academic_year', name: 'Academic Year' },
    { id: 'standard', name: 'Standard' },
    { id: 'feetype', name: 'Fee Type' },
]


class EditRecoverableAsset extends Component {

    constructor(props) {
        super(props)
        this.state = {
            submitDisable: false,
            // Step 1 - Category (replaces asset type tabs)
            selectedCategory: null,
            categories: [],
            categoriesLoading: true,
            // Derived from category
            asset_type: null,
            isPendingFees: false,
            pendingFeesMode: 'manual',  // 'manual' or 'auto'
            // Core fields
            name: '',
            opening_balance: '0',
            opening_balance_type: 'DEBIT',
            // Optional sections toggle
            showStaff: false,
            showBank: false,
            showCounterparty: false,
            showRecovery: false,
            // Section data
            staff: null,
            bank: null,
            account_label: null,
            counterparty_name: '',
            counterparty_type: null,
            total_amount: '0',
            monthly_recovery_amount: '0',
            purpose: '',
            remarks: '',
            // Lazy-loaded dropdown data
            staffOptions: null,
            bankOptions: null,
            staffWalletOptions: null,
            linkedStaffWallet: null,
            // Bank Account fields
            linkedBankObject: null,
            // Linked module
            linkedModule: null,

            // ── Edit Mapping Only mode (from balance sheet lock) ──
            editMappingOnly: false,
            editAssetId: null,

            // ── Multi-asset mapping mode ──
            multiAssetMode: false,
            pendingFeesAssets: [],
            assetsLoading: false,
            expandedAssetId: null,

            // ── Sundry Debtors Grouping State ──
            reportId: null,
            groupingLoading: false,
            groupingSaving: false,
            isEditMode: false,
            originalData: null,
            headings: [{
                id: null, heading: '', heading_alias: '',
                group_names: [{ id: null, group_name: '', group_alias: '', values_mapping: [] }]
            }],
            academicYearList: [],
            standardList: [],
            feetypeList: {},
            allFeeTypes: [],
            formErrors: {},
            // ── Advance Fee Config State ──
            isAdvanceFee: false,
            advanceFeeMode: 'manual',
            feeAdvanceTypeOptions: null,
            selectedAdvFeeTypes: [],
        }
        this.viewUrl = Actions.recoverable_asset_register.view.url
    }

    componentDidMount() {
        this.loadCategories()

        // Read URL query params
        const params = new URLSearchParams(this.props.location?.search || '')
        const assetIdParam = params.get('id') || params.get('asset_id')
        if (assetIdParam) {
            this._pendingAssetId = assetIdParam
            this.setState({ editAssetId: assetIdParam, isEditMode: true })
        }
    }

    // ── Category Loading (eager — on mount) ──
    loadCategories = () => {
        getRequest(GET_URL.recoverableAssetCategory.api, { is_active: true }, this.props)
            .then(res => {
                if (res && res.status === 200) {
                    this.setState({
                        categories: res.data.data || [],
                        categoriesLoading: false,
                    }, () => {
                    }, () => {
                        if (this._pendingAssetId) {
                            this.loadExistingAssetForMapping(this._pendingAssetId)
                            delete this._pendingAssetId
                        } else {
                            // If no ID provided, go back to list
                            this.props.history.push(this.viewUrl)
                        }
                    })
                } else {
                    this.setState({ categoriesLoading: false })
                }
            })
            .catch(() => this.setState({ categoriesLoading: false }))
    }

    // ── Load all manual SUNDRY_DEBTORS assets for multi-asset mapping ──
    loadPendingFeesAssets = () => {
        this.setState({ multiAssetMode: true, assetsLoading: true })
        getRequest(GET_URL.recoverableAsset.api, {
            linked_module: 'SUNDRY_DEBTORS',
            is_active: true,
            unlocked_fy_only: true,
            limit: 500,
            pageno: 1
        }, this.props).then(res => {
            const responseData = res?.data?.data || {}
            const allAssets = responseData.data_list || responseData || []
            const assetList = Array.isArray(allAssets) ? allAssets : []
            // Filter to manual assets (pending_fees_config is null/empty)
            const manualAssets = assetList.filter(a => !a.pending_fees_config)
            this.setState({ pendingFeesAssets: manualAssets, assetsLoading: false })

            if (manualAssets.length === 0) {
                // No manual assets — switch to normal add mode
                this.setState({ multiAssetMode: false })
                const option = LINKED_MODULE_OPTIONS.find(o => o.id === 'SUNDRY_DEBTORS')
                if (option) this.handleLinkedModuleChange(null, option)
            }
        }).catch(() => this.setState({ assetsLoading: false }))
    }

    // ── Select a specific asset for mapping configuration ──
    selectAssetForMapping = (assetId) => {
        if (this.state.expandedAssetId === assetId) {
            // Collapse if already expanded
            this.setState({ expandedAssetId: null, editMappingOnly: false, editAssetId: null })
            return
        }
        // Load the selected asset's data and show grouping form
        const asset = this.state.pendingFeesAssets.find(a => a.id === assetId)
        if (!asset) return

        const matchingCategory = this.state.categories.find(
            c => c.id === asset.category || c.id === asset.category_id
        )
        this.setState({
            expandedAssetId: assetId,
            editMappingOnly: true,
            editAssetId: assetId,
            name: asset.name || '',
            selectedCategory: matchingCategory || null,
            linkedModule: 'SUNDRY_DEBTORS',
            isPendingFees: true,
            pendingFeesMode: 'auto',
            asset_type: asset.asset_type || null,
            opening_balance: String(asset.opening_balance || '0'),
            opening_balance_type: asset.opening_balance_type || 'DEBIT',
            // Reset grouping state
            reportId: null,
            isEditMode: false,
            originalData: null,
            headings: [{
                id: null, heading: '', heading_alias: '',
                group_names: [{ id: null, group_name: '', group_alias: '', values_mapping: [] }]
            }],
        }, () => {
            this.loadGroupingData()
        })
    }

    // ── Load existing asset for edit-mapping-only mode ──
    loadExistingAssetForMapping = (assetId) => {
        getRequest(GET_URL.recoverableAsset.api + assetId + '/', {}, this.props)
            .then(res => {
                if (res && res.status === 200) {
                    const asset = res.data?.data || res.data
                    // Find matching category
                    const matchingCategory = this.state.categories.find(
                        c => c.id === asset.category || c.id === asset.category_id
                    )

                    let mappedPendingMode = 'manual'
                    if (asset.linked_module === 'SUNDRY_DEBTORS' && asset.pending_fees_config) {
                        mappedPendingMode = 'auto'
                    } else if (asset.linked_module === 'SUNDRY_DEBTORS') {
                        mappedPendingMode = 'manual'
                    }

                    this.setState({
                        // Turn off simple "mapping only" to show full form for edit
                        editMappingOnly: false,
                        editAssetId: assetId,
                        name: asset.name || '',
                        purpose: asset.purpose || '',
                        remarks: asset.remarks || '',
                        total_amount: asset.total_amount ? String(asset.total_amount) : '0',
                        monthly_recovery_amount: asset.monthly_recovery_amount ? String(asset.monthly_recovery_amount) : '0',
                        selectedCategory: matchingCategory || null,
                        linkedModule: asset.linked_module || null,
                        isPendingFees: asset.linked_module === 'SUNDRY_DEBTORS',
                        pendingFeesMode: mappedPendingMode,
                        asset_type: asset.asset_type || null,
                        opening_balance: String(asset.opening_balance || '0'),
                        opening_balance_type: asset.opening_balance_type || 'DEBIT',
                        showBank: !!asset.bank,
                        showStaff: !!asset.staff,
                        showCounterparty: !!asset.counterparty_name || !!asset.counterparty_type,
                        showRecovery: !!asset.monthly_recovery_amount,
                        counterparty_type: asset.counterparty_type ? COUNTERPARTY_TYPE_OPTIONS.find(o => o.id === asset.counterparty_type) : null,
                        counterparty_name: asset.counterparty_name || '',
                        account_label: asset.account_label ? ACCOUNT_LABEL_OPTIONS.find(o => o.id === asset.account_label) : null,
                    }, () => {
                        if (asset.bank) {
                            this.loadBankList()
                            getRequest(GET_URL.bankdetail.api, { is_active: true }, this.props).then(bRes => {
                                if (bRes && bRes.status === 200) {
                                    const bList = (bRes.data.data || []).map(b => ({
                                        id: b.id, name: b.display_name || b.bank_name
                                    }))
                                    this.setState({ bank: bList.find(b => b.id === asset.bank) || null })
                                }
                            })
                        }

                        if (asset.staff) {
                            this.loadStaffList()
                            getRequest(GET_URL.staff.api, { is_active: true, limit: 1000, pageno: 1 }, this.props).then(sRes => {
                                if (sRes && sRes.status === 200) {
                                    let list = sRes.data.data && sRes.data.data.data_list ? sRes.data.data.data_list : (sRes.data.data || [])
                                    const sList = list.map(s => ({
                                        id: s.id, name: ((s.first_name || '') + ' ' + (s.middle_name || '') + ' ' + (s.last_name || '')).trim()
                                    }))
                                    this.setState({ staff: sList.find(s => s.id === asset.staff) || null })
                                }
                            })
                        }

                        if (mappedPendingMode === 'auto') {
                            this.loadGroupingData()
                        }

                        // If ADVANCE_FEE, hydrate advance fee config
                        if (asset.linked_module === 'ADVANCE_FEE' && asset.advance_fee_config) {
                            const advConfig = asset.advance_fee_config
                            this.setState({
                                isAdvanceFee: true,
                                advanceFeeMode: 'auto',
                            })
                            this.loadFeeAdvanceTypes()
                            this.fetchGroupingDropdowns()
                            // Once fee advance types are loaded, hydrate selected values
                            setTimeout(() => {
                                const feeTypeIds = advConfig.fee_advance_types || []
                                this.setState(prev => ({
                                    selectedAdvFeeTypes: (prev.feeAdvanceTypeOptions || []).filter(t => feeTypeIds.includes(t.id)),
                                }))
                            }, 1500)
                        }
                    })
                }
            })
    }

    // ── Lazy loaders ──
    loadStaffList = () => {
        if (this.state.staffOptions) return
        getRequest(GET_URL.staff.api, { is_active: true, limit: 500, pageno: 1 }, this.props)
            .then(res => {
                if (res && res.status === 200) {
                    var list = res.data.data && res.data.data.data_list ? res.data.data.data_list : (res.data.data || [])
                    this.setState({
                        staffOptions: list.map(s => ({
                            id: s.id,
                            name: ((s.first_name || '') + ' ' + (s.middle_name || '') + ' ' + (s.last_name || '')).trim()
                        }))
                    })
                }
            })
    }

    loadBankList = () => {
        if (this.state.bankOptions) return
        getRequest(GET_URL.bankdetail.api, { is_active: true }, this.props)
            .then(res => {
                if (res && res.status === 200) {
                    this.setState({
                        bankOptions: (res.data.data || []).map(b => ({
                            id: b.id,
                            name: b.display_name || b.bank_name
                        }))
                    })
                }
            })
    }

    loadFeeAdvanceTypes = () => {
        if (this.state.feeAdvanceTypeOptions) return
        getRequest(GET_URL.feeadvancetype.api, { is_active: true }, this.props)
            .then(res => {
                if (res && res.status === 200) {
                    const data = res.data.data || res.data || []
                    this.setState({
                        feeAdvanceTypeOptions: (Array.isArray(data) ? data : (data.data_list || [])).map(t => ({
                            id: t.id, name: t.name || t.fee_advance_type_name || ''
                        }))
                    })
                }
            })
    }

    loadStaffWalletList = () => {
        if (this.state.staffWalletOptions) return
        getRequest(GET_URL.staffWallet.api, { is_active: true, limit: 500, pageno: 1 }, this.props)
            .then(res => {
                if (res && res.status === 200) {
                    const responseData = res.data?.data || {}
                    const walletData = responseData.data_list || []
                    this.setState({
                        staffWalletOptions: walletData.map(w => ({
                            id: w.id,
                            staff_id: w.staff_id,
                            user_id: w.user_id,
                            name: w.staff_name || '',
                            opening_balance: w.opening_balance || 0,
                            opening_balance_type: w.opening_balance_type || 'DEBIT',
                        }))
                    })
                }
            })
    }

    // ── Category Selection ──
    handleCategoryChange = (e, selectedCat) => {
        if (!selectedCat) {
            this.setState({
                selectedCategory: null,
                asset_type: null,
                isPendingFees: false,
                showStaff: false, showBank: false, showCounterparty: false, showRecovery: false,
                errors: {},
            })
            return
        }

        const assetTypes = selectedCat.asset_types || []
        const derivedType = assetTypes.length > 0 ? assetTypes[0] : null
        // Derive auto-sections from ALL asset types in this category
        const autoSections = []
        assetTypes.forEach(t => {
            const sections = ASSET_TYPE_SECTIONS[t] || []
            sections.forEach(s => { if (!autoSections.includes(s)) autoSections.push(s) })
        })

        this.setState({
            selectedCategory: selectedCat,
            asset_type: derivedType,
            isPendingFees: false,
            // Auto-show sections based on asset types
            showStaff: autoSections.includes('staff'),
            showBank: autoSections.includes('bank'),
            showCounterparty: autoSections.includes('counterparty'),
            showRecovery: autoSections.includes('recovery'),
            // Reset
            staff: null, bank: null, account_label: null,
            counterparty_name: '', counterparty_type: null,
            total_amount: '0', monthly_recovery_amount: '0',
            errors: {},
        })
    }

    // ══════════════════════════════════════════════════════
    // ══  PENDING FEES GROUPING LOGIC
    // ══════════════════════════════════════════════════════

    loadGroupingData = () => {
        this.setState({ groupingLoading: true })

        // Load dropdowns for academic year, standard, fee type
        this.fetchGroupingDropdowns()

        // Load existing pending_fees_config from the asset
        const assetId = this.state.editAssetId || this.state.expandedAssetId
        if (assetId) {
            getRequest(GET_URL.recoverableAsset.api + assetId + '/', {}, this.props)
                .then(res => {
                    this.setState({ groupingLoading: false })
                    if (res && res.status === 200) {
                        const asset = res.data?.data || res.data
                        const config = asset.pending_fees_config
                        if (config && typeof config === 'object') {
                            // Convert pending_fees_config to headings/group_names/values_mapping UI state
                            const valuesMappings = []
                            if (config.academic_years && config.academic_years.length > 0) {
                                valuesMappings.push({ id: null, type: 'academic_year', value: config.academic_years.join(',') })
                            }
                            if (config.standards && config.standards.length > 0) {
                                valuesMappings.push({ id: null, type: 'standard', value: config.standards.join(',') })
                                // Pre-fetch fee types for these standards
                                this.fetchFeeTypesByStandard(config.standards)
                            }
                            if (config.fee_types && config.fee_types.length > 0) {
                                valuesMappings.push({ id: null, type: 'feetype', value: config.fee_types.join(',') })
                            }

                            if (valuesMappings.length > 0) {
                                const categoryName = this.state.selectedCategory ? this.state.selectedCategory.name : ''
                                this.setState({
                                    isEditMode: true,
                                    headings: [{
                                        id: null,
                                        heading: categoryName,
                                        heading_alias: categoryName,
                                        group_names: [{
                                            id: null,
                                            group_name: this.state.name || '',
                                            group_alias: this.state.name || '',
                                            values_mapping: valuesMappings
                                        }]
                                    }]
                                })
                            }
                        }
                    }
                })
                .catch(() => this.setState({ groupingLoading: false }))
        } else {
            this.setState({ groupingLoading: false })
        }
    }

    fetchGroupingDropdowns = () => {
        // Academic years
        getRequest(GET_URL.getacademicyear.api, { is_active: true }, this.props)
            .then(res => {
                if (res && res.status === 200) {
                    this.setState({ academicYearList: res.data.data || [] })
                }
            })
        // Standards
        getRequest(GET_URL.getstandard.api, { is_active: true }, this.props)
            .then(res => {
                if (res && res.status === 200) {
                    this.setState({ standardList: res.data.data || [] })
                }
            })
        // All fee types (global fallback when no standard is selected)
        getRequest(GET_URL.addFeeType.api, { is_active: true }, this.props)
            .then(res => {
                if (res && res.status === 200) {
                    const data = res.data.data || res.data || []
                    this.setState({ allFeeTypes: Array.isArray(data) ? data : [] })
                }
            })
    }

    fetchFeeTypesByStandard = (standardIds) => {
        if (!standardIds || standardIds.length === 0) return
        const key = Array.isArray(standardIds) ? standardIds.sort().join(',') : String(standardIds)
        if (this.state.feetypeList[key]) return

        const idParam = Array.isArray(standardIds) ? standardIds.join(',') : String(standardIds)
        getRequest(GET_URL.getFeeTypes.api, { is_active: true, standard_id: idParam }, this.props)
            .then(res => {
                if (res && res.status === 200) {
                    const data = res.data.data
                    const rawList = Array.isArray(data) ? data : (data && data.data_list ? data.data_list : [])
                    const feeTypes = rawList.map(ft => ({
                        ...ft,
                        name: ft.name || ft.fee_type_name || ''
                    }))
                    this.setState(prev => ({
                        feetypeList: { ...prev.feetypeList, [key]: feeTypes }
                    }))
                }
            })
    }

    // Heading CRUD
    addHeading = () => {
        const categoryName = this.state.selectedCategory ? this.state.selectedCategory.name : ''
        this.setState(prev => ({
            headings: [...prev.headings, {
                id: null, heading: categoryName, heading_alias: categoryName,
                group_names: [{ id: null, group_name: '', group_alias: '', values_mapping: [] }]
            }]
        }))
    }

    removeHeading = (idx) => {
        if (this.state.headings.length <= 1) return
        this.setState(prev => ({
            headings: prev.headings.filter((_, i) => i !== idx)
        }))
    }

    updateHeading = (idx, field, value) => {
        this.setState(prev => {
            const headings = [...prev.headings]
            headings[idx] = { ...headings[idx], [field]: value }
            if (field === 'heading' && !headings[idx].heading_alias) {
                headings[idx].heading_alias = value
            }
            return { headings }
        })
    }

    // Group CRUD
    addGroupName = (hIdx) => {
        this.setState(prev => {
            const headings = [...prev.headings]
            headings[hIdx] = {
                ...headings[hIdx],
                group_names: [...headings[hIdx].group_names, { id: null, group_name: '', group_alias: '', values_mapping: [] }]
            }
            return { headings }
        })
    }

    removeGroupName = (hIdx, gIdx) => {
        this.setState(prev => {
            const headings = [...prev.headings]
            if (headings[hIdx].group_names.length <= 1) return null
            headings[hIdx] = {
                ...headings[hIdx],
                group_names: headings[hIdx].group_names.filter((_, i) => i !== gIdx)
            }
            return { headings }
        })
    }

    updateGroupName = (hIdx, gIdx, field, value) => {
        this.setState(prev => {
            const headings = [...prev.headings]
            const groups = [...headings[hIdx].group_names]
            groups[gIdx] = { ...groups[gIdx], [field]: value }
            if (field === 'group_name' && !groups[gIdx].group_alias) {
                groups[gIdx].group_alias = value
            }
            headings[hIdx] = { ...headings[hIdx], group_names: groups }
            return { headings }
        })
    }

    // Value Mapping CRUD
    addValuesMapping = (hIdx, gIdx) => {
        this.setState(prev => {
            const headings = [...prev.headings]
            const groups = [...headings[hIdx].group_names]
            groups[gIdx] = {
                ...groups[gIdx],
                values_mapping: [...groups[gIdx].values_mapping, { id: null, type: '', value: '' }]
            }
            headings[hIdx] = { ...headings[hIdx], group_names: groups }
            return { headings }
        })
    }

    removeValuesMapping = (hIdx, gIdx, mIdx) => {
        this.setState(prev => {
            const headings = [...prev.headings]
            const groups = [...headings[hIdx].group_names]
            groups[gIdx] = {
                ...groups[gIdx],
                values_mapping: groups[gIdx].values_mapping.filter((_, i) => i !== mIdx)
            }
            headings[hIdx] = { ...headings[hIdx], group_names: groups }
            return { headings }
        })
    }

    updateValuesMapping = (hIdx, gIdx, mIdx, field, value) => {
        this.setState(prev => {
            const headings = [...prev.headings]
            const groups = [...headings[hIdx].group_names]
            const mappings = [...groups[gIdx].values_mapping]
            mappings[mIdx] = { ...mappings[mIdx], [field]: value }
            groups[gIdx] = { ...groups[gIdx], values_mapping: mappings }
            headings[hIdx] = { ...headings[hIdx], group_names: groups }
            return { headings }
        })
    }

    updateValuesMappingMultiSelect = (hIdx, gIdx, mIdx, selectedItems, mappingType) => {
        const valueString = selectedItems.map(item => {
            const id = typeof item === 'object' ? item.id : item
            return Number(id)
        }).join(',')

        this.updateValuesMapping(hIdx, gIdx, mIdx, 'value', valueString)

        // If standards changed, fetch fee types
        if (mappingType === 'standard' && valueString) {
            const ids = valueString.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id))
            if (ids.length > 0) this.fetchFeeTypesByStandard(ids)
        }
    }

    // ── Save Grouping ──
    handleGroupingSave = () => {
        const { headings } = this.state
        const errors = {}

        headings.forEach((heading, hIdx) => {
            heading.group_names.forEach((group, gIdx) => {
                const effectiveGroupName = (group.group_name || this.state.name || '').trim()
                if (!effectiveGroupName) errors[`h_${hIdx}_g_${gIdx}_name`] = 'Group name is required'
                if (!group.values_mapping || group.values_mapping.length === 0)
                    errors[`h_${hIdx}_g_${gIdx}_mapping`] = 'At least one value mapping required'
                group.values_mapping.forEach((m, mIdx) => {
                    if (!m.type) errors[`h_${hIdx}_g_${gIdx}_m_${mIdx}_type`] = 'Type required'
                    if (!m.value || !m.value.trim()) errors[`h_${hIdx}_g_${gIdx}_m_${mIdx}_value`] = 'Value required'
                })
            })
        })

        if (Object.keys(errors).length > 0) {
            this.setState({ formErrors: errors })
            return
        }

        this.setState({ groupingSaving: true, formErrors: {} })

        // Build pending_fees_config from the values_mapping entries
        const config = { academic_years: [], standards: [], fee_types: [] }
        headings.forEach(h => {
            h.group_names.forEach(g => {
                g.values_mapping.forEach(m => {
                    if (!m.type || !m.value || !m.value.trim()) return
                    const ids = m.value.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id) && id > 0)
                    if (m.type === 'academic_year') {
                        config.academic_years = [...new Set([...config.academic_years, ...ids])]
                    } else if (m.type === 'standard') {
                        config.standards = [...new Set([...config.standards, ...ids])]
                    } else if (m.type === 'feetype') {
                        config.fee_types = [...new Set([...config.fee_types, ...ids])]
                    }
                })
            })
        })

        const assetId = this.state.editAssetId || this.state.expandedAssetId
        if (!assetId) {
            this.setState({ groupingSaving: false })
            Swal.fire({ type: 'error', title: 'No asset selected', showConfirmButton: true })
            return
        }

        // Patch the asset with pending_fees_config
        patchRequest(
            GET_URL.recoverableAsset.api + assetId + '/',
            { pending_fees_config: config },
            this.props
        ).then(res => {
            this.setState({ groupingSaving: false })
            if (res && (res.status === 200 || res.status === 201)) {
                Swal.fire({
                    position: 'top-end', type: 'success',
                    title: 'Pending fees mapping saved successfully',
                    showConfirmButton: false, timer: 1500
                })

                if (this.state.multiAssetMode) {
                    this.setState({
                        expandedAssetId: null,
                        editMappingOnly: false,
                        editAssetId: null,
                    }, () => {
                        this.loadPendingFeesAssets()
                        setTimeout(() => {
                            this.props.history.push('/finance/balance-sheet/view')
                        }, 500)
                    })
                } else if (this.state.editMappingOnly) {
                    this.props.history.push('/finance/balance-sheet/view')
                } else {
                    this.props.history.push('/finance/balance-sheet/view')
                }
            }
        }).catch(() => this.setState({ groupingSaving: false }))
    }

    // ══════════════════════════════════════════════════════
    // ══  ASSET ENTRY LOGIC
    // ══════════════════════════════════════════════════════

    toggleSection = (section) => {
        var key = 'show' + section.charAt(0).toUpperCase() + section.slice(1)
        this.setState(prev => ({ [key]: !prev[key] }))
    }

    handleChange = (field, value) => {
        var update = { errors: { ...this.state.errors } }
        update[field] = value
        update.errors[field] = ''
        this.setState(update)
    }

    validate = () => {
        var errors = {}
        if (!this.state.name.trim()) errors.name = 'Asset Name is required'
        if (!this.state.selectedCategory) errors.category = 'Please select a category'
        if (!this.state.opening_balance || this.state.opening_balance === '') errors.opening_balance = 'Opening Balance is required'
        this.setState({ errors })
        return Object.keys(errors).length === 0
    }

    handleSubmit = () => {
        if (!this.validate()) return
        this.setState({ submitDisable: true })

        const isCashInHand = this.state.linkedModule === 'CASH_IN_HAND'
        const isPendingFees = this.state.linkedModule === 'SUNDRY_DEBTORS'

        var payload = {
            name: this.state.name,
            asset_type: this.state.asset_type || '',
            category: this.state.selectedCategory ? parseInt(this.state.selectedCategory.id) : null,
            purpose: this.state.purpose || null,
            remarks: this.state.remarks || null,
            linked_module: this.state.linkedModule || null,
        }

        if (isCashInHand && this.state.linkedStaffWallet) {
            // Auto-populate from staff wallet data
            payload.opening_balance = parseFloat(this.state.linkedStaffWallet.opening_balance) || 0
            payload.opening_balance_type = this.state.linkedStaffWallet.opening_balance_type || 'DEBIT'
            payload.closing_balance = parseFloat(this.state.linkedStaffWallet.opening_balance) || 0
            payload.staff = this.state.linkedStaffWallet.staff_id || null
        } else if (isPendingFees && this.state.pendingFeesMode === 'auto') {
            // Validate mapping
            var mappingErrors = {};
            this.state.headings.forEach((heading, hIdx) => {
                heading.group_names.forEach((group, gIdx) => {
                    const effectiveGroupName = (group.group_name || this.state.name || '').trim()
                    if (!effectiveGroupName) mappingErrors[`h_${hIdx}_g_${gIdx}_name`] = 'Group name is required'
                    if (!group.values_mapping || group.values_mapping.length === 0)
                        mappingErrors[`h_${hIdx}_g_${gIdx}_mapping`] = 'At least one value mapping required'
                    group.values_mapping.forEach((m, mIdx) => {
                        if (!m.type) mappingErrors[`h_${hIdx}_g_${gIdx}_m_${mIdx}_type`] = 'Type required'
                        if (!m.value || !m.value.trim()) mappingErrors[`h_${hIdx}_g_${gIdx}_m_${mIdx}_value`] = 'Value required'
                    })
                })
            })

            if (Object.keys(mappingErrors).length > 0) {
                this.setState({ formErrors: mappingErrors, submitDisable: false })
                return
            }

            const config = { academic_years: [], standards: [], fee_types: [] }
            this.state.headings.forEach(h => {
                h.group_names.forEach(g => {
                    g.values_mapping.forEach(m => {
                        if (!m.type || !m.value || !m.value.trim()) return
                        const ids = m.value.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id) && id > 0)
                        if (m.type === 'academic_year') {
                            config.academic_years = [...new Set([...config.academic_years, ...ids])]
                        } else if (m.type === 'standard') {
                            config.standards = [...new Set([...config.standards, ...ids])]
                        } else if (m.type === 'feetype') {
                            config.fee_types = [...new Set([...config.fee_types, ...ids])]
                        }
                    })
                })
            })
            payload.pending_fees_config = config
            // OB is auto-calculated for automatic mode
            payload.opening_balance = 0
            payload.opening_balance_type = 'DEBIT'
            payload.closing_balance = 0
        } else if (isPendingFees && this.state.pendingFeesMode === 'manual') {
            // Manual mode — use user-entered amount
            payload.opening_balance = parseFloat(this.state.opening_balance) || 0
            payload.opening_balance_type = this.state.opening_balance_type || 'DEBIT'
            payload.closing_balance = parseFloat(this.state.opening_balance) || 0
        } else if (this.state.linkedModule === 'ADVANCE_FEE' && this.state.advanceFeeMode === 'auto') {
            // Build advance_fee_config
            const advConfig = {
                fee_advance_types: (this.state.selectedAdvFeeTypes || []).map(t => typeof t === 'object' ? t.id : t),
            }
            payload.advance_fee_config = advConfig
            payload.opening_balance = 0
            payload.opening_balance_type = 'CREDIT'
            payload.closing_balance = 0
        } else {
            payload.opening_balance = parseFloat(this.state.opening_balance) || 0
            payload.opening_balance_type = this.state.opening_balance_type || 'DEBIT'
            payload.closing_balance = parseFloat(this.state.opening_balance) || 0
        }

        if (this.state.showStaff && !isCashInHand) {
            payload.staff = this.state.staff && this.state.staff.id ? parseInt(this.state.staff.id) : null
        }
        if (this.state.showBank) {
            payload.bank = this.state.bank && this.state.bank.id ? parseInt(this.state.bank.id) : null
            payload.account_label = this.state.account_label && this.state.account_label.id ? this.state.account_label.id : 'OTHER'
        }
        if (this.state.showCounterparty) {
            payload.counterparty_name = this.state.counterparty_name || null
            payload.counterparty_type = this.state.counterparty_type && this.state.counterparty_type.id ? this.state.counterparty_type.id : null
        }
        if (this.state.showRecovery) {
            payload.total_amount = parseFloat(this.state.total_amount) || 0
            payload.monthly_recovery_amount = parseFloat(this.state.monthly_recovery_amount) || 0
        }

        if (this.state.linkedModule === 'STAFF_SALARY_ADVANCE') {
            payload.asset_type = 'STAFF_SALARY_ADVANCE'
        }

        const assetId = this.state.editAssetId
        const request = assetId
            ? putRequest(GET_URL.recoverableAsset.api + assetId + '/', payload, this.props)
            : postRequest(POST_URL.recoverableAsset.api, payload, this.props)

        request.then(response => {
            if (response && (response.status === 200 || response.status === 201)) {
                if (assetId) {
                    Swal.fire({
                        position: 'top-end', type: 'success',
                        title: 'Asset updated successfully',
                        showConfirmButton: false, timer: 1500
                    })
                    this.props.history.push(this.viewUrl)
                } else {
                    Swal.fire({
                        position: 'top-end', type: 'success',
                        title: 'Recoverable Asset has been saved',
                        showConfirmButton: false, timer: 1500
                    })
                    this.props.history.push(this.viewUrl)
                }
            }
            this.setState({ submitDisable: false })
        }).catch(() => this.setState({ submitDisable: false }))
    }

    // ══════════════════════════════════════════════════════
    // ══  RENDER HELPERS
    // ══════════════════════════════════════════════════════

    renderSectionHeader = (title) => (
        <Box mt={2} mb={1}>
            <Typography variant="subtitle2" style={{ color: '#1565c0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 }}>
                {title}
            </Typography>
            <Divider style={{ marginTop: 4, backgroundColor: '#1565c0' }} />
        </Box>
    )

    renderToggleButton = (label, section, isActive) => (
        <Chip
            icon={isActive ? <RemoveCircleOutlineIcon /> : <AddCircleOutlineIcon />}
            label={isActive ? 'Remove ' + label : 'Add ' + label}
            onClick={() => this.toggleSection(section)}
            variant={isActive ? 'default' : 'outlined'}
            color={isActive ? 'primary' : 'default'}
            style={{ margin: 4 }}
            clickable
        />
    )

    // ── Grouping Form Render (Pending Fees — simplified) ──
    renderGroupingForm = (hideSaveButton = false) => {
        const { headings, groupingLoading, groupingSaving, formErrors,
            academicYearList, standardList, feetypeList, isEditMode } = this.state

        if (groupingLoading) {
            return (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                    <CircularProgress />
                </Box>
            )
        }

        // Use first heading, first group for value mappings (flat structure)
        const heading = headings[0] || { group_names: [{ values_mapping: [] }] }
        const group = heading.group_names[0] || { values_mapping: [] }
        const hIdx = 0
        const gIdx = 0
        const stdIds = group.values_mapping
            .filter(m => m.type === 'standard' && m.value)
            .map(m => m.value.split(','))
            .flat()
            .map(id => Number(id.trim()))
            .filter(id => !isNaN(id))
        const stdKey = stdIds.length > 0 ? stdIds.sort().join(',') : ''
        const feeTypes = stdKey && feetypeList[stdKey] ? feetypeList[stdKey] : (this.state.allFeeTypes || [])

        return (
            <Box mt={2}>
                {this.renderSectionHeader('Pending Fees — Value Mapping')}

                {isEditMode && (
                    <Box mb={1}>
                        <Typography variant="caption" style={{ color: '#1976d2', fontWeight: 'bold' }}>
                            Edit Mode — modifying existing mappings
                        </Typography>
                    </Box>
                )}

                <Paper variant="outlined" style={{ padding: 16, marginBottom: 16 }}>
                    {/* Category Header */}
                    <Typography variant="subtitle1" style={{ color: '#1565c0', fontWeight: 600, marginBottom: 12 }}>
                        {this.state.selectedCategory ? this.state.selectedCategory.name : 'Category'}
                    </Typography>

                    {/* Value-Type Mappings (flat list, can add multiple) */}
                    {group.values_mapping.map((mapping, mIdx) => (
                        <Grid container spacing={2} key={mIdx} style={{ marginTop: mIdx === 0 ? 0 : 8 }} alignItems="center">
                            <Grid item xs={12} md={3}>
                                <DropDownWithSearch
                                    options={MAPPING_TYPE_OPTIONS}
                                    value={MAPPING_TYPE_OPTIONS.find(o => o.id === mapping.type) || null}
                                    onChange={(e, v) => {
                                        this.updateValuesMapping(hIdx, gIdx, mIdx, 'type', v ? v.id : '')
                                        this.updateValuesMapping(hIdx, gIdx, mIdx, 'value', '')
                                    }}
                                    label="Type *"
                                    className="width-100"
                                />
                            </Grid>
                            <Grid item xs={10} md={7}>
                                {mapping.type === 'academic_year' && (
                                    <MultipleSelectDropdown
                                        data_list={academicYearList}
                                        selected_list={mapping.value ? mapping.value.split(',').map(id => {
                                            const found = academicYearList.find(a => String(a.id) === id.trim())
                                            return found || null
                                        }).filter(Boolean) : []}
                                        onChange={(selected) => this.updateValuesMappingMultiSelect(hIdx, gIdx, mIdx, selected, 'academic_year')}
                                        label="Academic Year *"
                                    />
                                )}
                                {mapping.type === 'standard' && (
                                    <MultipleSelectDropdown
                                        data_list={standardList}
                                        selected_list={mapping.value ? mapping.value.split(',').map(id => {
                                            const found = standardList.find(s => String(s.id) === id.trim())
                                            return found || null
                                        }).filter(Boolean) : []}
                                        onChange={(selected) => this.updateValuesMappingMultiSelect(hIdx, gIdx, mIdx, selected, 'standard')}
                                        label="Standard *"
                                    />
                                )}
                                {mapping.type === 'feetype' && (
                                    <MultipleSelectDropdown
                                        data_list={feeTypes}
                                        selected_list={mapping.value ? mapping.value.split(',').map(id => {
                                            const found = feeTypes.find(f => String(f.id) === id.trim())
                                            return found || null
                                        }).filter(Boolean) : []}
                                        onChange={(selected) => this.updateValuesMappingMultiSelect(hIdx, gIdx, mIdx, selected, 'feetype')}
                                        label="Fee Type *"
                                    />
                                )}
                                {!mapping.type && (
                                    <Typography variant="caption" color="textSecondary" style={{ marginTop: 12, display: 'block' }}>
                                        Select a type first
                                    </Typography>
                                )}
                            </Grid>
                            <Grid item xs={2} md={1}>
                                <IconButton color="secondary" onClick={() => this.removeValuesMapping(hIdx, gIdx, mIdx)} size="small">
                                    <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                            </Grid>
                        </Grid>
                    ))}

                    {formErrors[`h_${hIdx}_g_${gIdx}_mapping`] && (
                        <Typography variant="caption" color="error" style={{ display: 'block', marginTop: 4 }}>
                            {formErrors[`h_${hIdx}_g_${gIdx}_mapping`]}
                        </Typography>
                    )}

                    <Box mt={1}>
                        <Button size="small" color="primary" startIcon={<AddCircleOutlineIcon />}
                            onClick={() => this.addValuesMapping(hIdx, gIdx)}>
                            Add Value Mapping
                        </Button>
                    </Box>
                </Paper>

                {!hideSaveButton && (
                    <Box display="flex" justifyContent="flex-end" mt={2}>
                        <Button variant="contained" color="primary"
                            onClick={this.handleGroupingSave}
                            disabled={groupingSaving}
                            style={{ minWidth: 120, padding: '10px 30px' }}>
                            {groupingSaving ? 'Saving...' : 'Save Groups'}
                        </Button>
                    </Box>
                )}
            </Box>
        )
    }

    // ── Asset Form Render ──
    renderAssetForm = () => {
        const { showStaff, showBank, showCounterparty, showRecovery } = this.state
        const state = this.state
        const errors = state.errors
        const linkedModule = state.linkedModule
        const isCashInHand = linkedModule === 'CASH_IN_HAND'
        const isPendingFees = linkedModule === 'SUNDRY_DEBTORS'
        const isManualPendingFees = isPendingFees && state.pendingFeesMode === 'manual'
        const isAutoPendingFees = isPendingFees && state.pendingFeesMode === 'auto'
        const isAdvanceFee = linkedModule === 'ADVANCE_FEE'
        const isAutoAdvanceFee = isAdvanceFee && state.advanceFeeMode === 'auto'
        const isSalaryAdvance = linkedModule === 'STAFF_SALARY_ADVANCE'
        const isBankAccount = linkedModule === 'BANK_ACCOUNT'
        const hideBalanceFields = isCashInHand || isAutoPendingFees || isAutoAdvanceFee || isBankAccount

        return (
            <Box>
                {/* Row 1: Asset Name */}
                {this.renderSectionHeader('Basic Details')}
                <Grid container spacing={3}>
                    <Grid item md={12} xs={12}>
                        <TextField
                            fullWidth variant="outlined" label="Asset Name" required
                            value={state.name}
                            onChange={e => this.handleChange('name', e.target.value)}
                            error={!!errors.name} helperText={errors.name || ''}
                        />
                    </Grid>
                </Grid>

                {/* Row 2: Opening Balance + Balance Type */}
                {!hideBalanceFields && (
                    <Grid container spacing={3} style={{ marginTop: 4 }}>
                        <Grid item md={6} xs={12}>
                            <TextField
                                fullWidth variant="outlined" label="Opening Balance" required
                                value={state.opening_balance}
                                InputProps={{ inputComponent: NumberFormatCustom }}
                                inputProps={{ style: { textAlign: 'right' } }}
                                onChange={e => this.handleChange('opening_balance', e.target.value.replace('₹', '').split(',').join('').trim())}
                                error={!!errors.opening_balance} helperText={errors.opening_balance || ''}
                            />
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Box display="flex" alignItems="center" style={{ height: '100%' }}>
                                <Typography variant="body2" style={{ marginRight: 12, fontWeight: 500 }}>Balance Type:</Typography>
                                <ToggleButtonGroup
                                    value={state.opening_balance_type}
                                    exclusive
                                    onChange={(e, val) => { if (val) this.handleChange('opening_balance_type', val) }}
                                    size="small"
                                >
                                    <ToggleButton value="DEBIT" style={{ padding: '6px 20px', color: state.opening_balance_type === 'DEBIT' ? '#fff' : '#d32f2f', backgroundColor: state.opening_balance_type === 'DEBIT' ? '#d32f2f' : 'transparent', border: '1px solid #d32f2f' }}>Debit</ToggleButton>
                                    <ToggleButton value="CREDIT" style={{ padding: '6px 20px', color: state.opening_balance_type === 'CREDIT' ? '#fff' : '#2e7d32', backgroundColor: state.opening_balance_type === 'CREDIT' ? '#2e7d32' : 'transparent', border: '1px solid #2e7d32' }}>Credit</ToggleButton>
                                </ToggleButtonGroup>
                            </Box>
                        </Grid>
                    </Grid>
                )}

                {/* ── Module-Specific Extra Fields ── */}

                {/* Pending Fees — Mode Toggle + Form */}
                {isPendingFees && (
                    <Box mt={2}>
                        {this.renderSectionHeader('Pending Fees Entry Mode')}
                        <Box display="flex" alignItems="center" mb={2}>
                            <ToggleButtonGroup
                                value={state.pendingFeesMode}
                                exclusive
                                onChange={(e, val) => {
                                    if (val) {
                                        this.setState({ pendingFeesMode: val }, () => {
                                            if (val === 'auto' && !state.reportId) {
                                                this.loadGroupingData()
                                            }
                                        })
                                    }
                                }}
                                size="small"
                            >
                                <ToggleButton value="manual" style={{
                                    padding: '6px 24px',
                                    color: state.pendingFeesMode === 'manual' ? '#fff' : '#1565c0',
                                    backgroundColor: state.pendingFeesMode === 'manual' ? '#1565c0' : 'transparent',
                                    border: '1px solid #1565c0',
                                }}>
                                    Manual Entry
                                </ToggleButton>
                                <ToggleButton value="auto" style={{
                                    padding: '6px 24px',
                                    color: state.pendingFeesMode === 'auto' ? '#fff' : '#2e7d32',
                                    backgroundColor: state.pendingFeesMode === 'auto' ? '#2e7d32' : 'transparent',
                                    border: '1px solid #2e7d32',
                                }}>
                                    Automatic Calculation
                                </ToggleButton>
                            </ToggleButtonGroup>
                            <Typography variant="caption" style={{ marginLeft: 16, color: '#64748b' }}>
                                {state.pendingFeesMode === 'manual'
                                    ? 'Enter pending fees amount directly'
                                    : 'Auto-calculate pending fees from fee plan configuration'}
                            </Typography>
                        </Box>

                        {isAutoPendingFees && this.renderGroupingForm(true)}
                    </Box>
                )}

                {/* Advance Fee — Mode Toggle + Config */}
                {isAdvanceFee && (
                    <Box mt={2}>
                        {this.renderSectionHeader('Advance Fee Entry Mode')}
                        <Box display="flex" alignItems="center" mb={2}>
                            <ToggleButtonGroup
                                value={state.advanceFeeMode}
                                exclusive
                                onChange={(e, val) => {
                                    if (val) {
                                        this.setState({ advanceFeeMode: val }, () => {
                                            if (val === 'auto') {
                                                this.loadFeeAdvanceTypes()
                                                this.fetchGroupingDropdowns()
                                            }
                                        })
                                    }
                                }}
                                size="small"
                            >
                                <ToggleButton value="manual" style={{
                                    padding: '6px 24px',
                                    color: state.advanceFeeMode === 'manual' ? '#fff' : '#1565c0',
                                    backgroundColor: state.advanceFeeMode === 'manual' ? '#1565c0' : 'transparent',
                                    border: '1px solid #1565c0',
                                }}>
                                    Manual Entry
                                </ToggleButton>
                                <ToggleButton value="auto" style={{
                                    padding: '6px 24px',
                                    color: state.advanceFeeMode === 'auto' ? '#fff' : '#2e7d32',
                                    backgroundColor: state.advanceFeeMode === 'auto' ? '#2e7d32' : 'transparent',
                                    border: '1px solid #2e7d32',
                                }}>
                                    Automatic Calculation
                                </ToggleButton>
                            </ToggleButtonGroup>
                            <Typography variant="caption" style={{ marginLeft: 16, color: '#64748b' }}>
                                {state.advanceFeeMode === 'manual'
                                    ? 'Enter advance fee amount directly'
                                    : 'Auto-calculate from advance fee collections'}
                            </Typography>
                        </Box>

                        {isAutoAdvanceFee && (
                            <Box mt={2}>
                                <Paper variant="outlined" style={{ padding: 16, marginBottom: 16 }}>
                                    <Typography variant="subtitle1" style={{ color: '#1565c0', fontWeight: 600, marginBottom: 12 }}>
                                        Advance Fee Configuration
                                    </Typography>
                                    <Grid container spacing={3}>
                                        <Grid item md={6} xs={12}>
                                            <MultipleSelectDropdown
                                                data_list={state.feeAdvanceTypeOptions || []}
                                                selected_list={state.selectedAdvFeeTypes}
                                                onChange={(selected) => this.setState({ selectedAdvFeeTypes: selected })}
                                                label="Fee Advance Types"
                                            />
                                        </Grid>
                                    </Grid>
                                </Paper>
                            </Box>
                        )}
                    </Box>
                )}

                {/* Staff Salary Advance — Staff + Recovery */}
                {isSalaryAdvance && (
                    <Box>
                        {this.renderSectionHeader('Staff Salary Advance')}
                        <Grid container spacing={3}>
                            <Grid item md={6} xs={12}>
                                <DropDownWithSearch
                                    options={state.staffOptions || []}
                                    value={state.staff}
                                    onChange={(e, v) => this.handleChange('staff', v)}
                                    label="Staff Member"
                                    fullWidth
                                    onOpen={this.loadStaffList}
                                />
                            </Grid>
                        </Grid>
                        {this.renderSectionHeader('Recovery Details')}
                        <Grid container spacing={3}>
                            <Grid item md={6} xs={12}>
                                <TextField
                                    fullWidth variant="outlined" label="Total Amount"
                                    value={state.total_amount}
                                    InputProps={{ inputComponent: NumberFormatCustom }}
                                    inputProps={{ style: { textAlign: 'right' } }}
                                    onChange={e => this.handleChange('total_amount', e.target.value.replace('₹', '').split(',').join('').trim())}
                                />
                            </Grid>
                            <Grid item md={6} xs={12}>
                                <TextField
                                    fullWidth variant="outlined" label="Monthly Recovery Amount"
                                    value={state.monthly_recovery_amount}
                                    InputProps={{ inputComponent: NumberFormatCustom }}
                                    inputProps={{ style: { textAlign: 'right' } }}
                                    onChange={e => this.handleChange('monthly_recovery_amount', e.target.value.replace('₹', '').split(',').join('').trim())}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                )}

                {/* Cash in Hand — Staff Wallet */}
                {isCashInHand && (
                    <Box>
                        {this.renderSectionHeader('Cash in Hand — Staff')}
                        <Grid container spacing={3}>
                            <Grid item md={6} xs={12}>
                                <DropDownWithSearch
                                    options={state.staffWalletOptions || []}
                                    value={state.linkedStaffWallet}
                                    onChange={(e, v) => this.handleChange('linkedStaffWallet', v)}
                                    label="Staff (Cash in Hand)"
                                    fullWidth
                                    onOpen={this.loadStaffWalletList}
                                />
                            </Grid>
                            {state.linkedStaffWallet && (
                                <Grid item md={6} xs={12}>
                                    <Box display="flex" alignItems="center" style={{ height: '100%' }}>
                                        <Typography variant="body2" style={{ color: '#1565c0' }}>
                                            Opening Balance: ₹{parseFloat(state.linkedStaffWallet.opening_balance || 0).toLocaleString('en-IN')} ({state.linkedStaffWallet.opening_balance_type || 'DEBIT'})
                                        </Typography>
                                    </Box>
                                </Grid>
                            )}
                        </Grid>
                    </Box>
                )}

                {/* Bank Account — Bank + Label */}
                {isBankAccount && (
                    <Box>
                        {this.renderSectionHeader('Bank Details')}
                        <Grid container spacing={3}>
                            <Grid item md={6} xs={12}>
                                <DropDownWithSearch
                                    options={state.bankOptions || []}
                                    value={state.bank}
                                    onChange={(e, v) => this.handleChange('bank', v)}
                                    label="Bank Account"
                                    fullWidth
                                    onOpen={this.loadBankList}
                                />
                            </Grid>
                            <Grid item md={6} xs={12}>
                                <DropDownWithSearch
                                    options={ACCOUNT_LABEL_OPTIONS}
                                    value={state.account_label}
                                    onChange={(e, v) => this.handleChange('account_label', v)}
                                    label="Account Label"
                                    fullWidth
                                />
                            </Grid>
                        </Grid>
                    </Box>
                )}

                {/* No module selected — show auto-sections from category asset_types */}
                {!linkedModule && (
                    <Box>
                        {showStaff && (
                            <Box>
                                {this.renderSectionHeader('Staff Details')}
                                <Grid container spacing={3}>
                                    <Grid item md={6} xs={12}>
                                        <DropDownWithSearch
                                            options={state.staffOptions || []}
                                            value={state.staff}
                                            onChange={(e, v) => this.handleChange('staff', v)}
                                            label="Staff Member"
                                            fullWidth
                                            onOpen={this.loadStaffList}
                                        />
                                    </Grid>
                                </Grid>
                            </Box>
                        )}
                        {showBank && (
                            <Box>
                                {this.renderSectionHeader('Bank Details')}
                                <Grid container spacing={3}>
                                    <Grid item md={6} xs={12}>
                                        <DropDownWithSearch
                                            options={state.bankOptions || []}
                                            value={state.bank}
                                            onChange={(e, v) => this.handleChange('bank', v)}
                                            label="Bank Account"
                                            fullWidth
                                            onOpen={this.loadBankList}
                                        />
                                    </Grid>
                                    <Grid item md={6} xs={12}>
                                        <DropDownWithSearch
                                            options={ACCOUNT_LABEL_OPTIONS}
                                            value={state.account_label}
                                            onChange={(e, v) => this.handleChange('account_label', v)}
                                            label="Account Label"
                                            fullWidth
                                        />
                                    </Grid>
                                </Grid>
                            </Box>
                        )}
                        {showCounterparty && (
                            <Box>
                                {this.renderSectionHeader('Counterparty Details')}
                                <Grid container spacing={3}>
                                    <Grid item md={6} xs={12}>
                                        <TextField
                                            fullWidth variant="outlined" label="Counterparty Name"
                                            value={state.counterparty_name}
                                            onChange={e => this.handleChange('counterparty_name', e.target.value)}
                                        />
                                    </Grid>
                                    <Grid item md={6} xs={12}>
                                        <DropDownWithSearch
                                            options={COUNTERPARTY_TYPE_OPTIONS}
                                            value={state.counterparty_type}
                                            onChange={(e, v) => this.handleChange('counterparty_type', v)}
                                            label="Counterparty Type"
                                            fullWidth
                                        />
                                    </Grid>
                                </Grid>
                            </Box>
                        )}
                        {showRecovery && (
                            <Box>
                                {this.renderSectionHeader('Recovery Details')}
                                <Grid container spacing={3}>
                                    <Grid item md={6} xs={12}>
                                        <TextField
                                            fullWidth variant="outlined" label="Total Amount"
                                            value={state.total_amount}
                                            InputProps={{ inputComponent: NumberFormatCustom }}
                                            inputProps={{ style: { textAlign: 'right' } }}
                                            onChange={e => this.handleChange('total_amount', e.target.value.replace('₹', '').split(',').join('').trim())}
                                        />
                                    </Grid>
                                    <Grid item md={6} xs={12}>
                                        <TextField
                                            fullWidth variant="outlined" label="Monthly Recovery Amount"
                                            value={state.monthly_recovery_amount}
                                            InputProps={{ inputComponent: NumberFormatCustom }}
                                            inputProps={{ style: { textAlign: 'right' } }}
                                            onChange={e => this.handleChange('monthly_recovery_amount', e.target.value.replace('₹', '').split(',').join('').trim())}
                                        />
                                    </Grid>
                                </Grid>
                            </Box>
                        )}
                    </Box>
                )}

                {/* Notes */}
                {this.renderSectionHeader('Notes')}
                <Grid container spacing={3}>
                    <Grid item md={12} xs={12}>
                        <TextField
                            fullWidth variant="outlined" label="Purpose" multiline minRows={2}
                            value={state.purpose}
                            onChange={e => this.handleChange('purpose', e.target.value)}
                        />
                    </Grid>
                    <Grid item md={12} xs={12}>
                        <TextField
                            fullWidth variant="outlined" label="Remarks" multiline minRows={2}
                            value={state.remarks}
                            onChange={e => this.handleChange('remarks', e.target.value)}
                        />
                    </Grid>
                </Grid>

                {/* Submit */}
                <Box display="flex" justifyContent="flex-end" mt={3}>
                    <Button
                        variant="contained" color="primary"
                        onClick={this.handleSubmit}
                        disabled={state.submitDisable}
                        style={{ minWidth: 120, padding: '10px 30px' }}
                    >
                        {state.submitDisable ? 'Saving...' : 'Submit'}
                    </Button>
                </Box>
            </Box>
        )
    }

    handleLinkedModuleChange = (e, v) => {
        const mod = v ? v.id : null
        const updates = {
            linkedModule: mod,
            linkedStaffWallet: null,
            fromBank: null,
            toBank: null,
            isPendingFees: mod === 'SUNDRY_DEBTORS',
            isAdvanceFee: mod === 'ADVANCE_FEE',
            advanceFeeMode: 'manual',
            pendingFeesMode: this._pendingMode || 'manual',
            errors: { ...this.state.errors },
            // Reset section flags — will be set by module
            showStaff: false,
            showBank: false,
            showCounterparty: false,
            showRecovery: false,
            // Reset advance fee selections
            selectedAdvFeeTypes: [],
        }

        // Auto-select matching category for SUNDRY_DEBTORS
        if (mod === 'SUNDRY_DEBTORS' && !this.state.selectedCategory) {
            const sundryCategory = this.state.categories.find(
                c => (c.code && c.code.toLowerCase() === 'sundry') ||
                    (c.name && c.name.toLowerCase().includes('sundry'))
            )
            if (sundryCategory) {
                updates.selectedCategory = sundryCategory
                updates.asset_type = (sundryCategory.asset_types || [])[0] || null
            }
        }

        // Set flags based on module for auto-sections when no module is selected
        if (mod === 'STAFF_SALARY_ADVANCE') {
            updates.showStaff = true
            updates.showRecovery = true
        } else if (mod === 'BANK_ACCOUNT') {
            updates.showBank = true
        } else if (!mod) {
            // Re-derive from category asset_types
            const assetTypes = (this.state.selectedCategory && this.state.selectedCategory.asset_types) || []
            const autoSections = []
            assetTypes.forEach(t => {
                const sections = ASSET_TYPE_SECTIONS[t] || []
                sections.forEach(s => { if (!autoSections.includes(s)) autoSections.push(s) })
            })
            updates.showStaff = autoSections.includes('staff')
            updates.showBank = autoSections.includes('bank')
            updates.showCounterparty = autoSections.includes('counterparty')
            updates.showRecovery = autoSections.includes('recovery')
        }
        this.setState(updates, () => {
            // Clear the pending mode after use
            delete this._pendingMode
            if (mod === 'SUNDRY_DEBTORS' && this.state.pendingFeesMode === 'auto') {
                this.loadGroupingData()
            } else if (mod === 'ADVANCE_FEE') {
                this.loadFeeAdvanceTypes()
                this.fetchGroupingDropdowns()  // for academic year list
            } else if (mod === 'STAFF_SALARY_ADVANCE') {
                this.loadStaffList()
            } else if (mod === 'CASH_IN_HAND') {
                this.loadStaffWalletList()
            } else if (mod === 'BANK_ACCOUNT') {
                this.loadBankList()
            }
        })
    }

    render() {
        const { categories, categoriesLoading, selectedCategory, errors } = this.state
        const state = this.state

        // ── Multi-asset mapping mode ──
        if (state.multiAssetMode) {
            return (
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={8} xs={12} className={classNames('header-align')}>
                            <Box className="heading">
                                Configure Automated Pending Fees
                            </Box>
                            <Box className="sub-heading">
                                Select an asset below to configure its value mapping for automated calculation
                            </Box>
                        </Grid>
                        <Grid item md={4} xs={12}>
                            <Box className={classNames('header-align', 'end-flex-prop')}>
                                <Button
                                    variant="contained"
                                    onClick={() => this.props.history.push(this.viewUrl)}
                                    className="editbutton-view"
                                >
                                    <VisibilityOutlinedIcon className="visibility-icon" /> View Register
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>

                    <Box px={3} pb={4}>
                        {state.assetsLoading ? (
                            <Box display="flex" justifyContent="center" py={4}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <>
                                {/* Assets Table */}
                                <Box mt={2}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                                                <TableCell><strong>Asset Name</strong></TableCell>
                                                <TableCell><strong>Category</strong></TableCell>
                                                <TableCell align="right"><strong>Opening Balance</strong></TableCell>
                                                <TableCell align="right"><strong>Outstanding</strong></TableCell>
                                                <TableCell align="center"><strong>Action</strong></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {state.pendingFeesAssets.map(asset => (
                                                <React.Fragment key={asset.id}>
                                                    <TableRow hover
                                                        style={state.expandedAssetId === asset.id ? { backgroundColor: '#e8f5e9' } : {}}
                                                    >
                                                        <TableCell>{asset.name || asset.particulars}</TableCell>
                                                        <TableCell>
                                                            <Chip label={asset.category_name || 'Sundry Debtors'} size="small" variant="outlined" color="primary" />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            {parseFloat(asset.opening_balance || 0).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <strong>{parseFloat(asset.closing_balance || 0).toFixed(2)}</strong>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Button
                                                                variant={state.expandedAssetId === asset.id ? 'contained' : 'outlined'}
                                                                color="primary"
                                                                size="small"
                                                                onClick={() => this.selectAssetForMapping(asset.id)}
                                                            >
                                                                {state.expandedAssetId === asset.id ? 'Collapse' : 'Configure'}
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                    {/* Expanded mapping form */}
                                                    {state.expandedAssetId === asset.id && (
                                                        <TableRow>
                                                            <TableCell colSpan={5} style={{ padding: '16px 24px', backgroundColor: '#fafafa' }}>
                                                                <Box>
                                                                    <Typography variant="subtitle2" style={{ color: '#1565c0', fontWeight: 600, marginBottom: 8 }}>
                                                                        Value Mapping for: {asset.name}
                                                                    </Typography>
                                                                    {this.renderGroupingForm()}
                                                                </Box>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                            {state.pendingFeesAssets.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={5} align="center">
                                                        <Typography color="textSecondary">No manual pending fees assets found.</Typography>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </Box>

                                {/* Create New button */}
                                <Box mt={3} display="flex" justifyContent="center">
                                    <Button
                                        variant="outlined"
                                        color="primary"
                                        onClick={() => {
                                            this.setState({ multiAssetMode: false, expandedAssetId: null, editMappingOnly: false })
                                            const option = LINKED_MODULE_OPTIONS.find(o => o.id === 'SUNDRY_DEBTORS')
                                            if (option) this.handleLinkedModuleChange(null, option)
                                        }}
                                    >
                                        + Create New Pending Fees Asset
                                    </Button>
                                </Box>
                            </>
                        )}
                    </Box>
                </Paper>
            )
        }

        // ── Edit Mapping Only mode (single asset, via asset_id param) ──
        if (state.editMappingOnly) {
            return (
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={8} xs={12} className={classNames('header-align')}>
                            <Box className="heading">
                                Configure Value Mapping
                            </Box>
                            <Box className="sub-heading">
                                {`Asset: ${state.name}`}
                                {selectedCategory ? ` • Category: ${selectedCategory.name}` : ''}
                            </Box>
                        </Grid>
                        <Grid item md={4} xs={12}>
                            <Box className={classNames('header-align', 'end-flex-prop')}>
                                <Button
                                    variant="contained"
                                    onClick={() => this.props.history.push(this.viewUrl)}
                                    className="editbutton-view"
                                >
                                    <VisibilityOutlinedIcon className="visibility-icon" /> View Register
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>

                    <Box px={3} pb={4}>
                        {/* Read-only asset info */}
                        <Box mt={2} mb={2}>
                            <Grid container spacing={3}>
                                <Grid item md={6} xs={12}>
                                    <TextField
                                        fullWidth variant="outlined" label="Asset Name"
                                        value={state.name}
                                        InputProps={{ readOnly: true }}
                                        style={{ backgroundColor: '#f5f5f5' }}
                                    />
                                </Grid>
                                <Grid item md={6} xs={12}>
                                    <TextField
                                        fullWidth variant="outlined" label="Linked Module"
                                        value="Pending Fees"
                                        InputProps={{ readOnly: true }}
                                        style={{ backgroundColor: '#f5f5f5' }}
                                    />
                                </Grid>
                            </Grid>
                        </Box>

                        {/* Value Mapping Form */}
                        {this.renderGroupingForm()}
                    </Box>
                </Paper>
            )
        }

        // ── Normal Add mode ──
        return (
            <Paper className={classNames('paper-background')}>
                {/* Header */}
                <Grid container>
                    <Grid item md={8} xs={12} className={classNames('header-align')}>
                        <Box className="heading">
                            Add Recoverable Asset
                        </Box>
                        <Box className="sub-heading">
                            {selectedCategory
                                ? `Category: ${selectedCategory.name}`
                                : 'Select a category to begin'
                            }
                        </Box>
                    </Grid>
                    <Grid item md={4} xs={12}>
                        <Box className={classNames('header-align', 'end-flex-prop')}>
                            <Button
                                variant="contained"
                                onClick={() => this.props.history.push(this.viewUrl)}
                                className="editbutton-view"
                            >
                                <VisibilityOutlinedIcon className="visibility-icon" /> View Register
                            </Button>
                        </Box>
                    </Grid>
                </Grid>

                <Box px={3} pb={4}>
                    {/* Row 1: Category + Link to Module on same row */}
                    <Box mt={2} mb={2}>
                        {categoriesLoading ? (
                            <CircularProgress size={24} />
                        ) : (
                            <Grid container spacing={3}>
                                <Grid item md={6} xs={12}>
                                    <DropDownWithSearch
                                        options={categories}
                                        value={selectedCategory}
                                        onChange={this.handleCategoryChange}
                                        label="Category *"
                                        className="width-100"
                                    />
                                    {errors.category && (
                                        <Typography variant="caption" color="error" style={{ marginTop: 4, display: 'block' }}>
                                            {errors.category}
                                        </Typography>
                                    )}
                                </Grid>
                                <Grid item md={6} xs={12}>
                                    <DropDownWithSearch
                                        options={LINKED_MODULE_OPTIONS}
                                        value={LINKED_MODULE_OPTIONS.find(o => o.id === (state.linkedModule || '')) || null}
                                        onChange={this.handleLinkedModuleChange}
                                        label="Link to Module"
                                        className="width-100"
                                    />
                                </Grid>
                            </Grid>
                        )}
                    </Box>

                    {/* Step 2: Show asset form when category is selected */}
                    {selectedCategory && this.renderAssetForm()}
                </Box>
            </Paper>
        )
    }
}


export default withRouter(EditRecoverableAsset)
