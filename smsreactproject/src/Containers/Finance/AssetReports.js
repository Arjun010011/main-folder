import React, { Component } from 'react'
import {
    Paper, Box, Grid, Button, TextField, MenuItem,
    Table, TableHead, TableRow, TableCell, TableBody,
    Typography, CircularProgress, ListSubheader
} from '@material-ui/core'
import GetAppIcon from '@material-ui/icons/GetApp'
import PrintIcon from '@material-ui/icons/Print'
import classNames from 'classnames'
import InfiniteScroll from 'react-infinite-scroller'

import { getRequest } from 'Includes/api/apicall'
import { GET_URL } from 'Includes/urls'
import { numberWithCommas } from 'Includes/functions'
import LoadingGif from 'Components/LoadingGif'
import SummaryCard from './Components/SummaryCard'

const RECOV_PAGE_SIZE = 10
const BASE_URL = process.env.REACT_APP_BASE

const REPORT_OPTIONS = [
    {
        group: 'Fixed Asset Reports', items: [
            { value: 'far', label: 'Fixed Asset Register' },
            { value: 'ags', label: 'Asset Group Summary' },
            { value: 'ds', label: 'Depreciation Schedule' },
            { value: 'cr', label: 'Cost Register' },
            { value: 'cgs', label: 'Cost Group Summary' },
            { value: 'dl', label: 'Disposal List' },
        ]
    },
    {
        group: 'Recoverable Asset Reports', items: [
            { value: 'rl', label: 'Asset Ledger' },
            { value: 'rs', label: 'Category Summary' },
            { value: 'rp', label: 'Period Report' },
        ]
    },
]

class AssetReports extends Component {
    constructor(props) {
        super(props)
        this.state = {
            loading: true,
            reportType: 'far',

            financial_year: '',
            financialYearOptions: [],

            // Fixed Asset Register (Tab 0)
            farData: [],
            farTotals: null,
            farPageNo: 1,
            farTotalCount: 0,
            farHasMore: true,
            farIsFetchingMore: false,
            farUpdating: false,

            // Asset Group Summary (Tab 1)
            agsSummary: [],
            agsGrandTotals: null,
            agsUpdating: false,

            // Depreciation Schedule (Tab 2)
            assetsList: [],
            selectedAssetId: '',
            dsSchedule: [],
            dsUpdating: false,

            // Cost Register (Tab 3)
            crData: [],
            crTotals: null,
            crPageNo: 1,
            crTotalCount: 0,
            crHasMore: true,
            crIsFetchingMore: false,
            crUpdating: false,
            crIsLocked: false,

            // Cost Group Summary (Tab 4)
            cgsSummary: [],
            cgsGrandTotals: null,
            cgsUpdating: false,
            cgsIsLocked: false,

            // Disposal List (Tab 5)
            dlData: [],
            dlTotals: null,
            dlUpdating: false,

            // ── Recoverable Asset Report state ──
            recovCategories: [],
            recovAssets: [],
            // Ledger
            ledgerCategoryId: '',
            ledgerAssets: [],
            rlSelectedAssetId: '',
            ledgerData: null,
            ledgerLoading: false,
            ledgerDisplayCount: RECOV_PAGE_SIZE,
            // Category Summary
            summaryData: null,
            summaryLoading: false,
            // Period
            fromDate: '',
            toDate: '',
            periodCategoryId: '',
            periodData: null,
            periodLoading: false,
            periodDisplayCount: RECOV_PAGE_SIZE,
        }
    }

    componentDidMount() {
        this.loadFinancialYears()
    }

    // ━━━ FINANCIAL YEAR LOADER ━━━
    loadFinancialYears = () => {
        getRequest(GET_URL.financialyear.api, { is_active: true }, this.props)
            .then(res => {
                if (res?.status !== 200) {
                    this.setState({ loading: false })
                    return
                }

                const options = res.data.data || []
                let currentFyId = ''

                const today = new Date()
                const currentFy = options.find(fy => {
                    const start = new Date(fy.start_date)
                    const end = new Date(fy.end_date)
                    return today >= start && today <= end
                })

                currentFyId = currentFy ? currentFy.id : options[0]?.id || ''

                this.setState(
                    {
                        financialYearOptions: options,
                        financial_year: currentFyId,
                        loading: false
                    },
                    () => {
                        if (currentFyId) {
                            this.loadTabData()
                            this.loadAssetsList()
                        }
                    }
                )
            })
            .catch(() => this.setState({ loading: false }))
    }

    loadAssetsList = () => {
        getRequest(GET_URL.assetList.api, { is_active: true, limit: 10, pageno: 1 }, this.props)
            .then(res => {
                if (res?.status === 200) {
                    const data = res.data.data
                    this.setState({ assetsList: data?.data_list || data || [] })
                }
            })
    }

    handleFyChange = (e) => {
        this.setState(
            { financial_year: e.target.value },
            this.loadTabData
        )
    }

    handleTabChange = (e) => {
        const reportType = e.target.value
        this.setState({ reportType }, this.loadTabData)
    }

    loadTabData = () => {
        const { reportType } = this.state
        if (reportType === 'far') this.loadFar()
        else if (reportType === 'ags') this.loadAgs()
        else if (reportType === 'ds') { /* loads on asset select */ }
        else if (reportType === 'cr') this.loadCr()
        else if (reportType === 'cgs') this.loadCgs()
        else if (reportType === 'dl') this.loadDl()
        else if (reportType === 'rl') this.loadRecovCategories()
        else if (reportType === 'rs') this.loadRecovCategories()
        else if (reportType === 'rp') this.loadRecovCategories()
    }

    // ━━━ TAB 0: FIXED ASSET REGISTER ━━━
    loadFar = () => {
        const { financial_year } = this.state
        if (!financial_year) return

        this.setState({
            farUpdating: true,
            farPageNo: 1,
            farData: [],
            farHasMore: true
        })

        const params = { financial_year, limit: 10, pageno: 1 }

        getRequest(GET_URL.fixedAssetRegister.api, params, this.props)
            .then(res => {
                if (res?.status !== 200) {
                    this.setState({ farUpdating: false })
                    return
                }

                const data = res.data.data || {}
                this.setState({
                    farData: data.register || [],
                    farTotals: data.totals || null,
                    farTotalCount: data.count || 0,
                    farHasMore: !!data.next,
                    farUpdating: false
                })
            })
            .catch(() => this.setState({ farUpdating: false }))
    }

    loadMoreFar = () => {
        const { financial_year, farPageNo, farHasMore, farIsFetchingMore } = this.state
        if (!farHasMore || farIsFetchingMore || this.farFetchLock) return

        this.farFetchLock = true
        const nextPage = farPageNo + 1
        this.setState({ farIsFetchingMore: true })

        const params = { financial_year, limit: 10, pageno: nextPage }

        getRequest(GET_URL.fixedAssetRegister.api, params, this.props)
            .then(res => {
                this.farFetchLock = false
                if (res?.status !== 200) {
                    this.setState({ farIsFetchingMore: false })
                    return
                }

                const data = res.data.data || {}
                const newItems = data.register || []

                this.setState(prev => {
                    const existingCodes = new Set(prev.farData.map(item => item.asset_code))
                    const uniqueNewItems = newItems.filter(item => !existingCodes.has(item.asset_code))

                    return {
                        farData: [...prev.farData, ...uniqueNewItems],
                        farPageNo: nextPage,
                        farHasMore: !!data.next,
                        farIsFetchingMore: false
                    }
                })
            })
            .catch(() => {
                this.farFetchLock = false
                this.setState({ farIsFetchingMore: false })
            })
    }

    handleFarExcel = () => {
        const { financial_year } = this.state
        if (!financial_year) return

        this.setState({ farUpdating: true })
        const params = { financial_year, download_excel: 'true' }
        const prop = { responseType: 'blob' }

        getRequest(GET_URL.fixedAssetRegister.api, params, prop)
            .then(res => {
                this.setState({ farUpdating: false })
                if (res?.status === 200) {
                    const url = window.URL.createObjectURL(new Blob([res.data]))
                    const link = document.createElement('a')
                    link.href = url
                    link.setAttribute('download', `Fixed_Asset_Register_${financial_year}.xlsx`)
                    document.body.appendChild(link)
                    link.click()
                    link.remove()
                }
            })
            .catch(() => this.setState({ farUpdating: false }))
    }

