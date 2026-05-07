import React, { Component } from 'react'
import {
    SUCCESS_MSG_PROPS
} from 'Constants'
import {
    Paper,
    Box,
    Grid,
    Button,
    TextField,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Typography,
    CircularProgress,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControlLabel,
    Switch,
    MenuItem,
    Menu,
    ListItemIcon,
    ListItemText
} from '@material-ui/core'
import Autocomplete from '@material-ui/lab/Autocomplete'
import AddIcon from '@material-ui/icons/Add'
import EditIcon from '@material-ui/icons/Edit'
import DeleteIcon from '@material-ui/icons/Delete'
import SearchIcon from '@material-ui/icons/Search'
import SortIcon from '@material-ui/icons/Sort'
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward'
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward'
import CloudUploadIcon from '@material-ui/icons/CloudUpload'
import GetAppIcon from '@material-ui/icons/GetApp'

import { getRequest, postRequest, putRequest, deleteRequest } from 'Includes/api/apicall'
import { GET_URL, POST_URL, PUT_URL, DELETE_URL } from 'Includes/urls'
import { numberWithCommas } from 'Includes/functions'
import LoadingGif from 'Components/LoadingGif'
import InfiniteScroll from 'react-infinite-scroller'
import fileDownload from 'js-file-download'
import Swal from 'sweetalert2'

import './styles.scss'

const STAFF_CATEGORY_OPTIONS = [
    { value: 'SCHOOL', label: 'School' },
    { value: 'PU_COLLEGE', label: 'PU College' },
    { value: 'DEGREE_COLLEGE', label: 'Degree College' },
    { value: 'MCOM', label: 'M.Com' },
]

class ViewStaffSalarySetup extends Component {
    constructor(props) {
        super(props)
        this.state = {
            loading: true,
            tableUpdating: false,

            setupData: [],
            searchTerm: '',

            pageNo: 1,
            limit: 10,
            totalCount: 0,
            hasMore: true,
            isFetchingMore: false,
            ordering: 'staff_name',
            sortAnchorEl: null,

            // Dialog state
            dialogOpen: false,
            dialogMode: 'add', // 'add' or 'edit'
            editingId: null,
            formData: {
                staff_name: '',
                staff_category: 'SCHOOL',
                gross_salary: '',
                esic_opted: false,
                lic_amount: 0,
                account_number: '',
            },
            formErrors: {},
            submitting: false,

            // Staff autocomplete
            staffOptions: [],
            staffLoading: false,
            staffPageNo: 1,
            staffHasMore: true,
            staffSearchTerm: '',

            // Bulk upload state
            bulkDialogOpen: false,
            bulkUploading: false,
            selectedFile: null,
            uploadErrors: null,
        }
    }

    componentDidMount() {
        this.loadSetups()
    }

    loadSetups = () => {
        const { limit, searchTerm, ordering } = this.state

        this.setState({
            tableUpdating: true,
            pageNo: 1,
            setupData: [],
            hasMore: true
        })

        const params = {
            limit,
            pageno: 1,
            is_active: true,
        }

        if (searchTerm) {
            params.search = searchTerm
        }
        if (ordering) {
            params.ordering = ordering
        }

        getRequest(GET_URL.staffsalarysetup.api, params, this.props)
            .then(res => {
                if (res?.status !== 200) {
                    this.setState({ tableUpdating: false, loading: false })
                    return
                }

                const data = res.data.data || {}

                this.setState({
                    setupData: data.data_list || [],
                    totalCount: data.count || 0,
                    hasMore: !!data.next,
                    tableUpdating: false,
                    loading: false
                })
            })
            .catch(() => this.setState({ tableUpdating: false, loading: false }))
    }

