import React, { Component } from 'react'
import { Paper, Box, Grid, Button, Table, TableHead, TableRow, TableCell, TableBody, Typography, TextField, MenuItem, IconButton, Menu } from '@material-ui/core'
import AddIcon from '@material-ui/icons/Add'
import EditIcon from '@material-ui/icons/Edit'
import DeleteIcon from '@material-ui/icons/Delete'
import MoreVertIcon from '@material-ui/icons/MoreVert'
import classNames from 'classnames'
import Swal from 'sweetalert2'
import { withRouter } from 'react-router-dom'

import { getRequest, deleteRequest } from 'Includes/api/apicall'
import { GET_URL, DEL_URL } from 'Includes/urls'
import LoadingGif from 'Components/LoadingGif'


class RecoverableAssetCategoryList extends Component {
    state = {
        categories: [],
        loading: true,
        financialYearOptions: [],
        selectedFy: '',
        anchorEl: null,
        selectedCategory: null
    }

    componentDidMount() {
        this.loadFinancialYears()
    }

    loadFinancialYears = () => {
        getRequest(GET_URL.financialyear.api, { is_active: true }, this.props).then(res => {
            if (res && res.status === 200) {
                const fyData = res.data.data.data_list || res.data.data || []
                let selectedFy = ''
                if (fyData.length > 0) {
                    const activeFys = fyData.filter(fy => fy.is_active === true || fy.is_active === 'true')
                    selectedFy = activeFys.length > 0 ? activeFys[0].id : fyData[0].id
                }
                this.setState({ financialYearOptions: fyData, selectedFy }, () => {
                    this.loadCategories()
                })
            } else {
                this.loadCategories()
            }
        }).catch(() => this.loadCategories())
    }

    loadCategories = () => {
        this.setState({ loading: true })
        const params = { is_active: true }
        if (this.state.selectedFy) params.financial_year = this.state.selectedFy

        getRequest(GET_URL.recoverableAssetCategory.api, params, this.props)
            .then(res => {
                if (res?.status === 200) {
                    this.setState({ categories: res.data.data || [], loading: false })
                } else {
                    this.setState({ loading: false })
                }
            })
            .catch(() => this.setState({ loading: false }))
    }

    handleAddClick = () => {
        const { selectedFy } = this.state;
        const url = '/finance/recoverable-assets/categories/add' + (selectedFy ? `?financial_year=${selectedFy}` : '');
        this.props.history.push(url);
    }

    handleMenuOpen = (e, cat) => this.setState({ anchorEl: e.currentTarget, selectedCategory: cat })
    handleMenuClose = () => this.setState({ anchorEl: null, selectedCategory: null })

    handleEdit = () => {
        const id = this.state.selectedCategory?.id
        this.handleMenuClose()
        if (id) this.props.history.push(`/finance/recoverable-assets/categories/edit?id=${id}`)
    }

    handleDelete = (confirm = false) => {
        const cat = this.state.selectedCategory
        const id = cat?.id
        this.handleMenuClose()
        if (!id) return

        Swal.fire({
            title: confirm ? 'Final Confirmation' : 'Are you sure?',
            text: 'This category will be deleted. This action cannot be undone.',
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.value) {
                const url = `${DEL_URL.recoverableAssetCategory.api}${id}/` + (confirm ? '?confirm=true' : '')
                deleteRequest(url, {}, this.props, true)
                    .then(res => {
                        if (res?.status === 200 && res.data?.warning) {
                            Swal.fire({
                                title: 'Warning - Active Assets Found',
                                text: res.data.message,
                                type: 'warning',
                                showCancelButton: true,
                                confirmButtonColor: '#d33',
                                cancelButtonColor: '#3085d6',
                                confirmButtonText: 'Delete Category AND Assets'
                            }).then((subResult) => {
                                if (subResult.value) {
                                    this.setState({ selectedCategory: cat }, () => this.handleDelete(true))
                                }
                            })
                        } else if (res?.status === 200) {
                            Swal.fire({
                                position: 'top-end', type: 'success', title: 'Category deleted',
                                showConfirmButton: false, timer: 1500
                            })
                            this.loadCategories()
                        } else if (res && res.data && res.data.message) {
                            Swal.fire('Failed', res.data.message, 'error')
                        } else {
                            Swal.fire('Failed', 'Failed to delete category.', 'error')
                        }
                    })
            }
        })
    }

    render() {
        const { categories, loading, selectedCategory } = this.state
        const fyLocked = selectedCategory?.is_fy_locked === true

        if (loading) return <LoadingGif />

        return (
            <Box>
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className="header-align">
                            <Box className="heading">Asset Categories</Box>
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Box display="flex" justifyContent="flex-end" p={2} style={{ gap: 16 }}>
                                <Box width="200px">
                                    <TextField
                                        select fullWidth variant="outlined" size="small"
                                        label="Financial Year"
                                        value={this.state.selectedFy}
                                        onChange={e => this.setState({ selectedFy: e.target.value }, () => this.loadCategories())}
                                    >
                                        <MenuItem value="">All</MenuItem>
                                        {this.state.financialYearOptions.map(fy => (
                                            <MenuItem key={fy.id} value={fy.id}>
                                                {fy.name || `${fy.start_date} - ${fy.end_date}`}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Box>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<AddIcon />}
                                    onClick={this.handleAddClick}
                                >
                                    Add Category
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>

                    <Box px={3} pb={3}>
                        <Table size="small">
                            <TableHead>
                                <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                                    <TableCell><strong>Code</strong></TableCell>
                                    <TableCell><strong>Name</strong></TableCell>
                                    <TableCell><strong>Description</strong></TableCell>
                                    <TableCell align="center"><strong>Assets</strong></TableCell>
                                    <TableCell align="center"><strong>Classification</strong></TableCell>
                                    <TableCell align="center"><strong>Actions</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {categories.map(cat => (
                                    <TableRow key={cat.id}>
                                        <TableCell>{cat.code}</TableCell>
                                        <TableCell><strong>{cat.name}</strong></TableCell>
                                        <TableCell>{cat.description}</TableCell>
                                        <TableCell align="center">{cat.asset_count}</TableCell>
                                        <TableCell align="center">{cat.balance_sheet_classification === 'FIXED_ASSET' ? 'Fixed Asset' : 'Liability'}</TableCell>
                                        <TableCell align="center">
                                            <IconButton size="small" onClick={(e) => this.handleMenuOpen(e, cat)}>
                                                <MoreVertIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {categories.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">
                                            <Typography color="textSecondary">No categories found. Add one to get started.</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Box>
                </Paper>

                {/* ── Category Actions Menu ── */}
                <Menu
                    anchorEl={this.state.anchorEl}
                    keepMounted
                    open={Boolean(this.state.anchorEl)}
                    onClose={this.handleMenuClose}
                    getContentAnchorEl={null}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                >
                    <MenuItem onClick={this.handleEdit} disabled={fyLocked}>
                        <EditIcon fontSize="small" style={{ marginRight: 8, color: fyLocked ? '#ccc' : '#2e7d32' }} />
                        Edit
                    </MenuItem>
                    <MenuItem onClick={() => this.handleDelete(false)} disabled={fyLocked}>
                        <DeleteIcon fontSize="small" style={{ marginRight: 8, color: fyLocked ? '#ccc' : '#c62828' }} />
                        Delete
                    </MenuItem>
                </Menu>
            </Box>
        )
    }
}

export default withRouter(RecoverableAssetCategoryList)