    handleFarPdf = () => {
        const { financial_year } = this.state
        if (!financial_year) return

        this.setState({ farUpdating: true })
        const params = { financial_year, download_pdf: 'true' }
        const prop = { responseType: 'blob' }

        getRequest(GET_URL.fixedAssetRegister.api, params, prop)
            .then(res => {
                this.setState({ farUpdating: false })
                if (res?.status === 200) {
                    const blob = new Blob([res.data], { type: 'application/pdf' })
                    const fileURL = URL.createObjectURL(blob)
                    const height = (window.screen.height * 75) / 100
                    const width = (window.screen.width * 75) / 100
                    window.open(fileURL, 'PRINT', `height=${height},width=${width}`)
                }
            })
            .catch(() => this.setState({ farUpdating: false }))
    }

    // ━━━ TAB 1: ASSET GROUP SUMMARY ━━━
    loadAgs = () => {
        const { financial_year } = this.state
        if (!financial_year) return

        this.setState({ agsUpdating: true })

        getRequest(GET_URL.assetGroupSummary.api, { financial_year }, this.props)
            .then(res => {
                if (res?.status !== 200) {
                    this.setState({ agsUpdating: false })
                    return
                }

                const data = res.data.data || {}
                this.setState({
                    agsSummary: data.summary || [],
                    agsGrandTotals: data.grand_totals || null,
                    agsUpdating: false
                })
            })
            .catch(() => this.setState({ agsUpdating: false }))
    }

    handleAgsExcel = () => {
        const { financial_year } = this.state
        if (!financial_year) return

        this.setState({ agsUpdating: true })
        const prop = { responseType: 'blob' }

        getRequest(GET_URL.assetGroupSummary.api, { financial_year, download_excel: 'true' }, prop)
            .then(res => {
                this.setState({ agsUpdating: false })
                if (res?.status === 200) {
                    const url = window.URL.createObjectURL(new Blob([res.data]))
                    const link = document.createElement('a')
                    link.href = url
                    link.setAttribute('download', `Asset_Group_Summary_${financial_year}.xlsx`)
                    document.body.appendChild(link)
                    link.click()
                    link.remove()
                }
            })
            .catch(() => this.setState({ agsUpdating: false }))
    }

    handleAgsPdf = () => {
        const { financial_year } = this.state
        if (!financial_year) return

        this.setState({ agsUpdating: true })
        const prop = { responseType: 'blob' }

        getRequest(GET_URL.assetGroupSummary.api, { financial_year, download_pdf: 'true' }, prop)
            .then(res => {
                this.setState({ agsUpdating: false })
                if (res?.status === 200) {
                    const blob = new Blob([res.data], { type: 'application/pdf' })
                    const fileURL = URL.createObjectURL(blob)
                    const height = (window.screen.height * 75) / 100
                    const width = (window.screen.width * 75) / 100
                    window.open(fileURL, 'PRINT', `height=${height},width=${width}`)
                }
            })
            .catch(() => this.setState({ agsUpdating: false }))
    }

    // ━━━ TAB 2: DEPRECIATION SCHEDULE ━━━
    loadDs = () => {
        const { selectedAssetId } = this.state
        if (!selectedAssetId) return

        this.setState({ dsUpdating: true })

        getRequest(GET_URL.depreciationSchedule.api, { asset: selectedAssetId }, this.props)
            .then(res => {
                if (res?.status !== 200) {
                    this.setState({ dsUpdating: false })
                    return
                }

                const data = res.data.data || {}
                this.setState({
                    dsSchedule: data.schedule || [],
                    dsUpdating: false
                })
            })
            .catch(() => this.setState({ dsUpdating: false }))
    }

    handleDsPdf = () => {
        const { selectedAssetId } = this.state
        if (!selectedAssetId) return

        this.setState({ dsUpdating: true })
        const prop = { responseType: 'blob' }

        getRequest(GET_URL.depreciationSchedule.api, { asset: selectedAssetId, download_pdf: 'true' }, prop)
            .then(res => {
                this.setState({ dsUpdating: false })
                if (res?.status === 200) {
                    const blob = new Blob([res.data], { type: 'application/pdf' })
                    const fileURL = URL.createObjectURL(blob)
                    const height = (window.screen.height * 75) / 100
                    const width = (window.screen.width * 75) / 100
                    window.open(fileURL, 'PRINT', `height=${height},width=${width}`)
                }
            })
            .catch(() => this.setState({ dsUpdating: false }))
    }

    handleDsExcel = () => {
        const { selectedAssetId } = this.state
        if (!selectedAssetId) return

        this.setState({ dsUpdating: true })
        const prop = { responseType: 'blob' }

        getRequest(GET_URL.depreciationSchedule.api, { asset: selectedAssetId, download_excel: 'true' }, prop)
            .then(res => {
                this.setState({ dsUpdating: false })
                if (res?.status === 200) {
                    const url = window.URL.createObjectURL(new Blob([res.data]))
                    const link = document.createElement('a')
                    link.href = url
                    link.setAttribute('download', `Depreciation_Schedule_${selectedAssetId}.xlsx`)
                    document.body.appendChild(link)
                    link.click()
                    link.remove()
                }
            })
            .catch(() => this.setState({ dsUpdating: false }))
    }

    // ━━━ TAB 3: COST REGISTER ━━━
    loadCr = () => {
        const { financial_year } = this.state
        if (!financial_year) return

        this.setState({
            crUpdating: true,
            crPageNo: 1,
            crData: [],
            crHasMore: true
        })

        const params = { financial_year, limit: 10, pageno: 1 }

        getRequest(GET_URL.fixedAssetCostRegister.api, params, this.props)
            .then(res => {
                if (res?.status !== 200) {
                    this.setState({ crUpdating: false })
                    return
                }

                const data = res.data.data || {}
                this.setState({
                    crData: data.register || [],
                    crTotals: data.totals || null,
                    crTotalCount: data.count || 0,
                    crHasMore: !!data.next,
                    crIsLocked: data.is_locked || false,
                    crUpdating: false
                })
            })
            .catch(() => this.setState({ crUpdating: false }))
    }

    loadMoreCr = () => {
        const { financial_year, crPageNo, crHasMore, crIsFetchingMore } = this.state
        if (!crHasMore || crIsFetchingMore || this.crFetchLock) return

        this.crFetchLock = true
        const nextPage = crPageNo + 1
        this.setState({ crIsFetchingMore: true })

        const params = { financial_year, limit: 10, pageno: nextPage }

        getRequest(GET_URL.fixedAssetCostRegister.api, params, this.props)
            .then(res => {
                this.crFetchLock = false
                if (res?.status !== 200) {
                    this.setState({ crIsFetchingMore: false })
                    return
                }

                const data = res.data.data || {}
                const newItems = data.register || []

                this.setState(prev => {
                    const existingCodes = new Set(prev.crData.map(item => item.asset_code))
                    const uniqueNewItems = newItems.filter(item => !existingCodes.has(item.asset_code))

                    return {
                        crData: [...prev.crData, ...uniqueNewItems],
                        crPageNo: nextPage,
                        crHasMore: !!data.next,
                        crIsFetchingMore: false
                    }
                })
            })
            .catch(() => {
                this.crFetchLock = false
                this.setState({ crIsFetchingMore: false })
            })
    }

    handleCrExcel = () => {
        const { financial_year } = this.state
        if (!financial_year) return

        this.setState({ crUpdating: true })
        const prop = { responseType: 'blob' }

        getRequest(GET_URL.fixedAssetCostRegister.api, { financial_year, download_excel: 'true' }, prop)
            .then(res => {
                this.setState({ crUpdating: false })
                if (res?.status === 200) {
                    const url = window.URL.createObjectURL(new Blob([res.data]))
                    const link = document.createElement('a')
                    link.href = url
                    link.setAttribute('download', `Cost_Register_${financial_year}.xlsx`)
                    document.body.appendChild(link)
                    link.click()
                    link.remove()
                }
            })
            .catch(() => this.setState({ crUpdating: false }))
    }

    handleCrPdf = () => {
        const { financial_year } = this.state
        if (!financial_year) return

        this.setState({ crUpdating: true })
        const prop = { responseType: 'blob' }

        getRequest(GET_URL.fixedAssetCostRegister.api, { financial_year, download_pdf: 'true' }, prop)
            .then(res => {
                this.setState({ crUpdating: false })
                if (res?.status === 200) {
                    const blob = new Blob([res.data], { type: 'application/pdf' })
                    const fileURL = URL.createObjectURL(blob)
                    const height = (window.screen.height * 75) / 100
                    const width = (window.screen.width * 75) / 100
                    window.open(fileURL, 'PRINT', `height=${height},width=${width}`)
                }
            })
            .catch(() => this.setState({ crUpdating: false }))
    }