    loadMoreData = () => {
        const { pageNo, hasMore, isFetchingMore, limit, searchTerm, ordering } = this.state
        if (!hasMore || isFetchingMore || this.fetchLock) return

        this.fetchLock = true
        const nextPage = pageNo + 1

        this.setState({ isFetchingMore: true })

        const params = {
            limit,
            pageno: nextPage,
            is_active: true,
        }

        if (searchTerm) {
            params.search = searchTerm
        }
        if (ordering) {
            params.ordering = ordering
        }

        getRequest(GET_URL.staffsalarysetup.api, params, this.props)
            .then(res => {
                this.fetchLock = false
                if (res?.status !== 200) {
                    this.setState({ isFetchingMore: false })
                    return
                }

                const data = res.data.data || {}
                const newData = data.data_list || []

                this.setState(prev => ({
                    setupData: [...prev.setupData, ...newData],
                    pageNo: nextPage,
                    hasMore: !!data.next,
                    isFetchingMore: false
                }))
            })
            .catch(() => {
                this.fetchLock = false
                this.setState({ isFetchingMore: false })
            })
    }

    handleSearchChange = (e) => {
        this.setState({ searchTerm: e.target.value })
    }

    handleSearch = () => {
        this.loadSetups()
    }

    handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            this.handleSearch()
        }
    }

    // Sort By menu handlers
    handleSortMenuOpen = (event) => {
        this.setState({ sortAnchorEl: event.currentTarget })
    }

    handleSortMenuClose = () => {
        this.setState({ sortAnchorEl: null })
    }

    handleSortChange = (ordering) => {
        this.setState({
            ordering,
            sortAnchorEl: null
        }, () => this.loadSetups())
    }

    getSortLabel = () => {
        const { ordering } = this.state
        const labels = {
            'staff_name': 'Name (A-Z)',
            '-staff_name': 'Name (Z-A)',
            'base_salary': 'Salary (Low→High)',
            '-base_salary': 'Salary (High→Low)',
        }
        return labels[ordering] || 'Sort'
    }

    // Dialog handlers
    handleOpenAddDialog = () => {
        this.setState({
            dialogOpen: true,
            dialogMode: 'add',
            editingId: null,
            formData: {
                staff_name: '',
                staff_category: 'SCHOOL',
                gross_salary: '',
                esic_opted: false,
                lic_amount: 0,
                account_number: '',
            },
            formErrors: {},
        })
        this.loadStaffOptions()
    }

    handleOpenEditDialog = (setup) => {
        this.setState({
            dialogOpen: true,
            dialogMode: 'edit',
            editingId: setup.id,
            formData: {
                staff_name: setup.staff_name || '',
                staff_category: setup.staff_category || 'SCHOOL',
                gross_salary: setup.gross_salary || '',
                esic_opted: setup.esic_opted || false,
                lic_amount: setup.lic_amount || 0,
                account_number: setup.account_number || '',
            },
            formErrors: {},
        })
        this.loadStaffOptions()
    }

    loadStaffOptions = (searchTerm = '', reset = true) => {
        this.setState({ staffLoading: true })

        const params = { is_active: true, limit: 10, pageno: 1, pagination: true }
        if (searchTerm) {
            params.search = searchTerm
        }

        getRequest(GET_URL.staff.api, params, this.props)
            .then(res => {
                if (res?.status === 200) {
                    const responseData = res.data || {}
                    const staffList = responseData.data || []
                    const options = Array.isArray(staffList)
                        ? staffList.map(s => s.full_name || '')
                        : []
                    this.setState({
                        staffOptions: options,
                        staffLoading: false,
                        staffPageNo: 1,
                        staffHasMore: !!responseData.next_page,
                        staffSearchTerm: searchTerm
                    })
                } else {
                    this.setState({ staffLoading: false })
                }
            })
            .catch(() => this.setState({ staffLoading: false }))
    }

    loadMoreStaff = () => {
        const { staffHasMore, staffLoading, staffPageNo, staffSearchTerm, staffOptions } = this.state
        if (!staffHasMore || staffLoading) return

        this.setState({ staffLoading: true })

        const nextPage = staffPageNo + 1
        const params = { is_active: true, limit: 10, pageno: nextPage, pagination: true }
        if (staffSearchTerm) {
            params.search = staffSearchTerm
        }

        getRequest(GET_URL.staff.api, params, this.props)
            .then(res => {
                if (res?.status === 200) {
                    const responseData = res.data || {}
                    const staffList = responseData.data || []

                    if (!staffList.length) {
                        this.setState({ staffLoading: false, staffHasMore: false })
                        return
                    }

                    const newOptions = staffList.map(s => s.full_name || '').filter(Boolean)

                    const existingSet = new Set(staffOptions)
                    const uniqueNewOptions = newOptions.filter(name => !existingSet.has(name))

                    if (uniqueNewOptions.length === 0) {
                        this.setState({ staffLoading: false, staffHasMore: false })
                        return
                    }

                    this.setState(prev => ({
                        staffOptions: [...prev.staffOptions, ...uniqueNewOptions],
                        staffLoading: false,
                        staffPageNo: nextPage,
                        staffHasMore: !!responseData.next_page
                    }))
                } else {
                    this.setState({ staffLoading: false, staffHasMore: false })
                }
            })
            .catch(() => this.setState({ staffLoading: false, staffHasMore: false }))
    }

    handleStaffListScroll = (event) => {
        const listboxNode = event.currentTarget
        if (listboxNode.scrollTop + listboxNode.clientHeight >= listboxNode.scrollHeight - 50) {
            this.loadMoreStaff()
        }
    }

    handleStaffNameChange = (event, newValue) => {
        this.setState(prev => ({
            formData: {
                ...prev.formData,
                staff_name: newValue || ''
            },
            formErrors: {
                ...prev.formErrors,
                staff_name: null
            }
        }))
    }

    handleCloseDialog = () => {
        this.setState({
            dialogOpen: false,
            editingId: null,
            formData: {
                staff_name: '',
                staff_category: 'SCHOOL',
                gross_salary: '',
                esic_opted: false,
                lic_amount: 0,
                account_number: '',
            },
            formErrors: {},
        })
    }

    handleFormChange = (field) => (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
        this.setState(prev => ({
            formData: {
                ...prev.formData,
                [field]: value
            },
            formErrors: {
                ...prev.formErrors,
                [field]: null
            }
        }))
    }

    validateForm = () => {
        const { formData } = this.state
        const errors = {}

        if (!formData.staff_name.trim()) {
            errors.staff_name = 'Staff name is required'
        }
        if (!formData.gross_salary || formData.gross_salary <= 0) {
            errors.gross_salary = 'Gross salary is required and must be positive'
        }
        if (!formData.account_number.trim()) {
            errors.account_number = 'Account number is required'
        }

        this.setState({ formErrors: errors })
        return Object.keys(errors).length === 0
    }

    handleSubmit = () => {
        if (!this.validateForm()) return

        const { dialogMode, editingId, formData } = this.state
        this.setState({ submitting: true })

        const data = {
            staff_name: formData.staff_name,
            staff_category: formData.staff_category,
            gross_salary: parseInt(formData.gross_salary),
            esic_opted: formData.esic_opted,
            lic_amount: parseInt(formData.lic_amount) || 0,
            account_number: formData.account_number,
            is_active: true,
        }

        if (dialogMode === 'add') {
            postRequest(POST_URL.staffsalarysetup.api, data, this.props)
                .then(res => {
                    if (res?.status === 200) {
                        this.handleCloseDialog()
                        this.loadSetups()
                    }
                    this.setState({ submitting: false })
                })
                .catch(() => this.setState({ submitting: false }))
        } else {
            const url = `${PUT_URL.staffsalarysetup.api}${editingId}/`
            putRequest(url, data, this.props)
                .then(res => {
                    if (res?.status === 200) {
                        this.handleCloseDialog()
                        this.loadSetups()
                    }
                    this.setState({ submitting: false })
                })
                .catch(() => this.setState({ submitting: false }))
        }
    }

    handleDelete = (id) => {
        const url = `${GET_URL.staffsalarysetup.api}${id}/`
        deleteRequest(url, {}, this.props)
            .then(res => {
                if (res?.status === 200) {
                    Swal.fire({
                        ...SUCCESS_MSG_PROPS,
                        title: 'Deleted!',
                        text: 'Staff salary setup has been deleted.'
                    })
                    this.loadSetups()
                }
            })
    }

    handleOpenBulkDialog = () => {
        this.setState({
            bulkDialogOpen: true,
            selectedFile: null,
            uploadErrors: null,
        })
    }

    handleCloseBulkDialog = () => {
        this.setState({
            bulkDialogOpen: false,
            selectedFile: null,
            uploadErrors: null,
            bulkUploading: false,
        })
    }

    handleDownloadTemplate = () => {
        getRequest(GET_URL.staffsalarybulk.api, {}, { responseType: 'blob' })
            .then(res => {
                if (res?.status === 200) {
                    const filename = res.headers?.['content-disposition']?.split('filename=')?.[1]
                        || 'staff_salary_setup_template.xlsx'
                    fileDownload(res.data, filename)
                }
            })
    }

    handleFileSelect = (e) => {
        const file = e.target.files?.[0]
        if (file) {
            const validTypes = [
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ]
            if (!validTypes.includes(file.type)) {
                this.setState({ uploadErrors: { general: 'Please upload an Excel file (.xls or .xlsx)' } })
                return
            }
            this.setState({ selectedFile: file, uploadErrors: null })
        }
    }

    handleBulkUpload = () => {
        const { selectedFile } = this.state
        if (!selectedFile) return

        this.setState({ bulkUploading: true, uploadErrors: null })

        const formData = new FormData()
        formData.append('file', selectedFile)

        postRequest(POST_URL.staffsalarybulk.api, formData, { return_error: true })
            .then(res => {
                if (res?.status === 200 && res.data?.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Upload Successful',
                        text: res.data.message || `Created ${res.data.created_count} salary setup(s).`,
                        timer: 3000,
                    })
                    this.handleCloseBulkDialog()
                    this.loadSetups()
                } else if (res?.data?.errors) {
                    this.setState({ uploadErrors: res.data.errors, bulkUploading: false })
                } else {
                    this.setState({
                        uploadErrors: { general: res?.data?.message || 'Upload failed. Please try again.' },
                        bulkUploading: false
                    })
                }
            })
            .catch(() => {
                this.setState({
                    uploadErrors: { general: 'Upload failed. Please check your file and try again.' },
                    bulkUploading: false
                })
            })
    }

    renderBulkUploadDialog = () => {
        const { bulkDialogOpen, bulkUploading, selectedFile, uploadErrors } = this.state

        return (
            <Dialog open={bulkDialogOpen} onClose={this.handleCloseBulkDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Bulk Upload Staff Salary Setup</DialogTitle>
                <DialogContent>
                    {bulkUploading && (
                        <Box display="flex" justifyContent="center" py={2}>
                            <CircularProgress />
                        </Box>
                    )}
                    <Box mb={3}>
                        <Typography variant="subtitle2" gutterBottom>Download Template</Typography>
                        <Button
                            variant="outlined"
                            startIcon={<GetAppIcon />}
                            onClick={this.handleDownloadTemplate}
                            style={{ textTransform: 'none' }}
                        >
                            Download Excel Template
                        </Button>
                        <Typography variant="caption" display="block" color="textSecondary" style={{ marginTop: 4 }}>
                            Fill the template with staff data, then upload below.
                        </Typography>
                    </Box>
                    <Box mb={2}>
                        <Typography variant="subtitle2" gutterBottom>Upload File</Typography>
                        <input
                            type="file"
                            id="bulk-upload-file"
                            accept=".xls,.xlsx"
                            style={{ display: 'none' }}
                            onChange={this.handleFileSelect}
                        />
                        <label htmlFor="bulk-upload-file">
                            <Button
                                variant="outlined"
                                component="span"
                                startIcon={<CloudUploadIcon />}
                                style={{ textTransform: 'none' }}
                            >
                                Select Excel File
                            </Button>
                        </label>
                        {selectedFile && (
                            <Typography variant="body2" style={{ marginTop: 8, color: '#4CAF50' }}>
                                Selected: {selectedFile.name}
                            </Typography>
                        )}
                    </Box>
                    {uploadErrors && (
                        <Box mt={2} p={2} style={{ backgroundColor: '#ffebee', borderRadius: 4 }}>
                            <Typography variant="subtitle2" color="error" gutterBottom>
                                Validation Errors:
                            </Typography>
                            {uploadErrors.general ? (
                                <Typography variant="body2" color="error">
                                    {uploadErrors.general}
                                </Typography>
                            ) : (
                                Object.entries(uploadErrors).map(([rowNum, errors]) => (
                                    <Box key={rowNum} mb={1}>
                                        <Typography variant="body2" color="error">
                                            <strong>Row {rowNum}:</strong> {Object.values(errors).join(', ')}
                                        </Typography>
                                    </Box>
                                ))
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={this.handleCloseBulkDialog} disabled={bulkUploading}>
                        Close
                    </Button>
                    <Button
                        onClick={this.handleBulkUpload}
                        color="primary"
                        variant="contained"
                        disabled={!selectedFile || bulkUploading}
                    >
                        Upload
                    </Button>
                </DialogActions>
            </Dialog>
        )
    }

    renderDialog = () => {
        const { dialogOpen, dialogMode, formData, formErrors, submitting, staffOptions, staffLoading } = this.state

        return (
            <Dialog open={dialogOpen} onClose={this.handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {dialogMode === 'add' ? 'Add Staff Salary Setup' : 'Edit Staff Salary Setup'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} style={{ marginTop: 8 }}>
                        <Grid item xs={12}>
                            <Autocomplete
                                freeSolo
                                options={staffOptions}
                                loading={staffLoading}
                                value={formData.staff_name}
                                onChange={this.handleStaffNameChange}
                                onInputChange={(event, newInputValue, reason) => {
                                    this.handleStaffNameChange(event, newInputValue)
                                    // Trigger search when user types (not on selection)
                                    if (reason === 'input' && newInputValue.length >= 2) {
                                        // Debounce search
                                        if (this.searchTimeout) clearTimeout(this.searchTimeout)
                                        this.searchTimeout = setTimeout(() => {
                                            this.loadStaffOptions(newInputValue)
                                        }, 300)
                                    }
                                }}
                                ListboxProps={{
                                    onScroll: this.handleStaffListScroll,
                                    style: { maxHeight: 200, overflow: 'auto' }
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Staff Name *"
                                        variant="outlined"
                                        size="small"
                                        error={!!formErrors.staff_name}
                                        helperText={formErrors.staff_name || 'Type to search or scroll for more'}
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <>
                                                    {staffLoading ? <CircularProgress size={16} /> : null}
                                                    {params.InputProps.endAdornment}
                                                </>
                                            ),
                                        }}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                select
                                fullWidth
                                label="Staff Category *"
                                value={formData.staff_category}
                                onChange={this.handleFormChange('staff_category')}
                                variant="outlined"
                                size="small"
                            >
                                {STAFF_CATEGORY_OPTIONS.map(opt => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Gross Salary *"
                                value={formData.gross_salary}
                                onChange={this.handleFormChange('gross_salary')}
                                error={!!formErrors.gross_salary}
                                helperText={formErrors.gross_salary}
                                variant="outlined"
                                size="small"
                                inputProps={{ min: 0 }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="LIC Amount"
                                value={formData.lic_amount}
                                onChange={this.handleFormChange('lic_amount')}
                                variant="outlined"
                                size="small"
                                inputProps={{ min: 0 }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Account Number *"
                                value={formData.account_number}
                                onChange={this.handleFormChange('account_number')}
                                error={!!formErrors.account_number}
                                helperText={formErrors.account_number}
                                variant="outlined"
                                size="small"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formData.esic_opted}
                                        onChange={this.handleFormChange('esic_opted')}
                                        color="primary"
                                    />
                                }
                                label="ESIC Opted"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={this.handleCloseDialog} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={this.handleSubmit}
                        color="primary"
                        variant="contained"
                        disabled={submitting}
                        startIcon={submitting ? <CircularProgress size={16} /> : null}
                    >
                        {dialogMode === 'add' ? 'Add' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>
        )
    }

    renderTable = () => {
        const { setupData } = this.state

        const columns = [
            { id: 'sl', label: 'SL', width: 50 },
            { id: 'staff_name', label: 'Staff Name', width: 180 },
            { id: 'staff_category', label: 'Category', width: 120 },
            { id: 'gross_salary', label: 'Gross Salary', width: 120 },
            { id: 'esic_opted', label: 'ESIC', width: 80 },
            { id: 'lic_amount', label: 'LIC', width: 100 },
            { id: 'account_number', label: 'Account No', width: 150 },
            { id: 'actions', label: 'Actions', width: 100 },
        ]

        return (
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        {columns.map(col => (
                            <TableCell
                                key={col.id}
                                style={{
                                    minWidth: col.width,
                                    fontWeight: 'bold',
                                    backgroundColor: '#1976d2',
                                    color: '#fff'
                                }}
                            >
                                {col.label}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {setupData.map((row, index) => (
                        <TableRow key={row.id} hover>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{row.staff_name}</TableCell>
                            <TableCell>
                                <span style={{
                                    padding: '4px 8px',
                                    borderRadius: 4,
                                    backgroundColor: '#e3f2fd',
                                    color: '#1565c0',
                                    fontSize: 12,
                                    fontWeight: 500
                                }}>
                                    {row.staff_category_display || row.staff_category}
                                </span>
                            </TableCell>
                            <TableCell>{numberWithCommas(row.gross_salary)}</TableCell>
                            <TableCell>
                                <span style={{
                                    color: row.esic_opted ? '#4CAF50' : '#999',
                                    fontWeight: 'bold'
                                }}>
                                    {row.esic_opted ? 'Yes' : 'No'}
                                </span>
                            </TableCell>
                            <TableCell>{numberWithCommas(row.lic_amount)}</TableCell>
                            <TableCell>{row.account_number}</TableCell>
                            <TableCell>
                                <Tooltip title="Edit">
                                    <IconButton
                                        size="small"
                                        onClick={() => this.handleOpenEditDialog(row)}
                                    >
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                    <IconButton
                                        size="small"
                                        color="secondary"
                                        onClick={() => this.handleDelete(row.id)}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        )
    }

    render() {
        const {
            loading,
            tableUpdating,
            searchTerm,
            totalCount,
            hasMore,
            isFetchingMore,
            setupData
        } = this.state

        if (loading) {
            return <LoadingGif />
        }

        return (
            <Paper className="staff-salary-setup">
                <Box p={3}>
                    {/* Header */}
                    <Grid container spacing={2} alignItems="center" style={{ marginBottom: 24 }}>
                        <Grid item xs={12} md={4}>
                            <Typography variant="h5" style={{ fontWeight: 600 }}>
                                Staff Salary Setup
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={5}>
                            <TextField
                                fullWidth
                                placeholder="Search by staff name..."
                                value={searchTerm}
                                onChange={this.handleSearchChange}
                                onKeyPress={this.handleKeyPress}
                                variant="outlined"
                                size="small"
                                InputProps={{
                                    endAdornment: (
                                        <IconButton size="small" onClick={this.handleSearch}>
                                            <SearchIcon />
                                        </IconButton>
                                    )
                                }}
                            />
                        </Grid>
                        <Grid item xs={6} md={2}>
                            <Button
                                fullWidth
                                size="small"
                                variant="outlined"
                                startIcon={<SortIcon />}
                                onClick={this.handleSortMenuOpen}
                            >
                                {this.getSortLabel()}
                            </Button>
                            <Menu
                                anchorEl={this.state.sortAnchorEl}
                                open={Boolean(this.state.sortAnchorEl)}
                                onClose={this.handleSortMenuClose}
                            >
                                <MenuItem onClick={() => this.handleSortChange('staff_name')}>
                                    <ListItemIcon><ArrowUpwardIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText>Name (A-Z)</ListItemText>
                                </MenuItem>
                                <MenuItem onClick={() => this.handleSortChange('-staff_name')}>
                                    <ListItemIcon><ArrowDownwardIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText>Name (Z-A)</ListItemText>
                                </MenuItem>
                                <MenuItem onClick={() => this.handleSortChange('-base_salary')}>
                                    <ListItemIcon><ArrowDownwardIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText>Salary (High→Low)</ListItemText>
                                </MenuItem>
                                <MenuItem onClick={() => this.handleSortChange('base_salary')}>
                                    <ListItemIcon><ArrowUpwardIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText>Salary (Low→High)</ListItemText>
                                </MenuItem>
                            </Menu>
                        </Grid>
                        <Grid item xs={6} md={1}>
                            <Tooltip title="Bulk upload salary setups from Excel">
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    color="primary"
                                    startIcon={<CloudUploadIcon />}
                                    onClick={this.handleOpenBulkDialog}
                                    style={{ minWidth: 'auto' }}
                                >
                                    Bulk
                                </Button>
                            </Tooltip>
                        </Grid>
                        <Grid item xs={6} md={2}>
                            <Button
                                fullWidth
                                variant="contained"
                                color="primary"
                                startIcon={<AddIcon />}
                                onClick={this.handleOpenAddDialog}
                            >
                                Add Setup
                            </Button>
                        </Grid>
                    </Grid>

                    {/* Count Header */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="subtitle1" color="textSecondary">
                            Showing {setupData.length} of {totalCount} setups
                        </Typography>
                    </Box>

                    {/* Table with InfiniteScroll */}
                    {tableUpdating ? (
                        <Box display="flex" justifyContent="center" py={4}>
                            <CircularProgress />
                        </Box>
                    ) : setupData.length === 0 ? (
                        <Box textAlign="center" py={4}>
                            <Typography color="textSecondary">
                                No salary setups found. Click "Add Setup" to create one.
                            </Typography>
                        </Box>
                    ) : (
                        <div style={{ maxHeight: 500, overflow: 'auto' }}>
                            <InfiniteScroll
                                pageStart={0}
                                loadMore={this.loadMoreData}
                                hasMore={hasMore && !isFetchingMore}
                                useWindow={false}
                                threshold={100}
                            >
                                {this.renderTable()}
                                {isFetchingMore && (
                                    <Box display="flex" justifyContent="center" py={2}>
                                        <CircularProgress size={24} />
                                    </Box>
                                )}
                            </InfiniteScroll>
                        </div>
                    )}

                    {/* Show More Button (fallback) */}
                    {hasMore && !isFetchingMore && setupData.length > 0 && (
                        <Box display="flex" justifyContent="center" mt={2}>
                            <Button
                                variant="outlined"
                                onClick={this.loadMoreData}
                            >
                                Show More
                            </Button>
                        </Box>
                    )}
                </Box>

                {/* Add/Edit Dialog */}
                {this.renderDialog()}

                {/* Bulk Upload Dialog */}
                {this.renderBulkUploadDialog()}
            </Paper>
        )
    }
}

export default ViewStaffSalarySetup