    // ━━━ TAB 4: COST GROUP SUMMARY ━━━
    loadCgs = () => {
        const { financial_year } = this.state
        if (!financial_year) return

        this.setState({ cgsUpdating: true })

        getRequest(GET_URL.assetGroupCostSummary.api, { financial_year }, this.props)
            .then(res => {
                if (res?.status !== 200) {
                    this.setState({ cgsUpdating: false })
                    return
                }

                const data = res.data.data || {}
                this.setState({
                    cgsSummary: data.summary || [],
                    cgsGrandTotals: data.grand_totals || null,
                    cgsIsLocked: data.is_locked || false,
                    cgsUpdating: false
                })
            })
            .catch(() => this.setState({ cgsUpdating: false }))
    }

    handleCgsExcel = () => {
        const { financial_year } = this.state
        if (!financial_year) return

        this.setState({ cgsUpdating: true })
        const prop = { responseType: 'blob' }

        getRequest(GET_URL.assetGroupCostSummary.api, { financial_year, download_excel: 'true' }, prop)
            .then(res => {
                this.setState({ cgsUpdating: false })
                if (res?.status === 200) {
                    const url = window.URL.createObjectURL(new Blob([res.data]))
                    const link = document.createElement('a')
                    link.href = url
                    link.setAttribute('download', `Cost_Group_Summary_${financial_year}.xlsx`)
                    document.body.appendChild(link)
                    link.click()
                    link.remove()
                }
            })
            .catch(() => this.setState({ cgsUpdating: false }))
    }

    handleCgsPdf = () => {
        const { financial_year } = this.state
        if (!financial_year) return

        this.setState({ cgsUpdating: true })
        const prop = { responseType: 'blob' }

        getRequest(GET_URL.assetGroupCostSummary.api, { financial_year, download_pdf: 'true' }, prop)
            .then(res => {
                this.setState({ cgsUpdating: false })
                if (res?.status === 200) {
                    const blob = new Blob([res.data], { type: 'application/pdf' })
                    const fileURL = URL.createObjectURL(blob)
                    const height = (window.screen.height * 75) / 100
                    const width = (window.screen.width * 75) / 100
                }
            })
            .catch(() => this.setState({ cgsUpdating: false }))
    }

    // ━━━ TAB 5: DISPOSAL LIST ━━━
    loadDl = () => {
        const { financial_year } = this.state
        if (!financial_year) return

        this.setState({ dlUpdating: true })

        getRequest(GET_URL.disposalList.api, { financial_year }, this.props)
            .then(res => {
                if (res?.status !== 200) {
                    this.setState({ dlUpdating: false })
                    return
                }

                const data = res.data.data || {}
                this.setState({
                    dlData: data.disposals || [],
                    dlTotals: data.totals || null,
                    dlUpdating: false
                })
            })
            .catch(() => this.setState({ dlUpdating: false }))
    }

    handleDlExcel = () => {
        const { financial_year } = this.state
        if (!financial_year) return

        this.setState({ dlUpdating: true })
        const prop = { responseType: 'blob' }

        getRequest(GET_URL.disposalList.api, { financial_year, download_excel: 'true' }, prop)
            .then(res => {
                this.setState({ dlUpdating: false })
                if (res?.status === 200) {
                    const url = window.URL.createObjectURL(new Blob([res.data]))
                    const link = document.createElement('a')
                    link.href = url
                    link.setAttribute('download', `Disposal_List_${financial_year}.xlsx`)
                    document.body.appendChild(link)
                    link.click()
                    link.remove()
                }
            })
            .catch(() => this.setState({ dlUpdating: false }))
    }

    handleDlPdf = () => {
        const { financial_year } = this.state
        if (!financial_year) return

        this.setState({ dlUpdating: true })
        const prop = { responseType: 'blob' }

        getRequest(GET_URL.disposalList.api, { financial_year, download_pdf: 'true' }, prop)
            .then(res => {
                this.setState({ dlUpdating: false })
                if (res?.status === 200) {
                    const blob = new Blob([res.data], { type: 'application/pdf' })
                    const fileURL = URL.createObjectURL(blob)
                    const height = (window.screen.height * 75) / 100
                    const width = (window.screen.width * 75) / 100
                    window.open(fileURL, 'PRINT', `height=${height},width=${width}`)
                }
            })
            .catch(() => this.setState({ dlUpdating: false }))
    }

    // ═══════════════════════════════════════════════════════════════════
    //  RECOVERABLE ASSET REPORT METHODS
    // ═══════════════════════════════════════════════════════════════════
    loadRecovCategories = () => {
        if (this.state.recovCategories.length > 0) return  // already loaded
        getRequest(GET_URL.recoverableAssetCategory.api, { is_active: true }, this.props)
            .then(res => {
                if (res?.status === 200) {
                    this.setState({ recovCategories: res.data.data || [] })
                    this.loadRecovAssets()
                }
            })
    }

    loadRecovAssets = (categoryId = null) => {
        const params = { is_active: true, limit: 10, pageno: 1 }
        if (categoryId) params.category = categoryId
        getRequest(GET_URL.recoverableAsset.api, params, this.props)
            .then(res => {
                if (res?.status === 200) {
                    const list = res.data.data?.data_list || res.data.data || []
                    if (categoryId !== null) {
                        this.setState({ ledgerAssets: list })
                    } else {
                        this.setState({ recovAssets: list })
                    }
                }
            })
    }

    onLedgerCategoryChange = (categoryId) => {
        this.setState({ ledgerCategoryId: categoryId, rlSelectedAssetId: '', ledgerData: null, ledgerAssets: [] })
        if (categoryId) {
            this.loadRecovAssets(categoryId)
        } else {
            const params = { is_active: true, limit: 10, pageno: 1 }
            getRequest(GET_URL.recoverableAsset.api, params, this.props)
                .then(res => {
                    if (res?.status === 200) {
                        this.setState({ ledgerAssets: res.data.data?.data_list || res.data.data || [] })
                    }
                })
        }
    }

    loadLedger = () => {
        const { rlSelectedAssetId } = this.state
        if (!rlSelectedAssetId) return
        this.setState({ ledgerLoading: true, ledgerDisplayCount: RECOV_PAGE_SIZE })
        getRequest(GET_URL.recoverableAssetReport.api, {
            report_type: 'ledger', asset_id: rlSelectedAssetId
        }, this.props)
            .then(res => {
                if (res?.status === 200) {
                    this.setState({ ledgerData: res.data.data, ledgerLoading: false })
                } else {
                    this.setState({ ledgerLoading: false })
                }
            })
            .catch(() => this.setState({ ledgerLoading: false }))
    }

    downloadLedger = (format) => {
        const { rlSelectedAssetId } = this.state
        if (!rlSelectedAssetId) return
        window.open(
            `${BASE_URL}${GET_URL.recoverableAssetReport.api}?report_type=ledger&format=${format}&asset_id=${rlSelectedAssetId}`,
            '_blank'
        )
    }

    loadSummary = () => {
        this.setState({ summaryLoading: true })
        getRequest(GET_URL.recoverableAssetReport.api, {
            report_type: 'category_summary'
        }, this.props)
            .then(res => {
                if (res?.status === 200) {
                    this.setState({ summaryData: res.data.data, summaryLoading: false })
                } else {
                    this.setState({ summaryLoading: false })
                }
            })
            .catch(() => this.setState({ summaryLoading: false }))
    }

    downloadSummary = (format) => {
        window.open(
            `${BASE_URL}${GET_URL.recoverableAssetReport.api}?report_type=category_summary&format=${format}`,
            '_blank'
        )
    }

    loadPeriodReport = () => {
        const { fromDate, toDate, periodCategoryId } = this.state
        if (!fromDate || !toDate) return
        this.setState({ periodLoading: true, periodDisplayCount: RECOV_PAGE_SIZE })
        const params = { report_type: 'period', from_date: fromDate, to_date: toDate }
        if (periodCategoryId) params.category_id = periodCategoryId
        getRequest(GET_URL.recoverableAssetReport.api, params, this.props)
            .then(res => {
                if (res?.status === 200) {
                    this.setState({ periodData: res.data.data, periodLoading: false })
                } else {
                    this.setState({ periodLoading: false })
                }
            })
            .catch(() => this.setState({ periodLoading: false }))
    }

    downloadPeriod = (format) => {
        const { fromDate, toDate, periodCategoryId } = this.state
        if (!fromDate || !toDate) return
        let url = `${BASE_URL}${GET_URL.recoverableAssetReport.api}?report_type=period&format=${format}&from_date=${fromDate}&to_date=${toDate}`
        if (periodCategoryId) url += `&category_id=${periodCategoryId}`
        window.open(url, '_blank')
    }

    formatAmt = (val) => {
        if (val === null || val === undefined) return '–'
        const num = parseFloat(val)
        if (isNaN(num) || num === 0) return '–'
        return numberWithCommas(num.toFixed(2))
    }

    // ━━━ RENDER ━━━
    render() {
        const { loading, reportType, financial_year, financialYearOptions } = this.state

        if (loading) return <LoadingGif />

        const isFixedReport = ['far', 'ags', 'ds', 'cr', 'cgs', 'dl'].includes(reportType)

        return (
            <Box>
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className="header-align">
                            <Box className="heading">Asset Reports</Box>
                        </Grid>
                    </Grid>

                    {/* Selector Row */}
                    <Grid container spacing={3} style={{ padding: 20 }}>
                        <Grid item md={4} xs={12}>
                            <TextField
                                fullWidth select label="Report Type"
                                value={reportType}
                                onChange={this.handleTabChange}
                                variant="outlined"
                            >
                                {REPORT_OPTIONS.map(group => [
                                    <ListSubheader key={group.group} disableSticky
                                        style={{ fontWeight: 700, color: '#1565c0', fontSize: '0.85rem', lineHeight: '36px' }}>
                                        {group.group}
                                    </ListSubheader>,
                                    ...group.items.map(opt => (
                                        <MenuItem key={opt.value} value={opt.value} style={{ paddingLeft: 24 }}>
                                            {opt.label}
                                        </MenuItem>
                                    ))
                                ])}
                            </TextField>
                        </Grid>
                        {isFixedReport && (
                            <Grid item md={4} xs={12}>
                                <TextField
                                    fullWidth select label="Financial Year"
                                    value={financial_year}
                                    onChange={this.handleFyChange}
                                    variant="outlined"
                                >
                                    {financialYearOptions.map(fy => (
                                        <MenuItem key={fy.id} value={fy.id}>
                                            {fy.name || `${fy.start_date} - ${fy.end_date}`}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                        )}
                    </Grid>

                    <Box p={3}>
                        {reportType === 'far' && this.renderFarTab()}
                        {reportType === 'ags' && this.renderAgsTab()}
                        {reportType === 'ds' && this.renderDsTab()}
                        {reportType === 'cr' && this.renderCrTab()}
                        {reportType === 'cgs' && this.renderCgsTab()}
                        {reportType === 'dl' && this.renderDlTab()}
                        {reportType === 'rl' && this.renderLedgerTab()}
                        {reportType === 'rs' && this.renderSummaryTab()}
                        {reportType === 'rp' && this.renderPeriodTab()}
                    </Box>
                </Paper>
            </Box>
        )
    }

    // ━━━ TAB 0: FIXED ASSET REGISTER ━━━
    renderFarTab() {
        const { farData, farTotals, farTotalCount, farHasMore, farIsFetchingMore, farUpdating } = this.state

        return (
            <Box>
                {farData.length > 0 && (
                    <Box display="flex" justifyContent="flex-end" mb={2}>
                        <Button variant="contained" color="primary" startIcon={<PrintIcon />}
                            onClick={this.handleFarPdf} style={{ marginRight: 10 }}>
                            Print PDF
                        </Button>
                        <Button variant="contained" color="primary" startIcon={<GetAppIcon />}
                            onClick={this.handleFarExcel}>
                            Download Excel
                        </Button>
                    </Box>
                )}

                {farData.length > 0 && farTotals && (
                    <Grid container spacing={2} style={{ marginBottom: 15 }}>
                        <Grid item xs={12} sm={6} md>
                            <SummaryCard label="ORIGINAL COST" value={numberWithCommas(farTotals.original_cost)} color="#006064" bgColor="#e0f7fa" />
                        </Grid>
                        <Grid item xs={12} sm={6} md>
                            <SummaryCard label="OPENING VALUE" value={numberWithCommas(farTotals.opening_value)} color="#1565c0" bgColor="#e3f2fd" />
                        </Grid>
                        <Grid item xs={12} sm={6} md>
                            <SummaryCard label="ADDITIONS" value={numberWithCommas(farTotals.additions)} color="#2e7d32" bgColor="#f1f8e9" />
                        </Grid>
                        <Grid item xs={12} sm={6} md>
                            <SummaryCard label="DEPRECIATION" value={numberWithCommas(farTotals.depreciation)} color="#c62828" bgColor="#ffebee" />
                        </Grid>
                        <Grid item xs={12} sm={6} md>
                            <SummaryCard label="CLOSING VALUE" value={numberWithCommas(farTotals.closing_value)} color="#6a1b9a" bgColor="#f3e5f5" />
                        </Grid>
                    </Grid>
                )}

                {farUpdating && (
                    <Box display="flex" justifyContent="center" p={3}>
                        <CircularProgress />
                    </Box>
                )}

                {farData.length > 0 && (
                    <Box>
                        <Box position="sticky" top={0} zIndex={3} bgcolor="#fff" px={2} py={1} borderBottom="1px solid #eee">
                            <Typography variant="caption" color="textSecondary">
                                Showing {farData.length} of {farTotalCount} assets
                            </Typography>
                        </Box>

                        <Box id="far-scroll-container" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                            <InfiniteScroll
                                pageStart={0} loadMore={this.loadMoreFar}
                                hasMore={farHasMore && !farIsFetchingMore}
                                useWindow={false}
                                getScrollParent={() => document.getElementById('far-scroll-container')}
                                threshold={150}
                                loader={
                                    <Box key="loader" display="flex" justifyContent="center" p={2}>
                                        <Typography color="textSecondary">Loading more assets...</Typography>
                                    </Box>
                                }
                            >
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                                            <TableCell>Asset Code</TableCell>
                                            <TableCell>Asset Name</TableCell>
                                            <TableCell>Group</TableCell>
                                            <TableCell>Purchase Date</TableCell>
                                            <TableCell align="right">Original Cost</TableCell>
                                            <TableCell align="right">Opening Value</TableCell>
                                            <TableCell align="right">Additions</TableCell>
                                            <TableCell align="right">Depreciation</TableCell>
                                            <TableCell align="right">Closing Value</TableCell>
                                            <TableCell>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {farData.map((row, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>{row.asset_code}</TableCell>
                                                <TableCell>{row.asset_name}</TableCell>
                                                <TableCell>{row.asset_group_name}</TableCell>
                                                <TableCell>{row.purchase_date}</TableCell>
                                                <TableCell align="right">{numberWithCommas(row.original_cost)}</TableCell>
                                                <TableCell align="right">{numberWithCommas(row.opening_value)}</TableCell>
                                                <TableCell align="right">{numberWithCommas(row.additions)}</TableCell>
                                                <TableCell align="right">{numberWithCommas(row.depreciation)}</TableCell>
                                                <TableCell align="right">{numberWithCommas(row.closing_value)}</TableCell>
                                                <TableCell>{row.status}</TableCell>
                                            </TableRow>
                                        ))}

                                        {farTotals && !farHasMore && (
                                            <TableRow style={{ backgroundColor: '#e3f2fd' }}>
                                                <TableCell colSpan={4}><strong>TOTAL</strong></TableCell>
                                                <TableCell align="right"><strong>{numberWithCommas(farTotals.original_cost)}</strong></TableCell>
                                                <TableCell align="right"><strong>{numberWithCommas(farTotals.opening_value)}</strong></TableCell>
                                                <TableCell align="right"><strong>{numberWithCommas(farTotals.additions)}</strong></TableCell>
                                                <TableCell align="right"><strong>{numberWithCommas(farTotals.depreciation)}</strong></TableCell>
                                                <TableCell align="right"><strong>{numberWithCommas(farTotals.closing_value)}</strong></TableCell>
                                                <TableCell></TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </InfiniteScroll>

                            {farIsFetchingMore && (
                                <Box display="flex" justifyContent="center" p={2}>
                                    <CircularProgress size={24} />
                                </Box>
                            )}

                            {farHasMore && !farIsFetchingMore && (
                                <Box display="flex" justifyContent="center" p={2}>
                                    <Button variant="outlined" onClick={this.loadMoreFar}>
                                        Show More
                                    </Button>
                                </Box>
                            )}
                        </Box>
                    </Box>
                )}

                {!farUpdating && farData.length === 0 && (
                    <Box p={3} textAlign="center">
                        <Typography color="textSecondary">
                            No data found for this financial year. Run depreciation first.
                        </Typography>
                    </Box>
                )}
            </Box>
        )
    }

    // ━━━ TAB 1: ASSET GROUP SUMMARY ━━━
    renderAgsTab() {
        const { agsSummary, agsGrandTotals, agsUpdating } = this.state

        return (
            <Box>
                {agsSummary.length > 0 && (
                    <Box display="flex" justifyContent="flex-end" mb={2}>
                        <Button variant="contained" color="primary" startIcon={<PrintIcon />}
                            onClick={this.handleAgsPdf} style={{ marginRight: 10 }}>
                            Print PDF
                        </Button>
                        <Button variant="contained" color="primary" startIcon={<GetAppIcon />}
                            onClick={this.handleAgsExcel}>
                            Download Excel
                        </Button>
                    </Box>
                )}

                {agsSummary.length > 0 && agsGrandTotals && (
                    <Grid container spacing={2} style={{ marginBottom: 15 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <SummaryCard label="TOTAL OPENING" value={numberWithCommas(agsGrandTotals.opening_value)} color="#1565c0" bgColor="#e3f2fd" />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <SummaryCard label="TOTAL ADDITIONS" value={numberWithCommas(agsGrandTotals.additions)} color="#2e7d32" bgColor="#f1f8e9" />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <SummaryCard label="TOTAL DEPRECIATION" value={numberWithCommas(agsGrandTotals.depreciation)} color="#c62828" bgColor="#ffebee" />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <SummaryCard label="TOTAL CLOSING" value={numberWithCommas(agsGrandTotals.closing_value)} color="#6a1b9a" bgColor="#f3e5f5" />
                        </Grid>
                    </Grid>
                )}

                {agsUpdating && (
                    <Box display="flex" justifyContent="center" p={3}>
                        <CircularProgress />
                    </Box>
                )}

                {agsSummary.length > 0 && (
                    <Table size="small">
                        <TableHead>
                            <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                                <TableCell>Asset Group</TableCell>
                                <TableCell>Parent Group</TableCell>
                                <TableCell align="right">Opening Value</TableCell>
                                <TableCell align="right">Additions</TableCell>
                                <TableCell align="right">Depreciation</TableCell>
                                <TableCell align="right">Closing Value</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {agsSummary.map((row, idx) => (
                                <TableRow key={idx}>
                                    <TableCell><strong>{row.asset_group_name}</strong></TableCell>
                                    <TableCell>{row.parent_group_name || '–'}</TableCell>
                                    <TableCell align="right">{numberWithCommas(row.opening_value)}</TableCell>
                                    <TableCell align="right">{numberWithCommas(row.additions)}</TableCell>
                                    <TableCell align="right">{numberWithCommas(row.depreciation)}</TableCell>
                                    <TableCell align="right">{numberWithCommas(row.closing_value)}</TableCell>
                                </TableRow>
                            ))}

                            {agsGrandTotals && (
                                <TableRow style={{ backgroundColor: '#e3f2fd' }}>
                                    <TableCell colSpan={2}><strong>GRAND TOTAL</strong></TableCell>
                                    <TableCell align="right"><strong>{numberWithCommas(agsGrandTotals.opening_value)}</strong></TableCell>
                                    <TableCell align="right"><strong>{numberWithCommas(agsGrandTotals.additions)}</strong></TableCell>
                                    <TableCell align="right"><strong>{numberWithCommas(agsGrandTotals.depreciation)}</strong></TableCell>
                                    <TableCell align="right"><strong>{numberWithCommas(agsGrandTotals.closing_value)}</strong></TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}

                {!agsUpdating && agsSummary.length === 0 && (
                    <Box p={3} textAlign="center">
                        <Typography color="textSecondary">
                            No data found for this financial year.
                        </Typography>
                    </Box>
                )}
            </Box>
        )
    }

    // ━━━ TAB 2: DEPRECIATION SCHEDULE ━━━
    renderDsTab() {
        const { assetsList, selectedAssetId, dsSchedule, dsUpdating } = this.state

        return (
            <Box>
                <Grid container spacing={2} alignItems="center">
                    <Grid item md={5} xs={12}>
                        <TextField
                            fullWidth select label="Select Asset" variant="outlined"
                            value={selectedAssetId}
                            onChange={e => this.setState({ selectedAssetId: e.target.value }, this.loadDs)}
                        >
                            <MenuItem value="">Select an asset...</MenuItem>
                            {assetsList.map(a => (
                                <MenuItem key={a.id} value={a.id}>
                                    {a.asset_code} – {a.asset_name}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                </Grid>

                {dsSchedule.length > 0 && (
                    <Box display="flex" justifyContent="flex-end" mb={2} mt={2}>
                        <Button variant="contained" color="primary" startIcon={<PrintIcon />}
                            onClick={this.handleDsPdf} style={{ marginRight: 10 }}>
                            Print PDF
                        </Button>
                        <Button variant="contained" color="primary" startIcon={<GetAppIcon />}
                            onClick={this.handleDsExcel}>
                            Download Excel
                        </Button>
                    </Box>
                )}

                {dsUpdating && (
                    <Box display="flex" justifyContent="center" p={3}>
                        <CircularProgress />
                    </Box>
                )}

                {dsSchedule.length > 0 && (
                    <Box mt={2}>
                        <Box position="sticky" top={0} zIndex={3} bgcolor="#fff" px={2} py={1} borderBottom="1px solid #eee">
                            <Typography variant="caption" color="textSecondary">
                                {dsSchedule.length} depreciation record(s) for {dsSchedule[0]?.asset_name || 'selected asset'}
                            </Typography>
                        </Box>

                        <Table size="small">
                            <TableHead>
                                <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                                    <TableCell>Asset Code</TableCell>
                                    <TableCell>Asset Name</TableCell>
                                    <TableCell>Financial Year</TableCell>
                                    <TableCell align="right">Opening Value</TableCell>
                                    <TableCell align="right">Depreciation</TableCell>
                                    <TableCell align="right">Closing Value</TableCell>
                                    <TableCell>Method</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {dsSchedule.map((row, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell>{row.asset_code}</TableCell>
                                        <TableCell>{row.asset_name}</TableCell>
                                        <TableCell>{row.financial_year_name}</TableCell>
                                        <TableCell align="right">{numberWithCommas(row.opening_wdv)}</TableCell>
                                        <TableCell align="right" style={{ color: '#c62828' }}>{numberWithCommas(row.depreciation)}</TableCell>
                                        <TableCell align="right"><strong>{numberWithCommas(row.closing_wdv)}</strong></TableCell>
                                        <TableCell>{row.calculation_method}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                )}

                {!dsUpdating && selectedAssetId && dsSchedule.length === 0 && (
                    <Box p={3} textAlign="center">
                        <Typography color="textSecondary">
                            No depreciation records found for this asset.
                        </Typography>
                    </Box>
                )}
            </Box>
        )
    }

    // ━━━ TAB 3: COST REGISTER ━━━
    renderCrTab() {
        const { crData, crTotals, crTotalCount, crHasMore, crIsFetchingMore, crUpdating } = this.state

        return (
            <Box>
                {crData.length > 0 && (
                    <Box display="flex" justifyContent="flex-end" mb={2}>
                        <Button variant="contained" color="primary" startIcon={<PrintIcon />}
                            onClick={this.handleCrPdf} style={{ marginRight: 10 }}>
                            Print PDF
                        </Button>
                        <Button variant="contained" color="primary" startIcon={<GetAppIcon />}
                            onClick={this.handleCrExcel}>
                            Download Excel
                        </Button>
                    </Box>
                )}

                {crData.length > 0 && crTotals && (
                    <Grid container spacing={2} style={{ marginBottom: 15 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <SummaryCard label="OPENING COST" value={numberWithCommas(crTotals.opening_cost)} color="#1565c0" bgColor="#e3f2fd" />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <SummaryCard label="ADDITIONS" value={numberWithCommas(crTotals.additions)} color="#2e7d32" bgColor="#f1f8e9" />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <SummaryCard label="DISPOSALS" value={numberWithCommas(crTotals.disposals)} color="#c62828" bgColor="#ffebee" />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <SummaryCard label="CLOSING COST" value={numberWithCommas(crTotals.closing_cost)} color="#6a1b9a" bgColor="#f3e5f5" />
                        </Grid>
                    </Grid>
                )}

                {crUpdating && (
                    <Box display="flex" justifyContent="center" p={3}>
                        <CircularProgress />
                    </Box>
                )}

                {crData.length > 0 && (
                    <Box>
                        <Box position="sticky" top={0} zIndex={3} bgcolor="#fff" px={2} py={1} borderBottom="1px solid #eee">
                            <Typography variant="caption" color="textSecondary">
                                Showing {crData.length} of {crTotalCount} assets
                            </Typography>
                        </Box>

                        <Box id="cr-scroll-container" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                            <InfiniteScroll
                                pageStart={0} loadMore={this.loadMoreCr}
                                hasMore={crHasMore && !crIsFetchingMore}
                                useWindow={false}
                                getScrollParent={() => document.getElementById('cr-scroll-container')}
                                threshold={150}
                                loader={
                                    <Box key="loader" display="flex" justifyContent="center" p={2}>
                                        <Typography color="textSecondary">Loading more assets...</Typography>
                                    </Box>
                                }
                            >
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                                            <TableCell>Asset Code</TableCell>
                                            <TableCell>Asset Name</TableCell>
                                            <TableCell>Group</TableCell>
                                            <TableCell>Purchase Date</TableCell>
                                            <TableCell align="right">Opening Cost</TableCell>
                                            <TableCell align="right">Additions</TableCell>
                                            <TableCell align="right">Disposals</TableCell>
                                            <TableCell align="right">Closing Cost</TableCell>
                                            <TableCell>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {crData.map((row, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>{row.asset_code}</TableCell>
                                                <TableCell>{row.asset_name}</TableCell>
                                                <TableCell>{row.asset_group_name}</TableCell>
                                                <TableCell>{row.purchase_date}</TableCell>
                                                <TableCell align="right">{numberWithCommas(row.opening_cost)}</TableCell>
                                                <TableCell align="right">{numberWithCommas(row.additions)}</TableCell>
                                                <TableCell align="right">{numberWithCommas(row.disposals)}</TableCell>
                                                <TableCell align="right">{numberWithCommas(row.closing_cost)}</TableCell>
                                                <TableCell>{row.status}</TableCell>
                                            </TableRow>
                                        ))}

                                        {crTotals && !crHasMore && (
                                            <TableRow style={{ backgroundColor: '#e3f2fd' }}>
                                                <TableCell colSpan={4}><strong>TOTAL</strong></TableCell>
                                                <TableCell align="right"><strong>{numberWithCommas(crTotals.opening_cost)}</strong></TableCell>
                                                <TableCell align="right"><strong>{numberWithCommas(crTotals.additions)}</strong></TableCell>
                                                <TableCell align="right"><strong>{numberWithCommas(crTotals.disposals)}</strong></TableCell>
                                                <TableCell align="right"><strong>{numberWithCommas(crTotals.closing_cost)}</strong></TableCell>
                                                <TableCell></TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </InfiniteScroll>

                            {crIsFetchingMore && (
                                <Box display="flex" justifyContent="center" p={2}>
                                    <CircularProgress size={24} />
                                </Box>
                            )}

                            {crHasMore && !crIsFetchingMore && (
                                <Box display="flex" justifyContent="center" p={2}>
                                    <Button variant="outlined" onClick={this.loadMoreCr}>
                                        Show More
                                    </Button>
                                </Box>
                            )}
                        </Box>
                    </Box>
                )}

                {!crUpdating && crData.length === 0 && (
                    <Box p={3} textAlign="center">
                        <Typography color="textSecondary">
                            No cost data found for this financial year.
                        </Typography>
                    </Box>
                )}
            </Box>
        )
    }

    // ━━━ TAB 4: COST GROUP SUMMARY ━━━
    renderCgsTab() {
        const { cgsSummary, cgsGrandTotals, cgsUpdating } = this.state

        return (
            <Box>
                {cgsSummary.length > 0 && (
                    <Box display="flex" justifyContent="flex-end" mb={2}>
                        <Button variant="contained" color="primary" startIcon={<PrintIcon />}
                            onClick={this.handleCgsPdf} style={{ marginRight: 10 }}>
                            Print PDF
                        </Button>
                        <Button variant="contained" color="primary" startIcon={<GetAppIcon />}
                            onClick={this.handleCgsExcel}>
                            Download Excel
                        </Button>
                    </Box>
                )}

                {cgsSummary.length > 0 && cgsGrandTotals && (
                    <Grid container spacing={2} style={{ marginBottom: 15 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <SummaryCard label="TOTAL OPENING COST" value={numberWithCommas(cgsGrandTotals.opening_cost)} color="#1565c0" bgColor="#e3f2fd" />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <SummaryCard label="TOTAL ADDITIONS" value={numberWithCommas(cgsGrandTotals.additions)} color="#2e7d32" bgColor="#f1f8e9" />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <SummaryCard label="TOTAL DISPOSALS" value={numberWithCommas(cgsGrandTotals.disposals)} color="#c62828" bgColor="#ffebee" />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <SummaryCard label="TOTAL CLOSING COST" value={numberWithCommas(cgsGrandTotals.closing_cost)} color="#6a1b9a" bgColor="#f3e5f5" />
                        </Grid>
                    </Grid>
                )}

                {cgsUpdating && (
                    <Box display="flex" justifyContent="center" p={3}>
                        <CircularProgress />
                    </Box>
                )}

                {cgsSummary.length > 0 && (
                    <Table size="small">
                        <TableHead>
                            <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                                <TableCell>Asset Group</TableCell>
                                <TableCell>Parent Group</TableCell>
                                <TableCell align="right">Opening Cost</TableCell>
                                <TableCell align="right">Additions</TableCell>
                                <TableCell align="right">Disposals</TableCell>
                                <TableCell align="right">Closing Cost</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {cgsSummary.map((row, idx) => (
                                <TableRow key={idx}>
                                    <TableCell><strong>{row.asset_group_name}</strong></TableCell>
                                    <TableCell>{row.parent_group_name || '–'}</TableCell>
                                    <TableCell align="right">{numberWithCommas(row.opening_cost)}</TableCell>
                                    <TableCell align="right">{numberWithCommas(row.additions)}</TableCell>
                                    <TableCell align="right">{numberWithCommas(row.disposals)}</TableCell>
                                    <TableCell align="right">{numberWithCommas(row.closing_cost)}</TableCell>
                                </TableRow>
                            ))}

                            {cgsGrandTotals && (
                                <TableRow style={{ backgroundColor: '#e3f2fd' }}>
                                    <TableCell colSpan={2}><strong>GRAND TOTAL</strong></TableCell>
                                    <TableCell align="right"><strong>{numberWithCommas(cgsGrandTotals.opening_cost)}</strong></TableCell>
                                    <TableCell align="right"><strong>{numberWithCommas(cgsGrandTotals.additions)}</strong></TableCell>
                                    <TableCell align="right"><strong>{numberWithCommas(cgsGrandTotals.disposals)}</strong></TableCell>
                                    <TableCell align="right"><strong>{numberWithCommas(cgsGrandTotals.closing_cost)}</strong></TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}

                {!cgsUpdating && cgsSummary.length === 0 && (
                    <Box p={3} textAlign="center">
                        <Typography color="textSecondary">
                            No cost data found for this financial year.
                        </Typography>
                    </Box>
                )}
            </Box>
        )
    }

    // ━━━ TAB 5: DISPOSAL LIST ━━━
    renderDlTab() {
        const { dlData, dlTotals, dlUpdating } = this.state

        return (
            <Box>
                {dlData.length > 0 && (
                    <Box display="flex" justifyContent="flex-end" mb={2}>
                        <Button variant="contained" color="primary" startIcon={<PrintIcon />}
                            onClick={this.handleDlPdf} style={{ marginRight: 10 }}>
                            Print PDF
                        </Button>
                        <Button variant="contained" color="primary" startIcon={<GetAppIcon />}
                            onClick={this.handleDlExcel}>
                            Download Excel
                        </Button>
                    </Box>
                )}

                {dlData.length > 0 && dlTotals && (
                    <Grid container spacing={2} style={{ marginBottom: 15 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <SummaryCard label="ORIGINAL COST" value={numberWithCommas(dlTotals.original_cost)} color="#1565c0" bgColor="#e3f2fd" />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <SummaryCard label="BOOK VALUE" value={numberWithCommas(dlTotals.wdv_at_disposal)} color="#6a1b9a" bgColor="#f3e5f5" />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <SummaryCard label="DISPOSAL VALUE" value={numberWithCommas(dlTotals.disposal_value)} color="#f57c00" bgColor="#fff3e0" />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <SummaryCard label="NET GAIN / LOSS" value={numberWithCommas(dlTotals.gain_loss)} color={dlTotals.gain_loss >= 0 ? "#2e7d32" : "#c62828"} bgColor={dlTotals.gain_loss >= 0 ? "#f1f8e9" : "#ffebee"} />
                        </Grid>
                    </Grid>
                )}

                {dlUpdating && (
                    <Box display="flex" justifyContent="center" p={3}>
                        <CircularProgress />
                    </Box>
                )}

                {dlData.length > 0 && (
                    <Table size="small">
                        <TableHead>
                            <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                                <TableCell>Asset Code</TableCell>
                                <TableCell>Asset Name</TableCell>
                                <TableCell>Group</TableCell>
                                <TableCell>Disposal Date</TableCell>
                                <TableCell>Reason</TableCell>
                                <TableCell align="right">Orig. Cost</TableCell>
                                <TableCell align="right">Book Value</TableCell>
                                <TableCell align="right">Disposal Value</TableCell>
                                <TableCell align="right">Gain / Loss</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {dlData.map((row, idx) => (
                                <TableRow key={idx}>
                                    <TableCell><strong>{row.asset_code}</strong></TableCell>
                                    <TableCell>{row.asset_name}</TableCell>
                                    <TableCell>{row.asset_group_name}</TableCell>
                                    <TableCell>{row.disposal_date}</TableCell>
                                    <TableCell>{row.reason}</TableCell>
                                    <TableCell align="right">{numberWithCommas(row.original_cost)}</TableCell>
                                    <TableCell align="right">{numberWithCommas(row.wdv_at_disposal)}</TableCell>
                                    <TableCell align="right">{numberWithCommas(row.disposal_value)}</TableCell>
                                    <TableCell align="right" style={{ color: row.gain_loss > 0 ? '#2e7d32' : (row.gain_loss < 0 ? '#c62828' : 'inherit') }}>
                                        {numberWithCommas(row.gain_loss)}
                                    </TableCell>
                                </TableRow>
                            ))}

                            {dlTotals && (
                                <TableRow style={{ backgroundColor: '#e3f2fd' }}>
                                    <TableCell colSpan={5}><strong>GRAND TOTAL</strong></TableCell>
                                    <TableCell align="right"><strong>{numberWithCommas(dlTotals.original_cost)}</strong></TableCell>
                                    <TableCell align="right"><strong>{numberWithCommas(dlTotals.wdv_at_disposal)}</strong></TableCell>
                                    <TableCell align="right"><strong>{numberWithCommas(dlTotals.disposal_value)}</strong></TableCell>
                                    <TableCell align="right" style={{ color: dlTotals.gain_loss > 0 ? '#2e7d32' : (dlTotals.gain_loss < 0 ? '#c62828' : 'inherit') }}>
                                        <strong>{numberWithCommas(dlTotals.gain_loss)}</strong>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}

                {!dlUpdating && dlData.length === 0 && (
                    <Box p={3} textAlign="center">
                        <Typography color="textSecondary">
                            No asset disposals found for this financial year.
                        </Typography>
                    </Box>
                )}
            </Box>
        )
    }
    // ━━━ RECOVERABLE: LEDGER ━━━
    renderLedgerTab() {
        const { recovCategories, ledgerCategoryId, ledgerAssets, rlSelectedAssetId, ledgerData, ledgerLoading, ledgerDisplayCount } = this.state
        const txns = ledgerData?.transactions || []
        const hasMore = ledgerDisplayCount < txns.length
        const displayAssets = ledgerAssets.length > 0 ? ledgerAssets : []

        return (
            <Box>
                <Grid container spacing={2} alignItems="center">
                    <Grid item md={3} xs={12}>
                        <TextField fullWidth select label="Select Category" variant="outlined" value={ledgerCategoryId}
                            onChange={e => this.onLedgerCategoryChange(e.target.value)}>
                            <MenuItem value="">All Categories</MenuItem>
                            {recovCategories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item md={4} xs={12}>
                        <TextField fullWidth select label="Select Asset" variant="outlined" value={rlSelectedAssetId}
                            onChange={e => this.setState({ rlSelectedAssetId: e.target.value }, this.loadLedger)}>
                            <MenuItem value="">Select an asset...</MenuItem>
                            {displayAssets.map(a => <MenuItem key={a.id} value={a.id}>{a.particulars || a.name}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item md={5} xs={12}>
                        <Box display="flex" justifyContent="flex-end">
                            <Button onClick={() => this.downloadLedger('excel')} startIcon={<GetAppIcon />}
                                variant="outlined" style={{ marginRight: 8, borderRadius: 30 }} disabled={!rlSelectedAssetId}>
                                Excel
                            </Button>
                            <Button onClick={() => this.downloadLedger('pdf')} startIcon={<GetAppIcon />}
                                variant="outlined" color="secondary" style={{ borderRadius: 30 }} disabled={!rlSelectedAssetId}>
                                PDF
                            </Button>
                        </Box>
                    </Grid>
                </Grid>

                {ledgerLoading && <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>}

                {ledgerData && !ledgerLoading && (
                    <Box mt={2}>
                        <Grid container spacing={2} style={{ marginBottom: 15 }}>
                            <Grid item xs={6} sm={3}>
                                <SummaryCard label="OPENING BAL." value={this.formatAmt(ledgerData.opening_balance)} color="#6a1b9a" bgColor="#f3e5f5" />
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <SummaryCard label="CLOSING BAL." value={this.formatAmt(ledgerData.closing_balance)} color="#1565c0" bgColor="#e3f2fd" />
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <SummaryCard label="TRANSACTIONS" value={txns.length} color="#2e7d32" bgColor="#e8f5e9" />
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <SummaryCard label="CATEGORY" value={ledgerData.category} color="#e65100" bgColor="#fff3e0" />
                            </Grid>
                        </Grid>

                        <Box pb={1}>
                            <Typography variant="body2" color="textSecondary">
                                Showing <strong>{Math.min(ledgerDisplayCount, txns.length)}</strong> of <strong>{txns.length}</strong> transactions
                            </Typography>
                        </Box>

                        <div id="ledger-scroll" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                            <InfiniteScroll pageStart={0}
                                loadMore={() => this.setState(p => ({ ledgerDisplayCount: p.ledgerDisplayCount + RECOV_PAGE_SIZE }))}
                                hasMore={hasMore}
                                useWindow={false}
                                getScrollParent={() => document.getElementById('ledger-scroll')}
                                threshold={150}
                            >
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                                            <TableCell><strong>Date</strong></TableCell>
                                            <TableCell><strong>Type</strong></TableCell>
                                            <TableCell><strong>Remarks</strong></TableCell>
                                            <TableCell align="right"><strong>Debit (₹)</strong></TableCell>
                                            <TableCell align="right"><strong>Credit (₹)</strong></TableCell>
                                            <TableCell align="right"><strong>Balance (₹)</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {txns.slice(0, ledgerDisplayCount).map((txn, i) => (
                                            <TableRow key={i} hover>
                                                <TableCell>{txn.date}</TableCell>
                                                <TableCell>{txn.type}</TableCell>
                                                <TableCell>{txn.remarks || '–'}</TableCell>
                                                <TableCell align="right" style={{ color: '#c62828' }}>{this.formatAmt(txn.debit)}</TableCell>
                                                <TableCell align="right" style={{ color: '#2e7d32' }}>{this.formatAmt(txn.credit)}</TableCell>
                                                <TableCell align="right"><strong>{this.formatAmt(txn.balance)}</strong></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </InfiniteScroll>
                        </div>

                        {hasMore && (
                            <Box display="flex" justifyContent="center" mt={2}>
                                <Button variant="outlined"
                                    onClick={() => this.setState(p => ({ ledgerDisplayCount: p.ledgerDisplayCount + RECOV_PAGE_SIZE }))}
                                    style={{ borderRadius: 30 }}>
                                    Show More ({Math.min(ledgerDisplayCount, txns.length)} of {txns.length})
                                </Button>
                            </Box>
                        )}
                    </Box>
                )}
            </Box>
        )
    }

    // ━━━ RECOVERABLE: CATEGORY SUMMARY ━━━
    renderSummaryTab() {
        const { summaryData, summaryLoading } = this.state

        return (
            <Box>
                <Grid container spacing={2} alignItems="center">
                    <Grid item md={4} xs={12}>
                        <Button variant="contained" color="primary" onClick={this.loadSummary}
                            disabled={summaryLoading} style={{ borderRadius: 30 }}>
                            {summaryLoading ? 'Loading...' : 'Generate Summary'}
                        </Button>
                    </Grid>
                    <Grid item md={8} xs={12}>
                        <Box display="flex" justifyContent="flex-end">
                            <Button onClick={() => this.downloadSummary('excel')} startIcon={<GetAppIcon />}
                                variant="outlined" style={{ marginRight: 8, borderRadius: 30 }} disabled={!summaryData}>
                                Excel
                            </Button>
                            <Button onClick={() => this.downloadSummary('pdf')} startIcon={<GetAppIcon />}
                                variant="outlined" color="secondary" style={{ borderRadius: 30 }} disabled={!summaryData}>
                                PDF
                            </Button>
                        </Box>
                    </Grid>
                </Grid>

                {summaryLoading && <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>}

                {summaryData && !summaryLoading && (
                    <Box mt={2}>
                        <Grid container spacing={2} style={{ marginBottom: 15 }}>
                            <Grid item xs={12} sm={4}>
                                <SummaryCard label="GRAND OPENING" value={this.formatAmt(summaryData.grand_total_opening)} color="#6a1b9a" bgColor="#f3e5f5" />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <SummaryCard label="GRAND CLOSING" value={this.formatAmt(summaryData.grand_total_closing)} color="#1565c0" bgColor="#e3f2fd" />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <SummaryCard label="NET MOVEMENT" value={this.formatAmt(summaryData.grand_net_movement)}
                                    color={parseFloat(summaryData.grand_net_movement) >= 0 ? '#2e7d32' : '#c62828'}
                                    bgColor={parseFloat(summaryData.grand_net_movement) >= 0 ? '#e8f5e9' : '#ffebee'} />
                            </Grid>
                        </Grid>

                        <Table size="small">
                            <TableHead>
                                <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                                    <TableCell><strong>Category</strong></TableCell>
                                    <TableCell align="center"><strong>Assets</strong></TableCell>
                                    <TableCell align="right"><strong>Opening (₹)</strong></TableCell>
                                    <TableCell align="right"><strong>Closing (₹)</strong></TableCell>
                                    <TableCell align="right"><strong>Net Movement (₹)</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {summaryData.categories.map((cat, i) => (
                                    <TableRow key={i} hover>
                                        <TableCell><strong>{cat.category_name}</strong></TableCell>
                                        <TableCell align="center">{cat.asset_count}</TableCell>
                                        <TableCell align="right">{this.formatAmt(cat.total_opening)}</TableCell>
                                        <TableCell align="right">{this.formatAmt(cat.total_closing)}</TableCell>
                                        <TableCell align="right">{this.formatAmt(cat.net_movement)}</TableCell>
                                    </TableRow>
                                ))}
                                <TableRow style={{ borderTop: '2px solid #1F4E79' }}>
                                    <TableCell><strong>GRAND TOTAL</strong></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell align="right"><strong>{this.formatAmt(summaryData.grand_total_opening)}</strong></TableCell>
                                    <TableCell align="right"><strong>{this.formatAmt(summaryData.grand_total_closing)}</strong></TableCell>
                                    <TableCell align="right"><strong>{this.formatAmt(summaryData.grand_net_movement)}</strong></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </Box>
                )}
            </Box>
        )
    }

    // ━━━ RECOVERABLE: PERIOD REPORT ━━━
    renderPeriodTab() {
        const { recovCategories, fromDate, toDate, periodCategoryId, periodData, periodLoading, periodDisplayCount } = this.state
        const txns = periodData?.transactions || []
        const hasMore = periodDisplayCount < txns.length

        return (
            <Box>
                <Grid container spacing={2} alignItems="center">
                    <Grid item md={3} xs={6}>
                        <TextField fullWidth label="From Date" variant="outlined" type="date" value={fromDate}
                            onChange={e => this.setState({ fromDate: e.target.value })}
                            InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid item md={3} xs={6}>
                        <TextField fullWidth label="To Date" variant="outlined" type="date" value={toDate}
                            onChange={e => this.setState({ toDate: e.target.value })}
                            InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid item md={3} xs={6}>
                        <TextField fullWidth select label="Category" variant="outlined" value={periodCategoryId}
                            onChange={e => this.setState({ periodCategoryId: e.target.value })}>
                            <MenuItem value="">All Categories</MenuItem>
                            {recovCategories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item md={3} xs={6}>
                        <Box display="flex" justifyContent="flex-end">
                            <Button variant="contained" color="primary" onClick={this.loadPeriodReport}
                                disabled={periodLoading || !fromDate || !toDate} style={{ borderRadius: 30 }}>
                                Generate
                            </Button>
                        </Box>
                    </Grid>
                </Grid>

                {periodData && !periodLoading && (
                    <Box mt={1} mb={2}>
                        <Box display="flex" justifyContent="flex-end">
                            <Button onClick={() => this.downloadPeriod('excel')} startIcon={<GetAppIcon />}
                                variant="outlined" size="small" style={{ marginRight: 8, borderRadius: 30 }}>
                                Excel
                            </Button>
                            <Button onClick={() => this.downloadPeriod('pdf')} startIcon={<GetAppIcon />}
                                variant="outlined" size="small" color="secondary" style={{ borderRadius: 30 }}>
                                PDF
                            </Button>
                        </Box>
                    </Box>
                )}

                {periodLoading && <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>}

                {periodData && !periodLoading && (
                    <Box mt={2}>
                        <Grid container spacing={2} style={{ marginBottom: 15 }}>
                            <Grid item xs={12} sm={4}>
                                <SummaryCard label="TOTAL DEBITS" value={this.formatAmt(periodData.total_debits)} color="#c62828" bgColor="#ffebee" />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <SummaryCard label="TOTAL CREDITS" value={this.formatAmt(periodData.total_credits)} color="#2e7d32" bgColor="#e8f5e9" />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <SummaryCard label="NET MOVEMENT" value={this.formatAmt(periodData.net_movement)}
                                    color={parseFloat(periodData.net_movement) >= 0 ? '#c62828' : '#2e7d32'}
                                    bgColor={parseFloat(periodData.net_movement) >= 0 ? '#ffebee' : '#e8f5e9'} />
                            </Grid>
                        </Grid>

                        <Box pb={1}>
                            <Typography variant="body2" color="textSecondary">
                                Showing <strong>{Math.min(periodDisplayCount, txns.length)}</strong> of <strong>{txns.length}</strong> transactions
                            </Typography>
                        </Box>

                        <div id="period-scroll" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                            <InfiniteScroll pageStart={0}
                                loadMore={() => this.setState(p => ({ periodDisplayCount: p.periodDisplayCount + RECOV_PAGE_SIZE }))}
                                hasMore={hasMore}
                                useWindow={false}
                                getScrollParent={() => document.getElementById('period-scroll')}
                                threshold={150}
                            >
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                                            <TableCell><strong>Date</strong></TableCell>
                                            <TableCell><strong>Asset</strong></TableCell>
                                            <TableCell><strong>Category</strong></TableCell>
                                            <TableCell><strong>Type</strong></TableCell>
                                            <TableCell align="right"><strong>Debit (₹)</strong></TableCell>
                                            <TableCell align="right"><strong>Credit (₹)</strong></TableCell>
                                            <TableCell><strong>Remarks</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {txns.slice(0, periodDisplayCount).map((txn, i) => (
                                            <TableRow key={i} hover>
                                                <TableCell>{txn.date}</TableCell>
                                                <TableCell>{txn.asset_name}</TableCell>
                                                <TableCell>{txn.category}</TableCell>
                                                <TableCell>{txn.type}</TableCell>
                                                <TableCell align="right" style={{ color: '#c62828' }}>{this.formatAmt(txn.debit)}</TableCell>
                                                <TableCell align="right" style={{ color: '#2e7d32' }}>{this.formatAmt(txn.credit)}</TableCell>
                                                <TableCell>{txn.remarks || '–'}</TableCell>
                                            </TableRow>
                                        ))}
                                        {txns.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={7} align="center">
                                                    <Typography color="textSecondary">No transactions found for this period.</Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </InfiniteScroll>
                        </div>

                        {hasMore && (
                            <Box display="flex" justifyContent="center" mt={2}>
                                <Button variant="outlined"
                                    onClick={() => this.setState(p => ({ periodDisplayCount: p.periodDisplayCount + RECOV_PAGE_SIZE }))}
                                    style={{ borderRadius: 30 }}>
                                    Show More ({Math.min(periodDisplayCount, txns.length)} of {txns.length})
                                </Button>
                            </Box>
                        )}
                    </Box>
                )}
            </Box>
        )
    }
}

export default AssetReports
